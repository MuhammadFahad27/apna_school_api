import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CloudinaryHealthController } from './cloudinary-health.controller.js';
import { CloudinaryHealthService } from './cloudinary-health.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { UploadController } from './upload.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [CloudinaryHealthController, UploadController],
  providers: [CloudinaryHealthService, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
