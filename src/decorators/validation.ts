import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';

// 验证类型枚举
export enum ValidationType {
  EMAIL = 'email',
  VERIFICATION_CODE = 'verification_code',
  PASSWORD = 'password',
  RATE_LIMIT = 'rate_limit',
  MODEL_INFO = 'model_info'
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
  },

  modelInfo: (modelInfoStr: string): { valid: boolean; message?: string; data?: any } => {
    try {
      if (!modelInfoStr || modelInfoStr.trim().length === 0) {
        return { valid: false, message: '模型信息不能为空' };
      }

      const modelInfo = JSON.parse(modelInfoStr);

      // 验证必填字段（除了des字段）
      if (!modelInfo.name || modelInfo.name.trim().length === 0) {
        return { valid: false, message: '模型名称不能为空' };
      }

      if (!modelInfo.hash || modelInfo.hash.trim().length === 0) {
        return { valid: false, message: '模型hash不能为空' };
      }

      if (!modelInfo.format || modelInfo.format.trim().length === 0) {
        return { valid: false, message: '模型格式不能为空' };
      }

      if (!modelInfo.size || modelInfo.size.trim().length === 0) {
        return { valid: false, message: '模型大小不能为空' };
      }

      // 验证字段长度
      if (modelInfo.name.length > 255) {
        return { valid: false, message: '模型名称长度不能超过255个字符' };
      }

      if (modelInfo.des && modelInfo.des.length > 500) {
        return { valid: false, message: '模型描述长度不能超过500个字符' };
      }

      // 验证格式
      const allowedFormats = ['PMX', 'GLB', 'GLTF'];
      if (!allowedFormats.includes(modelInfo.format.toUpperCase())) {
        return { valid: false, message: `不支持的模型格式: ${modelInfo.format}` };
      }

      // 验证大小格式（应该是数字字符串）
      if (isNaN(Number(modelInfo.size))) {
        return { valid: false, message: '模型大小格式错误' };
      }

      // 验证截图格式（可选字段）
      if (modelInfo.screenshot) {
        if (typeof modelInfo.screenshot !== 'string') {
          return { valid: false, message: '截图数据格式错误' };
        }

        // 检查是否是有效的base64格式
        if (!modelInfo.screenshot.startsWith('data:image/')) {
          return { valid: false, message: '截图必须是有效的base64图片格式' };
        }
      }

      return { valid: true, data: modelInfo };
    } catch (error) {
      return { valid: false, message: '模型信息格式错误' };
    }
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

          case ValidationType.MODEL_INFO:
            const modelInfoResult = validators.modelInfo(value);
            if (!modelInfoResult.valid) {
              res.status(400).json({
                success: false,
                message: validation.message || modelInfoResult.message
              });
              return;
            }
            // 将解析后的模型信息添加到请求对象中
            (req as any).parsedModelInfo = modelInfoResult.data;
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
