import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { Validate, ValidationType } from '../decorators/validation';
import { 
  catchAsync, 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError,
  InternalServerError 
} from '../middleware/errorHandler';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // 发送注册验证码
  @Validate({ type: ValidationType.EMAIL, field: 'email' })
  async sendRegisterCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email } = req.body;
    const result = await this.authService.sendRegisterCode(email);
    
    if (!result.success) {
      throw new ValidationError(result.message || '发送验证码失败');
    }
    
    res.json(result);
  }

  // 用户注册
  @Validate({ type: ValidationType.EMAIL, field: 'email' })
  @Validate({ type: ValidationType.PASSWORD, field: 'password' })
  @Validate({ type: ValidationType.VERIFICATION_CODE, field: 'verificationCode' })
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password, username } = req.body;
    
    // 验证码已在中间件中验证，这里直接注册
    const result = await this.authService.registerWithVerifiedEmail(
      (req as any).verifiedEmail || email, 
      password, 
      username
    );
    
    if (!result.success) {
      throw new ValidationError(result.message || '注册失败');
    }
    
    res.status(201).json(result);
  }

  // 用户登录
  @Validate({ type: ValidationType.PASSWORD, field: 'password' })
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);
    
    if (!result.success) {
      throw new UnauthorizedError(result.message || '登录失败');
    }
    
    res.json(result);
  }

  //用户信息验证
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    // 从中间件中获取用户信息
    const user = (req as any).user;
    
    if (!user || !user.userId) {
      throw new UnauthorizedError('未获取到用户信息');
    }

    // 根据用户ID获取完整用户信息
    const result = await this.authService.getUserById(user.userId);
    
    if (!result.success) {
      throw new NotFoundError(result.message || '用户不存在');
    }
    
    res.json(result);
  }
}
