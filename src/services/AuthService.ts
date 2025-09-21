import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Repository, MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { VerificationCode } from '../entities/VerificationCode';
import { EmailService } from './EmailService';
import { config } from '../config/config';

export class AuthService {
  private userRepository: Repository<User>;
  private verificationCodeRepository: Repository<VerificationCode>;
  private emailService: EmailService;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.verificationCodeRepository = AppDataSource.getRepository(VerificationCode);
    this.emailService = new EmailService();
  }

  // 生成6位数字验证码
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 生成JWT token
  private generateToken(payload: any): string {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
  }

  //验证JWT token
  verifyToken(token: string): Promise<{ success: boolean; message: string; data?: any }> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, config.jwt.secret, (err, decoded) => {
        if (err) {
          resolve({ success: false, message: '无效的token' });
        } else {
          resolve({ success: true, message: '验证成功', data: decoded });
        }
      })
    })
  }

  // 密码加密
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcryptjs.hash(password, saltRounds);
  }

  // 密码验证
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcryptjs.compare(password, hashedPassword);
  }

  // 检查邮箱格式
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 发送注册验证码
  async sendRegisterCode(email: string): Promise<{ success: boolean; message: string }> {
    // 验证邮箱格式
    if (!this.isValidEmail(email)) {
      return { success: false, message: '邮箱格式不正确' };
    }

    return await AppDataSource.transaction(async (manager) => {
      // 检查用户是否已存在
      const existingUser = await manager.findOne(User, {
        where: { username: email }
      });

      if (existingUser) {
        throw new Error('该邮箱已被注册');
      }

      // 检查是否在60秒内发送过验证码
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentCode = await manager.findOne(VerificationCode, {
        where: {
          email: email,
          create_time: MoreThan(oneMinuteAgo)
        },
        order: { create_time: 'DESC' }
      });

      if (recentCode) {
        const remainingTime = Math.ceil((recentCode.create_time.getTime() + 60 * 1000 - Date.now()) / 1000);
        throw new Error(`请等待 ${remainingTime} 秒后再重新发送验证码`);
      }

      // 生成新验证码
      const code = this.generateVerificationCode();
      const expireTime = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

      // 查找是否有未使用的验证码
      const existingCode = await manager.findOne(VerificationCode, {
        where: {
          email: email,
          is_used: 0,
          expire_time: MoreThan(new Date())
        },
        order: { create_time: 'DESC' }
      });

      if (existingCode) {
        // 更新现有验证码
        existingCode.code = code;
        existingCode.expire_time = expireTime;
        existingCode.update_time = new Date();
        await manager.save(existingCode);
      } else {
        // 创建新验证码记录
        const verificationCode = manager.create(VerificationCode, {
          email,
          code,
          expire_time: expireTime,
          is_used: 0
        });
        await manager.save(verificationCode);
      }

      // 发送验证码邮件
      const emailSent = await this.emailService.sendVerificationCode(email, code);
      if (!emailSent) {
        throw new Error('发送验证码邮件失败');
      }

      return {
        success: true,
        message: '验证码已发送到您的邮箱，请查收'
      };
    }).catch((error) => {
      console.error('Send register code error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '发送验证码过程中发生错误'
      };
    });
  }

  // 验证验证码
  async verifyCode(email: string, code: string): Promise<boolean> {
    return await AppDataSource.transaction(async (manager) => {
      const verificationCode = await manager.findOne(VerificationCode, {
        where: {
          email,
          code,
          is_used: 0,
          expire_time: MoreThan(new Date())
        },
        order: { create_time: 'DESC' }
      });

      if (!verificationCode) {
        return false;
      }

      // 标记验证码为已使用
      verificationCode.is_used = 1;
      await manager.save(verificationCode);

      return true;
    }).catch((error) => {
      console.error('Verify code error:', error);
      return false;
    });
  }

  // 用户注册（带验证码验证）
  async register(email: string, password: string, username: string, verificationCode: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // 验证输入
      if (!email || !password || !verificationCode || !username) {
        return { success: false, message: '邮箱、密码、用户名和验证码不能为空' };
      }

      if (!this.isValidEmail(email)) {
        return { success: false, message: '邮箱格式不正确' };
      }

      if (password.length < 8) {
        return { success: false, message: '密码长度至少为8位' };
      }

      if (username.trim().length === 0) {
        return { success: false, message: '用户名不能为空' };
      }

      // 验证验证码
      const isCodeValid = await this.verifyCode(email, verificationCode);
      if (!isCodeValid) {
        return { success: false, message: '验证码无效或已过期' };
      }

      const result = await this.createUser(email, password, username);

      // 如果注册成功，自动登录
      if (result.success) {
        const loginResult = await this.login(email, password);
        if (loginResult.success) {
          return {
            success: true,
            message: '注册成功，已自动登录',
            data: loginResult.data
          };
        }
      }

      return result;

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: '注册过程中发生错误' };
    }
  }

  // 用户注册（已验证邮箱）- 用于中间件验证后
  async registerWithVerifiedEmail(email: string, password: string, username: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.isValidEmail(email)) {
        return { success: false, message: '邮箱格式不正确' };
      }

      if (password.length < 8) {
        return { success: false, message: '密码长度至少为8位' };
      }

      if (!username || username.trim().length === 0) {
        return { success: false, message: '用户名不能为空' };
      }

      const result = await this.createUser(email, password, username);

      // 如果注册成功，自动登录
      if (result.success) {
        const loginResult = await this.login(email, password);
        if (loginResult.success) {
          return {
            success: true,
            message: '注册成功，已自动登录',
            data: loginResult.data
          };
        }
      }

      return result;

    } catch (error) {
      console.error('Registration with verified email error:', error);
      return { success: false, message: '注册过程中发生错误' };
    }
  }

  // 创建用户的通用方法
  private async createUser(email: string, password: string, username: string): Promise<{ success: boolean; message: string; data?: any }> {
    return await AppDataSource.transaction(async (manager) => {
      // 检查邮箱是否已存在
      const existingEmailUser = await manager.findOne(User, {
        where: { username: email }
      });

      if (existingEmailUser) {
        throw new Error('该邮箱已被注册');
      }

      // 检查昵称是否已存在
      const existingNicknameUser = await manager.findOne(User, {
        where: { nickname: username }
      });

      if (existingNicknameUser) {
        throw new Error('该用户名已被使用');
      }

      // 加密密码
      const hashedPassword = await this.hashPassword(password);

      // 创建用户
      const user = manager.create(User, {
        username: email,
        password: hashedPassword,
        nickname: username,
        verify: 'verified'
      });

      const savedUser = await manager.save(user);

      return {
        success: true,
        message: '注册成功',
        data: {
          userId: savedUser.id,
          email: savedUser.username,
          username: savedUser.nickname
        }
      };
    }).catch((error) => {
      console.error('Create user error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '创建用户失败'
      };
    });
  }

  // 用户登录
  async login(loginField: string, password: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // 验证输入
      if (!loginField || !password) {
        return { success: false, message: '登录账号和密码不能为空' };
      }

      if (password.length < 8) {
        return { success: false, message: '密码长度至少为8位' };
      }

      // 判断是邮箱还是昵称登录
      const isEmail = this.isValidEmail(loginField);
      let user;

      if (isEmail) {
        // 邮箱登录
        user = await this.userRepository.findOne({
          where: { username: loginField }
        });
      } else {
        // 昵称登录
        user = await this.userRepository.findOne({
          where: { nickname: loginField }
        });
      }

      if (!user) {
        return { success: false, message: '账号或密码错误' };
      }

      // 验证密码
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return { success: false, message: '账号或密码错误' };
      }

      // 生成JWT token
      const token = this.generateToken({
        userId: user.id,
        email: user.username
      });

      // 返回用户信息（不包括密码）
      const userInfo = {
        id: user.id,
        email: user.username,
        username: user.nickname,
        is_verified: user.verify === 'verified'
      };

      return {
        success: true,
        message: '登录成功',
        data: {
          user: userInfo,
          token
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: '登录过程中发生错误' };
    }
  }

  // 根据用户ID获取用户信息
  async getUserById(userId: number): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      // 返回用户信息（不包括密码）
      const userInfo = {
        id: user.id,
        email: user.username,
        username: user.nickname,
        is_verified: user.verify === 'verified',
        created_at: user.create_time
      };

      return {
        success: true,
        message: '获取用户信息成功',
        data: { user: userInfo }
      };

    } catch (error) {
      console.error('Get user by id error:', error);
      return { success: false, message: '获取用户信息过程中发生错误' };
    }
  }
}
