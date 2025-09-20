<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">{{ $t('auth.login.title') }}</h1>
        <p class="login-subtitle">{{ $t('auth.login.subtitle') }}</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="loginField">
          <el-input
            v-model="loginForm.loginField"
            :placeholder="$t('auth.login.loginFieldPlaceholder')"
            size="large"
            prefix-icon="Message"
            :disabled="loading"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            :placeholder="$t('auth.login.passwordPlaceholder')"
            size="large"
            prefix-icon="Lock"
            show-password
            :disabled="loading"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <div class="form-options">
            <el-checkbox v-model="rememberMe">{{ $t('auth.login.rememberMe') }}</el-checkbox>
            <el-link type="primary" @click="showForgotPassword = true">
              {{ $t('auth.login.forgotPassword') }}
            </el-link>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            {{ loading ? $t('common.loading') : $t('auth.login.loginButton') }}
          </el-button>
        </el-form-item>

        <div class="register-link">
          <span>{{ $t('auth.login.noAccount') }}</span>
          <el-link type="primary" @click="$router.push('/register')">
            {{ $t('auth.login.registerLink') }}
          </el-link>
        </div>
      </el-form>
    </div>

    <!-- 忘记密码对话框 -->
    <el-dialog
      v-model="showForgotPassword"
      :title="$t('auth.login.resetPassword')"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form ref="forgotFormRef" :model="forgotForm" :rules="forgotRules">
        <el-form-item prop="email">
          <el-input
            v-model="forgotForm.email"
            type="email"
            :placeholder="$t('auth.login.resetPasswordPlaceholder')"
            prefix-icon="Message"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showForgotPassword = false">{{ $t('common.cancel') }}</el-button>
          <el-button
            type="primary"
            :loading="forgotLoading"
            @click="handleForgotPassword"
          >
            {{ $t('auth.login.sendResetEmail') }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElNotification } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 表单引用
const loginFormRef = ref<FormInstance>()
const forgotFormRef = ref<FormInstance>()

// 加载状态
const loading = ref(false)
const forgotLoading = ref(false)

// 表单数据
const loginForm = reactive({
  loginField: '',
  password: ''
})

const forgotForm = reactive({
  email: ''
})

// 其他状态
const rememberMe = ref(false)
const showForgotPassword = ref(false)

// 表单验证规则
const { t } = useI18n()

const loginRules: FormRules = {
  loginField: [
    { required: true, message: t('auth.validation.loginFieldRequired'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('auth.validation.passwordRequired'), trigger: 'blur' },
    { min: 8, message: t('auth.validation.passwordLength'), trigger: 'blur' }
  ]
}

const forgotRules: FormRules = {
  email: [
    { required: true, message: t('auth.validation.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.validation.emailInvalid'), trigger: 'blur' }
  ]
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
    loading.value = true

    const success = await authStore.login(loginForm.loginField, loginForm.password, rememberMe.value)
    
    if (success) {
      ElNotification({
        title: '登录成功',
        message: '欢迎回来！',
        type: 'success'
      })
      
      // 跳转到主页
      router.push('/')
    }
  } catch (error) {
    console.error('Login error:', error)
  } finally {
    loading.value = false
  }
}

// 忘记密码处理
const handleForgotPassword = async () => {
  if (!forgotFormRef.value) return

  try {
    await forgotFormRef.value.validate()
    forgotLoading.value = true

    // TODO: 实现忘记密码API调用
    ElMessage.success('重置密码邮件已发送，请检查您的邮箱')
    showForgotPassword.value = false
    forgotForm.email = ''
  } catch (error) {
    console.error('Forgot password error:', error)
  } finally {
    forgotLoading.value = false
  }
}
</script>

<style scoped lang="less">
.login-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1);
  margin: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-title {
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

.login-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin: 0;
}

.login-form {
  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .login-button {
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

.register-link {
  text-align: center;
  margin-top: 20px;
  color: rgba(255, 255, 255, 0.7);

  span {
    margin-right: 8px;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
