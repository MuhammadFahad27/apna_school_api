import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import { User } from '../users/user.entity.js';
import { Employee } from './employee.entity.js';
import { Farm } from './farm.entity.js';
import { FarmsController } from './farms.controller.js';
import { FarmsService } from './farms.service.js';

@Module({
  imports: [
    AuthModule,
    MailModule,
    TypeOrmModule.forFeature([Farm, Employee, User]),
  ],
  controllers: [FarmsController],
  providers: [FarmsService],
})
export class FarmsModule {}
