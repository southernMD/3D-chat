import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';

// 验证类型枚举
export enum ValidationType {
  EMAIL = 'email',
  VERIFICATION_CODE = 'verification_code',
  PASSWORD = 'password',
  RATE_LIMIT = 'rate_limit'
}

// 验证配置接口
export interface ValidationConfig {
  type: ValidationType;
  field: string;
  message?: string;
  options?: any;
}

// 验证装饰器元数据键
const VALIDATION_METADATA_KEY = Symbol('validation');

// 验证装饰器
export function Validate(config: ValidationConfig) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const existingValidations = Reflect.getMetadata(VALIDATION_METADATA_KEY, target, propertyName) || [];

    // 检查是否已存在相同的验证配置（避免重复）
    const isDuplicate = existingValidations.some((existing: ValidationConfig) =>
      existing.type === config.type &&
      existing.field === config.field
    );

    if (!isDuplicate) {
      existingValidations.push(config);
      Reflect.defineMetadata(VALIDATION_METADATA_KEY, existingValidations, target, propertyName);
    } else {
      console.warn(`⚠️  重复的验证装饰器: ${config.type} for field '${config.field}' on method '${propertyName}'`);
    }
  };
}

// 获取验证配置
export function getValidationConfig(target: any, propertyName: string): ValidationConfig[] {
  return Reflect.getMetadata(VALIDATION_METADATA_KEY, target, propertyName) || [];
}

// 验证器函数
export const validators = {
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  verificationCode: (value: string): boolean => {
    return /^\d{6}$/.test(value);
  },

  password: (value: string): boolean => {
    return typeof value === 'string' && value.length >= 8;
  }
};

// 验证中间件
export function validationMiddleware(target: any, propertyName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validations = getValidationConfig(target, propertyName);

      for (const validation of validations) {
        const value = req.body[validation.field];

        switch (validation.type) {
          case ValidationType.EMAIL:
            if (!value) {
              res.status(400).json({
                success: false,
                message: validation.message || '邮箱不能为空'
              });
              return;
            }
            if (!validators.email(value)) {
              res.status(400).json({
                success: false,
                message: validation.message || '邮箱格式不正确'
              });
              return;
            }
            break;

          case ValidationType.VERIFICATION_CODE:
            if (!value) {
              res.status(400).json({
                success: false,
                message: validation.message || '验证码不能为空'
              });
              return;
            }
            if (!validators.verificationCode(value)) {
              res.status(400).json({
                success: false,
                message: validation.message || '验证码必须为6位数字'
              });
              return;
            }
            break;

          case ValidationType.PASSWORD:
            if (!value) {
              res.status(400).json({
                success: false,
                message: validation.message || '密码不能为空'
              });
              return;
            }
            if (!validators.password(value)) {
              res.status(400).json({
                success: false,
                message: validation.message || '密码长度至少为8位'
              });
              return;
            }
            break;
        }
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: '验证过程中发生错误'
      });
    }
  };
}
