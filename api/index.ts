import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module.js';

type ExpressHandler = (request: Request, response: Response) => void;

let handlerPromise: Promise<ExpressHandler> | undefined;

async function createHandler(): Promise<ExpressHandler> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  });
  await app.init();

  return app.getHttpAdapter().getInstance() as ExpressHandler;
}

export default async function vercelHandler(
  request: Request,
  response: Response,
): Promise<void> {
  const requestPath = request.url?.split('?')[0];

  // Set permissive CORS headers for all responses
  const origin = (request.headers.origin as string) || '*';
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  );
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, X-Requested-With',
  );

  // Fast preflight response
  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (requestPath === '/health' || requestPath === '/health/server') {
    response.status(200).json({
      status: 'up',
      service: 'apna_school_api',
      message: 'Backend is running successfully',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (requestPath === '/health/db-check') {
    try {
      const { Client } = await import('pg');
      const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URI;
      if (!dbUrl) {
        response.status(500).json({ status: 'error', message: 'DATABASE_URL or DATABASE_URI not found in env' });
        return;
      }
      const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      await client.connect();
      const res = await client.query('SELECT NOW() as now, count(*)::int as user_count from users;');
      await client.end();
      response.status(200).json({ status: 'connected', data: res.rows[0] });
    } catch (err: any) {
      response.status(500).json({ status: 'error', message: err.message, stack: err.stack });
    }
    return;
  }

  try {
    handlerPromise ??= createHandler();
    const handler = await handlerPromise;
    handler(request, response);
  } catch (error: any) {
    handlerPromise = undefined; // reset so next request can retry
    console.error('Handler error:', error);
    response.status(500).json({
      statusCode: 500,
      message: 'Backend initialization failed',
      error: error?.message || String(error),
      detail: 'Check Vercel Environment Variables: DATABASE_URL and JWT_SECRET.',
    });
  }
}
