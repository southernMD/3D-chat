<template>

    <div class="file-uploader">
        <!-- 上传按钮 -->
        <button class="upload-button" @click="showUploadDialog">
            <span class="upload-icon">📁</span>
            <span>{{ $t('modelSelection.uploadModel') }}</span>
        </button>

        <!-- 上传对话框 -->
        <teleport to="body">
            <div v-if="showUpload" class="upload-dialog-overlay" @click.self="closeUploadDialog">
                <div class="upload-dialog">
                    <div class="upload-header">
                        <h3>{{ $t('modelSelection.uploadDialog.title') }}</h3>
                        <button class="close-btn" @click="closeUploadDialog">×</button>
                    </div>
                    <div class="upload-content-wrapper">
                        <!-- 左侧上传区域 -->
                        <div class="upload-section">
                            <div class="upload-content">
                                <!-- 动作检测蒙版 -->
                                <div v-if="isDetectingAnimation" class="detection-overlay">
                                    <div class="detection-content">
                                        <div class="loading-spinner"></div>
                                        <p>{{ $t('fileUploader.detectingAnimation') }}</p>
                                    </div>
                                </div>

                                <!-- 拖拽上传区域 -->
                                <div class="drag-upload-area"
                                    :class="{ 'drag-over': isDragOver, 'uploading': isUploading }" @drop="handleDrop"
                                    @dragover.prevent="handleDragOver" @dragenter.prevent="handleDragEnter"
                                    @dragleave.prevent="handleDragLeave" @click="triggerFileSelect">
                                    <div class="upload-icon">📎</div>
                                    <p v-if="!isUploading">{{ $t('fileUploader.dragDrop') }}</p>
                                    <p v-else class="uploading-prompt">正在处理文件中，请等待...</p>
                                    <p class="upload-note">{{ $t('fileUploader.supportedFormats') }}</p>
                                    <p class="format-requirements">支持: GLB/GLTF 模型文件, ZIP 压缩包(PMX+纹理+VMD)</p>
                                    <button class="select-file-btn" @click.stop="triggerFileSelect"
                                        :disabled="isUploading">
                                        {{ $t('fileUploader.selectFiles') }}
                                    </button>
                                </div>

                                <!-- 隐藏的文件输入 -->
                                <input ref="fileInput" type="file" :multiple="false" :accept="'.glb,.gltf,.zip'"
                                    style="display: none" @change="handleFileSelect" :disabled="isUploading" />

                                <!-- 文件列表和进度 -->
                                <div v-if="uploadFiles.length > 0" class="upload-list">
                                    <h4 class="list-title">{{ $t('fileUploader.uploadList') }}</h4>

                                    <div class="file-items">
                                        <div v-for="file in uploadFiles" :key="file.id" class="file-item"
                                            :class="{ 'completed': file.status === 'completed', 'error': file.status === 'error' }">
                                            <!-- 文件信息 -->
                                            <div class="file-info">
                                                <div class="file-icon">
                                                    <span v-if="file.status === 'completed'">✅</span>
                                                    <span v-else-if="file.status === 'error'">❌</span>
                                                    <span v-else>📄</span>
                                                </div>

                                                <div class="file-details">
                                                    <div class="file-name" :title="file.name">{{ file.name }}</div>
                                                    <div class="file-size">{{ formatFileSize(file.size) }}</div>
                                                </div>
                                            </div>

                                            <!-- 进度条 -->
                                            <div v-if="file.status === 'uploading' || file.status === 'completed'"
                                                class="progress-container">
                                                <div class="progress-bar">
                                                    <div class="progress-fill" :style="{ width: file.progress + '%' }"
                                                        :class="{ 'completed': file.status === 'completed' }"></div>
                                                </div>
                                                <div class="progress-text">
                                                    {{ file.progress }}%
                                                    <span v-if="file.status === 'uploading'" class="upload-speed">
                                                        ({{ formatSpeed(file.uploadSpeed) }})
                                                    </span>
                                                </div>
                                            </div>

                                            <!-- 错误信息 -->
                                            <div v-if="file.status === 'error'" class="error-message">
                                                {{ file.errorMessage }}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 批量操作 -->
                                    <div class="batch-actions">
                                        <button class="batch-btn upload-btn" @click="uploadAllFiles"
                                            :disabled="!canUpload || isUploading || isUploadingDebounce">
                                            <span v-if="isUploadingDebounce">处理中...</span>
                                            <span v-else>{{ $t('fileUploader.upload') }}</span>
                                        </button>

                                        <button class="batch-btn cancel-btn" @click="cancelUpload"
                                            :disabled="!isUploading">
                                            取消上传
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 右侧信息表单 -->
                        <div class="info-section">
                                <div class="info-form">
                                    <h4 class="form-title">模型信息</h4>

                                    <!-- 模型预览 -->
                                    <div class="form-group">
                                        <label class="form-label">模型预览 <span class="required">*</span></label>
                                        <div class="model-preview-area"
                                            :class="{ 'has-model': hasModelLoaded }">

                                            <div class="model-preview-container">
                                                <canvas ref="modelCanvas" class="model-canvas" 
                                                    :style="{ display: hasModelLoaded ? 'block' : 'none' }"></canvas>
                                                <div v-if="hasModelLoaded" class="model-overlay">
                                                    <div class="model-controls">
                                                        <button type="button" class="control-btn reset-btn"
                                                            @click="resetModelView" title="重置视角">🔄</button>
                                                    </div>
                                                </div>
                                                
                                                <div v-if="!hasModelLoaded" class="model-upload-prompt">
                                                    <div class="upload-icon">🎯</div>
                                                    <p>请先选择模型文件</p>
                                                    <p class="upload-note">将会自动加载预览</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 模型名称 -->
                                    <div class="form-group">
                                        <label class="form-label">模型名称 <span class="required">*</span></label>
                                        <input v-model="modelInfo.name" type="text" class="form-input"
                                            placeholder="请输入模型名称" maxlength="50" />
                                        <div class="input-hint">{{ modelInfo.name.length }}/50</div>
                                    </div>

                                    <!-- 模型大小 -->
                                    <div class="form-group">
                                        <label class="form-label">模型大小</label>
                                        <div class="size-display">
                                            <div class="size-item">
                                                <span>文件大小:</span>
                                                <span>{{ formatFileSize(modelInfo.fileSize) }}</span>
                                            </div>
                                            <div class="size-item">
                                                <span>格式:</span>
                                                <span>{{ modelInfo.format }}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 模型描述 -->
                                    <div class="form-group">
                                        <label class="form-label">模型描述</label>
                                        <textarea v-model="modelInfo.description" class="form-textarea"
                                            placeholder="请描述您的模型特色、用途或设计理念..." maxlength="500" rows="4"></textarea>
                                        <div class="input-hint">{{ modelInfo.description.length }}/500</div>
                                    </div>

                                </div>
                        </div>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js'
import { useI18n } from 'vue-i18n'
import JSZip from 'jszip'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { showError, showInfo, showSuccess, showWarning } from '@/utils/message';
import { calculateFileHash } from '@/utils/fileHash';
import { useAuthStore } from '@/stores/auth';

// 类型定义
interface UploadFile {
    id: string
    name: string
    size: number
    file: File
    status: 'pending' | 'uploading' | 'completed' | 'error'
    progress: number
    uploadSpeed: number
    errorMessage?: string
    startTime?: number
}

// Props
interface Props {
    accept?: string
    multiple?: boolean
    maxFileSize?: number // MB
}

const props = withDefaults(defineProps<Props>(), {
    accept: '.glb,.gltf,.zip',
    multiple: false,
    maxFileSize: 500,
})

// Emits
const emit = defineEmits<{
    fileSelected: [files: File[]]
    uploadProgress: [file: UploadFile]
    uploadCompleted: [file: UploadFile]
    uploadError: [file: UploadFile, error: string]
    allUploadsCompleted: [files: UploadFile[]]
}>()

// Composables
const { t } = useI18n()
const authStore = useAuthStore()

// Refs
const fileInput = ref<HTMLInputElement | null>(null)
const uploadFiles = ref<UploadFile[]>([])
const isDragOver = ref(false)
const showUpload = ref(false)
const isDetectingAnimation = ref(false)
const currentModelType = ref<'glb' | 'gltf' | 'pmx' | null>(null)
const waitingForVmd = ref(false)
const isUploading = ref(false)
const currentXHR = ref<XMLHttpRequest | null>(null) // 保存当前的xhr引用
const abortController = ref<AbortController | null>(null) // 用于取消hash计算和压缩
const currentWorkers = ref<Worker[]>([]) // 保存当前运行的Workers
const activeURLs = ref<string[]>([]) // 保存所有创建的URL对象，用于清理

// 模型预览相关
const modelCanvas = ref<HTMLCanvasElement | null>(null)
const hasModelLoaded = ref(false)
const modelInfo = ref({
    name: '',
    description: '',
    fileSize: 0,
    format: ''
})

// Three.js 相关
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let currentModel: THREE.Group | null = null
let animationFrameId: number | null = null

// Computed
const hasUploadableFiles = computed(() =>
    uploadFiles.value.some(file => file.status === 'pending' || file.status === 'error')
)

const hasCompletedFiles = computed(() =>
    uploadFiles.value.some(file => file.status === 'completed')
)

const canUpload = computed(() => {
    return hasUploadableFiles.value
})

// 方法
const showUploadDialog = () => {
    // 打开弹窗前先清理之前的资源
    performResourceCleanup()
    resetUploadState()
    showUpload.value = true
    console.log('📂 上传弹窗已打开，资源已清理')
}

const triggerFileSelect = () => {
    // 如果正在上传，不允许选择文件
    if (isUploading.value) {
        showWarning('上传过程中不允许添加文件')
        return
    }
    fileInput.value?.click()
}

// 拖拽事件处理
const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    // 如果正在上传，不允许拖拽
    if (isUploading.value) {
        return
    }
    isDragOver.value = true
}

const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    // 如果正在上传，不允许拖拽
    if (isUploading.value) {
        return
    }
    isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    // 如果正在上传，不处理拖拽事件
    if (isUploading.value) {
        return
    }
    // 只有当离开整个拖拽区域时才取消高亮
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
    ) {
        isDragOver.value = false
    }
}

const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    isDragOver.value = false

    // 如果正在上传，不允许添加文件
    if (isUploading.value) {
        showWarning('上传过程中不允许添加文件')
        return
    }

    const files = Array.from(event.dataTransfer?.files || [])
    if (files.length > 0) {
        processFiles(files)
    }
}

const handleFileSelect = (event: Event) => {
    // 如果正在上传，不允许添加文件
    if (isUploading.value) {
        showWarning('上传过程中不允许添加文件')
        return
    }

    const target = event.target as HTMLInputElement
    const files = Array.from(target.files || [])

    if (files.length > 0) {
        processFiles(files)
    }

    // 清空input
    if (target) target.value = ''
}

const processFiles = async (files: File[]) => {
    if (files.length === 0) return

    // 单文件上传限制
    if (files.length > 1) {
        showWarning(t('fileUploader.singleFileOnly'))
        return
    }

    const file = files[0]
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    // PMX 模型必须是 ZIP 格式
    if (fileExtension === '.pmx') {
        showError('PMX 模型必须以 ZIP 压缩包格式上传，压缩包内需包含 .pmx 文件、贴图文件(.png)和动作文件(.vmd)')
        return
    }

    // 检查是否为VMD文件
    if (fileExtension === '.vmd') {
        showError('VMD 文件应该与 PMX 模型一起打包在 ZIP 文件中上传')
        return
    }

    // 选择新的glb/gltf/zip文件时，自动清空已有列表
    if (fileExtension === '.glb' || fileExtension === '.gltf' || fileExtension === '.zip') {
        uploadFiles.value = []
        resetUploadState()
    }

    // 验证文件
    if (!validateFile(file)) {
        return
    }

    // 处理 ZIP 文件
    if (fileExtension === '.zip') {
        try {
            showSuccess('正在解析 ZIP 文件...')
            const zipContents = await parseZipFile(file)
            
            if (!zipContents.pmxFile) {
                showError('ZIP 文件中未找到 PMX 模型文件，无法上传')
                return
            }

            // 设置模型类型为 PMX
            currentModelType.value = 'pmx'

            // 添加 PMX 文件到上传列表
            const pmxUploadFile: UploadFile = {
                id: generateId(),
                name: zipContents.pmxFile.name,
                size: zipContents.pmxFile.size,
                file: zipContents.pmxFile,
                status: 'pending',
                progress: 0,
                uploadSpeed: 0
            }
            uploadFiles.value.push(pmxUploadFile)

            // 添加纹理文件到上传列表
            for (const [fileName, textureFile] of zipContents.textures) {
                const textureUploadFile: UploadFile = {
                    id: generateId(),
                    name: fileName,
                    size: textureFile.size,
                    file: textureFile,
                    status: 'pending',
                    progress: 0,
                    uploadSpeed: 0
                }
                uploadFiles.value.push(textureUploadFile)
            }

            // 添加 VMD 文件到上传列表
            for (const vmdFile of zipContents.vmdFiles) {
                const vmdUploadFile: UploadFile = {
                    id: generateId(),
                    name: vmdFile.name,
                    size: vmdFile.size,
                    file: vmdFile,
                    status: 'pending',
                    progress: 0,
                    uploadSpeed: 0
                }
                uploadFiles.value.push(vmdUploadFile)
            }

            // 自动填充模型信息
            modelInfo.value.name = zipContents.pmxFile.name.replace(/\.[^/.]+$/, '')
            modelInfo.value.fileSize = uploadFiles.value.reduce((total, f) => total + f.size, 0)
            modelInfo.value.format = 'PMX'

            // 加载模型预览（传入原始 ZIP 文件用于预览）
            loadModelPreview(file, 'zip')

            showSuccess(`ZIP 解析成功：${zipContents.pmxFile.name} + ${zipContents.textures.size} 个纹理 + ${zipContents.vmdFiles.length} 个动作文件`)

            // 触发事件
            emit('fileSelected', Array.from(uploadFiles.value.map(f => f.file)))

        } catch (error) {
            console.error('ZIP 文件解析失败:', error)
            showError('ZIP 文件解析失败: ' + (error instanceof Error ? error.message : '未知错误'))
            return
        }
    } else {
        // 处理 GLB/GLTF 文件
        const newFile: UploadFile = {
            id: generateId(),
            name: file.name,
            size: file.size,
            file,
            status: 'pending',
            progress: 0,
            uploadSpeed: 0
        }

        uploadFiles.value.push(newFile)

        // 设置当前模型类型
        if (fileExtension === '.glb') {
            currentModelType.value = 'glb'
        } else if (fileExtension === '.gltf') {
            currentModelType.value = 'gltf'
        }

        // 自动填充模型信息并加载预览
        modelInfo.value.name = file.name.replace(/\.[^/.]+$/, '')
        modelInfo.value.fileSize = file.size
        modelInfo.value.format = fileExtension.toUpperCase().slice(1)
        
        // 加载模型预览
        loadModelPreview(file, fileExtension.slice(1) as 'glb' | 'gltf')

        showSuccess(`${fileExtension.toUpperCase().slice(1)} 模型加载成功`)

        // 触发事件
        emit('fileSelected', [file])
    }
}

const validateFile = (file: File): boolean => {
    // 检查文件大小
    const maxSize = props.maxFileSize * 1024 * 1024 * 5// MB to bytes
    if (file.size > maxSize) {
        showError(t('fileUploader.fileTooLarge', { name: file.name, size: props.maxFileSize }))
        return false
    }

    // 检查文件类型
    const allowedExtensions = props.accept.split(',').map(ext => ext.trim().toLowerCase())
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedExtensions.includes(fileExtension)) {
        showError(t('fileUploader.invalidFileType', { name: file.name }))
        return false
    }

    return true
}


// 创建可取消的压缩任务
const createCancellableZip = async (
    zip: JSZip,
    signal: AbortSignal,
    onProgress: (progress: number) => void
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        // 监听取消信号
        const onAbort = () => {
            reject(new Error('压缩被取消'))
        }

        if (signal.aborted) {
            reject(new Error('压缩被取消'))
            return
        }

        signal.addEventListener('abort', onAbort)

        // 生成压缩文件
        zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        }, (metadata) => {
            // 检查是否被取消
            if (signal.aborted) {
                return
            }
            onProgress(metadata.percent)
        }).then((blob) => {
            signal.removeEventListener('abort', onAbort)
            if (signal.aborted) {
                reject(new Error('压缩被取消'))
            } else {
                resolve(blob)
            }
        }).catch((error) => {
            signal.removeEventListener('abort', onAbort)
            reject(error)
        })
    })
}


// 使用原生XHR上传ZIP文件
const uploadWithXHR = async (zipBlob: Blob, files: UploadFile[], modelHash: string, modelScreenshot?: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const xhr = new XMLHttpRequest()
            const formData = new FormData()
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const zipFileName = `${modelHash}.zip` // 使用模型文件hash作为文件名

            formData.append('file', zipBlob, zipFileName)

            // 添加模型信息到FormData
            const modelData = {
                name: modelInfo.value.name,
                description: modelInfo.value.description,
                size: modelInfo.value.fileSize.toString(),
                format: modelInfo.value.format,
                hash: modelHash,
                screenshot: modelScreenshot // 直接添加base64截图字符串
            }
            formData.append('modelInfo', JSON.stringify(modelData))
            formData.append('user',JSON.stringify(authStore.user))
            // 监听上传进度
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const uploadProgress = (event.loaded / event.total) * 100
                    // 压缩占怰30%，上传占怰70%
                    const totalProgress = 30 + (uploadProgress * 0.7)

                    files.forEach(file => {
                        file.progress = Math.round(totalProgress)

                        // 计算上传速度
                        if (file.startTime) {
                            const timeElapsed = (Date.now() - file.startTime) / 1000
                            file.uploadSpeed = event.loaded / timeElapsed
                        }

                        emit('uploadProgress', file)
                    })
                }
            })

            // 监听上传完成
            xhr.addEventListener('load', () => {
                currentXHR.value = null // 清除引用
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText)
                        if (response.success) {
                            resolve()
                        } else {
                            reject(new Error(response.error || '上传失败'))
                        }
                    } catch (error) {
                        reject(new Error('服务器响应格式错误'))
                    }
                } else if (xhr.status === 401) {
                    // 认证失败
                    reject(new Error('登录已过期，请重新登录'))
                } else if (xhr.status === 403) {
                    reject(new Error('Token无效，请重新登录'))
                } else {
                    reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
                }
            })

            // 监听上传错误
            xhr.addEventListener('error', () => {
                currentXHR.value = null // 清除引用
                reject(new Error('网络错误'))
            })

            // 监听上传取消
            xhr.addEventListener('abort', () => {
                currentXHR.value = null // 清除引用
                reject(new Error('上传被取消'))
            })

            // 开始上传
            xhr.open('POST', API_BASE_URL + '/file/upload-zip')

            // 添加JWT认证头
            if (authStore.token) {
                xhr.setRequestHeader('Authorization', `Bearer ${authStore.token}`)
            }

            xhr.send(formData)

            // 保存xhr引用以便取消
            currentXHR.value = xhr
            files.forEach(file => {
                (file as any).xhr = xhr
            })
        } catch (error) {
            reject(new Error('计算hash失败: ' + (error instanceof Error ? error.message : '未知错误')))
        }
    })
}

// 防抖变量
const isUploadingDebounce = ref(false)

const uploadAllFiles = async () => {
    // 防抖检查
    if (isUploadingDebounce.value) {
        console.log('⚠️ 上传按钮防抖中，忽略重复点击')
        return
    }

    // 设置防抖标志
    isUploadingDebounce.value = true

    try {
    // 检查用户是否已登录
    // if (!authStore.isAuthenticated) {
    //     showError('请先登录后再上传文件')
    //     return
    // }

    const filesToUpload = uploadFiles.value.filter(
        file => file.status === 'pending' || file.status === 'error'
    )

    if (filesToUpload.length === 0) {
        showWarning('没有可上传的文件')
        return
    }

    // 简化的文件检查：ZIP 文件在上传时验证内容，GLB/GLTF 直接上传

    const hasGlbFile = filesToUpload.some(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        return ext === '.glb' || ext === '.gltf'
    })
    if (hasGlbFile) {
        if (!await checkGLBModel(filesToUpload[0].file)) {
            showError(`glb模型必须包含动作walk和stand}`)
            return
        }
    }

    try {
        // 在上传前截图
        let modelScreenshot = ''
        if (hasModelLoaded.value) {
            modelScreenshot = captureModelScreenshot()
            console.log('模型截图已生成，长度:', modelScreenshot.length)
        }

        // 设置上传状态
        isUploading.value = true

        // 更新所有文件状态为上传中
        filesToUpload.forEach(file => {
            file.status = 'uploading'
            file.progress = 0
            file.startTime = Date.now()
        })
        // 找到主要模型文件（glb/gltf或pmx）
        const mainModelFile = filesToUpload.find(file => {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase()
            return ext === '.glb' || ext === '.gltf' || ext === '.pmx'
        })

        if (!mainModelFile) {
            throw new Error('未找到主要模型文件')
        }

        // 创建 AbortController 用于取消操作
        abortController.value = new AbortController()
        const signal = abortController.value.signal

        // 检查是否被取消
        if (signal.aborted) {
            throw new Error('上传被取消')
        }

        // 计算主要模型文件的hash作为压缩包名
        console.log('正在计算主要模型文件hash:', mainModelFile.name)
        const modelHash = await calculateFileHash(mainModelFile.file, signal, currentWorkers.value)
        console.log('主要模型文件hash:', modelHash)

        // 检查是否被取消
        if (signal.aborted) {
            throw new Error('上传被取消')
        }

        // 统一上传逻辑：所有文件都压缩成ZIP上传
        const zip = new JSZip()

        filesToUpload.forEach(uploadFile => {
            zip.file(uploadFile.name, uploadFile.file)
        })

        // 生成压缩文件（支持取消）
        const zipBlob = await createCancellableZip(zip, signal, (progress) => {
            // 更新压缩进度
            filesToUpload.forEach(file => {
                file.progress = Math.round(progress * 0.3) // 压缩占30%进度
                emit('uploadProgress', file)
            })
        })

        // 使用原生XHR上传
        await uploadWithXHR(zipBlob, filesToUpload, modelHash, modelScreenshot)

        // 所有文件上传完成
        filesToUpload.forEach(file => {
            file.status = 'completed'
            file.progress = 100
            emit('uploadCompleted', file)
        })

        showSuccess('文件上传完成')
        emit('allUploadsCompleted', filesToUpload)

    } catch (error) {
        // 所有文件上传失败
        filesToUpload.forEach(file => {
            file.status = 'error'
            file.errorMessage = error instanceof Error ? error.message : t('fileUploader.uploadFailed')
            emit('uploadError', file, file.errorMessage)
        })
        showError('文件上传失败')
    } finally {
        // 重置上传状态
        isUploading.value = false
        currentXHR.value = null // 清除xhr引用
        abortController.value = null // 清除AbortController引用
        // 清理所有workers
        currentWorkers.value.forEach(worker => {
            worker.terminate()
        })
        currentWorkers.value = []

        // 清除防抖标志（延迟500ms防止快速重复点击）
        setTimeout(() => {
            isUploadingDebounce.value = false
        }, 500)
    }
    } catch (outerError) {
        console.error('上传过程中发生错误:', outerError)
        showError('上传失败: ' + (outerError instanceof Error ? outerError.message : '未知错误'))

        // 清除防抖标志
        setTimeout(() => {
            isUploadingDebounce.value = false
        }, 500)
    }
}


const clearCompletedFiles = () => {
    uploadFiles.value = uploadFiles.value.filter(file => file.status !== 'completed')
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s'

    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))

    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
}


// Three.js 初始化
const initThreeJS = () => {
    if (!modelCanvas.value) {
        console.error('❌ 模型画布未找到，无法初始化Three.js')
        return
    }

    try {
        console.log('🔧 开始初始化Three.js...')

        // 清理之前的资源
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
        }

        if (renderer) {
            renderer.dispose()
        }

        if (controls) {
            controls.dispose()
        }

        // 场景
        scene = new THREE.Scene()
        scene.background = new THREE.Color(0x1a1a1a)
        console.log('✅ 场景创建完成')

        // 相机
        camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
        camera.position.set(0, 1, 3)
        console.log('✅ 相机创建完成')

        // 渲染器
        renderer = new THREE.WebGLRenderer({
            canvas: modelCanvas.value,
            antialias: true,
            preserveDrawingBuffer: true // 保持绘制缓冲区，用于截图
        })
        renderer.setSize(300, 300)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        console.log('✅ 渲染器创建完成')

        // 控制器
        controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.1
        controls.enableZoom = true
        console.log('✅ 控制器创建完成')

        // 灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 1)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(1, 1, 1)
        directionalLight.castShadow = true
        scene.add(directionalLight)
        console.log('✅ 灯光添加完成')

        // 开始渲染循环
        animate()
        console.log('🎉 Three.js初始化完成')
    } catch (error) {
        console.error('❌ Three.js初始化失败:', error)
        showError('3D预览初始化失败')
    }
}

// 动画循环
const animate = () => {
    if (!renderer || !scene || !camera || !controls) {
        console.warn('⚠️ 动画循环停止：Three.js组件未就绪')
        return
    }

    try {
        animationFrameId = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
    } catch (error) {
        console.error('❌ 渲染错误:', error)
        // 尝试重新初始化
        ensureThreeJSReady()
    }
}

// ZIP 文件内容接口
interface ZipContents {
    pmxFile?: File
    textures: Map<string, File>
    vmdFiles: File[]
}

// 解析 ZIP 文件内容
const parseZipFile = async (zipFile: File): Promise<ZipContents> => {
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(zipFile)
    
    const contents: ZipContents = {
        textures: new Map(),
        vmdFiles: []
    }
    
    for (const [fileName, fileEntry] of Object.entries(zipContent.files)) {
        if (fileEntry.dir) continue
        
        const ext = '.' + fileName.split('.').pop()?.toLowerCase()
        
        if (ext === '.pmx') {
            const blob = await fileEntry.async('blob')
            contents.pmxFile = new File([blob], fileName)
        } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            const blob = await fileEntry.async('blob')
            const textureFile = new File([blob], fileName)
            contents.textures.set(fileName, textureFile)
        } else if (ext === '.vmd') {
            const blob = await fileEntry.async('blob')
            const vmdFile = new File([blob], fileName)
            contents.vmdFiles.push(vmdFile)
        }
    }
    
    return contents
}

// 加载模型预览
const loadModelPreview = async (file: File, fileType: 'glb' | 'gltf' | 'zip') => {
    console.log('🎯 开始加载模型预览:', fileType)

    // 确保Three.js场景准备就绪
    ensureThreeJSReady()

    // 等待下一帧确保DOM更新
    await nextTick()

    if (!scene || !renderer || !camera || !controls) {
        console.error('❌ Three.js场景未正确初始化')
        showError('3D预览初始化失败')
        return
    }

    console.log('✅ Three.js场景检查通过')

    // 清除之前的模型
    if (currentModel) {
        scene.remove(currentModel)
        disposeModel(currentModel)
        currentModel = null
    }

    try {
        if (fileType === 'glb' || fileType === 'gltf') {
            const loader = new GLTFLoader()
            const fileURL = createManagedURL(file)

            loader.load(fileURL, (gltf) => {
                currentModel = gltf.scene
                scene!.add(currentModel)
                
                const box = new THREE.Box3().setFromObject(currentModel)
                const center = box.getCenter(new THREE.Vector3())
                const size = box.getSize(new THREE.Vector3())
                
                currentModel.position.sub(center)
                
                const maxDim = Math.max(size.x, size.y, size.z)
                camera!.position.set(0, maxDim * 0.5, maxDim * 2)
                controls!.target.set(0, 0, 0)
                controls!.update()
                
                hasModelLoaded.value = true

                showSuccess('模型加载成功')
            }, undefined, (error) => {
                console.error('模型加载失败:', error)
                showError('模型加载失败')
            })
        } else if (fileType === 'zip') {
            try {
                showSuccess('正在解析 ZIP 文件...')
                const zipContents = await parseZipFile(file)
                
                if (!zipContents.pmxFile) {
                    showError('ZIP 文件中未找到 PMX 模型文件')
                    return
                }
                
                // 更新模型信息
                currentModelType.value = 'pmx'
                modelInfo.value.format = 'PMX'
                
                const textureURLs: string[] = []
                const textureURLMap = new Map<string, string>()

                for (const [fileName, textureFile] of zipContents.textures) {
                    const textureURL = createManagedURL(textureFile)
                    textureURLs.push(textureURL)
                    textureURLMap.set(fileName, textureURL)
                    console.log(`📝 生成纹理URL: ${fileName} -> ${textureURL}`)
                }

                // 创建自定义的LoadingManager来重定向纹理文件URL
                const tempLoadingManager = new THREE.LoadingManager()

                // 监听所有资源加载完成
                tempLoadingManager.onLoad = () => {
                    console.log('🎉 所有资源（包括纹理）加载完成')
                    // URL会在组件卸载时统一清理，这里不需要手动清理
                }

                tempLoadingManager.resolveURL = function(url: string) {
                    // 提取文件名
                    const fileName = url.split('/').pop() || url
                    // 如果在我们的纹理映射中找到了对应的URL，就使用它
                    if (textureURLMap.has(fileName)) {
                        console.log(`🔗 重定向纹理URL: ${fileName} -> ${textureURLMap.get(fileName)}`)
                        return textureURLMap.get(fileName)!
                    }
                    return url
                }
                
                // 加载 PMX 模型，使用自定义的LoadingManager来处理纹理URL重定向
                const loader = new MMDLoader(tempLoadingManager)
                const pmxURL = createManagedURL(zipContents.pmxFile)

                loader.load(pmxURL, (mmd) => {
                    currentModel = new THREE.Group()

                    if (mmd instanceof THREE.SkinnedMesh) {
                        // PMX加载器会自动处理纹理，我们只需要添加模型到场景
                        currentModel.add(mmd)
                        console.log(`✅ PMX模型加载成功，包含 ${zipContents.textures.size} 个纹理文件`)
                    } else if (mmd && typeof mmd === 'object' && 'isObject3D' in mmd) {
                        // 如果是其他类型的Object3D
                        currentModel.add(mmd as THREE.Object3D)
                        console.log(`✅ PMX模型作为Object3D加载成功`)
                    } else {
                        showError('PMX模型格式不兼容')
                    }
                    
                    scene!.add(currentModel)

                    const box = new THREE.Box3().setFromObject(currentModel)
                    const center = box.getCenter(new THREE.Vector3())
                    const size = box.getSize(new THREE.Vector3())
                    
                    currentModel.position.sub(center)
                    
                    const maxDim = Math.max(size.x, size.y, size.z)
                    camera!.position.set(0, maxDim * 0.5, maxDim * 2)
                    controls!.target.set(0, 0, 0)
                    controls!.update()

                    hasModelLoaded.value = true

                    showSuccess(`PMX模型加载成功 (包含 ${zipContents.textures.size} 个纹理, ${zipContents.vmdFiles.length} 个动作文件)`)
                }, undefined, (error: any) => {
                    console.error('PMX模型加载失败:', error)
                    showError('PMX模型加载失败: ' + (error?.message || '未知错误'))

                    hasModelLoaded.value = true
                })
                
            } catch (error) {
                console.error('ZIP 文件解析失败:', error)
                showError('ZIP 文件解析失败: ' + (error instanceof Error ? error.message : '未知错误'))
            }
        }
    } catch (error) {
        console.error('模型预览失败:', error)
        showError('模型预览失败')
    }
}

// URL对象管理
const createManagedURL = (blob: Blob): string => {
    const url = URL.createObjectURL(blob)
    activeURLs.value.push(url)
    return url
}

const cleanupAllURLs = () => {
    activeURLs.value.forEach(url => {
        URL.revokeObjectURL(url)
    })
    activeURLs.value = []
    console.log('🧹 已清理所有URL对象')
}

// 深度清理Three.js模型资源
const disposeModel = (model: THREE.Object3D) => {
    model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            // 清理几何体
            if (child.geometry) {
                child.geometry.dispose()
            }

            // 清理材质和纹理
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        disposeMaterial(material)
                    })
                } else {
                    disposeMaterial(child.material)
                }
            }
        }
    })
}

// 清理材质和相关纹理
const disposeMaterial = (material: THREE.Material) => {
    // 清理所有可能的纹理
    const textureProperties = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap',
        'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap',
        'alphaMap', 'lightMap', 'envMap'
    ]

    textureProperties.forEach(prop => {
        if ((material as any)[prop]) {
            (material as any)[prop].dispose()
        }
    })

    material.dispose()
}

// 执行完整的资源清理（弹窗关闭时调用）
const performResourceCleanup = () => {
    console.log('🧹 开始执行资源清理...')

    // 1. 取消所有正在进行的操作
    if (abortController.value) {
        abortController.value.abort()
        abortController.value = null
    }

    // 2. 终止所有Web Workers
    currentWorkers.value.forEach(worker => {
        worker.terminate()
    })
    currentWorkers.value = []

    // 3. 取消XHR请求
    if (currentXHR.value) {
        currentXHR.value.abort()
        currentXHR.value = null
    }

    // 4. 清理动画循环
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
    }

    // 5. 清理Three.js资源
    if (currentModel) {
        disposeModel(currentModel)
        currentModel = null
    }

    // 6. 清理场景
    if (scene) {
        scene.traverse((child) => {
            if (child instanceof THREE.Object3D) {
                disposeModel(child)
            }
        })
        scene.clear()
    }

    // 7. 清理所有URL对象
    cleanupAllURLs()

    console.log('✅ 资源清理完成')
}

// 截图功能
const captureModelScreenshot = (): string => {
    if (!renderer || !modelCanvas.value) {
        return ''
    }
    
    // 渲染一帧以确保最新状态
    renderer.render(scene!, camera!)
    
    // 获取 canvas 的 base64 数据
    return modelCanvas.value.toDataURL('image/png')
}

// 重置模型视角
const resetModelView = () => {
    if (!camera || !controls || !currentModel) return

    const box = new THREE.Box3().setFromObject(currentModel)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    camera.position.set(0, maxDim * 0.5, maxDim * 2)
    controls.target.set(0, 0, 0)
    controls.update()
}

// 重置上传状态
const resetUploadState = () => {
    uploadFiles.value = []
    currentModelType.value = null
    waitingForVmd.value = false
    isDetectingAnimation.value = false
    isUploading.value = false
    isUploadingDebounce.value = false // 清理防抖状态

    // 重置信息表单
    modelInfo.value = {
        name: '',
        description: '',
        fileSize: 0,
        format: ''
    }

    // 重置模型预览
    hasModelLoaded.value = false
    if (currentModel && scene) {
        scene.remove(currentModel)
        disposeModel(currentModel)
        currentModel = null
    }

    // 确保Three.js场景正常工作
    ensureThreeJSReady()
}

// 确保Three.js场景准备就绪
const ensureThreeJSReady = () => {
    if (!modelCanvas.value) return

    // 检查渲染器是否还有效
    if (!renderer || renderer.domElement !== modelCanvas.value) {
        console.log('🔄 重新初始化Three.js渲染器')
        initThreeJS()
        return
    }

    // 检查场景是否存在
    if (!scene) {
        console.log('🔄 重新创建Three.js场景')
        scene = new THREE.Scene()
        scene.background = new THREE.Color(0x1a1a1a)

        // 重新添加灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 1)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(1, 1, 1)
        directionalLight.castShadow = true
        scene.add(directionalLight)
    }

    // 确保动画循环正在运行
    if (!animationFrameId) {
        console.log('🔄 重新启动动画循环')
        animate()
    }
}

// 取消上传
const cancelUpload = () => {
    // 检查是否有正在进行的操作
    if (!isUploading.value) {
        showWarning('没有正在进行的操作')
        return
    }

    const uploadingFiles = uploadFiles.value.filter(file => file.status === 'uploading')

    if (uploadingFiles.length > 0) {
        // 1. 取消 AbortController（这会停止hash计算和压缩）
        if (abortController.value) {
            abortController.value.abort()
            abortController.value = null
        }

        // 2. 终止所有 Workers
        currentWorkers.value.forEach(worker => {
            worker.terminate()
        })
        currentWorkers.value = []

        // 3. 取消XHR请求
        if (currentXHR.value) {
            currentXHR.value.abort()
            currentXHR.value = null
        }

        // 4. 重置文件状态
        uploadingFiles.forEach(file => {
            file.status = 'pending'
            file.progress = 0
            file.uploadSpeed = 0
            file.errorMessage = undefined
            // 清除文件上的xhr引用
            delete (file as any).xhr
        })

        // 5. 重置上传状态
        isUploading.value = false
        showInfo('已取消上传')
    } else {
        showWarning('没有正在上传的文件')
    }
}

// 修改关闭对话框方法
const closeUploadDialog = () => {
    console.log('🚪 关闭上传弹窗，开始清理资源...')

    // 1. 强制取消所有正在进行的上传
    if (isUploading.value) {
        cancelUpload()
        console.log('🛑 已取消正在进行的上传')
    }

    // 2. 执行完整的资源清理
    performResourceCleanup()

    // 3. 重置所有状态
    resetUploadState()

    // 4. 关闭弹窗
    showUpload.value = false

    console.log('✅ 上传弹窗关闭，资源清理完成')
}

const checkGLBModel = async (file: File) => {
    const glbLoader = new GLTFLoader()
    const fileArrayBuffer = await file.arrayBuffer()
    return new Promise((resolve) => {
        glbLoader.parse(fileArrayBuffer, '', (gltf) => {
            let n = 0;
            gltf.animations.forEach((animation) => {
                if (animation.name === 'walk') n++
                if (animation.name === 'stand') n++
            })
            if (n === 2) {
                return resolve(true)
            } else {
                return resolve(false)
            }
        }, () => resolve(false))
    })

}

// 生命周期管理
onMounted(() => {
    console.log('🚀 FileUploader组件已挂载')
    // 在组件挂载后初始化 Three.js
    nextTick(() => {
        if (modelCanvas.value) {
            console.log('🎯 初始化Three.js场景')
            initThreeJS()
        } else {
            console.warn('⚠️ 模型画布未找到')
        }
    })
})

onUnmounted(() => {
    console.log('🧹 组件卸载，执行最终资源清理...')

    // 执行完整的资源清理
    performResourceCleanup()

    // 额外清理渲染器和控制器引用
    if (controls) {
        controls.dispose()
        controls = null
    }

    if (renderer) {
        renderer.dispose()
        renderer.forceContextLoss()
        renderer = null
    }

    // 清理场景和相机引用
    scene = null
    camera = null

    console.log('✅ 组件卸载清理完成')
})


// 暴露方法给父组件
defineExpose({
    triggerFileSelect,
    uploadAllFiles,
    clearCompletedFiles,
    resetUploadState,
    getUploadFiles: () => uploadFiles.value
})
</script>

<style scoped>
/* 上传按钮样式 */
.upload-button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 25px;
    background: linear-gradient(45deg, #ff00ff, #00ffff);
    border: none;
    border-radius: 12px;
    color: #000000;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.upload-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(255, 0, 255, 0.4);
}

.upload-icon {
    font-size: 1.2rem;
}

/* 上传对话框样式 */
.upload-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.upload-dialog {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    border: 1px solid rgba(0, 255, 255, 0.3);
    backdrop-filter: blur(20px);
    width: 90%;
    height: 85%;
    max-width: none;
    max-height: none;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.upload-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 30px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.upload-header h3 {
    color: #00ffff;
    font-size: 1.3rem;
    margin: 0;
}

.close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
}

.upload-content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: row;
    min-height: 0;
    overflow: hidden;
}

.upload-section {
    flex: 1;
    min-width: 0;
    padding: 30px;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    overflow-y: auto;
}

.upload-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
}

.info-section {
    flex: 1;
    min-width: 0;
    padding: 30px;
    overflow-y: auto;
}

.info-form {
    max-width: 100%;
}

.form-title {
    color: #00ffff;
    font-size: 1.2rem;
    margin: 0 0 20px 0;
    font-weight: 600;
}

.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    color: #ffffff;
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 8px;
}

.required {
    color: #ef4444;
    font-size: 0.8rem;
}

/* 模型预览区域 */
.model-preview-area {
    border: 2px dashed rgba(0, 255, 255, 0.5);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    position: relative;
    min-height: 300px;
    overflow: hidden;
}

.model-preview-area.has-model {
    border-style: solid;
    border-color: rgba(0, 255, 255, 0.7);
    background: rgba(0, 0, 0, 0.3);
}

.model-preview-container {
    position: relative;
    width: 100%;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.model-canvas {
    width: 100%;
    height: 100%;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.8);
}

.model-overlay {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
}

.model-controls {
    display: flex;
    gap: 8px;
}

.control-btn {
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(0, 255, 255, 0.5);
    color: #00ffff;
    padding: 8px;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
}

.control-btn:hover {
    background: rgba(0, 255, 255, 0.2);
    border-color: #00ffff;
    color: #ffffff;
    transform: scale(1.1);
}

.model-upload-prompt {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 50px 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.model-upload-prompt .upload-icon {
    font-size: 3rem;
    margin-bottom: 15px;
    display: block;
    color: rgba(0, 255, 255, 0.5);
}

.model-upload-prompt p {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 8px;
}

.model-upload-prompt .upload-note {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    margin-bottom: 0;
}

/* 表单输入 */
.form-input,
.form-textarea {
    width: 100%;
    padding: 12px 15px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: #ffffff;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: #00ffff;
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
}

.form-input::placeholder,
.form-textarea::placeholder {
    color: rgba(255, 255, 255, 0.5);
}

.form-textarea {
    resize: vertical;
    min-height: 80px;
}

.input-hint {
    margin-top: 5px;
    font-size: 0.8rem;
    color: rgba(0, 255, 255, 0.8);
    text-align: right;
}

/* 大小显示 */
.size-display {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 15px;
}

.size-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.size-item:last-child {
    margin-bottom: 0;
}

.size-item span:first-child {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
}

.size-item span:last-child {
    color: #00ffff;
    font-weight: 600;
}


/* 动作检测蒙版样式 */
.detection-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    border-radius: 12px;
}

.detection-content {
    text-align: center;
    color: #fff;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 255, 255, 0.3);
    border-top: 4px solid #00ffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

/* 拖拽上传区域样式 */
.drag-upload-area {
    border: 2px dashed rgba(0, 255, 255, 0.5);
    border-radius: 12px;
    padding: 20px 20px;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 20px;
}

.drag-upload-area:hover,
.drag-upload-area.drag-over {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
}

.drag-upload-area.waiting-vmd {
    border-color: #ff00ff;
    background: rgba(255, 0, 255, 0.1);
}

.drag-upload-area.uploading {
    border-color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
    cursor: not-allowed;
    pointer-events: none;
    opacity: 0.7;
}

.drag-upload-area.uploading .select-file-btn {
    background: rgba(107, 114, 128, 0.5);
    color: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
    pointer-events: none;
}

.uploading-prompt {
    color: #fbbf24 !important;
    font-weight: 600;
}

.missing-files-prompt {
    color: #ef4444 !important;
    font-weight: 600;
    font-size: 0.85rem;
    margin-top: 5px;
}

.vmd-prompt {
    color: #ff00ff !important;
    font-weight: 600;
}

.drag-upload-area .upload-icon {
    font-size: 3rem;
    margin-bottom: 15px;
    display: block;
}

.drag-upload-area p {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 10px;
}

.upload-note {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    margin-bottom: 8px;
}

.format-requirements {
    color: rgba(0, 255, 255, 0.8);
    font-size: 0.8rem;
    margin-bottom: 15px;
    line-height: 1.4;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
}

.select-file-btn {
    background: rgba(0, 255, 255, 0.2);
    border: 1px solid #00ffff;
    color: #00ffff;
    padding: 12px 25px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
}

.select-file-btn:hover {
    background: rgba(0, 255, 255, 0.3);
    transform: translateY(-2px);
}

/* 上传列表样式 */
.upload-list {
    margin-top: 20px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.upload-list::-webkit-scrollbar {
    width: 8px;
}

.upload-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

.upload-list::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.5);
    border-radius: 4px;
}

.upload-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 255, 0.7);
}

.list-title {
    margin: 0 0 16px 0;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
}

.file-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.file-item {
    padding: 16px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
    transition: all 0.3s ease;
}

.file-item.completed {
    border-left-color: #10b981;
}

.file-item.error {
    border-left-color: #ef4444;
}

.file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

/* 进度条样式 */
.progress-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
}

.progress-bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
    border-radius: 3px;
    transition: width 0.3s ease;
    position: relative;
}

.progress-fill.completed {
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.2) 50%,
            transparent 100%);
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% {
        transform: translateX(-100%);
    }

    100% {
        transform: translateX(100%);
    }
}

.progress-text {
    color: #9ca3af;
    font-size: 12px;
    white-space: nowrap;
    min-width: 80px;
}

.upload-speed {
    color: #6b7280;
}

/* 错误信息样式 */
.error-message {
    margin-top: 8px;
    padding: 8px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    color: #fca5a5;
    font-size: 12px;
}

/* 批量操作样式 */
.batch-actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.batch-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.upload-all-btn {
    background: #10b981;
    color: white;
}

.upload-all-btn:hover:not(:disabled) {
    background: #059669;
}

.cancel-btn {
    background: #6b7280;
    color: white;
}

.cancel-btn:hover:not(:disabled) {
    background: #4b5563;
}

.batch-btn:disabled {
    background: #374151;
    color: #6b7280;
    cursor: not-allowed;
}

/* 过渡动画 */
/* 文件列表过渡 */
.upload-list-fade-enter-active {
    transition: all 0.4s ease-out;
}

.upload-list-fade-leave-active {
    transition: all 0.3s ease-in;
}

.upload-list-fade-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.upload-list-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* 文件项过渡 */
.file-item-slide-enter-active {
    transition: all 0.4s ease-out;
    transition-delay: var(--delay, 0s);
}

.file-item-slide-leave-active {
    transition: all 0.3s ease-in;
}

.file-item-slide-enter-from {
    opacity: 0;
    transform: translateX(-30px);
}

.file-item-slide-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* 进度条过渡 */
.progress-fade-enter-active {
    transition: all 0.3s ease-out;
}

.progress-fade-leave-active {
    transition: all 0.2s ease-in;
}

.progress-fade-enter-from {
    opacity: 0;
    transform: scaleY(0);
    transform-origin: top;
}

.progress-fade-leave-to {
    opacity: 0;
    transform: scaleY(0);
    transform-origin: top;
}

/* 错误信息过渡 */
.error-slide-enter-active {
    transition: all 0.3s ease-out;
}

.error-slide-leave-active {
    transition: all 0.2s ease-in;
}

.error-slide-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}

.error-slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>