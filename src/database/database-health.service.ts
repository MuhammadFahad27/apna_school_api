import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type DatabaseHealthResult = {
  status: 'up' | 'down';
  database: 'postgresql';
  responseTimeMs?: number;
  message?: string;
};

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<DatabaseHealthResult> {
    const startedAt = Date.now();

    try {
      if (!this.dataSource.isInitialized) {
        throw new Error('Database connection is not initialized.');
      }

      await this.dataSource.query('SELECT 1');

      return {
        status: 'up',
        database: 'postgresql',
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';

      this.logger.error(`Database health check failed: ${message}`);

      return {
        status: 'down',
        database: 'postgresql',
        responseTimeMs: Date.now() - startedAt,
        message,
      };
    }
  }
}
