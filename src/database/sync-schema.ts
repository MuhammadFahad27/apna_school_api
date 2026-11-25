import 'reflect-metadata';
import dotenv from 'dotenv';
import dataSource from './data-source.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function syncSchema(): Promise<void> {
  console.log('=====================================================');
  console.log('            DATABASE SCHEMA SYNCHRONIZATION          ');
  console.log('=====================================================');

  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('✓ Database connection established.');

  console.log('Ensuring uuid-ossp extension is enabled...');
  try {
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✓ Extension uuid-ossp ready.');
  } catch (err: any) {
    console.log('ℹ Notice on uuid-ossp:', err.message);
  }

  console.log('Synchronizing schema (creating/updating all tables)...');
  await dataSource.synchronize();
  console.log('✓ All 18 tables and relations successfully synchronized.');

  await dataSource.destroy();
  console.log('=====================================================');
  console.log('            SCHEMA SYNC COMPLETED                    ');
  console.log('=====================================================');
}

syncSchema().catch((err) => {
  console.error('❌ Schema sync failed:', err);
  process.exit(1);
});
