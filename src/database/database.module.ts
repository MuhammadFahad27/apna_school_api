import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database.config.js';
import { DatabaseHealthController } from './database-health.controller.js';
import { DatabaseHealthService } from './database-health.service.js';
import { User } from '../users/user.entity.js';
import { Farm } from '../farms/farm.entity.js';
import { Employee } from '../farms/employee.entity.js';

const databaseLogger = new Logger('Database');

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...createDatabaseOptions(config),
        entities: [User, Farm, Employee],
      }),
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
  controllers: [DatabaseHealthController],
  providers: [DatabaseHealthService],
})
export class DatabaseModule {}
