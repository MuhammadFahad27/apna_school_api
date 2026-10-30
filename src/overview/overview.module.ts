import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../farms/employee.entity.js';
import { Farm } from '../farms/farm.entity.js';
import { SupportRequest } from '../support/support-request.entity.js';
import { User } from '../users/user.entity.js';
import { OverviewController } from './overview.controller.js';
import { OverviewService } from './overview.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Farm, Employee, SupportRequest]),
  ],
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService],
})
export class OverviewModule {}
