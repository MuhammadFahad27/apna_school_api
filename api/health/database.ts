import type { Request, Response } from 'express';
import { Pool } from 'pg';

export default async function databaseHealthHandler(
  _request: Request,
  response: Response,
): Promise<void> {
  const startedAt = Date.now();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    response.status(503).json({
      status: 'down',
      database: 'postgresql',
      message: 'DATABASE_URL is not configured in Vercel.',
    });
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  try {
    await pool.query('SELECT 1');
    response.status(200).json({
      status: 'up',
      database: 'postgresql',
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    response.status(503).json({
      status: 'down',
      database: 'postgresql',
      responseTimeMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'Database check failed',
    });
  } finally {
    await pool.end();
  }
}
