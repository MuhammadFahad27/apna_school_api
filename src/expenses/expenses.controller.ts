import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ExpensesService } from './expenses.service.js';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto.js';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { QueryExpensesDto } from './dto/query-expenses.dto.js';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ---------------- CATEGORIES ----------------
  @Get('categories')
  getCategories(@Query('includeInactive') includeInactive?: string) {
    return this.expensesService.getCategories(includeInactive !== 'false');
  }

  @Post('categories')
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expensesService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.deleteCategory(id);
  }

  // ---------------- STATS & FINANCIAL SUMMARY ----------------
  @Get('stats')
  getStats(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.expensesService.getStats(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get('financial-summary')
  getFinancialSummary(@Query('year') year?: string) {
    return this.expensesService.getFinancialSummary(year ? Number(year) : undefined);
  }

  // ---------------- EXPENSES CRUD ----------------
  @Get()
  findAll(@Query() query: QueryExpensesDto) {
    return this.expensesService.findAllExpenses(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOneExpense(id);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.expensesService.createExpense(dto, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.updateExpense(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.deleteExpense(id);
  }
}
