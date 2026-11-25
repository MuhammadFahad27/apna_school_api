import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentFee } from './entities/student-fee.entity.js';
import { FeeVoucher } from './entities/fee-voucher.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { FeesService } from './fees.service.js';
import { FeesController } from './fees.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([StudentFee, FeeVoucher, Student, Class, Section])],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [FeesService, TypeOrmModule],
})
export class FeesModule {}
