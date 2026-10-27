import { Module } from '@nestjs/common';
import { CloudinaryHealthController } from './cloudinary-health.controller.js';
import { CloudinaryHealthService } from './cloudinary-health.service.js';

@Module({
  controllers: [CloudinaryHealthController],
  providers: [CloudinaryHealthService],
})
export class CloudinaryModule {}
