import type { Request, Response } from 'express';

export default function healthHandler(
  _request: Request,
  response: Response,
): void {
  const frontendUrl = process.env.FRONTEND_URL;

  if (frontendUrl) {
    response.setHeader('Access-Control-Allow-Origin', frontendUrl);
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }

  response.status(200).json({
    status: 'up',
    service: 'farm_dost_backend',
    message: 'Backend is running successfully',
    timestamp: new Date().toISOString(),
  });
}
