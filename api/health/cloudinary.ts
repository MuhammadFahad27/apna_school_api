import type { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';

export default async function cloudinaryHealthHandler(
  _request: Request,
  response: Response,
): Promise<void> {
  const startedAt = Date.now();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    response.status(503).json({
      status: 'down',
      service: 'cloudinary',
      message: 'Cloudinary credentials are not configured in Vercel.',
    });
    return;
  }

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    await cloudinary.api.ping();
    response.status(200).json({
      status: 'up',
      service: 'cloudinary',
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    const cloudinaryError =
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string'
        ? error.error.message
        : error instanceof Error
          ? error.message
          : 'Cloudinary check failed';

    response.status(503).json({
      status: 'down',
      service: 'cloudinary',
      responseTimeMs: Date.now() - startedAt,
      message: cloudinaryError,
    });
  }
}
