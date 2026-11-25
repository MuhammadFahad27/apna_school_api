import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from '../students/entities/student.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { FeePaymentStatus, StudentFee } from './entities/student-fee.entity.js';
import { FeeVoucher } from './entities/fee-voucher.entity.js';
import { CollectFeeDto } from './dto/collect-fee.dto.js';
import { QueryFeeStudentsDto } from './dto/query-fee-students.dto.js';
import { GenerateVouchersDto } from './dto/generate-vouchers.dto.js';

export const MONTHS_LIST = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(StudentFee)
    private readonly feeRepo: Repository<StudentFee>,
    @InjectRepository(FeeVoucher)
    private readonly voucherRepo: Repository<FeeVoucher>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(Section)
    private readonly sectionRepo: Repository<Section>,
  ) {}

  private async generateReceiptNumber(): Promise<string> {
    const count = await this.feeRepo.count({
      where: { status: FeePaymentStatus.PAID },
    });
    let receiptNumber = `REC_${String(count + 1).padStart(4, '0')}`;
    let offset = 1;
    while (await this.feeRepo.findOne({ where: { receipt_number: receiptNumber } })) {
      receiptNumber = `REC_${String(count + 1 + offset).padStart(4, '0')}`;
      offset++;
    }
    return receiptNumber;
  }

  private getCurrentMonthAndYear(): { month: string; year: number } {
    const now = new Date();
    const month = MONTHS_LIST[now.getMonth()];
    const year = now.getFullYear();
    return { month, year };
  }

  // 1. Get Students with Fee Status for a given Month & Year
  async getStudentsWithFeeStatus(query: QueryFeeStudentsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const { month: defaultMonth, year: defaultYear } = this.getCurrentMonthAndYear();
    const month = query.month?.trim() || defaultMonth;
    const year = query.year ? Number(query.year) : defaultYear;

    // Calculate the end date of the selected billing month
    const monthIndex = MONTHS_LIST.indexOf(month);
    const validMonthIndex = monthIndex >= 0 ? monthIndex : new Date().getMonth();
    const lastDay = new Date(year, validMonthIndex + 1, 0).getDate();
    const monthPadded = String(validMonthIndex + 1).padStart(2, '0');
    const selectedMonthEnd = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;

    const qb = this.studentRepo
      .createQueryBuilder('std')
      .leftJoinAndSelect('std.class', 'cls')
      .leftJoinAndSelect('std.section', 'sec')
      .leftJoinAndMapOne(
        'std.feeRecord',
        StudentFee,
        'fee',
        'fee.student_id = std.id AND fee.month = :month AND fee.year = :year',
        { month, year },
      )
      .where('(std.admission_date IS NULL OR std.admission_date <= :selectedMonthEnd)', {
        selectedMonthEnd,
      })
      .orderBy('std.student_id', 'ASC');

    // Filter: search
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(std.full_name ILIKE :search OR std.student_id ILIKE :search OR std.admission_number ILIKE :search OR std.father_name ILIKE :search)',
        { search },
      );
    }

    // Filter: class
    if (query.class_id && query.class_id !== 'all') {
      qb.andWhere('std.class_id = :class_id', { class_id: query.class_id });
    }

    // Filter: section
    if (query.section_id && query.section_id !== 'all') {
      qb.andWhere('std.section_id = :section_id', {
        section_id: query.section_id,
      });
    }

    // Filter: gender
    if (query.gender && query.gender !== 'all') {
      qb.andWhere('std.gender = :gender', { gender: query.gender.toLowerCase() });
    }

    // Filter: fee_status
    if (query.fee_status && query.fee_status !== 'all') {
      if (query.fee_status === 'paid') {
        qb.andWhere('fee.status = :fStatus', { fStatus: FeePaymentStatus.PAID });
      } else if (query.fee_status === 'unpaid') {
        qb.andWhere('(fee.id IS NULL OR fee.status = :fStatus)', {
          fStatus: FeePaymentStatus.UNPAID,
        });
      }
    }

    qb.skip(skip).take(limit);

    const [rawStudents, total] = await qb.getManyAndCount();

    const items = rawStudents.map((std: any) => {
      const fee = std.feeRecord as StudentFee | undefined;
      const isPaid = fee?.status === FeePaymentStatus.PAID;
      const monthlyFee = Number(std.monthly_fee ?? 0);

      return {
        id: std.id,
        student_id: std.student_id,
        admission_number: std.admission_number,
        first_name: std.first_name,
        last_name: std.last_name,
        full_name: std.full_name,
        gender: std.gender,
        profile_picture: std.profile_picture,
        father_name: std.father_name,
        father_contact_number: std.father_contact_number,
        student_status: std.student_status,
        monthly_fee: monthlyFee,
        class_id: std.class_id,
        class_name: std.class?.name || '',
        class_code: std.class?.code || '',
        section_id: std.section_id,
        section_name: std.section?.name || '',
        current_fee: {
          fee_id: fee?.id || null,
          month,
          year,
          due_amount: Number(fee?.due_amount ?? monthlyFee),
          paid_amount: Number(fee?.paid_amount ?? 0),
          status: fee?.status || FeePaymentStatus.UNPAID,
          payment_date: fee?.payment_date || null,
          payment_method: fee?.payment_method || null,
          receipt_number: fee?.receipt_number || null,
          remarks: fee?.remarks || null,
        },
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      month,
      year,
    };
  }

  // 2. Fee Statistics for selected month
  async getFeeStats(monthParam?: string, yearParam?: number) {
    const { month: defaultMonth, year: defaultYear } = this.getCurrentMonthAndYear();
    const month = monthParam?.trim() || defaultMonth;
    const year = yearParam ? Number(yearParam) : defaultYear;

    // Calculate the end date of the selected billing month
    const monthIndex = MONTHS_LIST.indexOf(month);
    const validMonthIndex = monthIndex >= 0 ? monthIndex : new Date().getMonth();
    const lastDay = new Date(year, validMonthIndex + 1, 0).getDate();
    const monthPadded = String(validMonthIndex + 1).padStart(2, '0');
    const selectedMonthEnd = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;

    // Total active enrolled students for this month/year (admitted on or before this month)
    const totalStudents = await this.studentRepo
      .createQueryBuilder('std')
      .where('(std.admission_date IS NULL OR std.admission_date <= :selectedMonthEnd)', {
        selectedMonthEnd,
      })
      .getCount();

    // Total Expected Fee = Sum of all enrolled students' monthly_fee
    const expectedResult = await this.studentRepo
      .createQueryBuilder('std')
      .select('SUM(std.monthly_fee)', 'totalExpected')
      .where('(std.admission_date IS NULL OR std.admission_date <= :selectedMonthEnd)', {
        selectedMonthEnd,
      })
      .getRawOne();
    const totalExpectedFee = Number(expectedResult?.totalExpected || 0);

    // Total Collected Fee for the given month & year
    const collectedResult = await this.feeRepo
      .createQueryBuilder('fee')
      .select('SUM(fee.paid_amount)', 'totalCollected')
      .where('fee.month = :month AND fee.year = :year AND fee.status = :status', {
        month,
        year,
        status: FeePaymentStatus.PAID,
      })
      .getRawOne();
    const totalCollectedFee = Number(collectedResult?.totalCollected || 0);

    // Paid students count
    const paidStudentsCount = await this.feeRepo.count({
      where: { month, year, status: FeePaymentStatus.PAID },
    });

    const unpaidStudentsCount = Math.max(0, totalStudents - paidStudentsCount);
    const totalPendingFee = Math.max(0, totalExpectedFee - totalCollectedFee);

    return {
      month,
      year,
      totalStudents,
      totalExpectedFee,
      totalCollectedFee,
      totalPendingFee,
      paidStudentsCount,
      unpaidStudentsCount,
    };
  }

  // 3. Full 12-Month Fee Ledger for a Student
  async getStudentFeeLedger(studentId: string, yearParam?: number, sessionParam?: string) {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: { class: true, section: true },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID '${studentId}' not found.`);
    }

    const year = yearParam ? Number(yearParam) : new Date().getFullYear();
    const session = sessionParam?.trim() || student.academic_session || String(year);
    const monthlyFee = Number(student.monthly_fee ?? 0);

    // Parse student admission year & month
    let admissionYear = 0;
    let admissionMonth = 0;
    if (student.admission_date) {
      const admDate = new Date(student.admission_date);
      if (!isNaN(admDate.getTime())) {
        admissionYear = admDate.getFullYear();
        admissionMonth = admDate.getMonth() + 1; // 1 to 12
      }
    }

    // Get all fee records of this student for this year
    const existingRecords = await this.feeRepo.find({
      where: { student_id: student.id, year },
      order: { month_index: 'ASC' },
    });

    const recordMap = new Map<string, StudentFee>();
    for (const r of existingRecords) {
      recordMap.set(r.month.toLowerCase(), r);
    }

    let totalYearDue = 0;
    let totalYearPaid = 0;

    const months = MONTHS_LIST.map((monthName, idx) => {
      const monthIndex = idx + 1;
      const rec = recordMap.get(monthName.toLowerCase());

      // If the month is before student's admission date and no fee record exists
      const isBeforeAdmission =
        admissionYear > 0 &&
        (year < admissionYear || (year === admissionYear && monthIndex < admissionMonth));

      if (isBeforeAdmission && !rec) {
        return {
          month: monthName,
          month_index: monthIndex,
          year,
          academic_session: session,
          due_amount: 0,
          paid_amount: 0,
          status: 'not_enrolled',
          payment_date: null,
          payment_method: null,
          receipt_number: null,
          remarks: 'Before admission date',
          fee_id: null,
        };
      }

      const dueAmount = rec ? Number(rec.due_amount) : monthlyFee;
      const paidAmount = rec ? Number(rec.paid_amount) : 0;
      const status = rec ? rec.status : FeePaymentStatus.UNPAID;

      totalYearDue += dueAmount;
      totalYearPaid += paidAmount;

      return {
        month: monthName,
        month_index: monthIndex,
        year,
        academic_session: session,
        due_amount: dueAmount,
        paid_amount: paidAmount,
        status,
        payment_date: rec?.payment_date || null,
        payment_method: rec?.payment_method || null,
        receipt_number: rec?.receipt_number || null,
        remarks: rec?.remarks || null,
        fee_id: rec?.id || null,
      };
    });

    const totalYearPending = Math.max(0, totalYearDue - totalYearPaid);

    return {
      student: {
        id: student.id,
        student_id: student.student_id,
        admission_number: student.admission_number,
        full_name: student.full_name,
        gender: student.gender,
        monthly_fee: monthlyFee,
        class_name: student.class?.name || '',
        class_code: student.class?.code || '',
        section_name: student.section?.name || '',
        academic_session: session,
      },
      summary: {
        totalYearDue,
        totalYearPaid,
        totalYearPending,
      },
      months,
    };
  }

  // 4. Collect Fee (Mark as Paid for a specific month)
  async collectFee(dto: CollectFeeDto, userId?: string) {
    const student = await this.studentRepo.findOne({
      where: { id: dto.student_id },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID '${dto.student_id}' not found.`);
    }

    const monthIndex = MONTHS_LIST.indexOf(dto.month.trim()) + 1;
    if (monthIndex < 1) {
      throw new BadRequestException(`Invalid month name '${dto.month}'.`);
    }

    const session = dto.academic_session?.trim() || student.academic_session || String(dto.year);
    const baseDue = Number(student.monthly_fee ?? 0);
    const extraCharges = Number(dto.extra_charges || 0);
    const dueAmount = baseDue + extraCharges;
    const paidAmount = Number(dto.paid_amount);

    let fee = await this.feeRepo.findOne({
      where: {
        student_id: student.id,
        month: dto.month.trim(),
        year: Number(dto.year),
      },
    });

    const receiptNumber = fee?.receipt_number || (await this.generateReceiptNumber());
    const status = paidAmount >= dueAmount ? FeePaymentStatus.PAID : FeePaymentStatus.PARTIAL;

    // Combine remarks with extra charges explanation if provided
    let finalRemarks = dto.remarks?.trim() || '';
    if (extraCharges > 0) {
      const reason = dto.extra_charges_reason?.trim() || 'Extra / Annual Charges';
      const extraTag = `[${reason}: Rs. ${extraCharges.toLocaleString()}]`;
      finalRemarks = finalRemarks ? `${extraTag} ${finalRemarks}` : extraTag;
    }

    if (!fee) {
      fee = this.feeRepo.create({
        student_id: student.id,
        academic_session: session,
        month: dto.month.trim(),
        year: Number(dto.year),
        month_index: monthIndex,
        due_amount: dueAmount,
        paid_amount: paidAmount,
        discount: dto.discount ? Number(dto.discount) : 0,
        status,
        payment_date: dto.payment_date || new Date().toISOString().split('T')[0],
        payment_method: dto.payment_method.trim(),
        receipt_number: receiptNumber,
        remarks: finalRemarks || null,
        collected_by: userId || null,
      });
    } else {
      fee.due_amount = dueAmount;
      fee.paid_amount = paidAmount;
      fee.status = status;
      fee.payment_date = dto.payment_date || new Date().toISOString().split('T')[0];
      fee.payment_method = dto.payment_method.trim();
      fee.receipt_number = receiptNumber;
      if (dto.discount !== undefined) fee.discount = Number(dto.discount);
      fee.remarks = finalRemarks || null;
      fee.collected_by = userId || fee.collected_by;
    }

    const saved = await this.feeRepo.save(fee);
    return {
      message: `Fee of Rs. ${paidAmount} collected for ${dto.month} ${dto.year}. Receipt: ${receiptNumber}`,
      fee: saved,
    };
  }

  // 5. Revert Fee (Mark as Unpaid)
  async revertFee(feeId: string) {
    const fee = await this.feeRepo.findOne({ where: { id: feeId } });
    if (!fee) {
      throw new NotFoundException(`Fee record with ID '${feeId}' not found.`);
    }

    fee.paid_amount = 0;
    fee.status = FeePaymentStatus.UNPAID;
    fee.payment_date = null;
    fee.payment_method = null;
    fee.receipt_number = null;
    fee.remarks = null;

    await this.feeRepo.save(fee);
    return {
      message: `Fee record for ${fee.month} ${fee.year} reverted to Unpaid.`,
    };
  }

  // 6. List Created Fee Vouchers for selected month & year
  async getFeeVouchers(
    month?: string,
    year?: number,
    classId?: string,
    sectionId?: string,
    search?: string,
  ) {
    const { month: defaultMonth, year: defaultYear } = this.getCurrentMonthAndYear();
    const targetMonth = month?.trim() || defaultMonth;
    const targetYear = year ? Number(year) : defaultYear;

    const qb = this.voucherRepo
      .createQueryBuilder('v')
      .where('v.billing_month = :targetMonth AND v.billing_year = :targetYear', {
        targetMonth,
        targetYear,
      });

    if (classId && classId !== 'all') {
      qb.andWhere('v.class_id = :classId', { classId });
    }
    if (sectionId && sectionId !== 'all') {
      qb.andWhere('v.section_id = :sectionId', { sectionId });
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        "(v.voucher_number ILIKE :term OR v.student_data->>'full_name' ILIKE :term OR v.student_data->>'student_id' ILIKE :term OR v.student_data->>'father_name' ILIKE :term)",
        { term },
      );
    }

    qb.orderBy('v.created_at', 'DESC');
    const records = await qb.getMany();

    return records.map((v) => ({
      id: v.id,
      voucher_number: v.voucher_number,
      billing_month: v.billing_month,
      billing_year: v.billing_year,
      issue_date: v.issue_date,
      due_date: v.due_date,
      late_fee: Number(v.late_fee),
      tuition_fee: Number(v.tuition_fee),
      arrears: Number(v.arrears),
      custom_heads: v.custom_heads || [],
      total_within_due: Number(v.total_within_due),
      total_after_due: Number(v.total_after_due),
      student: v.student_data,
      bank_info: v.bank_info,
    }));
  }

  // 7. Generate & Save 3-Copy Fee Vouchers (Single or Class/Section Bulk)
  async generateFeeVouchers(dto: GenerateVouchersDto) {
    const qb = this.studentRepo
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.class', 'class')
      .leftJoinAndSelect('student.section', 'section')
      .where('student.student_status = :status', { status: StudentStatus.ACTIVE });

    if (dto.student_id) {
      qb.andWhere('student.id = :studentId', { studentId: dto.student_id });
    } else {
      if (dto.class_id && dto.class_id !== 'all') {
        qb.andWhere('student.class_id = :classId', { classId: dto.class_id });
      }
      if (dto.section_id && dto.section_id !== 'all') {
        qb.andWhere('student.section_id = :sectionId', { sectionId: dto.section_id });
      }
    }

    qb.orderBy('class.code', 'ASC')
      .addOrderBy('section.name', 'ASC')
      .addOrderBy('student.student_id', 'ASC');

    const targetMonthIndex = MONTHS_LIST.indexOf(dto.month) + 1;
    const targetYear = Number(dto.year);
    const lateFee = Number(dto.late_fee ?? 100);

    // Only generate vouchers for students admitted on or before this billing month
    const lastDayOfMonth = new Date(targetYear, targetMonthIndex, 0).getDate();
    const selectedMonthEnd = `${targetYear}-${String(targetMonthIndex).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
    qb.andWhere('(student.admission_date IS NULL OR student.admission_date <= :selectedMonthEnd)', {
      selectedMonthEnd,
    });

    const students = await qb.getMany();
    if (students.length === 0) {
      return [];
    }

    const savedVouchers = await Promise.all(
      students.map(async (st, idx) => {
        const tuitionFee = Number(st.monthly_fee ?? 2500);

        // Calculate arrears: all unpaid balances prior to this billing month
        const priorUnpaid = await this.feeRepo
          .createQueryBuilder('f')
          .where('f.student_id = :stId', { stId: st.id })
          .andWhere(
            '(f.year < :year OR (f.year = :year AND f.month_index < :mIndex))',
            { year: targetYear, mIndex: targetMonthIndex },
          )
          .andWhere('f.status != :paidStatus', {
            paidStatus: FeePaymentStatus.PAID,
          })
          .select('COALESCE(SUM(f.due_amount - f.paid_amount), 0)', 'total')
          .getRawOne();

        const arrears = Number(priorUnpaid?.total || 0);

        // Custom extra heads (Exam Fee, Annual Charges, etc.)
        const customHeads = (dto.custom_heads || []).map((h) => ({
          title: h.title,
          amount: Number(h.amount),
        }));
        const customSum = customHeads.reduce((acc, h) => acc + h.amount, 0);

        const totalWithinDue = tuitionFee + arrears + customSum;
        const totalAfterDue = totalWithinDue + lateFee;

        // Check if voucher already exists for this student, month and year
        let existingVoucher = await this.voucherRepo.findOne({
          where: {
            student_id: st.id,
            billing_month: dto.month.trim(),
            billing_year: targetYear,
          },
        });

        // Unique voucher number: VCH-YYYYMM-XXXX
        const monthPadded = String(targetMonthIndex).padStart(2, '0');
        const seq = String(idx + 1).padStart(4, '0');
        const voucherNumber =
          existingVoucher?.voucher_number ||
          `VCH-${targetYear}${monthPadded}-${seq}-${Date.now().toString().slice(-4)}`;

        const studentData = {
          id: st.id,
          student_id: st.student_id,
          admission_number: st.admission_number,
          full_name: st.full_name,
          father_name: st.father_name,
          class_id: st.class_id,
          class_name: st.class?.name || 'Class',
          class_code: st.class?.code || '',
          section_id: st.section_id || null,
          section_name: st.section?.name || 'A',
          emergency_contact: st.father_contact_number || st.emergency_contact_number || '',
        };

        const bankInfo = {
          bank_name: dto.bank_name || 'School Accounts / Allied Bank',
          account_title: dto.account_title || 'School Official Account',
          account_no: dto.account_no || '1122-3344-5566-77',
          branch_note: dto.branch_note || 'Main Branch / Accounts Department',
        };

        if (!existingVoucher) {
          existingVoucher = this.voucherRepo.create({
            school_id: (st as any).school_id || null,
            voucher_number: voucherNumber,
            billing_month: dto.month.trim(),
            billing_year: targetYear,
            student_id: st.id,
            class_id: st.class_id || null,
            section_id: st.section_id || null,
            issue_date: dto.issue_date,
            due_date: dto.due_date,
            late_fee: lateFee,
            tuition_fee: tuitionFee,
            arrears,
            custom_heads: customHeads,
            total_within_due: totalWithinDue,
            total_after_due: totalAfterDue,
            student_data: studentData,
            bank_info: bankInfo,
          });
        } else {
          existingVoucher.issue_date = dto.issue_date;
          existingVoucher.due_date = dto.due_date;
          existingVoucher.late_fee = lateFee;
          existingVoucher.tuition_fee = tuitionFee;
          existingVoucher.arrears = arrears;
          existingVoucher.custom_heads = customHeads;
          existingVoucher.total_within_due = totalWithinDue;
          existingVoucher.total_after_due = totalAfterDue;
          existingVoucher.student_data = studentData;
          existingVoucher.bank_info = bankInfo;
        }

        const saved = await this.voucherRepo.save(existingVoucher);

        return {
          id: saved.id,
          voucher_number: saved.voucher_number,
          billing_month: saved.billing_month,
          billing_year: saved.billing_year,
          issue_date: saved.issue_date,
          due_date: saved.due_date,
          late_fee: Number(saved.late_fee),
          tuition_fee: Number(saved.tuition_fee),
          arrears: Number(saved.arrears),
          custom_heads: saved.custom_heads,
          total_within_due: Number(saved.total_within_due),
          total_after_due: Number(saved.total_after_due),
          student: saved.student_data,
          bank_info: saved.bank_info,
        };
      }),
    );

    return savedVouchers;
  }

  // 8. Delete Fee Voucher (Hard Delete)
  async deleteFeeVoucher(studentId?: string, month?: string, year?: number, voucherId?: string) {
    if (voucherId) {
      await this.voucherRepo.delete({ id: voucherId });
      return { message: 'Fee voucher permanently deleted.' };
    }

    if (studentId && month && year) {
      await this.voucherRepo.delete({
        student_id: studentId,
        billing_month: month.trim(),
        billing_year: Number(year),
      });
      return { message: 'Fee voucher permanently deleted.' };
    }

    return { message: 'Fee voucher deleted.' };
  }
}
