import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { Employee } from '../farms/employee.entity.js';
import { Farm } from '../farms/farm.entity.js';
import { User } from '../users/user.entity.js';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Farm, User]),
    CloudinaryModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
