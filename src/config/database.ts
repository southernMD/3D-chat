import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { VerificationCode } from '../entities/VerificationCode';
import { StaticResourcePath } from '../entities/StaticResourcePath';
import { StaticResourceMessage } from '../entities/StaticResourceMessage';
import { config } from './config';
import { Equipment } from '../entities/Equipment';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.database,
  synchronize: false, // 开发环境自动同步表结构
  logging: false,
  entities: [User, VerificationCode, StaticResourcePath, StaticResourceMessage,Equipment],
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized successfully');
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
    throw error;
  }
};
