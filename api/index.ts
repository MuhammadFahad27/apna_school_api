import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppModule, ObserveInstrument } from '../src/app.module.js';

type ExpressHandler = (request: Request, response: Response) => void;

let handlerPromise: Promise<ExpressHandler> | undefined;

async function createHandler(): Promise<ExpressHandler> {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? false,
  });
  await app.init();

  return app.getHttpAdapter().getInstance() as ExpressHandler;
}

export default async function vercelHandler(
  request: Request,
  response: Response,
): Promise<void> {
  const requestPath = request.url?.split('?')[0];

  if (requestPath === '/health' || requestPath === '/health/server') {
    response.status(200).json({
      status: 'up',
      service: 'farm_dost_backend',
      message: 'Backend is running successfully',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  handlerPromise ??= createHandler();
  const handler = await handlerPromise;
  handler(request, response);
}
