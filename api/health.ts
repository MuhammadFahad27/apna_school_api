import type { Request, Response } from 'express';

export default function healthHandler(
  _request: Request,
  response: Response,
): void {
  response.status(200).json({
    status: 'up',
    service: 'farm_dost_backend',
    message: 'Backend is running successfully',
    timestamp: new Date().toISOString(),
  });
}
