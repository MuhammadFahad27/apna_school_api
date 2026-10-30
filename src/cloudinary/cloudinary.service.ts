import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    } else {
      this.logger.warn('Cloudinary credentials are not fully configured.');
    }
  }

  /**
   * Upload buffer directly to Cloudinary
   */
  async uploadBuffer(
    buffer: Buffer,
    folder = 'farm_dost/employees',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 600, height: 600, crop: 'limit', quality: 'auto' },
          ],
        },
        (error, result?: UploadApiResponse) => {
          if (error) {
            this.logger.error('Cloudinary stream upload error', error);
            return reject(error);
          }
          if (!result?.secure_url) {
            return reject(new Error('Cloudinary upload returned no secure URL.'));
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Upload base64 or Data URI string to Cloudinary
   */
  async uploadBase64(
    base64Data: string,
    folder = 'farm_dost/employees',
  ): Promise<string> {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 600, height: 600, crop: 'limit', quality: 'auto' },
      ],
    });

    if (!result?.secure_url) {
      throw new Error('Cloudinary upload returned no secure URL.');
    }

    return result.secure_url;
  }
}
