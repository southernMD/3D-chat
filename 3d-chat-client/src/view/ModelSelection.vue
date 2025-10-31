<template>
  <div class="model-selection-container">
    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧模型选择区域 -->
      <div class="model-section">
        <h2 class="section-title">{{ pageTitle }}</h2>
        
        <!-- 搜索和上传区域 -->
        <div class="action-bar">
          <div class="search-container">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('modelSelection.searchPlaceholder')"
              class="search-input"
            />
            <span class="search-icon">🔍</span>
          </div>
          
          <!-- 文件上传组件 -->
          <FileUploader
            :multiple="true"
            :max-file-size="100"
            :auto-upload="false"
            @file-selected="handleFileSelected"
            @upload-completed="handleUploadCompleted"
            @upload-error="handleUploadError"
          />
        </div>
        
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p class="loading-text">正在加载模型列表...</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-container">
          <div class="error-icon">⚠️</div>
          <p class="error-text">{{ error }}</p>
          <button class="retry-button" @click="loadModels">重试</button>
        </div>

        <!-- 空状态 -->
        <div v-else-if="filteredModels.length === 0" class="empty-container">
          <div class="empty-icon">📦</div>
          <p class="empty-text">暂无模型数据</p>
          <p class="empty-hint">请先上传一些3D模型文件</p>
        </div>

        <!-- 模型网格 -->
        <div v-else class="model-grid">
          <div
            v-for="model in filteredModels"
            :key="model.id"
            :class="['model-card', { selected: selectedModel === model.hash }]"
            @click="selectedModel = model.hash"
          >
            <div class="model-preview" :class="`model-${model.type}`">
              <div class="model-thumbnail">
                <img
                  v-if="model.previewUrl"
                  :src="model.previewUrl"
                  :alt="model.name"
                  class="model-preview-image"
                  @error="handleImageError"
                />
              </div>
            </div>
            <div class="model-info">
              <h4 class="model-name">{{ model.name }}</h4>
              <p class="model-size">{{ model.size }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧模型描述区域 -->
      <div class="description-section">
        <div class="description-card">
          <div v-if="currentModelInfo" class="model-detail">
            <h3 class="detail-title">{{ currentModelInfo.name }}</h3>
            
            <!-- 模型预览 -->
            <div class="model-preview-large" :class="`model-${currentModelInfo.type}`">
                <img
                  v-if="currentModelInfo.previewUrl"
                  :src="currentModelInfo.previewUrl"
                  :alt="currentModelInfo.name"
                  class="model-preview-image-large"
                  @error="handleImageError"
                />
            </div>

            <!-- 模型信息 -->
            <div class="model-details">
              <div class="detail-item">
                <span class="detail-label">文件大小:</span>
                <span class="detail-value">{{ currentModelInfo.size }}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">创建者:</span>
                <span class="detail-value">{{ currentModelInfo.createdBy }}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">上传时间:</span>
                <span class="detail-value">{{ currentModelInfo.createTime }}</span>
              </div>
            </div>
            
            <!-- 模型描述 -->
            <div class="model-description">
              <h4>{{ $t('modelSelection.description') }}</h4>
              <p>{{ currentModelInfo.description }}</p>
            </div>
            

          </div>
          
          <!-- 确认按钮 -->
          <div class="confirm-button-section">
            <button
              class="confirm-button"
              :disabled="!selectedModel"
              @click="confirmModelSelection"
            >
              <span class="button-text">{{ confirmButtonText }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 密码输入弹窗（加入私密房间时） -->
  <PinDialog
    v-model="showPinDialog"
    :title="'输入密码'"
    :message="passwordDialogMessage"
    placeholder="请输入房间密码"
    :maxlength="20"
    @confirm="handlePinConfirm"
    @cancel="closePinDialog"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import FileUploader from '@/components/FileUploader.vue'
import {
  getModelList,
  formatFileSize,
  formatDate,
  getModelPreviewUrl,
  type ModelInfo
} from '@/api/modelApi'
import { showError, showSuccess } from '@/utils/message'
import { useAuthStore } from '@/stores/auth'
import { useWebRTCStore, type RoomConfig } from '@/stores/webrtc'
import { checkRoomExists, checkRoomHasPassword, verifyRoomPassword } from '@/api/roomApi'
import PinDialog from '@/components/PinDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const webrtcStore = useWebRTCStore()

// 检查是否有ping码（从URL参数获取）
const pingCode = ref<string | null>(null)

// 私密房间密码弹窗状态
const showPinDialog = ref(false)
const passwordDialogMessage = computed(() => `该房间已设置密码，请输入密码以继续`)
const pendingSelectedForJoin = ref<any>(null)

// 搜索查询
const searchQuery = ref('')

// 选中的模型
const selectedModel = ref<string | null>(null)

// 模型数据
const models = ref<ModelInfo[]>([])

// 加载状态
const loading = ref(false)

// 错误状态
const error = ref('')

// 转换后的模型数据（用于显示）
interface DisplayModel {
  id: number
  name: string
  category: string
  type: string
  size: string
  description: string
  features: string[]
  createdBy: string
  createTime: string
  previewUrl: string
  hash: string
}

const displayModels = computed((): DisplayModel[] => {
  return models.value.map(model => ({
    id: model.id,
    name: model.name || `模型_${model.hash.substring(0, 8)}`,
    category: '',
    type: 'uploaded',
    size: formatFileSize(model.size),
    description: model.description || '用户上传的3D模型',
    features: [],
    createdBy: model.createdBy?.nickname || '未知用户',
    createTime: formatDate(model.createTime),
    previewUrl: getModelPreviewUrl(model.picPath),
    hash: model.hash
  }))
})

// 页面标题
const pageTitle = computed(() => {
  if (pingCode.value) {
    return `加入房间 (${pingCode.value.substring(0, 8)}...)`
  }
  return '选择3D模型'
})

// 确认按钮文本
const confirmButtonText = computed(() => {
  if (pingCode.value) {
    return '加入房间'
  }
  return '创建房间'
})

// 过滤后的模型
const filteredModels = computed(() => {
  if (!searchQuery.value) {
    return displayModels.value
  }
  return displayModels.value.filter(model =>
    model.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    model.createdBy.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 当前模型信息
const currentModelInfo = computed(() => {
  return displayModels.value.find(model => model.hash === selectedModel.value) || displayModels.value[0]
})

// 加载模型列表
const loadModels = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await getModelList()

    if (response.success && response.data) {
      models.value = response.data

      // 默认选择第一个模型
      if (displayModels.value.length > 0) {
        selectedModel.value = displayModels.value[0].hash
      }

      console.log(`加载了 ${response.data.length} 个模型`)
    } else {
      error.value = response.error || '加载模型列表失败'
      ElMessage.error(error.value)
    }
  } catch (err) {
    error.value = '网络错误，请稍后重试'
    ElMessage.error(error.value)
    console.error('加载模型列表失败:', err)
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  // 检查URL参数中是否有ping码
  const urlParams = new URLSearchParams(window.location.search)
  const urlPingCode = urlParams.get('pingCode')
  if (urlPingCode) {
    pingCode.value = urlPingCode
    console.log('检测到ping码:', urlPingCode)
  }

  loadModels()
})

// 组件销毁时清理资源
onUnmounted(() => {
  // WebRTC store会在应用级别管理，这里不需要清理
  // 如果需要，可以调用 webrtcStore.cleanup()
})

// 图片加载错误处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  // 可以在这里设置默认图片或显示图标
}

// 文件选择处理
const handleFileSelected = (files: File[]) => {
  console.log('Files selected:', files)
  ElMessage.info(`已选择 ${files.length} 个文件`)
}

// 文件上传完成处理
const handleUploadCompleted = (file: any) => {
  console.log('File uploaded:', file)
  ElMessage.success(`文件 ${file.name} 上传成功！`)

  // 重新加载模型列表
  loadModels()
}

// 文件上传错误处理
const handleUploadError = (file: any, error: string) => {
  console.error('Upload error:', error)
  ElMessage.error(`文件 ${file.name} 上传失败：${error}`)
}

// 这些回调函数现在由WebRTC store管理，不再需要在组件中定义

// 确认模型选择
const confirmModelSelection = async () => {
  if (!selectedModel.value) {
    showError('请先选择一个模型')
    return
  }

  const selected = displayModels.value.find(model => model.hash === selectedModel.value)
  if (!selected) {
    showError('选择的模型无效')
    return
  }

  // 检查是否是通过ping码加入房间
  if (pingCode.value) {
    // 通过ping码加入房间
    await joinRoomByPingCode(selected)
    return
  }

  // 创建新房间的逻辑
  let roomConfig:RoomConfig
  try {
    roomConfig = JSON.parse(history.state.mapConfig)
  } catch (error) {
    showError('房间配置无效')
    return
  }

  console.log('选择的模型:', selectedModel.value)
  console.log('房间配置:', roomConfig)
  console.log('用户信息:', authStore.user)

  try {
    // 初始化WebRTC管理器
    console.log('1. 初始化WebRTC管理器...')
    webrtcStore.initializeWebRTCManager()
    console.log('WebRTC管理器初始化完成')

    // 连接到服务器
    console.log('2. 连接到服务器...')
    const connected = await webrtcStore.connectToServer()
    console.log('连接结果:', connected)

    if (!connected) {
      console.error('服务器连接失败')
      showError('连接服务器失败')
      return
    }

    // 使用真实的用户名
    const userName = authStore.user?.username || '用户'
    console.log('3. 准备创建房间，用户名:', userName)

    // 创建并加入房间
    console.log('4. 创建并加入房间...')
    const success = await webrtcStore.createAndJoinRoom(
      roomConfig,
      selectedModel.value!,
      selected,
      userName
    )
    webrtcStore.roomConfig = roomConfig

    console.log('房间创建结果:', success)

    if (success) {
      console.log('5. 房间创建成功，准备跳转...')
      showSuccess('房间创建成功，正在进入聊天室...')

      // 跳转到3D聊天室
      router.push({
        path: '/3d-chat-room',
        state: {
          roomConfig: JSON.stringify(roomConfig),
          modelHash: selectedModel.value,
          modelInfo: JSON.stringify(selected)
        }
      })
    } else {
      console.error('房间创建失败')
      showError('创建房间失败')
    }

  } catch (error) {
    console.error('=== 模型选择确认流程出错 ===', error)
    showError('创建房间失败，请重试')
  }
}

// 通过ping码加入房间
const joinRoomByPingCode = async (selected: any) => {
  console.log('通过ping码加入房间:', pingCode.value)
  console.log('选择的模型:', selectedModel.value)
  console.log('用户信息:', authStore.user)

  try {
    //检查对应房间是否需要密码
    const { data } = await checkRoomHasPassword(pingCode.value!)
    if(data?.exists){
      pendingSelectedForJoin.value = selected
      showPinDialog.value = true
      return
    }
    await continueJoin(selected)
  } catch (error) {
    console.error('=== 加入房间流程出错 ===', error)
    showError('加入房间失败，请重试')
  }
}

// 处理密码确认
const handlePinConfirm = async (value: string) => {
  if (!pingCode.value) return
  const verify = await verifyRoomPassword(pingCode.value, value.trim())
  if (!verify.success || !verify.data?.isRight) {
    showError('密码错误，请重新输入')
    return
  }
  showSuccess('密码验证通过')
  showPinDialog.value = false
  const selected = pendingSelectedForJoin.value
  pendingSelectedForJoin.value = null
  await continueJoin(selected)
}

const closePinDialog = () => {
  showPinDialog.value = false
  pendingSelectedForJoin.value = null
}

// 验证通过后继续加入
const continueJoin = async (selected: any) => {
  // 初始化WebRTC管理器
  console.log('1. 初始化WebRTC管理器...')
  webrtcStore.initializeWebRTCManager()
  console.log('WebRTC管理器初始化完成')

    // 连接到服务器
    console.log('2. 连接到服务器...')
    const connected = await webrtcStore.connectToServer()
    console.log('连接结果:', connected)

    if (!connected) {
      console.error('服务器连接失败')
      showError('连接服务器失败')
      return
    }

    // 使用真实的用户名
    const userName = authStore.user?.username || '用户'
    console.log('3. 准备加入房间，用户名:', userName)

    // 再次检查房间是否存在（防止在选择模型期间房间被删除）
    console.log('4. 再次检查房间是否存在...')
    const roomCheck = await checkRoomExists(pingCode.value!)

    if (!roomCheck.data?.exists) {
      showError('房间已不存在或被删除，请重新获取房间码')
      return
    }

    // 直接加入房间（使用房间UUID作为ping码）
    console.log('5. 通过ping码加入房间...')
    const success = await webrtcStore.joinRoomByUUID(
      pingCode.value!,
      selectedModel.value!,
      selected,
      userName
    )

    console.log('加入房间结果:', success)

    if (success) {
      console.log('6. 成功加入房间，准备跳转...')
      showSuccess('成功加入房间，正在进入聊天室...')

      // 跳转到3D聊天室
      router.push({
        path: '/3d-chat-room',
        state: {
          roomUUID: pingCode.value,
          modelHash: selectedModel.value,
          modelInfo: JSON.stringify(selected),
          joinedByPingCode: true
        }
      })
    } 
}
</script>

<style scoped lang="less">
.model-selection-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
  overflow-x: hidden;
}

.main-content {
  display: flex;
  gap: 30px;
  padding: 120px 40px 40px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100vh;
}

.model-section {
  flex: 2;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 30px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.5);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 255, 255, 0.7);
    }
  }
}

.section-title {
  font-size: 2rem;
  color: #00ffff;
  margin-bottom: 30px;
  text-align: center;
}

.action-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  align-items: center;
}

.search-container {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 15px 50px 15px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  color: #ffffff;
  font-size: 1rem;
  backdrop-filter: blur(10px);

  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
}

.search-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.2rem;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.model-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    border-color: rgba(0, 255, 255, 0.5);
    transform: translateY(-5px);
  }

  &.selected {
    border-color: #00ffff;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }
}

.model-preview {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);

  &.model-character {
    background: linear-gradient(135deg, #2a1a4e 0%, #3a2a6e 100%);
  }
}

.model-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-icon {
  font-size: 3rem;
}

.model-info {
  padding: 15px;
}

.model-name {
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 5px;
  font-weight: 600;
}

.model-category {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-bottom: 3px;
}

.model-size {
  color: rgba(0, 255, 255, 0.8);
  font-size: 0.75rem;
  font-weight: 500;
}

.model-preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.model-preview-image-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

// 加载状态样式
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.7);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 255, 255, 0.3);
  border-top: 3px solid #00ffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1rem;
  margin: 0;
}

// 错误状态样式
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.7);
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.error-text {
  font-size: 1rem;
  margin-bottom: 20px;
  text-align: center;
}

.retry-button {
  padding: 10px 20px;
  background: rgba(255, 0, 0, 0.2);
  border: 1px solid rgba(255, 0, 0, 0.5);
  border-radius: 8px;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 0, 0, 0.3);
    border-color: #ff6b6b;
  }
}

// 空状态样式
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.7);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.8);
}

.empty-hint {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.description-section {
  flex: 1;
  min-width: 350px;
}

.description-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(255, 0, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 30px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-title {
  font-size: 1.5rem;
  color: #ff00ff;
  margin-bottom: 25px;
  text-align: center;
}

.model-preview-large {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  margin-bottom: 20px;

  &.model-character {
    background: linear-gradient(135deg, #2a1a4e 0%, #3a2a6e 100%);
  }
}

.model-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-icon-large {
  font-size: 5rem;
}

.model-details {
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.detail-value {
  color: #ffffff;
  font-weight: 600;
}

.model-description {
  margin-bottom: 20px;

  h4 {
    color: #ffffff;
    margin-bottom: 10px;
    font-size: 1.1rem;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.5;
  }
}



.confirm-button-section {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 0, 255, 0.2);
}

.confirm-button {
  width: 100%;
  padding: 20px;
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  border: none;
  border-radius: 15px;
  color: #000000;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 255, 255, 0.4);
    background: linear-gradient(45deg, #ff00ff, #00ffff);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    padding: 100px 20px;
    height: auto;
    min-height: calc(100vh - 140px);
  }

  .action-bar {
    flex-direction: column;
    gap: 15px;
  }

  .model-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
  }
}
</style>