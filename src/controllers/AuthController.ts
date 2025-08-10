import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { Validate, ValidationType } from '../decorators/validation';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // 发送注册验证码
  @Validate({ type: ValidationType.EMAIL, field: 'email' })
  async sendRegisterCode(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const result = await this.authService.sendRegisterCode(email);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Send register code error:', error);
      res.status(500).json({
        success: false,
        message: '发送验证码过程中发生错误'
      });
    }
  }

  // 用户注册
  @Validate({ type: ValidationType.EMAIL, field: 'email' })
  @Validate({ type: ValidationType.PASSWORD, field: 'password' })
  @Validate({ type: ValidationType.VERIFICATION_CODE, field: 'verificationCode' })
  async register(req: Request, res: Response) {
    try {
      const { email, password, username } = req.body;
      
      // 验证码已在中间件中验证，这里直接注册
      const result = await this.authService.registerWithVerifiedEmail(
        (req as any).verifiedEmail || email, 
        password, 
        username
      );
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: '注册过程中发生错误'
      });
    }
  }

  // 用户登录
  @Validate({ type: ValidationType.PASSWORD, field: 'password' })
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: '登录过程中发生错误'
      });
    }
  }
}
