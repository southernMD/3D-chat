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
                    <div class="upload-content">
                        <!-- 动作检测蒙版 -->
                        <div v-if="isDetectingAnimation" class="detection-overlay">
                            <div class="detection-content">
                                <div class="loading-spinner"></div>
                                <p>{{ $t('fileUploader.detectingAnimation') }}</p>
                            </div>
                        </div>

                        <!-- 拖拽上传区域 -->
                        <div class="drag-upload-area" :class="{ 'drag-over': isDragOver, 'uploading': isUploading }" @drop="handleDrop"
                            @dragover.prevent="handleDragOver" @dragenter.prevent="handleDragEnter"
                            @dragleave.prevent="handleDragLeave" @click="triggerFileSelect">
                            <div class="upload-icon">📎</div>
                            <p v-if="!isUploading">{{ $t('fileUploader.dragDrop') }}</p>
                            <p v-else class="uploading-prompt">正在处理文件中，请等待...</p>
                            <p class="upload-note">{{ $t('fileUploader.supportedFormats') }}</p>
                            <p class="format-requirements">{{ $t('fileUploader.formatRequirements') }}</p>
                            <!-- PMX文件缺少提示 -->
                            <p v-if="pmxMissingFiles.length > 0" class="missing-files-prompt">
                                PMX模型还需要：{{ pmxMissingFiles.join('、') }}
                            </p>
                            <button class="select-file-btn" @click.stop="triggerFileSelect" :disabled="isUploading">
                                {{ $t('fileUploader.selectFiles') }}
                            </button>
                        </div>

                        <!-- 隐藏的文件输入 -->
                        <input ref="fileInput" type="file" :multiple="false" :accept="'.glb,.gltf,.pmx,.vmd'" style="display: none"
                            @change="handleFileSelect" :disabled="isUploading" />

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
                                    :disabled="!canUpload || isUploading">
                                    {{ $t('fileUploader.upload') }}
                                </button>

                                <button class="batch-btn cancel-btn" @click="cancelUpload" :disabled="!isUploading">
                                    取消处理
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import JSZip from 'jszip'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { showError, showSuccess } from '@/utils/message';
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
    accept: '.glb,.gltf,.pmx,.vmd',
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

// Computed
const hasUploadableFiles = computed(() =>
    uploadFiles.value.some(file => file.status === 'pending' || file.status === 'error')
)

const hasCompletedFiles = computed(() =>
    uploadFiles.value.some(file => file.status === 'completed')
)

const canUpload = computed(() => {
    if (!hasUploadableFiles.value) return false
    
    // 检查是否有PMX文件
    const hasPmxFile = uploadFiles.value.some(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        return ext === '.pmx'
    })
    
    if (hasPmxFile) {
        const hasWalkVmd = uploadFiles.value.some(file => 
            file.name.toLowerCase() === 'walk.vmd'
        )
        const hasStandVmd = uploadFiles.value.some(file => 
            file.name.toLowerCase() === 'stand.vmd'
        )
        return hasWalkVmd && hasStandVmd
    }
    
    return true
})

const pmxMissingFiles = computed(() => {
    const hasPmxFile = uploadFiles.value.some(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        return ext === '.pmx'
    })
    
    if (!hasPmxFile) return []
    
    const missingFiles = []
    const hasWalkVmd = uploadFiles.value.some(file => 
        file.name.toLowerCase() === 'walk.vmd'
    )
    const hasStandVmd = uploadFiles.value.some(file => 
        file.name.toLowerCase() === 'stand.vmd'
    )
    
    if (!hasWalkVmd) missingFiles.push('walk.vmd')
    if (!hasStandVmd) missingFiles.push('stand.vmd')
    
    return missingFiles
})

// 方法
const showUploadDialog = () => {
    showUpload.value = true
}

const triggerFileSelect = () => {
    // 如果正在上传，不允许选择文件
    if (isUploading.value) {
        ElMessage.warning('上传过程中不允许添加文件')
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
        ElMessage.warning('上传过程中不允许添加文件')
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
        ElMessage.warning('上传过程中不允许添加文件')
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

const processFiles = (files: File[]) => {
    if (files.length === 0) return
    
    // 单文件上传限制
    if (files.length > 1) {
        ElMessage.warning(t('fileUploader.singleFileOnly'))
        return
    }
    
    const file = files[0]
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    // 检查是否为VMD文件
    if (fileExtension === '.vmd') {
        // 检查上传列表中是否有PMX文件
        const hasPmxFile = uploadFiles.value.some(f => {
            const ext = '.' + f.name.split('.').pop()?.toLowerCase()
            return ext === '.pmx'
        })
        
        if (!hasPmxFile) {
            showError('请先添加PMX模型文件')
            return
        }
    } else {
        // 选择新的glb/gltf/pmx文件时，自动清空已有列表
        if (fileExtension === '.glb' || fileExtension === '.gltf' || fileExtension === '.pmx') {
            uploadFiles.value = []
            resetUploadState()
        }
    }

    // 验证文件
    if (!validateFile(file)) {
        return
    }

    // 添加到上传列表
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
    } else if (fileExtension === '.pmx') {
        currentModelType.value = 'pmx'
    }

    // 触发事件
    emit('fileSelected', [file])

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

// 使用原生XHR上传文件
const uploadWithXHR = async (zipBlob: Blob, files: UploadFile[], modelHash: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const xhr = new XMLHttpRequest()
            const formData = new FormData()
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const zipFileName = `${modelHash}.zip` // 使用模型文件hash作为文件名
            
            formData.append('file', zipBlob, zipFileName)
            
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
                    // 认证失败，清除用户登录状态
                    authStore.clearAuth()
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

const uploadAllFiles = async () => {
    // 检查用户是否已登录
    if (!authStore.isAuthenticated) {
        showError('请先登录后再上传文件')
        return
    }
    
    const filesToUpload = uploadFiles.value.filter(
        file => file.status === 'pending' || file.status === 'error'
    )

    if (filesToUpload.length === 0) {
        ElMessage.warning('没有可上传的文件')
        return
    }

    // 检查PMX文件的必需VMD文件
    const hasPmxFile = filesToUpload.some(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        return ext === '.pmx'
    })

    if (hasPmxFile) {
        const hasWalkVmd = filesToUpload.some(file => 
            file.name.toLowerCase() === 'walk.vmd'
        )
        const hasStandVmd = filesToUpload.some(file => 
            file.name.toLowerCase() === 'stand.vmd'
        )

        if (!hasWalkVmd || !hasStandVmd) {
            const missingFiles = []
            if (!hasWalkVmd) missingFiles.push('walk.vmd')
            if (!hasStandVmd) missingFiles.push('stand.vmd')
            showError(`PMX模型必须包含以下文件：${missingFiles.join('、')}`)
            return
        }
    }

    const hasGlbFile = filesToUpload.some(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        return ext === '.glb' || ext === '.gltf'
    })
    if(hasGlbFile){
        if(!await checkGLBModel(filesToUpload[0].file)){
            showError(`glb模型必须包含动作walk和stand}`)
            return
        }
    }

    try {
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

        // 使用JSZip压缩所有文件
        const zip = new JSZip()
        
        filesToUpload.forEach(uploadFile => {
            zip.file(uploadFile.name, uploadFile.file)
        })

        // 生成压缩文件（支持取消）
        const zipBlob = await createCancellableZip(zip, signal, (progress) => {
            // 更新压缩进度
            filesToUpload.forEach(file => {
                file.progress = Math.round(progress * 0.3) // 压缩占怰30%进度
                emit('uploadProgress', file)
            })
        })

        // 使用原生XHR上传
        await uploadWithXHR(zipBlob, filesToUpload, modelHash)

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


// 重置上传状态
const resetUploadState = () => {
    uploadFiles.value = []
    currentModelType.value = null
    waitingForVmd.value = false
    isDetectingAnimation.value = false
}

// 取消上传
const cancelUpload = () => {
    // 检查是否有正在进行的操作
    if (!isUploading.value) {
        ElMessage.warning('没有正在进行的操作')
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
        ElMessage.info('已取消上传')
    } else {
        ElMessage.warning('没有正在上传的文件')
    }
}

// 修改关闭对话框方法
const closeUploadDialog = () => {
    showUpload.value = false
    // 如果没有正在进行的上传，重置状态
    const hasActiveUploads = uploadFiles.value.some(file => 
        file.status === 'uploading' || waitingForVmd.value
    )
    if (!hasActiveUploads) {
        resetUploadState()
    }
}

const checkGLBModel = async (file:File)=>{
    const glbLoader = new GLTFLoader()
    const fileArrayBuffer = await file.arrayBuffer()
    return new Promise((resolve) => { 
        glbLoader.parse(fileArrayBuffer, '',(gltf) => {
            let n = 0;
            gltf.animations.forEach((animation)=>{
                if(animation.name === 'walk') n++
                if(animation.name === 'stand') n++
            })
            if(n === 2){
                return resolve(true)
            }else{
                return resolve(false)
            }
        },()=> resolve(false))
    })

}

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
    width: 50%;
    height: 80%;
    max-width: none;
    max-height: none;
    overflow-y: auto;
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

.upload-content {
    padding: 30px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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