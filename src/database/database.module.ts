import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database.config.js';

const databaseLogger = new Logger('Database');

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createDatabaseOptions,
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Database connection options were not created.');
        }

        const dataSource = new DataSource(options);

        try {
          await dataSource.initialize();
          databaseLogger.log('PostgreSQL database connection established');
          return dataSource;
        } catch (error) {
          databaseLogger.error(
            'PostgreSQL database connection failed',
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        }
      },
    }),
  ],
})
export class DatabaseModule {}
