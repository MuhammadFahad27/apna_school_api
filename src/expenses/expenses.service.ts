import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CategoryStatus,
  ExpenseCategory,
} from './entities/expense-category.entity.js';
import {
  Expense,
  ExpensePaymentMethod,
} from './entities/expense.entity.js';
import { StudentFee, FeePaymentStatus } from '../fees/entities/student-fee.entity.js';
import { Payslip, PayslipStatus } from '../payroll/entities/payslip.entity.js';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto.js';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { QueryExpensesDto } from './dto/query-expenses.dto.js';

const DEFAULT_CATEGORIES = [
  'Electricity Bill (بجلی کا بل)',
  'Sui Gas Bill (سوئی گیس کا بل)',
  'Water & Tanker Supply (پانی و ٹینکر)',
  'Generator & Diesel Fuel (جنریٹر و ایندھن)',
  'Building Rent (عمارت کا کرایہ)',
  'Internet & Telephone (انٹرنیٹ و ٹیلیفون)',
  'Stationery & Printing (اسٹیشنری و پرنٹنگ)',
  'Exam Papers & Photocopy (امتحانی پیپرز و فوٹو کاپی)',
  'Repair & Maintenance (مرمت و دیکھ بھال)',
  'Cleaning & Janitorial Supplies (صفائی ستھرائی)',
  'Tea & Refreshment (چائے و ریفریشمنٹ)',
  'School Events & Functions (تقریبات و فنکشنز)',
  'Sports Goods & Equipment (کھیلوں کا سامان)',
  'Science Lab & IT Equipment (سائنس لیب و کمپیوٹر)',
  'Van Fuel & Transport (ٹرانسپورٹ و وین)',
  'Advertising & Marketing (اشتہارات و تشہیر)',
  'First Aid & Medical (طبی سامان)',
  'Furniture & Fixtures (فرنیچر و فکسچرز)',
  'Miscellaneous (متفرق اخراجات)',
];

@Injectable()
export class ExpensesService implements OnModuleInit {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
    @InjectRepository(StudentFee)
    private readonly feeRepo: Repository<StudentFee>,
    @InjectRepository(Payslip)
    private readonly payslipRepo: Repository<Payslip>,
  ) {}

  async onModuleInit() {
    try {
      const existing = await this.categoryRepo.find();
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase().trim()));

      for (const name of DEFAULT_CATEGORIES) {
        const simpleName = name.split(' (')[0].toLowerCase().trim();
        const hasExisting = Array.from(existingNames).some(
          (en) => en.includes(simpleName) || simpleName.includes(en),
        );
        if (!hasExisting) {
          const cat = this.categoryRepo.create({
            name,
            description: `Default category for ${name}`,
            status: CategoryStatus.ACTIVE,
          });
          await this.categoryRepo.save(cat);
        }
      }
    } catch {
      // If table not created yet, migration will run
    }
  }

  // ---------------- CATEGORIES CRUD ----------------
  async getCategories(includeInactive = true) {
    const qb = this.categoryRepo
      .createQueryBuilder('cat')
      .leftJoin('cat.expenses', 'exp')
      .select([
        'cat.id AS id',
        'cat.name AS name',
        'cat.description AS description',
        'cat.status AS status',
        'cat.created_at AS created_at',
        'COUNT(exp.id)::int AS expense_count',
        'COALESCE(SUM(exp.amount), 0)::float AS total_spent',
      ])
      .groupBy('cat.id');

    if (!includeInactive) {
      qb.where('cat.status = :status', { status: CategoryStatus.ACTIVE });
    }

    qb.orderBy('cat.name', 'ASC');
    return qb.getRawMany();
  }

  async createCategory(dto: CreateExpenseCategoryDto) {
    const trimmed = dto.name.trim();
    const existing = await this.categoryRepo
      .createQueryBuilder('cat')
      .where('LOWER(cat.name) = LOWER(:name)', { name: trimmed })
      .getOne();

    if (existing) {
      throw new ConflictException(`Category "${trimmed}" already exists.`);
    }

    const cat = this.categoryRepo.create({
      name: trimmed,
      description: dto.description?.trim() || null,
      status: dto.status || CategoryStatus.ACTIVE,
    });

    return this.categoryRepo.save(cat);
  }

  async updateCategory(id: string, dto: UpdateExpenseCategoryDto) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) {
      throw new NotFoundException(`Expense category with ID "${id}" was not found.`);
    }

    if (dto.name && dto.name.trim().toLowerCase() !== cat.name.toLowerCase()) {
      const existing = await this.categoryRepo
        .createQueryBuilder('c')
        .where('LOWER(c.name) = LOWER(:name) AND c.id != :id', {
          name: dto.name.trim(),
          id,
        })
        .getOne();

      if (existing) {
        throw new ConflictException(`Category "${dto.name.trim()}" already exists.`);
      }
      cat.name = dto.name.trim();
    }

    if (dto.description !== undefined) cat.description = dto.description?.trim() || null;
    if (dto.status !== undefined) cat.status = dto.status;

    return this.categoryRepo.save(cat);
  }

  async deleteCategory(id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) {
      throw new NotFoundException(`Expense category with ID "${id}" was not found.`);
    }

    const linkedCount = await this.expenseRepo.count({
      where: { category_id: id },
    });
    if (linkedCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${cat.name}" because it is linked to ${linkedCount} expense record(s). You can deactivate it instead.`,
      );
    }

    await this.categoryRepo.remove(cat);
    return {
      success: true,
      message: `Category "${cat.name}" deleted successfully.`,
    };
  }

  // ---------------- EXPENSES CRUD ----------------
  private async generateExpenseNumber(): Promise<string> {
    const count = await this.expenseRepo.count();
    let expNum = `EXP_${String(count + 1).padStart(4, '0')}`;
    let exists = await this.expenseRepo.findOne({ where: { expense_number: expNum } });
    let offset = 1;
    while (exists) {
      expNum = `EXP_${String(count + 1 + offset).padStart(4, '0')}`;
      exists = await this.expenseRepo.findOne({ where: { expense_number: expNum } });
      offset++;
    }
    return expNum;
  }

  async createExpense(dto: CreateExpenseDto, userId?: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: dto.category_id },
    });
    if (!category) {
      throw new NotFoundException(`Expense category not found.`);
    }
    if (category.status !== CategoryStatus.ACTIVE) {
      throw new BadRequestException(
        `Category "${category.name}" is inactive. Please choose an active category.`,
      );
    }

    if (!dto.amount || Number(dto.amount) <= 0) {
      throw new BadRequestException('Expense amount must be greater than zero.');
    }

    const expenseNumber = await this.generateExpenseNumber();

    const expense = this.expenseRepo.create({
      expense_number: expenseNumber,
      title: dto.title.trim(),
      category_id: dto.category_id,
      amount: Number(dto.amount),
      expense_date: dto.expense_date,
      payment_method: dto.payment_method || ExpensePaymentMethod.CASH,
      vendor_name: dto.vendor_name?.trim() || null,
      description: dto.description?.trim() || null,
      receipt_url: dto.receipt_url?.trim() || null,
      created_by: userId || null,
    });

    const saved = await this.expenseRepo.save(expense);
    return this.findOneExpense(saved.id);
  }

  async findAllExpenses(query: QueryExpensesDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const qb = this.expenseRepo
      .createQueryBuilder('exp')
      .leftJoinAndSelect('exp.category', 'cat');

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(exp.title ILIKE :term OR exp.vendor_name ILIKE :term OR exp.expense_number ILIKE :term OR cat.name ILIKE :term)',
        { term },
      );
    }

    if (query.category_id && query.category_id !== 'all') {
      qb.andWhere('exp.category_id = :catId', { catId: query.category_id });
    }

    if (query.payment_method && query.payment_method !== 'all') {
      qb.andWhere('exp.payment_method = :pm', { pm: query.payment_method });
    }

    if (query.start_date) {
      qb.andWhere('exp.expense_date >= :start_date', { start_date: query.start_date });
    }

    if (query.end_date) {
      qb.andWhere('exp.expense_date <= :end_date', { end_date: query.end_date });
    }

    if (query.month) {
      qb.andWhere('EXTRACT(MONTH FROM exp.expense_date) = :month', { month: query.month });
    }

    if (query.year) {
      qb.andWhere('EXTRACT(YEAR FROM exp.expense_date) = :year', { year: query.year });
    }

    qb.orderBy('exp.expense_date', 'DESC')
      .addOrderBy('exp.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOneExpense(id: string) {
    const expense = await this.expenseRepo.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${id}" was not found.`);
    }

    return expense;
  }

  async updateExpense(id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOneExpense(id);

    if (dto.category_id && dto.category_id !== expense.category_id) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.category_id },
      });
      if (!category) {
        throw new NotFoundException(`Selected expense category not found.`);
      }
      if (category.status !== CategoryStatus.ACTIVE) {
        throw new BadRequestException(
          `Category "${category.name}" is inactive. Please choose an active category.`,
        );
      }
      expense.category_id = dto.category_id;
    }

    if (dto.title !== undefined) expense.title = dto.title.trim();
    if (dto.amount !== undefined) {
      if (Number(dto.amount) <= 0) {
        throw new BadRequestException('Expense amount must be greater than zero.');
      }
      expense.amount = Number(dto.amount);
    }
    if (dto.expense_date !== undefined) expense.expense_date = dto.expense_date;
    if (dto.payment_method !== undefined) expense.payment_method = dto.payment_method;
    if (dto.vendor_name !== undefined) expense.vendor_name = dto.vendor_name?.trim() || null;
    if (dto.description !== undefined) expense.description = dto.description?.trim() || null;
    if (dto.receipt_url !== undefined) expense.receipt_url = dto.receipt_url?.trim() || null;

    await this.expenseRepo.save(expense);
    return this.findOneExpense(id);
  }

  async deleteExpense(id: string) {
    const expense = await this.findOneExpense(id);
    await this.expenseRepo.remove(expense);
    return {
      success: true,
      message: `Expense "${expense.title}" (${expense.expense_number}) deleted successfully.`,
    };
  }

  // ---------------- DASHBOARD STATS ----------------
  async getStats(month?: number, year?: number) {
    const now = new Date();
    const curMonth = month || now.getMonth() + 1;
    const curYear = year || now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];

    // Total expenses all time
    const totalRaw = await this.expenseRepo
      .createQueryBuilder('exp')
      .select('COALESCE(SUM(exp.amount), 0)', 'total')
      .addSelect('COUNT(exp.id)', 'count')
      .getRawOne();

    // This month expenses
    const thisMonthRaw = await this.expenseRepo
      .createQueryBuilder('exp')
      .select('COALESCE(SUM(exp.amount), 0)', 'total')
      .where('EXTRACT(MONTH FROM exp.expense_date) = :month', { month: curMonth })
      .andWhere('EXTRACT(YEAR FROM exp.expense_date) = :year', { year: curYear })
      .getRawOne();

    // Today expenses
    const todayRaw = await this.expenseRepo
      .createQueryBuilder('exp')
      .select('COALESCE(SUM(exp.amount), 0)', 'total')
      .where('exp.expense_date = :today', { today: todayStr })
      .getRawOne();

    // Monthly Trend (Past 6 months)
    const monthlyTrend = await this.expenseRepo
      .createQueryBuilder('exp')
      .select([
        "TO_CHAR(exp.expense_date, 'Mon YYYY') AS period",
        'EXTRACT(YEAR FROM exp.expense_date)::int AS year',
        'EXTRACT(MONTH FROM exp.expense_date)::int AS month',
        'COALESCE(SUM(exp.amount), 0)::float AS amount',
        'COUNT(exp.id)::int AS count',
      ])
      .groupBy("TO_CHAR(exp.expense_date, 'Mon YYYY'), EXTRACT(YEAR FROM exp.expense_date), EXTRACT(MONTH FROM exp.expense_date)")
      .orderBy('year', 'DESC')
      .addOrderBy('month', 'DESC')
      .limit(6)
      .getRawMany();

    // Category breakdown
    const categoryBreakdown = await this.expenseRepo
      .createQueryBuilder('exp')
      .innerJoin('exp.category', 'cat')
      .select([
        'cat.id AS category_id',
        'cat.name AS category_name',
        'COALESCE(SUM(exp.amount), 0)::float AS amount',
        'COUNT(exp.id)::int AS count',
      ])
      .groupBy('cat.id, cat.name')
      .orderBy('amount', 'DESC')
      .limit(8)
      .getRawMany();

    return {
      total_expenses: Number(totalRaw?.total || 0),
      total_records: Number(totalRaw?.count || 0),
      this_month_expenses: Number(thisMonthRaw?.total || 0),
      today_expenses: Number(todayRaw?.total || 0),
      selected_month: curMonth,
      selected_year: curYear,
      monthly_trend: monthlyTrend.reverse(),
      category_breakdown: categoryBreakdown,
    };
  }

  // ---------------- FINANCIAL SUMMARY ----------------
  async getFinancialSummary(year?: number) {
    const selectedYear = Number(year) || new Date().getFullYear();

    // 1. Total fee collections (Actual Income) for selected year
    const feeCollectedRaw = await this.feeRepo
      .createQueryBuilder('fee')
      .select('COALESCE(SUM(fee.paid_amount), 0)', 'total_fee')
      .where('fee.status = :status AND fee.year = :year', {
        status: FeePaymentStatus.PAID,
        year: selectedYear,
      })
      .getRawOne();
    const totalFeeIncome = Number(feeCollectedRaw?.total_fee || 0);

    // Unpaid fee receivables for selected year
    const feeUnpaidRaw = await this.feeRepo
      .createQueryBuilder('fee')
      .select('COALESCE(SUM(fee.due_amount - fee.paid_amount), 0)', 'unpaid_fee')
      .where('fee.status = :status AND fee.year = :year', {
        status: FeePaymentStatus.UNPAID,
        year: selectedYear,
      })
      .getRawOne();
    const unpaidFeeReceivables = Number(feeUnpaidRaw?.unpaid_fee || 0);

    // 2. Total general expenses for selected year
    const expRaw = await this.expenseRepo
      .createQueryBuilder('exp')
      .select('COALESCE(SUM(exp.amount), 0)', 'total_exp')
      .where('EXTRACT(YEAR FROM exp.expense_date) = :year', { year: selectedYear })
      .getRawOne();
    const totalGeneralExpenses = Number(expRaw?.total_exp || 0);

    // 3. Total paid payroll for selected year
    const paidPayrollRaw = await this.payslipRepo
      .createQueryBuilder('psl')
      .select('COALESCE(SUM(psl.net_salary), 0)', 'total_payroll_paid')
      .where('psl.payment_status = :status AND psl.payroll_year = :year', {
        status: PayslipStatus.PAID,
        year: selectedYear,
      })
      .getRawOne();
    const totalPayrollPaid = Number(paidPayrollRaw?.total_payroll_paid || 0);

    // 4. Unpaid payroll liabilities for selected year
    const unpaidPayrollRaw = await this.payslipRepo
      .createQueryBuilder('psl')
      .select('COALESCE(SUM(psl.net_salary), 0)', 'unpaid_payroll')
      .where('psl.payment_status = :status AND psl.payroll_year = :year', {
        status: PayslipStatus.UNPAID,
        year: selectedYear,
      })
      .getRawOne();
    const unpaidPayrollLiabilities = Number(unpaidPayrollRaw?.unpaid_payroll || 0);

    // 5. Total Outgoing & Net Cash Balance
    const totalOutgoing = totalGeneralExpenses + totalPayrollPaid;
    const netCashBalance = totalFeeIncome - totalOutgoing;

    // 6. Monthly Cash Flow (Selected Year)
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const monthlyCashFlow: Array<{
      month: string;
      month_index: number;
      fee_income: number;
      general_expenses: number;
      payroll_paid: number;
      total_outgoing: number;
      net_balance: number;
    }> = [];

    for (let i = 1; i <= 12; i++) {
      const monthName = months[i - 1];

      // Monthly fee
      const mFee = await this.feeRepo
        .createQueryBuilder('f')
        .select('COALESCE(SUM(f.paid_amount), 0)', 'val')
        .where('f.month = :m AND f.year = :y AND f.status = :s', {
          m: monthName,
          y: selectedYear,
          s: FeePaymentStatus.PAID,
        })
        .getRawOne();

      // Monthly general expenses
      const mExp = await this.expenseRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount), 0)', 'val')
        .where('EXTRACT(MONTH FROM e.expense_date) = :m AND EXTRACT(YEAR FROM e.expense_date) = :y', {
          m: i,
          y: selectedYear,
        })
        .getRawOne();

      // Monthly paid payroll
      const mPay = await this.payslipRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.net_salary), 0)', 'val')
        .where('p.payroll_month = :m AND p.payroll_year = :y AND p.payment_status = :s', {
          m: monthName,
          y: selectedYear,
          s: PayslipStatus.PAID,
        })
        .getRawOne();

      const feeInc = Number(mFee?.val || 0);
      const expOut = Number(mExp?.val || 0);
      const payOut = Number(mPay?.val || 0);
      const outTotal = expOut + payOut;

      monthlyCashFlow.push({
        month: monthName,
        month_index: i,
        fee_income: feeInc,
        general_expenses: expOut,
        payroll_paid: payOut,
        total_outgoing: outTotal,
        net_balance: feeInc - outTotal,
      });
    }

    return {
      year: selectedYear,
      total_fee_income: totalFeeIncome,
      total_general_expenses: totalGeneralExpenses,
      total_payroll_paid: totalPayrollPaid,
      total_outgoing: totalOutgoing,
      net_cash_balance: netCashBalance,
      unpaid_fee_receivables: unpaidFeeReceivables,
      unpaid_payroll_liabilities: unpaidPayrollLiabilities,
      monthly_cash_flow: monthlyCashFlow,
    };
  }
}
