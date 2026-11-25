import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from '../students/entities/student.entity.js';
import { Teacher, EmploymentStatus } from '../teachers/entities/teacher.entity.js';
import { Staff, StaffEmploymentStatus } from '../staff/entities/staff.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { StudentFee, FeePaymentStatus } from '../fees/entities/student-fee.entity.js';
import { Expense } from '../expenses/entities/expense.entity.js';
import { Payslip, PayslipStatus } from '../payroll/entities/payslip.entity.js';
import { QueryDashboardDto } from './dto/query-dashboard.dto.js';

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
export class DashboardService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(StudentFee)
    private readonly feeRepo: Repository<StudentFee>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Payslip)
    private readonly payslipRepo: Repository<Payslip>,
  ) {}

  async getDashboardOverview(query: QueryDashboardDto) {
    const now = new Date();
    const currentMonthIndex = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();

    // 1. Resolve target month and year
    let targetMonth = query.month?.trim() || MONTHS_LIST[currentMonthIndex];
    let targetYear = query.year ? Number(query.year) : currentYear;
    const period = query.period || 'current_month';

    if (period === 'last_month') {
      const prevMonthIdx = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
      targetMonth = MONTHS_LIST[prevMonthIdx];
      targetYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;
    }

    const targetMonthIdx = MONTHS_LIST.indexOf(targetMonth) + 1;

    // ---------------- A. CORE ENTITY HEADCOUNTS ----------------
    const totalStudents = await this.studentRepo.count();
    const activeStudents = await this.studentRepo.count({
      where: { student_status: StudentStatus.ACTIVE },
    });
    const inactiveStudents = totalStudents - activeStudents;

    const totalTeachers = await this.teacherRepo.count();
    const activeTeachers = await this.teacherRepo.count({
      where: { employment_status: EmploymentStatus.ACTIVE },
    });

    const totalStaff = await this.staffRepo.count();
    const activeStaff = await this.staffRepo.count({
      where: { employment_status: StaffEmploymentStatus.ACTIVE },
    });

    const totalClasses = await this.classRepo.count();

    // ---------------- B. FINANCIAL METRICS (PERIOD & LIFETIME) ----------------
    // Fee Collected Period
    const feePeriodRaw = await this.feeRepo
      .createQueryBuilder('f')
      .where('f.month = :month AND f.year = :year AND f.status = :status', {
        month: targetMonth,
        year: targetYear,
        status: FeePaymentStatus.PAID,
      })
      .select('COALESCE(SUM(f.paid_amount), 0)', 'total')
      .addSelect('COUNT(f.id)', 'count')
      .getRawOne();
    const feeCollectedPeriod = Number(feePeriodRaw?.total || 0);

    // Fee Collected Lifetime
    const feeLifetimeRaw = await this.feeRepo
      .createQueryBuilder('f')
      .where('f.status = :status', { status: FeePaymentStatus.PAID })
      .select('COALESCE(SUM(f.paid_amount), 0)', 'total')
      .getRawOne();
    const feeCollectedLifetime = Number(feeLifetimeRaw?.total || 0);

    // Fee Pending Period
    const feePendingPeriodRaw = await this.feeRepo
      .createQueryBuilder('f')
      .where('f.month = :month AND f.year = :year AND f.status = :status', {
        month: targetMonth,
        year: targetYear,
        status: FeePaymentStatus.UNPAID,
      })
      .select('COALESCE(SUM(f.due_amount - f.paid_amount), 0)', 'total')
      .addSelect('COUNT(f.id)', 'count')
      .getRawOne();
    const feePendingPeriod = Number(feePendingPeriodRaw?.total || 0);

    // Fee Pending Lifetime (All Unpaid)
    const feePendingLifetimeRaw = await this.feeRepo
      .createQueryBuilder('f')
      .where('f.status = :status', { status: FeePaymentStatus.UNPAID })
      .select('COALESCE(SUM(f.due_amount - f.paid_amount), 0)', 'total')
      .getRawOne();
    const feePendingLifetime = Number(feePendingLifetimeRaw?.total || 0);

    // Expenses Period (General Expenses)
    const expPeriodRaw = await this.expenseRepo
      .createQueryBuilder('e')
      .where(
        'EXTRACT(MONTH FROM e.expense_date) = :m AND EXTRACT(YEAR FROM e.expense_date) = :y',
        { m: targetMonthIdx, y: targetYear },
      )
      .select('COALESCE(SUM(e.amount), 0)', 'total')
      .getRawOne();
    const expensesPeriod = Number(expPeriodRaw?.total || 0);

    // Expenses Lifetime
    const expLifetimeRaw = await this.expenseRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'total')
      .getRawOne();
    const expensesLifetime = Number(expLifetimeRaw?.total || 0);

    // Payroll Paid Period (Teacher Net Salaries Paid)
    const payrollPeriodRaw = await this.payslipRepo
      .createQueryBuilder('p')
      .where(
        'p.payroll_month = :month AND p.payroll_year = :year AND p.payment_status = :status',
        {
          month: targetMonth,
          year: targetYear,
          status: PayslipStatus.PAID,
        },
      )
      .select('COALESCE(SUM(p.net_salary), 0)', 'total')
      .getRawOne();
    const payrollPaidPeriod = Number(payrollPeriodRaw?.total || 0);

    // Payroll Paid Lifetime
    const payrollLifetimeRaw = await this.payslipRepo
      .createQueryBuilder('p')
      .where('p.payment_status = :status', { status: PayslipStatus.PAID })
      .select('COALESCE(SUM(p.net_salary), 0)', 'total')
      .getRawOne();
    const payrollPaidLifetime = Number(payrollLifetimeRaw?.total || 0);

    // Total Outgoing & Net Cash Balance Period
    const totalOutgoingPeriod = expensesPeriod + payrollPaidPeriod;
    const netBalancePeriod = feeCollectedPeriod - totalOutgoingPeriod;

    // ---------------- C. 12-MONTH INCOME VS EXPENSES CHART ----------------
    const incomeVsExpenses: Array<{
      month: string;
      month_short: string;
      month_index: number;
      income: number;
      expenses: number;
      general_expenses: number;
      payroll_paid: number;
      net: number;
    }> = [];

    for (let i = 1; i <= 12; i++) {
      const mName = MONTHS_LIST[i - 1];

      // Monthly fee collection
      const mFee = await this.feeRepo
        .createQueryBuilder('f')
        .where('f.month = :m AND f.year = :y AND f.status = :s', {
          m: mName,
          y: targetYear,
          s: FeePaymentStatus.PAID,
        })
        .select('COALESCE(SUM(f.paid_amount), 0)', 'val')
        .getRawOne();

      // Monthly general expenses
      const mExp = await this.expenseRepo
        .createQueryBuilder('e')
        .where(
          'EXTRACT(MONTH FROM e.expense_date) = :m AND EXTRACT(YEAR FROM e.expense_date) = :y',
          { m: i, y: targetYear },
        )
        .select('COALESCE(SUM(e.amount), 0)', 'val')
        .getRawOne();

      // Monthly paid payroll
      const mPay = await this.payslipRepo
        .createQueryBuilder('p')
        .where(
          'p.payroll_month = :m AND p.payroll_year = :y AND p.payment_status = :s',
          { m: mName, y: targetYear, s: PayslipStatus.PAID },
        )
        .select('COALESCE(SUM(p.net_salary), 0)', 'val')
        .getRawOne();

      const inc = Number(mFee?.val || 0);
      const gExp = Number(mExp?.val || 0);
      const pPay = Number(mPay?.val || 0);
      const totalExp = gExp + pPay;

      incomeVsExpenses.push({
        month: mName,
        month_short: mName.substring(0, 3),
        month_index: i,
        income: inc,
        expenses: totalExp,
        general_expenses: gExp,
        payroll_paid: pPay,
        net: inc - totalExp,
      });
    }

    // ---------------- D. FEE STATUS DISTRIBUTION (DONUT) ----------------
    const totalDuePeriod = feeCollectedPeriod + feePendingPeriod;
    const paidPercentage =
      totalDuePeriod > 0
        ? Math.round((feeCollectedPeriod / totalDuePeriod) * 100)
        : 0;
    const pendingPercentage = 100 - paidPercentage;

    const feeStatusDistribution = [
      {
        name: 'Paid Fees',
        nameUr: 'وصول شدہ فیس',
        amount: feeCollectedPeriod,
        count: Number(feePeriodRaw?.count || 0),
        percentage: paidPercentage,
        color: '#10b981', // emerald-500
      },
      {
        name: 'Pending Fees',
        nameUr: 'بقایا فیس',
        amount: feePendingPeriod,
        count: Number(feePendingPeriodRaw?.count || 0),
        percentage: pendingPercentage,
        color: '#f59e0b', // amber-500
      },
    ];

    // ---------------- E. STUDENT DISTRIBUTION BY CLASS ----------------
    const classDistributionRaw = await this.classRepo
      .createQueryBuilder('c')
      .leftJoin(
        'students',
        's',
        's.class_id = c.id AND s.student_status = :activeStatus',
        { activeStatus: StudentStatus.ACTIVE },
      )
      .select([
        'c.id AS class_id',
        'c.name AS class_name',
        'c.code AS class_code',
        'COUNT(s.id)::int AS student_count',
      ])
      .groupBy('c.id, c.name, c.code, c.display_order')
      .orderBy('c.display_order', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .getRawMany();

    const totalActiveForDistribution = classDistributionRaw.reduce(
      (acc, c) => acc + Number(c.student_count || 0),
      0,
    );

    const studentsByClass = classDistributionRaw.map((cls) => {
      const count = Number(cls.student_count || 0);
      const percentage =
        totalActiveForDistribution > 0
          ? Math.round((count / totalActiveForDistribution) * 100)
          : 0;
      return {
        class_id: cls.class_id,
        class_name: cls.class_name,
        class_code: cls.class_code,
        count,
        percentage,
      };
    });

    // ---------------- F. STUDENT ENROLLMENT TREND (LINE CHART) ----------------
    const admissionsRaw = await this.studentRepo
      .createQueryBuilder('s')
      .where('EXTRACT(YEAR FROM s.admission_date) = :year', { year: targetYear })
      .select([
        'EXTRACT(MONTH FROM s.admission_date)::int AS month_index',
        'COUNT(s.id)::int AS count',
      ])
      .groupBy('EXTRACT(MONTH FROM s.admission_date)')
      .orderBy('month_index', 'ASC')
      .getRawMany();

    const admissionMap = new Map<number, number>();
    for (const a of admissionsRaw) {
      admissionMap.set(Number(a.month_index), Number(a.count));
    }

    const enrollmentTrend = MONTHS_LIST.map((mName, idx) => ({
      month: mName,
      month_short: mName.substring(0, 3),
      month_index: idx + 1,
      count: admissionMap.get(idx + 1) || 0,
    }));

    // ---------------- G. RECENT FEE PAYMENTS ----------------
    const recentPaymentsRaw = await this.feeRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.student', 'st')
      .leftJoinAndSelect('st.class', 'c')
      .leftJoinAndSelect('st.section', 'sec')
      .where('f.status = :status', { status: FeePaymentStatus.PAID })
      .orderBy('f.payment_date', 'DESC')
      .addOrderBy('f.updated_at', 'DESC')
      .limit(6)
      .getMany();

    const recentFeePayments = recentPaymentsRaw.map((p) => ({
      id: p.id,
      student_id: p.student?.student_id || '',
      admission_number: p.student?.admission_number || '',
      student_name: p.student?.full_name || 'Student',
      class_name: p.student?.class?.name || 'Class',
      section_name: p.student?.section?.name || 'A',
      amount_paid: Number(p.paid_amount || 0),
      payment_date: p.payment_date || '',
      payment_method: p.payment_method || 'Cash',
      receipt_number: p.receipt_number || '',
      month: p.month,
      year: p.year,
      status: p.status,
    }));

    return {
      period_info: {
        selected_month: targetMonth,
        selected_year: targetYear,
        selected_period: period,
        label: `${targetMonth} ${targetYear}`,
      },
      summary: {
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: inactiveStudents,
        },
        teachers: {
          total: totalTeachers,
          active: activeTeachers,
        },
        staff: {
          total: totalStaff,
          active: activeStaff,
        },
        classes: {
          total: totalClasses,
        },
        finances: {
          fee_collected_period: feeCollectedPeriod,
          fee_collected_lifetime: feeCollectedLifetime,
          fee_pending_period: feePendingPeriod,
          fee_pending_lifetime: feePendingLifetime,
          expenses_period: expensesPeriod,
          expenses_lifetime: expensesLifetime,
          payroll_paid_period: payrollPaidPeriod,
          payroll_paid_lifetime: payrollPaidLifetime,
          total_outgoing_period: totalOutgoingPeriod,
          net_balance_period: netBalancePeriod,
        },
      },
      income_vs_expenses: incomeVsExpenses,
      fee_status_distribution: feeStatusDistribution,
      students_by_class: studentsByClass,
      enrollment_trend: enrollmentTrend,
      recent_fee_payments: recentFeePayments,
    };
  }
}
