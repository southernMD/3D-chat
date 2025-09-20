<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1 class="register-title">{{ $t('auth.register.title') }}</h1>
        <p class="register-subtitle">{{ $t('auth.register.subtitle') }}</p>
      </div>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="register-form"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="email">
          <el-input
            v-model="registerForm.email"
            type="email"
            :placeholder="$t('auth.register.emailPlaceholder')"
            size="large"
            prefix-icon="Message"
            :disabled="loading"
          />
        </el-form-item>

        <el-form-item prop="verificationCode">
          <div class="verification-input-group">
            <el-input
              v-model="registerForm.verificationCode"
              :placeholder="$t('auth.register.verificationCodePlaceholder')"
              size="large"
              prefix-icon="Key"
              :disabled="loading"
              maxlength="6"
              class="verification-input"
            />
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              :disabled="countdown > 0"
              @click="sendVerificationCode"
              class="send-code-button"
            >
              {{ getCodeButtonText() }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            :placeholder="$t('auth.register.usernamePlaceholder')"
            size="large"
            prefix-icon="User"
            :disabled="loading"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            :placeholder="$t('auth.register.passwordPlaceholder')"
            size="large"
            prefix-icon="Lock"
            show-password
            :disabled="loading"
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            :placeholder="$t('auth.register.confirmPasswordPlaceholder')"
            size="large"
            prefix-icon="Lock"
            show-password
            :disabled="loading"
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-form-item prop="agreement">
          <el-checkbox v-model="registerForm.agreement" :disabled="loading">
            {{ $t('auth.register.agreement') }}
            <el-link type="primary" @click="showTerms = true">{{ $t('auth.register.termsOfService') }}</el-link>
            {{ $t('auth.register.and') }}
            <el-link type="primary" @click="showPrivacy = true">{{ $t('auth.register.privacyPolicy') }}</el-link>
          </el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleRegister"
            class="register-button"
          >
            {{ loading ? $t('common.loading') : $t('auth.register.registerButton') }}
          </el-button>
        </el-form-item>

        <div class="login-link">
          <span>{{ $t('auth.register.hasAccount') }}</span>
          <el-link type="primary" @click="$router.push('/login')">
            {{ $t('auth.register.loginLink') }}
          </el-link>
        </div>
      </el-form>
    </div>



    <!-- 用户协议对话框 -->
    <el-dialog v-model="showTerms" title="用户协议" width="600px">
      <div class="terms-content">
        <h4>1. 服务条款</h4>
        <p>欢迎使用3D Chat服务。使用本服务即表示您同意遵守以下条款。</p>
        
        <h4>2. 用户行为规范</h4>
        <p>用户应当文明使用本服务，不得发布违法、有害、威胁、辱骂、骚扰、侵权或其他不当内容。</p>
        
        <h4>3. 隐私保护</h4>
        <p>我们重视您的隐私，将按照隐私政策保护您的个人信息。</p>
        
        <h4>4. 服务变更</h4>
        <p>我们保留随时修改或终止服务的权利，恕不另行通知。</p>
      </div>
    </el-dialog>

    <!-- 隐私政策对话框 -->
    <el-dialog v-model="showPrivacy" title="隐私政策" width="600px">
      <div class="privacy-content">
        <h4>1. 信息收集</h4>
        <p>我们收集您提供的注册信息，包括邮箱地址和用户名。</p>
        
        <h4>2. 信息使用</h4>
        <p>我们使用您的信息来提供服务、改进用户体验和发送重要通知。</p>
        
        <h4>3. 信息保护</h4>
        <p>我们采用行业标准的安全措施来保护您的个人信息。</p>
        
        <h4>4. 信息共享</h4>
        <p>除法律要求外，我们不会与第三方共享您的个人信息。</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElNotification } from 'element-plus'
import { SuccessFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { showSuccess, showError, showWarning } from '@/utils/message'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

// 表单引用
const registerFormRef = ref<FormInstance>()

// 加载状态
const loading = ref(false)

// 验证码相关状态
const codeSent = ref(false)
const countdown = ref(0)
let countdownTimer: NodeJS.Timeout | null = null

// 对话框状态
const showTerms = ref(false)
const showPrivacy = ref(false)

// 表单数据
const registerForm = reactive({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  verificationCode: '',
  agreement: false
})

// 确认密码验证
const validateConfirmPassword = (rule: any, value: string, callback: any) => {
  if (value !== registerForm.password) {
    callback(new Error(t('auth.validation.passwordMismatch')))
  } else {
    callback()
  }
}

// 表单验证规则
const registerRules: FormRules = {
  email: [
    { required: true, message: t('auth.validation.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.validation.emailInvalid'), trigger: 'blur' }
  ],
  verificationCode: [
    { required: true, message: t('auth.validation.verificationCodeRequired'), trigger: 'blur' },
    { len: 6, message: t('auth.validation.verificationCodeLength'), trigger: 'blur' },
    { pattern: /^\d{6}$/, message: t('auth.validation.verificationCodeFormat'), trigger: 'blur' }
  ],
  username: [
    { required: true, message: t('auth.validation.usernameRequired'), trigger: 'blur' },
    { min: 2, message: t('auth.validation.usernameLength'), trigger: 'blur' },
    { max: 20, message: t('auth.validation.usernameLength'), trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, message: t('auth.validation.usernameFormat'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('auth.validation.passwordRequired'), trigger: 'blur' },
    { min: 8, message: t('auth.validation.passwordLength'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('auth.validation.confirmPasswordRequired'), trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  agreement: [
    {
      validator: (rule: any, value: boolean, callback: any) => {
        if (!value) {
          callback(new Error(t('auth.validation.agreementRequired')))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 获取验证码按钮文本
const getCodeButtonText = () => {
  if (countdown.value > 0) {
    return `${countdown.value}s${t('auth.register.resendCode')}`
  }
  return codeSent.value ? t('auth.register.resendCode') : t('auth.register.sendCode')
}

// 发送验证码
const sendVerificationCode = async () => {
  if (!registerFormRef.value) return

  try {
    // 验证邮箱格式
    if (!registerForm.email) {
      showWarning(t('auth.validation.emailRequired'))
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registerForm.email)) {
      showWarning(t('auth.validation.emailInvalid'))
      return
    }

    loading.value = true

    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/send-register-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: registerForm.email
      }),
    })

    const data = await response.json()

    if (data.success) {
      codeSent.value = true
      showSuccess(data.message || '验证码已发送到您的邮箱')
      startCountdown()
    } else {
      showError(data.message || '发送验证码失败，请检查邮箱地址')
    }
  } catch (error: any) {
    console.error('Send verification code error:', error)
    showError('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 开始倒计时
const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
    }
  }, 1000)
}

// 注册处理
const handleRegister = async () => {
  if (!registerFormRef.value) return

  try {
    // 验证表单
    await registerFormRef.value.validate()

    // 检查是否发送了验证码
    if (!codeSent.value) {
      ElMessage.error('请先发送验证码')
      return
    }

    // 检查是否输入了验证码
    if (!registerForm.verificationCode) {
      ElMessage.error('请输入验证码')
      return
    }

    loading.value = true

    const success = await authStore.register({
      email: registerForm.email,
      username: registerForm.username,
      password: registerForm.password,
      verificationCode: registerForm.verificationCode
    })

    if (success) {
      // 注册成功后跳转到首页
      ElNotification({
        title: '注册成功',
        message: '欢迎加入3D Chat！',
        type: 'success'
      })
      router.push('/')
    }
  } catch (error) {
    console.error('Register error:', error)
  } finally {
    loading.value = false
  }
}



// 组件销毁时清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped lang="less">
.register-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.register-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 450px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1);
  margin: 20px;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-title {
  font-size: 32px;
  font-weight: bold;
  color: #00ffff;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #00ffff 0%, #ff00ff 25%, #ffff00 50%, #ff00ff 75%, #00ffff 100%);
  background-size: 400% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: colorCycle 4s linear infinite;
}

.register-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin: 0;
}

.register-form {
  .verification-input-group {
    display: flex;
    gap: 12px;
    align-items: center;

    .verification-input {
      flex: 1;
    }

    .send-code-button {
      min-width: 120px;
      height: 40px;
      background: linear-gradient(45deg, #00d4ff, #ff00ff);
      border: none;
      border-radius: 8px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;

      &:hover:not(:disabled) {
        background: linear-gradient(45deg, #00b8e6, #e600e6);
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(0, 212, 255, 0.4);
      }

      &:disabled {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.5);
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
    }
  }

  .register-button {
    width: 100%;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    background: linear-gradient(45deg, #00d4ff, #ff00ff);
    border: none;
    border-radius: 12px;
    color: #ffffff;
    box-shadow: 0 10px 30px rgba(0, 212, 255, 0.4);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    &:hover {
      background: linear-gradient(45deg, #00b8e6, #e600e6);
      transform: translateY(-2px);
      box-shadow: 0 15px 35px rgba(0, 212, 255, 0.6);

      &::before {
        left: 100%;
      }
    }
  }
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: rgba(255, 255, 255, 0.7);

  span {
    margin-right: 8px;
  }
}



.terms-content,
.privacy-content {
  max-height: 400px;
  overflow-y: auto;
  
  h4 {
    color: #00ffff;
    margin: 20px 0 10px 0;

    &:first-child {
      margin-top: 0;
    }
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
    margin-bottom: 12px;
  }
}

:deep(.el-input__wrapper) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);

  &:hover {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.2);
  }

  &.is-focus {
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
}

:deep(.el-input__inner) {
  color: #ffffff;
  background: transparent;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-checkbox__label) {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #00ffff;
  border-color: #00ffff;
}

// 添加颜色循环动画
@keyframes colorCycle {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}
</style>
