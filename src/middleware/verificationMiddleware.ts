import { Request, Response, NextFunction } from 'express';
import { Repository, MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { VerificationCode } from '../entities/VerificationCode';

export class VerificationMiddleware {
  private verificationCodeRepository: Repository<VerificationCode>;

  constructor() {
    this.verificationCodeRepository = AppDataSource.getRepository(VerificationCode);
  }

  // 检查60秒发送限制
  checkRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: '邮箱不能为空'
        });
        return;
      }

      // 检查是否在60秒内发送过验证码
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentCode = await this.verificationCodeRepository.findOne({
        where: {
          email: email,
          create_time: MoreThan(oneMinuteAgo)
        },
        order: { create_time: 'DESC' }
      });

      if (recentCode) {
        const remainingTime = Math.ceil((recentCode.create_time.getTime() + 60 * 1000 - Date.now()) / 1000);
        res.status(429).json({
          success: false,
          message: `请等待 ${remainingTime} 秒后再重新发送验证码`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Rate limit check error:', error);
      res.status(500).json({
        success: false,
        message: '检查发送限制时发生错误'
      });
    }
  };

  // 验证验证码
  verifyCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, verificationCode } = req.body;

      if (!email || !verificationCode) {
        res.status(400).json({
          success: false,
          message: '邮箱和验证码不能为空'
        });
        return;
      }

      const code = await this.verificationCodeRepository.findOne({
        where: {
          email,
          code: verificationCode,
          is_used: 0,
          expire_time: MoreThan(new Date())
        },
        order: { create_time: 'DESC' }
      });

      if (!code) {
        res.status(400).json({
          success: false,
          message: '验证码无效或已过期'
        });
        return;
      }

      // 标记验证码为已使用
      code.is_used = 1;
      await this.verificationCodeRepository.save(code);

      // 将验证结果存储到请求对象中
      (req as any).verifiedEmail = email;

      next();
    } catch (error) {
      console.error('Code verification error:', error);
      res.status(500).json({
        success: false,
        message: '验证码校验时发生错误'
      });
    }
  };
}

// 创建中间件实例
export const verificationMiddleware = new VerificationMiddleware();
