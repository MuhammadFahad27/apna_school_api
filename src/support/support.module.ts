import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Farm } from '../farms/farm.entity.js';
import { MailModule } from '../mail/mail.module.js';
import { User } from '../users/user.entity.js';
import { SupportController } from './support.controller.js';
import { SupportRequest } from './support-request.entity.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportRequest, Farm, User]),
    MailModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
