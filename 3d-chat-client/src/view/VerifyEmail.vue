<template>
  <div class="verify-container">
    <div class="verify-card">
      <!-- 验证中状态 -->
      <div v-if="verifying" class="verify-content">
        <el-icon class="verify-icon loading" size="64" color="#409EFF">
          <Loading />
        </el-icon>
        <h2>正在验证您的邮箱...</h2>
        <p>请稍候，我们正在处理您的验证请求。</p>
      </div>

      <!-- 验证成功状态 -->
      <div v-else-if="verifyResult === 'success'" class="verify-content">
        <el-icon class="verify-icon success" size="64" color="#67C23A">
          <SuccessFilled />
        </el-icon>
        <h2>邮箱验证成功！</h2>
        <p>恭喜您，您的邮箱已成功验证。现在您可以登录并开始使用3D Chat了。</p>
        
        <div class="verify-actions">
          <el-button type="primary" size="large" @click="goToLogin">
            前往登录
          </el-button>
        </div>
      </div>

      <!-- 验证失败状态 -->
      <div v-else-if="verifyResult === 'error'" class="verify-content">
        <el-icon class="verify-icon error" size="64" color="#F56C6C">
          <CircleCloseFilled />
        </el-icon>
        <h2>验证失败</h2>
        <p class="error-message">{{ errorMessage }}</p>
        
        <div class="verify-actions">
          <el-button @click="goToRegister">返回注册</el-button>
          <el-button type="primary" @click="showResendDialog = true">
            重新发送验证邮件
          </el-button>
        </div>
      </div>

      <!-- 无效链接状态 -->
      <div v-else class="verify-content">
        <el-icon class="verify-icon warning" size="64" color="#E6A23C">
          <WarningFilled />
        </el-icon>
        <h2>无效的验证链接</h2>
        <p>该验证链接无效或已过期。请重新注册或重新发送验证邮件。</p>
        
        <div class="verify-actions">
          <el-button @click="goToRegister">重新注册</el-button>
          <el-button type="primary" @click="showResendDialog = true">
            重新发送验证邮件
          </el-button>
        </div>
      </div>
    </div>

    <!-- 重新发送验证邮件对话框 -->
    <el-dialog
      v-model="showResendDialog"
      title="重新发送验证邮件"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form ref="resendFormRef" :model="resendForm" :rules="resendRules">
        <el-form-item label="邮箱地址" prop="email">
          <el-input
            v-model="resendForm.email"
            type="email"
            placeholder="请输入您的注册邮箱"
            prefix-icon="Message"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showResendDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="resendLoading"
            @click="handleResendVerification"
          >
            发送验证邮件
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Loading, 
  SuccessFilled, 
  CircleCloseFilled, 
  WarningFilled 
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 表单引用
const resendFormRef = ref<FormInstance>()

// 状态
const verifying = ref(false)
const verifyResult = ref<'success' | 'error' | null>(null)
const errorMessage = ref('')
const showResendDialog = ref(false)
const resendLoading = ref(false)

// 重新发送表单
const resendForm = reactive({
  email: ''
})

// 表单验证规则
const resendRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

// 验证邮箱
const verifyEmail = async (token: string) => {
  try {
    verifying.value = true
    const success = await authStore.verifyEmail(token)
    
    if (success) {
      verifyResult.value = 'success'
    } else {
      verifyResult.value = 'error'
      errorMessage.value = '验证令牌无效或已过期'
    }
  } catch (error: any) {
    verifyResult.value = 'error'
    errorMessage.value = error.message || '验证过程中发生错误'
  } finally {
    verifying.value = false
  }
}

// 重新发送验证邮件
const handleResendVerification = async () => {
  if (!resendFormRef.value) return

  try {
    await resendFormRef.value.validate()
    resendLoading.value = true

    const success = await authStore.resendVerification(resendForm.email)
    
    if (success) {
      ElMessage.success('验证邮件已重新发送，请检查您的邮箱')
      showResendDialog.value = false
      resendForm.email = ''
    }
  } catch (error) {
    console.error('Resend verification error:', error)
  } finally {
    resendLoading.value = false
  }
}

// 前往登录页面
const goToLogin = () => {
  router.push('/login')
}

// 前往注册页面
const goToRegister = () => {
  router.push('/register')
}

// 组件挂载时验证邮箱
onMounted(() => {
  const token = route.query.token as string
  
  if (token) {
    verifyEmail(token)
  } else {
    verifyResult.value = null
  }
})
</script>

<style scoped lang="less">
.verify-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.verify-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 500px;
  padding: 60px 40px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1);
  margin: 20px;
}

.verify-content {
  text-align: center;
  
  .verify-icon {
    margin-bottom: 24px;
    
    &.loading {
      animation: rotate 2s linear infinite;
    }
    
    &.success {
      animation: bounce 0.6s ease-out;
    }
    
    &.error {
      animation: shake 0.6s ease-out;
    }
    
    &.warning {
      animation: pulse 1s ease-in-out infinite;
    }
  }
  
  h2 {
    font-size: 24px;
    font-weight: bold;
    color: #00ffff;
    margin-bottom: 16px;
    background: linear-gradient(90deg, #00ffff 0%, #ff00ff 25%, #ffff00 50%, #ff00ff 75%, #00ffff 100%);
    background-size: 400% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: colorCycle 4s linear infinite;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
    margin-bottom: 24px;
    font-size: 16px;
  }
  
  .error-message {
    color: #F56C6C;
    font-weight: 500;
  }
  
  .verify-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    
    .el-button {
      min-width: 120px;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 动画效果
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translate3d(0, 0, 0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translate3d(-4px, 0, 0);
  }
  20%, 40%, 60%, 80% {
    transform: translate3d(4px, 0, 0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@media (max-width: 768px) {
  .verify-card {
    padding: 40px 20px;
    margin: 10px;
  }
  
  .verify-content {
    .verify-actions {
      flex-direction: column;
      align-items: center;
      
      .el-button {
        width: 100%;
        max-width: 200px;
      }
    }
  }
}
</style>
