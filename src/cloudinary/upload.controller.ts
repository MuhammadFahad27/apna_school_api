import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CloudinaryService } from './cloudinary.service.js';

interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file?: UploadedMulterFile,
    @Body('image') base64Image?: string,
  ) {
    if (file?.buffer) {
      const url = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        'farm_dost/employees',
      );
      return { url };
    }

    if (base64Image && typeof base64Image === 'string') {
      const url = await this.cloudinaryService.uploadBase64(
        base64Image,
        'farm_dost/employees',
      );
      return { url };
    }

    throw new BadRequestException(
      'An image file (multipart "file") or base64 "image" string is required.',
    );
  }
}
