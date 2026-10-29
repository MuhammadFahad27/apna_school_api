import 'reflect-metadata';
import dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { Employee } from '../farms/employee.entity.js';
import { Farm } from '../farms/farm.entity.js';
import { User } from '../users/user.entity.js';
import { createDatabaseOptions } from './database.config.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

const config = new ConfigService();
const databaseOptions = createDatabaseOptions(config);

const options: DataSourceOptions = {
  type: 'postgres',
  url: databaseOptions.url,
  ssl: databaseOptions.ssl,
  entities: [User, Farm, Employee],
  migrations: ['dist/database/migrations/*.js'],
};

export default new DataSource(options);
