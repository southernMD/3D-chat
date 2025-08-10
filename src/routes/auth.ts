import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { verificationMiddleware } from '../middleware/verificationMiddleware';
import { validationMiddleware } from '../decorators/validation';

const router = Router();
const authController = new AuthController();

// 发送注册验证码
router.post('/send-register-code',
  verificationMiddleware.checkRateLimit,
  validationMiddleware(authController, 'sendRegisterCode'),
  authController.sendRegisterCode.bind(authController)
);

// 用户注册
router.post('/register',
  validationMiddleware(authController, 'register'),
  verificationMiddleware.verifyCode,
  authController.register.bind(authController)
);

// 用户登录
router.post('/login',
  validationMiddleware(authController, 'login'),
  authController.login.bind(authController)
);

export default router;
