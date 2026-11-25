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
  let url = configService.get<string>('DATABASE_URL') || configService.get<string>('DATABASE_URI');

  if (!url) {
    throw new Error(
      'DATABASE_URL is not configured. Add it to .env or src/.env.',
    );
  }

  // Handle unencoded @ in password (e.g. postgresql://user:pass@word@host:port/db)
  const atMatches = [...url.matchAll(/@/g)];
  if (atMatches.length > 1) {
    const lastAtIndex = url.lastIndexOf('@');
    const firstColonIndex = url.indexOf(':', url.indexOf('://') + 3);
    if (firstColonIndex !== -1 && lastAtIndex > firstColonIndex) {
      const prefix = url.substring(0, firstColonIndex + 1);
      const rawPassword = url.substring(firstColonIndex + 1, lastAtIndex);
      const hostPart = url.substring(lastAtIndex);
      url = `${prefix}${encodeURIComponent(decodeURIComponent(rawPassword))}${hostPart}`;
    }
  }

  // Strip incompatible query parameters like channel_binding that cause ECONNRESET in node-postgres
  url = url.replace(/channel_binding=[^&]*&?/g, '').replace(/[?&]$/, '');

  return {
    type: 'postgres',
    url,
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    synchronize: false,
    connectTimeoutMS: 15000,
    extra: {
      max: 5,
      min: 0,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 10000,
      acquireTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    },
  };
}
