import { ConfigService } from '@nestjs/config';

export type DatabaseOptions = {
  type: 'postgres';
  url: string;
  ssl: { rejectUnauthorized: false };
  autoLoadEntities: true;
  synchronize: false;
};

export function createDatabaseOptions(
  configService: ConfigService,
): DatabaseOptions {
  const url = configService.get<string>('DATABASE_URL');

  if (!url) {
    throw new Error(
      'DATABASE_URL is not configured. Add it to .env or src/.env.',
    );
  }

  return {
    type: 'postgres',
    url,
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    synchronize: false,
  };
}
