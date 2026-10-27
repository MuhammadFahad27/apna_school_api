import { ConfigService } from '@nestjs/config';
import { type TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createDatabaseOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
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
