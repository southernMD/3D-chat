import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { VerificationCode } from '../entities/VerificationCode';
import { config } from './config';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.database.host,
  port: 3306,
  username: config.database.user,
  password: config.database.password,
  database: config.database.database,
  synchronize: true, // 开发环境自动同步表结构
  logging: false,
  entities: [User, VerificationCode],
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
