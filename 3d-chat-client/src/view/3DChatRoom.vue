<script setup lang="ts">

import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { GUIManager } from '@/models/managers/GUIManager';
// 导入管理器类
import { MMDModelManager } from '@/models/managers/MMDModelManager';
import { SceneManager } from '@/models/managers/SceneManager';
import { ObjectManager } from '@/models/managers/ObjectManager';
import { BVHPhysics } from '@/physics/BVHPhysics';
import { FPSMonitor } from '@/utils/FPSMonitor';
import GameUI from '@/components/GameUI.vue';
import LoadingProgress from '@/components/LoadingProgress.vue';
// 导入WebRTC store和相关工具
import { useWebRTCStore } from '@/stores/webrtc';
import { useAuthStore } from '@/stores/auth';
import { showError, showSuccess, showInfo } from '@/utils/message';
import { eventBus } from '@/utils/eventBus';


// BVH物理系统已集成到模型中，不再需要CANNON

let scene: THREE.Scene
const dom = ref()
let width = innerWidth
let height = innerHeight
let hadRenderCamera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer

// 管理器实例
let mmdModelManager: MMDModelManager
let sceneManager: SceneManager
let objectManager: ObjectManager
let guiManager: GUIManager
let fpsMonitor: FPSMonitor

// WebRTC store和认证store
const webrtcStore = useWebRTCStore()
const authStore = useAuthStore()
const router = useRouter()

// UI状态
const showGameUI = ref(true)

// WebRTC相关状态
const isWebRTCConnected = computed(() => webrtcStore.isConnected)
const roomInfo = computed(() => webrtcStore.roomInfo)
const peers = computed(() => webrtcStore.peers)
const messages = computed(() => webrtcStore.messages)
const microphoneEnabled = ref(false)

// 步骤状态类型
type StepStatus = 'pending' | 'loading' | 'completed' | 'error'

// 加载进度状态
const isLoading = ref(true)
const currentLoadingMessage = ref('')
const loadingSteps = ref<Array<{ title: string, description: string, status: StepStatus }>>([
  { title: '初始化渲染器', description: '创建WebGL渲染器和基础配置', status: 'pending' },
  { title: '创建场景', description: '初始化3D场景和相机系统', status: 'pending' },
  { title: '加载MMD模型', description: '加载角色模型和动画数据', status: 'pending' },
  { title: '初始化物理系统', description: '设置BVH碰撞检测系统', status: 'pending' },
  { title: '创建场景对象', description: '生成地面、墙体等场景元素', status: 'pending' },
  { title: '初始化控制系统', description: '设置相机控制和用户交互', status: 'pending' },
  { title: '启动渲染循环', description: '开始3D场景的实时渲染', status: 'pending' }
])

// 更新加载步骤状态的辅助函数
const updateLoadingStep = (stepIndex: number, status: StepStatus, message?: string) => {
  if (stepIndex >= 0 && stepIndex < loadingSteps.value.length) {
    loadingSteps.value[stepIndex].status = status
    if (message) {
      currentLoadingMessage.value = message
    }
  }
}

let bvhPhysics: BVHPhysics

// 鸡蛋广播事件处理函数
let eggBroadcastHandler: ((data: any) => void) | null = null

// WebRTC初始化函数
const initializeWebRTC = async () => {
  try {
    console.log('🌐 检查WebRTC连接状态...')

    // 检查是否已经连接
    if (webrtcStore.isConnected) {
      console.log('✅ WebRTC已连接，无需重新初始化')
      showSuccess('WebRTC连接已建立')
      return
    }

    // 检查是否已经初始化
    if (!webrtcStore.isInitialized) {
      console.log('🌐 初始化WebRTC管理器...')
      webrtcStore.initializeWebRTC()
    }

    // 如果未连接，尝试连接到服务器
    if (!webrtcStore.isConnected) {
      console.log('🌐 连接到WebRTC服务器...')
      const connected = await webrtcStore.connectToServer()
      if (connected) {
        console.log('✅ WebRTC服务器连接成功')
        showSuccess('WebRTC服务器连接成功')
      } else {
        console.warn('⚠️ WebRTC服务器连接失败')
        showError('WebRTC服务器连接失败，聊天功能将不可用')
      }
    }
  } catch (error) {
    console.error('❌ WebRTC初始化失败:', error)
    showError('WebRTC初始化失败，聊天功能将不可用')
  }
}
onMounted(async () => {
  try {
    // 检查WebRTC连接状态（不重新初始化）
    console.log('🌐 3D聊天室页面已加载')
    console.log('当前WebRTC状态:', webrtcStore.getStatusInfo())
    if (!webrtcStore.isConnected) {
      console.warn('⚠️ WebRTC未连接，尝试初始化...')
      await initializeWebRTC()
    } else {
      console.log('✅ WebRTC已连接，房间信息:', webrtcStore.roomInfo)
      console.log('✅ 房间配置:', webrtcStore.roomConfig)
    }

    // 步骤1: 初始化渲染器
    updateLoadingStep(0, 'loading', '正在创建WebGL渲染器...')

    // 初始化场景管理器
    sceneManager = new SceneManager();
    sceneManager.createCamera(width, height)
    scene = sceneManager.getScene();
    updateLoadingStep(0, 'completed')

    // 步骤2: 创建场景
    updateLoadingStep(1, 'loading', '正在初始化3D场景和相机...')

    // 创建相机和渲染器
    renderer = sceneManager.createRenderer(dom.value, width, height);

    // 初始化灯光
    sceneManager.initializeLights();

    bvhPhysics = new BVHPhysics(scene);


    // 创建场景控制器
    sceneManager.createSceneControls();
    updateLoadingStep(1, 'completed')

    updateLoadingStep(2, 'loading', '正在生成地面、墙体等场景元素...')
    objectManager = new ObjectManager(scene);
    await objectManager.create();
    updateLoadingStep(2, 'completed')

    // 步骤3: 加载MMD模型
    updateLoadingStep(3, 'loading', '正在加载角色模型和动画数据...')
    mmdModelManager = new MMDModelManager(scene, renderer, bvhPhysics);
    await mmdModelManager.loadModel();
    updateLoadingStep(3, 'completed')

    hadRenderCamera = sceneManager.getCamera()

    // 初始化FPS监控器
    fpsMonitor = new FPSMonitor(60)

    // 初始化GUI管理器
    guiManager = new GUIManager(
      mmdModelManager,
      objectManager,
      sceneManager,
      bvhPhysics,
      renderer,
      fpsMonitor,
      hadRenderCamera == mmdModelManager.getLookCamera() ? true : false
    );

    nextTick(() => {
      bvhPhysics.createSeparateColliders(objectManager.getAllObjects());
      guiManager.syncTrackFromObject();
    });

    // 监听墙体重新创建事件，重新生成BVH碰撞体
    window.addEventListener('wallsRecreated', () => {
      nextTick(() => {
        bvhPhysics.createSeparateColliders(objectManager.getAllObjects());
      });
    });

    // 添加窗口事件监听器
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 监听WebRTC连接状态变化
    watch(isWebRTCConnected, (connected) => {
      console.log('🌐 WebRTC连接状态变化:', connected)
      if (connected) {
        showSuccess('WebRTC连接已建立')
      }
    })

    // 监听房间信息变化
    watch(roomInfo, (info) => {
      if (info) {
        console.log('🏠 房间信息更新:', info)
        showSuccess(`已加入房间: ${info.roomId}`)
      }
    })

    // 监听成员变化
    watch(peers, (newPeers, oldPeers) => {
      if (oldPeers && newPeers.length > oldPeers.length) {
        showInfo('有新成员加入房间')
      } else if (oldPeers && newPeers.length < oldPeers.length) {
        showInfo('有成员离开房间')
      }
    })

    // 添加右键发射小球事件监听器
    let mouseDownPosition = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', (event: MouseEvent) => {
      if (event.button === 2) { // 右键
        mouseDownPosition.x = event.clientX;
        mouseDownPosition.y = event.clientY;
      }
    });

    renderer.domElement.addEventListener('mouseup', (event: MouseEvent) => {
      if (event.button === 2) { // 右键抬起
        // 检查是否是点击（而不是拖拽）
        const totalDelta = Math.abs(event.clientX - mouseDownPosition.x) +
          Math.abs(event.clientY - mouseDownPosition.y);
        if (totalDelta > 2) return;

        // 计算鼠标在标准化设备坐标中的位置
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

        // 发射鸡蛋
        if (mmdModelManager && mmdModelManager.isModelLoaded()) {
          const model = mmdModelManager.getModel();
          const currentCamera = guiManager.getHadRenderCamera() || hadRenderCamera;
          if (model && currentCamera) {
            model.shootEgg(currentCamera, scene, mouseX, mouseY);
          }
        }
      }
    });

    // 阻止右键菜单
    renderer.domElement.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
    });

    // 相机辅助器更新现在在animate函数中处理
    animate(); // 启动渲染循环

    // 所有步骤完成，隐藏加载界面
    setTimeout(() => {
      isLoading.value = false
      currentLoadingMessage.value = '加载完成！'
      console.log('🎉 3D场景加载完成！')
    }, 500)

    // 监听彩蛋广播事件
    if(webrtcStore.roomConfig?.map === 'school') {
      eggBroadcastHandler = (data) => {
        // 创建鸡蛋模型
        const createdEggs = objectManager.createEggBroadcast(data)

        // 为每个创建的鸡蛋创建BVH碰撞体
        createdEggs.forEach(egg => {
          const bvhCollider = bvhPhysics.createEggBVH(egg.id, egg.model)
          if (bvhCollider) {
            console.log(`🥚 鸡蛋 ${egg.id} BVH碰撞体创建成功`)
          }
        })
      }
      eventBus.on('egg-broadcast', eggBroadcastHandler)
    }

  } catch (error) {
    console.error('❌ 加载过程中发生错误:', error)
  }
})

onUnmounted(() => {
  // 移除窗口事件监听器
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);

  // 清理事件总线监听器
  if(webrtcStore.roomConfig?.map === 'school' && eggBroadcastHandler) {
    eventBus.off('egg-broadcast', eggBroadcastHandler)
    eggBroadcastHandler = null
  }

  // 清理WebRTC连接
  try {
    webrtcStore.disconnect()
    console.log('🌐 WebRTC连接已清理')
  } catch (error) {
    console.error('❌ WebRTC清理失败:', error)
  }

  // 清理鸡蛋资源
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model) {
      model.disposeEggShooter(scene);
    }
  }

  // 清理所有管理器资源
  if (mmdModelManager) {
    mmdModelManager.cleanup();
  }

  // PhysicsManager 已移除

  if (sceneManager) {
    sceneManager.cleanup();
  }

  // 清理GUI管理器
  if (guiManager) {
    guiManager.cleanup();
  }

  // 清理FPS监控器
  if (fpsMonitor) {
    fpsMonitor.cleanup();
  }
})

function animate(timestamp?: number) {
  // 使用FPS监控器进行帧率控制和显示更新
  if (!fpsMonitor.update(timestamp)) {
    requestAnimationFrame(animate);
    return;
  }

  requestAnimationFrame(animate);

  // 1. 更新MMD模型（处理用户输入，同步到物理身体）
  if (mmdModelManager) {
    mmdModelManager.update(1 / 120);
  }

  // 2. 更新BVH物理系统（集成在模型中）
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model) {
      // 使用BVH物理系统更新模型
      model.updateMovement(scene);

      // 更新发射的鸡蛋物理（传递相机进行视野优化）
      const currentCamera = guiManager.getHadRenderCamera() || hadRenderCamera;
      model.updateProjectileEggs(1 / 60, currentCamera);

      // 只在需要调试时才更新辅助器（包围盒、胶囊体等）
      // 注释掉这些行可以提高性能
      model.updateModelHelpers();
      model.updateCameraHelpers();
    }
  }

  // 3. 更新相机跟随
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model && mmdModelManager.getLookCamera() && mmdModelManager.getCameraControls()) {
      model.updateCameraFollow(mmdModelManager.getLookCamera()!, mmdModelManager.getCameraControls()!);
    }
  }

  if (sceneManager) {
    // 使用当前选择的渲染相机
    sceneManager.update();
    // 从GUIManager获取当前渲染相机，如果没有则使用默认相机
    const currentCamera = guiManager.getHadRenderCamera() || hadRenderCamera;
    sceneManager.render(currentCamera);
  }
}

// light函数现在由SceneManager处理

window.addEventListener('resize', function () {
  width = window.innerWidth
  height = window.innerHeight
  if (sceneManager) {
    sceneManager.handleResize(width, height);
  }
})

function handleKeyDown(event: KeyboardEvent) {
  if (mmdModelManager) {
    mmdModelManager.handleKeyDown(event);
  }

  // GUI切换快捷键 - 按G键切换GUI显示
  if (event.key === 'g' || event.key === 'G') {
    if (guiManager) {
      guiManager.toggle();
      console.log('🎛️ GUI显示状态已切换');
    }
  }

  // FPS显示切换快捷键 - 按F键切换FPS显示
  if (event.key === 'f' || event.key === 'F') {
    if (fpsMonitor) {
      fpsMonitor.toggle();
      console.log('📊 FPS显示状态已切换');
    }
  }

  // UI显示切换快捷键 - 按U键切换游戏UI显示
  if (event.key === 'u' || event.key === 'U') {
    showGameUI.value = !showGameUI.value;
    console.log('🎮 游戏UI显示状态已切换:', showGameUI.value ? '显示' : '隐藏');
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (mmdModelManager) {
    mmdModelManager.handleKeyUp(event);
  }
}

// WebRTC事件处理函数
const handleSendMessage = (message: string) => {
  try {
    const success = webrtcStore.sendMessage(message)
    if (!success) {
      showError('消息发送失败，请检查网络连接')
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    showError('消息发送失败')
  }
}

const handleToggleMicrophone = async () => {
  try {
    const enabled = await webrtcStore.toggleMicrophone()
    microphoneEnabled.value = enabled
    console.log(`麦克风${enabled ? '已开启' : '已关闭'}`)
    showSuccess(`麦克风${enabled ? '已开启' : '已关闭'}`)
  } catch (error) {
    console.error('麦克风操作失败:', error)
    showError('麦克风操作失败')
  }
}

const handleExitRoom = () => {
  try {
    webrtcStore.leaveRoom()
    showInfo('已离开房间')
    // 跳转到房间大厅
    router.push('/lobby')
  } catch (error) {
    console.error('离开房间失败:', error)
    showError('离开房间失败')
  }
}



const handleCopyRoomCode = (success: boolean, roomCode?: string) => {
  if (success && roomCode) {
    showSuccess(`房间码已复制到剪贴板: ${roomCode}`)
    console.log('📋 房间码复制成功:', roomCode)
  } else {
    showError('复制房间码失败，请手动复制')
    console.error('❌ 房间码复制失败')
  }
}


</script>

<template>
  <div class="model" ref="dom">
    <!-- 加载进度界面 -->
    <LoadingProgress :visible="isLoading" :steps="loadingSteps" :current-message="currentLoadingMessage" />

    <!-- 游戏UI界面 -->
    <GameUI v-show="showGameUI && !isLoading" :webrtc-connected="isWebRTCConnected" :room-info="roomInfo" :peers="peers"
      :messages="messages" :microphone-enabled="microphoneEnabled" @send-message="handleSendMessage"
      @toggle-microphone="handleToggleMicrophone" @exit-room="handleExitRoom" @copy-room-code="handleCopyRoomCode" />
  </div>
</template>

<style scoped>
.model {
  position: relative;
  width: 100%;
  height: 100vh;
}
</style>
