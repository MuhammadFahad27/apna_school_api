import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PayRun } from './entities/pay-run.entity.js';
import { Payslip, PayslipStatus } from './entities/payslip.entity.js';
import { Teacher, EmploymentStatus } from '../teachers/entities/teacher.entity.js';
import { GeneratePayrollDto } from './dto/generate-payroll.dto.js';
import { EditPayslipDto } from './dto/edit-payslip.dto.js';
import { QueryPayslipsDto } from './dto/query-payslips.dto.js';
import { QueryPayRunsDto } from './dto/query-pay-runs.dto.js';

@Injectable()
export class PayrollService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PayRun)
    private readonly payRunRepo: Repository<PayRun>,
    @InjectRepository(Payslip)
    private readonly payslipRepo: Repository<Payslip>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {}

  private async generatePayRunNumber(): Promise<string> {
    const count = await this.payRunRepo.count();
    let num = `PR_${String(count + 1).padStart(4, '0')}`;
    let offset = 1;
    while (await this.payRunRepo.findOne({ where: { pay_run_number: num } })) {
      num = `PR_${String(count + 1 + offset).padStart(4, '0')}`;
      offset++;
    }
    return num;
  }

  private async generatePayslipNumber(): Promise<string> {
    const count = await this.payslipRepo.count();
    let num = `PSL_${String(count + 1).padStart(5, '0')}`;
    let offset = 1;
    while (await this.payslipRepo.findOne({ where: { payslip_number: num } })) {
      num = `PSL_${String(count + 1 + offset).padStart(5, '0')}`;
      offset++;
    }
    return num;
  }

  // 1. Check Eligibility of Teachers for a Month & Year
  async checkEligibility(month: string, year: number) {
    const activeTeachers = await this.teacherRepo.find({
      where: { employment_status: EmploymentStatus.ACTIVE },
      order: { employee_id: 'ASC' },
    });

    const teacherIds = activeTeachers.map((t) => t.id);
    const existingPayslips = teacherIds.length > 0
      ? await this.payslipRepo.find({
          where: {
            teacher_id: In(teacherIds),
            payroll_month: month.trim(),
            payroll_year: Number(year),
          },
        })
      : [];

    const existingMap = new Map<string, Payslip>();
    for (const p of existingPayslips) {
      existingMap.set(p.teacher_id, p);
    }

    const items = activeTeachers.map((t) => {
      const existing = existingMap.get(t.id);
      return {
        id: t.id,
        employee_id: t.employee_id,
        full_name: t.full_name,
        designation: t.designation,
        base_salary: Number(t.base_salary ?? 40000),
        profile_picture: t.profile_picture,
        is_eligible: !existing,
        existing_payslip: existing
          ? {
              id: existing.id,
              payslip_number: existing.payslip_number,
              status: existing.payment_status,
              pay_run_id: existing.pay_run_id,
              net_salary: Number(existing.net_salary),
            }
          : null,
      };
    });

    const eligibleCount = items.filter((i) => i.is_eligible).length;
    const alreadyProcessedCount = items.length - eligibleCount;

    return {
      month,
      year: Number(year),
      total_teachers: items.length,
      eligible_count: eligibleCount,
      already_processed_count: alreadyProcessedCount,
      teachers: items,
    };
  }

  // 2. Generate Payroll Batch (Pay Run + Payslips)
  async generatePayroll(dto: GeneratePayrollDto, userId?: string) {
    if (!dto.teacher_ids || dto.teacher_ids.length === 0) {
      throw new BadRequestException('Please select at least one teacher to generate payroll.');
    }

    const month = dto.month.trim();
    const year = Number(dto.year);

    // Fetch teachers requested
    const requestedTeachers = await this.teacherRepo.find({
      where: { id: In(dto.teacher_ids) },
    });

    if (requestedTeachers.length === 0) {
      throw new NotFoundException('Selected teachers not found.');
    }

    // Check existing payslips for duplicate prevention
    const existingPayslips = await this.payslipRepo.find({
      where: {
        teacher_id: In(dto.teacher_ids),
        payroll_month: month,
        payroll_year: year,
      },
      relations: { teacher: true },
    });

    const existingTeacherIdSet = new Set(existingPayslips.map((p) => p.teacher_id));

    const eligibleTeachers = requestedTeachers.filter(
      (t) => !existingTeacherIdSet.has(t.id),
    );

    const excludedTeachers = requestedTeachers
      .filter((t) => existingTeacherIdSet.has(t.id))
      .map((t) => {
        const p = existingPayslips.find((ep) => ep.teacher_id === t.id);
        return {
          id: t.id,
          employee_id: t.employee_id,
          full_name: t.full_name,
          reason: `Already processed as ${p?.payment_status?.toUpperCase() || 'PROCESSED'} (${p?.payslip_number || ''})`,
        };
      });

    if (eligibleTeachers.length === 0) {
      throw new ConflictException(
        `All selected teachers have already been processed for ${month} ${year}. Duplicate payroll cannot be generated.`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Create Pay Run
      const payRunNumber = await this.generatePayRunNumber();
      const payRun = manager.create(PayRun, {
        pay_run_number: payRunNumber,
        payroll_month: month,
        payroll_year: year,
        total_teachers: eligibleTeachers.length,
        total_amount: 0,
        paid_count: 0,
        unpaid_count: eligibleTeachers.length,
        created_by: userId || null,
      });

      const savedPayRun = await manager.save(PayRun, payRun);

      // 2. Create individual payslips for eligible teachers
      let totalAmount = 0;
      const payslipsToSave: Payslip[] = [];

      let slipCounter = await this.payslipRepo.count();

      for (const t of eligibleTeachers) {
        slipCounter++;
        const pslNumber = `PSL_${String(slipCounter).padStart(5, '0')}`;
        const baseSalary = Number(t.base_salary ?? 40000);
        totalAmount += baseSalary;

        const payslip = manager.create(Payslip, {
          payslip_number: pslNumber,
          pay_run_id: savedPayRun.id,
          teacher_id: t.id,
          payroll_month: month,
          payroll_year: year,
          base_salary: baseSalary,
          bonus_amount: 0,
          bonus_reason: null,
          deduction_amount: 0,
          deduction_reason: null,
          net_salary: baseSalary,
          payment_status: PayslipStatus.UNPAID,
          payment_date: null,
          remarks: null,
        });

        payslipsToSave.push(payslip);
      }

      await manager.save(Payslip, payslipsToSave);

      // 3. Update Pay Run total amount
      savedPayRun.total_amount = totalAmount;
      await manager.save(PayRun, savedPayRun);

      return {
        message: `Payroll batch ${payRunNumber} successfully generated for ${eligibleTeachers.length} teachers. Total: PKR ${totalAmount.toLocaleString()}`,
        pay_run: savedPayRun,
        generated_count: eligibleTeachers.length,
        excluded_count: excludedTeachers.length,
        excluded_teachers: excludedTeachers,
      };
    });
  }

  // 3. List Pay Runs
  async findAllPayRuns(query: QueryPayRunsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.payRunRepo
      .createQueryBuilder('pr')
      .orderBy('pr.created_at', 'DESC');

    if (query.month && query.month !== 'all') {
      qb.andWhere('pr.payroll_month = :month', { month: query.month });
    }

    if (query.year) {
      qb.andWhere('pr.payroll_year = :year', { year: Number(query.year) });
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((i) => ({
        ...i,
        total_amount: Number(i.total_amount),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // 4. Get Single Pay Run with Payslips
  async findOnePayRun(id: string) {
    const payRun = await this.payRunRepo.findOne({
      where: { id },
      relations: { payslips: { teacher: true } },
      order: { payslips: { payslip_number: 'ASC' } },
    });

    if (!payRun) {
      throw new NotFoundException(`Pay Run with ID '${id}' not found.`);
    }

    return {
      ...payRun,
      total_amount: Number(payRun.total_amount),
      payslips: payRun.payslips.map((p) => ({
        ...p,
        base_salary: Number(p.base_salary),
        bonus_amount: Number(p.bonus_amount),
        deduction_amount: Number(p.deduction_amount),
        net_salary: Number(p.net_salary),
      })),
    };
  }

  // 5. List Payslips (with Search & Filters)
  async findAllPayslips(query: QueryPayslipsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.payslipRepo
      .createQueryBuilder('psl')
      .leftJoinAndSelect('psl.teacher', 'teacher')
      .leftJoinAndSelect('psl.payRun', 'payRun')
      .orderBy('psl.created_at', 'DESC');

    if (query.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(teacher.full_name) LIKE :term OR LOWER(teacher.employee_id) LIKE :term OR LOWER(psl.payslip_number) LIKE :term)',
        { term },
      );
    }

    if (query.month && query.month !== 'all') {
      qb.andWhere('psl.payroll_month = :month', { month: query.month });
    }

    if (query.year) {
      qb.andWhere('psl.payroll_year = :year', { year: Number(query.year) });
    }

    if (query.payment_status && query.payment_status !== 'all') {
      qb.andWhere('psl.payment_status = :status', { status: query.payment_status });
    }

    if (query.pay_run_id) {
      qb.andWhere('psl.pay_run_id = :prId', { prId: query.pay_run_id });
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((p) => ({
        ...p,
        base_salary: Number(p.base_salary),
        bonus_amount: Number(p.bonus_amount),
        deduction_amount: Number(p.deduction_amount),
        net_salary: Number(p.net_salary),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // 6. Get Single Payslip for Printable View
  async findOnePayslip(id: string) {
    const psl = await this.payslipRepo.findOne({
      where: { id },
      relations: { teacher: true, payRun: true },
    });

    if (!psl) {
      throw new NotFoundException(`Payslip with ID '${id}' not found.`);
    }

    return {
      ...psl,
      base_salary: Number(psl.base_salary),
      bonus_amount: Number(psl.bonus_amount),
      deduction_amount: Number(psl.deduction_amount),
      net_salary: Number(psl.net_salary),
    };
  }

  // 7. Edit Payslip (Bonus, Deductions) - ONLY UNPAID
  async editPayslip(id: string, dto: EditPayslipDto) {
    const psl = await this.payslipRepo.findOne({
      where: { id },
      relations: { teacher: true },
    });

    if (!psl) {
      throw new NotFoundException(`Payslip with ID '${id}' not found.`);
    }

    if (psl.payment_status === PayslipStatus.PAID) {
      throw new BadRequestException('Cannot edit a payslip that has already been marked as PAID.');
    }

    if (psl.payment_status === PayslipStatus.VOID) {
      throw new BadRequestException('Cannot edit a VOID payslip.');
    }

    if (dto.bonus_amount !== undefined) psl.bonus_amount = Number(dto.bonus_amount);
    if (dto.bonus_reason !== undefined) psl.bonus_reason = dto.bonus_reason?.trim() || null;
    if (dto.deduction_amount !== undefined) psl.deduction_amount = Number(dto.deduction_amount);
    if (dto.deduction_reason !== undefined) psl.deduction_reason = dto.deduction_reason?.trim() || null;
    if (dto.remarks !== undefined) psl.remarks = dto.remarks?.trim() || null;

    // Recalculate Net Salary automatically: Net Salary = Base Salary + Bonus - Deductions
    psl.net_salary = Math.max(
      0,
      Number(psl.base_salary) + Number(psl.bonus_amount) - Number(psl.deduction_amount),
    );

    const savedPsl = await this.payslipRepo.save(psl);

    // Recalculate parent PayRun total amount
    await this.recalculatePayRunTotals(psl.pay_run_id);

    return {
      message: `Payslip for ${psl.teacher?.full_name || 'teacher'} updated successfully. Net Salary: PKR ${savedPsl.net_salary.toLocaleString()}`,
      payslip: savedPsl,
    };
  }

  // 8. Individual Payment: Mark Payslip as PAID
  async markPayslipAsPaid(id: string) {
    const psl = await this.payslipRepo.findOne({
      where: { id },
      relations: { teacher: true },
    });

    if (!psl) {
      throw new NotFoundException(`Payslip with ID '${id}' not found.`);
    }

    if (psl.payment_status === PayslipStatus.PAID) {
      throw new BadRequestException('This payslip is already marked as PAID.');
    }

    psl.payment_status = PayslipStatus.PAID;
    psl.payment_date = new Date();

    const saved = await this.payslipRepo.save(psl);

    // Update parent PayRun counts
    await this.recalculatePayRunTotals(psl.pay_run_id);

    return {
      message: `Salary of PKR ${saved.net_salary.toLocaleString()} for ${psl.teacher?.full_name} marked as PAID.`,
      payslip: saved,
    };
  }

  // 9. Bulk Payment: Mark All Unpaid in Pay Run as PAID
  async bulkPayPayRun(payRunId: string) {
    const payRun = await this.payRunRepo.findOne({
      where: { id: payRunId },
      relations: { payslips: true },
    });

    if (!payRun) {
      throw new NotFoundException(`Pay Run with ID '${payRunId}' not found.`);
    }

    const unpaidSlips = payRun.payslips.filter(
      (p) => p.payment_status === PayslipStatus.UNPAID,
    );

    if (unpaidSlips.length === 0) {
      return {
        message: 'All payslips in this pay run are already paid.',
        paid_count: payRun.paid_count,
      };
    }

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      for (const slip of unpaidSlips) {
        slip.payment_status = PayslipStatus.PAID;
        slip.payment_date = now;
      }
      await manager.save(Payslip, unpaidSlips);

      payRun.paid_count = payRun.total_teachers;
      payRun.unpaid_count = 0;
      await manager.save(PayRun, payRun);
    });

    return {
      message: `Successfully marked all ${unpaidSlips.length} unpaid payslips as PAID for ${payRun.payroll_month} ${payRun.payroll_year}.`,
      newly_paid: unpaidSlips.length,
    };
  }

  // 10. Delete / Void Payslip
  async deletePayslip(id: string, forceVoid = false) {
    const psl = await this.payslipRepo.findOne({
      where: { id },
      relations: { teacher: true },
    });

    if (!psl) {
      throw new NotFoundException(`Payslip with ID '${id}' not found.`);
    }

    const payRunId = psl.pay_run_id;

    if (psl.payment_status === PayslipStatus.PAID && !forceVoid) {
      throw new BadRequestException(
        'A PAID payslip cannot be permanently deleted because it represents a completed financial record. You can void it instead.',
      );
    }

    if (psl.payment_status === PayslipStatus.PAID || forceVoid) {
      // Mark as VOID to retain audit trail and enforce unique constraint
      psl.payment_status = PayslipStatus.VOID;
      await this.payslipRepo.save(psl);
      await this.recalculatePayRunTotals(payRunId);
      return {
        message: `Payslip for ${psl.teacher?.full_name} has been VOIDED.`,
      };
    }

    // If UNPAID: remove record
    await this.payslipRepo.remove(psl);
    await this.recalculatePayRunTotals(payRunId);

    return {
      message: `Unpaid payslip for ${psl.teacher?.full_name} deleted successfully.`,
    };
  }

  // Helper: Recalculate Pay Run totals
  private async recalculatePayRunTotals(payRunId: string) {
    const payRun = await this.payRunRepo.findOne({
      where: { id: payRunId },
      relations: { payslips: true },
    });

    if (!payRun) return;

    const activePayslips = payRun.payslips.filter(
      (p) => p.payment_status !== PayslipStatus.VOID,
    );

    const totalAmount = activePayslips.reduce(
      (sum, p) => sum + Number(p.net_salary),
      0,
    );
    const paidCount = activePayslips.filter(
      (p) => p.payment_status === PayslipStatus.PAID,
    ).length;
    const unpaidCount = activePayslips.filter(
      (p) => p.payment_status === PayslipStatus.UNPAID,
    ).length;

    payRun.total_teachers = activePayslips.length;
    payRun.total_amount = totalAmount;
    payRun.paid_count = paidCount;
    payRun.unpaid_count = unpaidCount;

    await this.payRunRepo.save(payRun);
  }

  // 11. Overall Stats
  async getStats() {
    const totalPayRuns = await this.payRunRepo.count();
    const totalPayslips = await this.payslipRepo.count();
    const paidPayslips = await this.payslipRepo.count({
      where: { payment_status: PayslipStatus.PAID },
    });
    const unpaidPayslips = await this.payslipRepo.count({
      where: { payment_status: PayslipStatus.UNPAID },
    });

    const sumResult = await this.payslipRepo
      .createQueryBuilder('psl')
      .select('SUM(psl.net_salary)', 'totalNet')
      .where('psl.payment_status = :status', { status: PayslipStatus.PAID })
      .getRawOne();

    const totalDisbursed = Number(sumResult?.totalNet || 0);

    return {
      totalPayRuns,
      totalPayslips,
      paidPayslips,
      unpaidPayslips,
      totalDisbursed,
    };
  }
}
