import { ConfigService } from '@nestjs/config';

export type DatabaseOptions = {
  type: 'postgres';
  url: string;
  ssl: { rejectUnauthorized: false };
  autoLoadEntities: true;
  synchronize: false;
  connectTimeoutMS: number;
  extra: {
    max: number;
    min: number;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
    acquireTimeoutMillis: number;
    keepAlive: boolean;
    keepAliveInitialDelayMillis: number;
  };
};

export function createDatabaseOptions(
  configService: ConfigService,
): DatabaseOptions {
  let url = configService.get<string>('DATABASE_URL');

  if (!url) {
    throw new Error(
      'DATABASE_URL is not configured. Add it to .env or src/.env.',
    );
  }

  // Strip incompatible query parameters like channel_binding that cause ECONNRESET in node-postgres
  url = url.replace(/channel_binding=[^&]*&?/g, '').replace(/[?&]$/, '');

  return {
    type: 'postgres',
    url,
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    synchronize: false,
    connectTimeoutMS: 30000,
    extra: {
      max: 5,                           // Neon free tier: low pool size
      min: 0,                           // allow pool to drain fully
      connectionTimeoutMillis: 30000,   // 30s — Neon cold-start can take ~10-15s
      idleTimeoutMillis: 10000,         // release idle connections quickly
      acquireTimeoutMillis: 30000,      // pg-pool acquire timeout
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    },
  };
}
