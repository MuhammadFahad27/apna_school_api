import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export type CloudinaryHealthResult = {
  status: 'up' | 'down';
  service: 'cloudinary';
  responseTimeMs?: number;
  message?: string;
};

@Injectable()
export class CloudinaryHealthService {
  private readonly logger = new Logger(CloudinaryHealthService.name);

  constructor(private readonly configService: ConfigService) {}

  async check(): Promise<CloudinaryHealthResult> {
    const startedAt = Date.now();
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      return this.down(
        'Cloudinary credentials are incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
        startedAt,
      );
    }

    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });

      await cloudinary.api.ping();

      return {
        status: 'up',
        service: 'cloudinary',
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      const cloudinaryError = this.getCloudinaryError(error);
      const message = cloudinaryError ?? 'Unknown Cloudinary error';

      return this.down(`Cloudinary health check failed: ${message}`, startedAt);
    }
  }

  private getCloudinaryError(error: unknown): string | undefined {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      const nestedError = error.error;

      if (
        typeof nestedError === 'object' &&
        nestedError !== null &&
        'message' in nestedError &&
        typeof nestedError.message === 'string'
      ) {
        return nestedError.message;
      }
    }

    return undefined;
  }

  private down(message: string, startedAt: number): CloudinaryHealthResult {
    this.logger.error(message);

    return {
      status: 'down',
      service: 'cloudinary',
      responseTimeMs: Date.now() - startedAt,
      message,
    };
  }
}
