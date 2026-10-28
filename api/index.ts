import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppModule, ObserveInstrument } from '../src/app.module.js';

type ExpressHandler = (request: Request, response: Response) => void;

let handlerPromise: Promise<ExpressHandler> | undefined;

async function createHandler(): Promise<ExpressHandler> {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  await app.init();

  return app.getHttpAdapter().getInstance() as ExpressHandler;
}

export default async function vercelHandler(
  request: Request,
  response: Response,
): Promise<void> {
  handlerPromise ??= createHandler();
  const handler = await handlerPromise;
  handler(request, response);
}
