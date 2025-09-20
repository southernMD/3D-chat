import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { verificationMiddleware } from '../middleware/verificationMiddleware';
import { validationMiddleware } from '../decorators/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();
const authController = new AuthController();

// 发送注册验证码
router.post('/send-register-code',
  verificationMiddleware.checkRateLimit,
  validationMiddleware(authController, 'sendRegisterCode'),
  catchAsync(authController.sendRegisterCode.bind(authController))
);

// 用户注册
router.post('/register',
  validationMiddleware(authController, 'register'),
  verificationMiddleware.verifyCode,
  catchAsync(authController.register.bind(authController))
);

// 用户登录
router.post('/login',
  validationMiddleware(authController, 'login'),
  catchAsync(authController.login.bind(authController))
);

router.get('/me',
  authMiddleware.authenticateToken,
  catchAsync(authController.me.bind(authController))
)

export default router;
