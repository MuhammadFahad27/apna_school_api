import { Module } from '@nestjs/common';
import { CloudinaryHealthController } from './cloudinary-health.controller.js';
import { CloudinaryHealthService } from './cloudinary-health.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { UploadController } from './upload.controller.js';

@Module({
  controllers: [CloudinaryHealthController, UploadController],
  providers: [CloudinaryHealthService, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
