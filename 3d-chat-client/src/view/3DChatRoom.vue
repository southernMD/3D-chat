<script setup lang="ts">

import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { GUIManager } from '@/models/managers/GUIManager';
// 导入管理器类
import { MMDModelManager } from '@/models/managers/MMDModelManager';
import { StaticMMDModelManager } from '@/models/managers/StaticMMDModelManager';
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
import { Egg } from '@/models/Egg';
import { Tree } from '@/models/architecture/Tree';


// BVH物理系统已集成到模型中，不再需要CANNON

let scene: THREE.Scene
const dom = ref()
let width = innerWidth
let height = innerHeight
let hadRenderCamera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer

// 管理器实例
let mmdModelManager: MMDModelManager          // 主机用户模型管理器（有物理）
let staticModelManager: StaticMMDModelManager // 其他用户静态模型管理器（无物理）
let sceneManager: SceneManager
let objectManager: ObjectManager
let guiManager: GUIManager
let fpsMonitor: FPSMonitor

// watch 停止函数
let stopWatchers: (() => void)[] = [];

// WebRTC store和认证store
const webrtcStore = useWebRTCStore()
const authStore = useAuthStore()
const router = useRouter()

// UI状态
const showGameUI = ref(true)

// 用户装备状态
const userEquipment = ref({
  egg: 0 // 鸡蛋数量
})

// 当前选中的物品槽位（从GameUI组件获取）
const selectedSlot = ref(0)

// 检查是否可以发射鸡蛋
const canShootEgg = () => {
  // 检查当前选中的槽位是否是鸡蛋（槽位0）
  if (selectedSlot.value !== 0) {
    console.log('⚠️ 当前未选中鸡蛋，无法发射');
    return false;
  }

  // 检查鸡蛋数量是否大于0
  if (userEquipment.value.egg <= 0) {
    console.log('⚠️ 鸡蛋数量不足，无法发射');
    return false;
  }

  return true;
}

// 处理来自GameUI的槽位选择事件
const handleSlotSelection = (slotIndex: number) => {
  selectedSlot.value = slotIndex;
  console.log(`🎯 选中物品槽位: ${slotIndex}`);
}

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
      webrtcStore.initializeWebRTCManager()
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

    // 步骤3: 加载主机用户模型（有物理）
    updateLoadingStep(3, 'loading', '正在加载角色模型和动画数据...')
    mmdModelManager = new MMDModelManager(scene, renderer, bvhPhysics);
    await mmdModelManager.loadModel(history.state.modelHash);
    updateLoadingStep(3, 'completed')
    hadRenderCamera = sceneManager.getCamera()

    // 初始化主机用户昵称标签管理器
    const container = dom.value;
    if (container && hadRenderCamera) {
      mmdModelManager.initializeNameTagManager(hadRenderCamera, container);

      // 设置用户昵称（从WebRTC store获取）
      const userPeer = webrtcStore.getYouPeer();
      if (userPeer && userPeer.name) {
        mmdModelManager.setNickname(userPeer.name);
      }
    }

    // 步骤4: 初始化其他用户静态模型管理器（无物理）
    console.log('🎭 初始化其他用户静态模型管理器...')
    staticModelManager = new StaticMMDModelManager(scene, renderer);

    // 为其他用户初始化昵称标签管理器
    if (container && hadRenderCamera) {
      staticModelManager.initializeNameTagManager(hadRenderCamera, container);
      console.log('✅ 其他用户静态模型管理器初始化完成');
    }

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
      false // 默认为第三人称视角（场景相机）
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
    const stopWebRTCWatch = watch(isWebRTCConnected, (connected) => {
      console.log('🌐 WebRTC连接状态变化:', connected)
      if (connected) {
        showSuccess('WebRTC连接已建立')
      }
    })
    stopWatchers.push(stopWebRTCWatch);

    // 监听房间信息变化
    const stopRoomInfoWatch = watch(roomInfo, (info) => {
      if (info) {
        console.log('🏠 房间信息更新:', info)
        showSuccess(`已加入房间: ${info.roomId}`)
      }
    })
    stopWatchers.push(stopRoomInfoWatch);

    // 🆕 监听 eventBus 事件来处理用户模型加载
    if (staticModelManager) {

      // 监听新用户加入事件
      const handleUserJoined = async (data: { peerId: string, userName: string, modelHash: string }) => {
        console.log(`👤 EventBus新用户加入: ${data.userName} (${data.peerId}) 模型: ${data.modelHash}`);

        try {
          // 为新用户创建静态模型
          await staticModelManager.loadModel(data.peerId, data.modelHash);

          // 设置用户昵称
          staticModelManager.setNickname(data.peerId, data.userName);

          console.log(`✅ 用户 ${data.userName} 的静态模型已创建`);
          showInfo(`${data.userName} 加入了房间`);
        } catch (error) {
          console.error(`❌ 为用户 ${data.userName} 创建静态模型失败:`, error);
        }
      };

      // 监听用户离开事件
      const handleUserLeft = (data: { peerId: string }) => {
        console.log(`👋 EventBus用户离开: ${data.peerId}`);

        try {
          // 移除用户的静态模型
          staticModelManager.removeModel(data.peerId);
          console.log(`✅ 用户 ${data.peerId} 的静态模型已移除`);
          showInfo('有成员离开房间');
        } catch (error) {
          console.error(`❌ 移除用户 ${data.peerId} 的静态模型失败:`, error);
        }
      };

      // 监听房间用户同步事件
      const handleRoomUsersSync = async (data: { users: Array<{ peerId: string, userName: string, modelHash: string }> }) => {
        console.log('🔄 EventBus房间用户同步:', data.users);
        const currentUserId = webrtcStore.roomInfo?.peerId;

        for (const user of data.users) {
          if (user.peerId !== currentUserId) {
            console.log(`🔄 同步已存在用户: ${user.userName} (${user.peerId}) 模型: ${user.modelHash}`);
            try {
              await staticModelManager.loadModel(user.peerId, user.modelHash);
              staticModelManager.setNickname(user.peerId, user.userName);
              console.log(`✅ 已存在用户 ${user.userName} 的静态模型已同步`);
            } catch (error) {
              console.error(`❌ 同步用户 ${user.userName} 的静态模型失败:`, error);
            }
          }
        }
      };

      // 监听模型状态更新事件
      const handleModelStateUpdate = (data: { userName: string, modelState: any }) => {
        // console.log(`📡 收到模型状态更新: ${data.userName}`, data.modelState);
        
        // 根据用户名找到对应的peerId
        const peer = webrtcStore.peers.find(p => p.name === data.userName);
        if (peer) {
          // 更新对应用户的静态模型状态
          staticModelManager.updateModelByState(peer.id, data.modelState);
          // console.log(`✅ 用户 ${data.userName} 的模型状态已更新`);
        } else {
          console.warn(`⚠️ 未找到用户 ${data.userName} 的peer信息`);
        }
      };

      // 🚪 监听门状态更新事件
      const handleDoorStateUpdate = (data: { doorName: string, doorNearName: string | undefined, visible: boolean, isOpen: boolean }) => {
        console.log(`🚪 门状态更新事件: ${data.doorName}, 状态: ${data.isOpen ? '打开' : '关闭'}`);
        
        // 通过WebRTC发送门状态到其他客户端
        webrtcStore.sendDoorState(data.doorName, data.doorNearName, data.visible, data.isOpen);
      };

      // 绑定 eventBus 监听器
      eventBus.on('user-joined', handleUserJoined);
      eventBus.on('user-left', handleUserLeft);
      eventBus.on('room-users-sync', handleRoomUsersSync);
      eventBus.on('model-state-update', handleModelStateUpdate); // 添加模型状态更新监听
      eventBus.on('door-state-update', handleDoorStateUpdate); // 🚪 添加门状态更新监听

      // 保存清理函数
      const cleanupEventBusListeners = () => {
        eventBus.off('user-joined', handleUserJoined);
        eventBus.off('user-left', handleUserLeft);
        eventBus.off('room-users-sync', handleRoomUsersSync);
        eventBus.off('model-state-update', handleModelStateUpdate); // 添加清理函数
        eventBus.off('door-state-update', handleDoorStateUpdate); // 🚪 添加门状态清理函数
      };
      stopWatchers.push(cleanupEventBusListeners);

      // 加载房间内已存在的其他用户模型
      // console.log('🔄 开始同步房间内已存在的用户模型...');
      // const currentPeers = webrtcStore.peers;
      // const currentUserId = webrtcStore.roomInfo?.peerId;

      // for (const peer of currentPeers) {
      //   if (peer.id !== currentUserId) {
      //     console.log(`� 同步已存在用户: ${peer.name} (${peer.id}) 模型: ${peer.modelHash}`);
      //     try {
      //       // 使用用户真实的modelHash，如果没有则使用默认值
      //       const userModelHash = peer.modelHash || history.state.modelHash || 'default-model-hash';
      //       await staticModelManager.loadModel(peer.id, userModelHash);
      //       staticModelManager.setNickname(peer.id, peer.name);
      //       console.log(`✅ 已存在用户 ${peer.name} 的静态模型已同步`);
      //     } catch (error) {
      //       console.error(`❌ 同步用户 ${peer.name} 的静态模型失败:`, error);
      //     }
      //   }
      // }
    }

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

        // 检查是否可以发射鸡蛋
        if (!canShootEgg()) {
          return;
        }

        // 计算鼠标在标准化设备坐标中的位置
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

        // 发射鸡蛋
        if (mmdModelManager && mmdModelManager.isModelLoaded()) {
          const model = mmdModelManager.getModel();
          const currentCamera = guiManager.getHadRenderCamera() || hadRenderCamera;
          if (model && currentCamera) {
            model.shootEgg(currentCamera, scene, mouseX, mouseY);
            // 消耗1个鸡蛋
            webrtcStore.modifyEggQuantity(-1);
            console.log('🥚🚀 发射鸡蛋，库存-1');
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

    setupEquipmentBusListeners()

    //获取装备
    webrtcStore.getUserEquipment()
    // 监听鸡蛋广播事件
    if (webrtcStore.roomConfig?.map === 'school') {
      eggBroadcastHandler = (data) => {
        if (data.isSync) {
          console.log(`🔄 收到鸡蛋状态同步: ${data.totalEggs}个已标记的鸡蛋`)
        } else {
          console.log(`📡 收到鸡蛋广播: ${data.totalEggs}个新鸡蛋`)
        }

        // 创建鸡蛋模型
        setTimeout(() => { 
          console.log("创建鸡蛋模型");
          
          const createdEggs = objectManager.createEggBroadcast(data)

          // 为每个创建的鸡蛋创建BVH碰撞体
          createdEggs.forEach(egg => {
            const bvhCollider = bvhPhysics.createEggBVH(egg.id, egg.model)
            if (bvhCollider) {
              console.log(`🥚 鸡蛋 ${egg.id} BVH碰撞体创建成功`)
            }
          })
        }, 1500)
      }
      eventBus.on('egg-broadcast', eggBroadcastHandler)

      // 监听清除鸡蛋服务器事件
      eventBus.on('clear-egg-server', ({ eggId }) => {
        console.log('🥚 收到清除鸡蛋服务器请求:', eggId)
        // 通过WebRTC通知服务器清除鸡蛋标记
        const uPeer = webrtcStore.getYouPeer()
        webrtcStore.clearEgg(eggId, uPeer.id, uPeer.name!, webrtcStore.roomInfo?.roomId!)
      })

      // 监听重新插入鸡蛋事件
      eventBus.on('reinsert-egg', ({ eggId, reason, message, position }) => {
        console.log('🥚 收到重新插入鸡蛋请求:', { eggId, reason, message, position })

        // 如果有具体位置信息，重新插入鸡蛋到场景中
        if (position) {
          const createdEgg = objectManager.insertEggIntoScene(position.id, position.x, position.y, position.z)
          if (createdEgg) {
            // 为重新插入的鸡蛋创建BVH碰撞体
            const bvhCollider = bvhPhysics.createEggBVH(position.id, createdEgg)
            if (bvhCollider) {
              console.log(`🥚 重新插入的鸡蛋 ${position.id} BVH碰撞体创建成功`)
            }
          }
        }
      })

      // 监听鸡蛋收集成功事件
      eventBus.on('egg-collected', ({ message }) => {
        // 服务端已经自动增加了装备，这里只显示消息
        userEquipment.value.egg++
        showSuccess(message)
        console.log(`🎉 ${message}`)
      })

      // 监听鸡蛋被清除事件（房间内广播）
      eventBus.on('egg-cleared', ({ eggId}) => {
        eventBus.emit('egg-clear', { eggId});
        // 从BVH物理系统中移除鸡蛋碰撞体
        bvhPhysics?.removeEggBVH(eggId)

        // 清理本地映射
        bvhPhysics.getColliders()!.delete(eggId)
        // 通过事件总线通知Model清理位置距离映射
        eventBus.emit('clear-egg-mapUserPositionDistance', { eggId })
      })
    }

    // 设置装备相关事件监听器
    setupEquipmentBusListeners();

    // 🚪 设置门状态回调，用于接收其他客户端的门状态更新
    if (mmdModelManager) {
      webrtcStore.setDoorStateCallback((doorName: string, doorNearName: string | undefined, visible: boolean, isOpen: boolean) => {
        console.log(`🚪 收到门状态同步: ${doorName}, 状态: ${isOpen ? '打开' : '关闭'}`);
        
        // 通过 eventBus 通知 Model 同步门状态
        const model = mmdModelManager.getModel();
        if (model) {
          model.syncDoorState({ doorName, doorNearName, visible, isOpen }, scene);
        }
      });
    }

    //发送自身状态
    webrtcStore.sendYouState(mmdModelManager.getModel()?.getModelState.bind(mmdModelManager.getModel())!,30)

  } catch (error) {
    console.error('❌ 加载过程中发生错误:', error)
    showError('加载过程中发生错误')
    router.back()
  }
})

// 监听装备相关的事件总线事件
const setupEquipmentBusListeners = () => {
  // 监听用户装备数据更新
  eventBus.on('user-equipment-updated', (data: { egg: number }) => {
    userEquipment.value.egg = data.egg
    console.log(`📦 用户装备已更新: 鸡蛋 x${userEquipment.value.egg}`)
  })

  // 监听鸡蛋数量更新成功
  eventBus.on('egg-quantity-updated', (data: { quantity: number }) => {
    userEquipment.value.egg = data.quantity
    console.log(`✅ 鸡蛋数量更新成功: ${data.quantity}`)
  })
}

onUnmounted(() => {
  console.log('🧹 开始彻底清理 3DChatRoom 资源...');
  cancelAnimationFrame(animateId)
  // 增强的资源清理函数
  const deepDisposeObject3D = (obj: THREE.Object3D): void => {
    obj.traverse((child) => {
      // 清理网格
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) deepDisposeMaterial(child.material);
      }

      // 清理蒙皮网格
      if (child instanceof THREE.SkinnedMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) deepDisposeMaterial(child.material);
        if (child.skeleton && child.skeleton.boneTexture) {
          child.skeleton.boneTexture.dispose();
        }
      }

      // 清理灯光
      if (child instanceof THREE.Light) {
        if (child.shadow && child.shadow.map) {
          child.shadow.map.dispose();
        }
      }

      // 清理相机辅助器
      if (child instanceof THREE.CameraHelper) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) deepDisposeMaterial(child.material);
      }
    });

    // 清空子对象
    obj.clear();
  };

  // 深度清理材质和纹理
  const deepDisposeMaterial = (material: THREE.Material | THREE.Material[]): void => {
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((mat) => {
      // 清理所有可能的纹理属性
      const textureProperties = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap',
        'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap',
        'alphaMap', 'lightMap', 'envMap', 'specularMap',
        'gradientMap', 'matcap', 'clearcoatMap', 'clearcoatNormalMap',
        'clearcoatRoughnessMap', 'transmissionMap', 'thicknessMap',
        'sheenColorMap', 'sheenRoughnessMap', 'iridescenceMap',
        'iridescenceThicknessMap'
      ];

      textureProperties.forEach(prop => {
        const texture = (mat as any)[prop];
        if (texture && texture.dispose) {
          texture.dispose();
        }
      });

      mat.dispose();
    });
  };

  // ==================== 2. 移除所有事件监听器 ====================
  console.log('🗑️ 移除事件监听器...');

  // 移除窗口事件监听器
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    if (sceneManager) {
      sceneManager.handleResize(width, height);
    }
  });

  // 移除自定义事件监听器
  window.removeEventListener('wallsRecreated', () => {});

  // 移除渲染器事件监听器
  if (renderer && renderer.domElement) {
    renderer.domElement.removeEventListener('mousedown', () => {});
    renderer.domElement.removeEventListener('mouseup', () => {});
    renderer.domElement.removeEventListener('contextmenu', () => {});
  }

  // ==================== 3. 清理 Vue watch 监听器 ====================
  console.log('🗑️ 清理 Vue watch 监听器...');

  // 停止所有 watch 函数
  stopWatchers.forEach(stopFn => {
    try {
      stopFn();
    } catch (error) {
      console.error('❌ 停止 watch 监听器失败:', error);
    }
  });
  stopWatchers = [];
  console.log('✅ 所有 Vue watch 监听器已清理');

  // ==================== 4. 清理所有事件总线监听器 ====================
  console.log('🗑️ 清理事件总线监听器...');

  // 清理鸡蛋相关事件监听器
  if (webrtcStore.roomConfig?.map === 'school' && eggBroadcastHandler) {
    eventBus.off('egg-broadcast', eggBroadcastHandler);
    eggBroadcastHandler = null;
  }

  // 清理所有其他事件总线监听器
  eventBus.off('clear-egg-server', () => {});
  eventBus.off('reinsert-egg', () => {});
  eventBus.off('egg-collected', () => {});
  eventBus.off('egg-cleared', () => {});
  eventBus.off('user-equipment-updated', () => {});
  eventBus.off('egg-quantity-updated', () => {});
  eventBus.off('model-state-update', () => {}); // 添加清理模型状态更新监听器

  // 彻底清理事件总线
  eventBus.clear();

  // ==================== 4. 清理人物模型和相关资源 ====================
  console.log('🗑️ 清理人物模型...');

  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model) {
      // 清理鸡蛋发射器
      model.disposeEggShooter(scene);

      // 从场景中移除模型
      if (model.mesh && scene) {
        scene.remove(model.mesh);
      }

      // 调用模型的dispose方法彻底清理所有资源
      if (typeof model.dispose === 'function') {
        model.dispose();
      }
    }
  }

  // 清理主机用户MMD模型管理器（这会调用模型的dispose方法）
  if (mmdModelManager) {
    mmdModelManager.cleanup();
  }

  // 清理其他用户静态模型管理器
  if (staticModelManager) {
    staticModelManager.cleanup();
  }

  // ==================== 5. 清理ObjectManager加载的所有模型 ====================
  console.log('🗑️ 清理ObjectManager模型...');

  if (objectManager) {
    // 清理所有静态对象
    objectManager.dispose();
  }

  // ==================== 6. 清理BVH物理系统 ====================
  console.log('🗑️ 清理BVH物理系统...');

  if (bvhPhysics) {
    bvhPhysics.dispose();
  }

  // ==================== 7. 清理GUI管理器 ====================
  console.log('🗑️ 清理GUI管理器...');

  if (guiManager) {
    guiManager.cleanup();
  }

  // ==================== 8. 清理FPS监控器 ====================
  console.log('🗑️ 清理FPS监控器...');

  if (fpsMonitor) {
    fpsMonitor.cleanup();
  }

  // ==================== 9. 彻底清理3D场景 ====================
  console.log('🗑️ 彻底清理3D场景...');

  if (scene) {
    // 深度遍历清理所有对象
    const objectsToRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      objectsToRemove.push(child);
    });

    // 使用增强的资源清理函数
    objectsToRemove.forEach((obj) => {
      deepDisposeObject3D(obj);
    });

    // 清空场景
    scene.clear();
  }

  // ==================== 10. 清理场景管理器 ====================
  console.log('🗑️ 清理场景管理器...');

  if (sceneManager) {
    sceneManager.cleanup();
  }

  // ==================== 11. 清理渲染器 ====================
  console.log('🗑️ 清理渲染器...');

  if (renderer) {
    // 清理渲染器上下文
    renderer.dispose();

    // 移除DOM元素
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

  }

  // ==================== 13. 清理WebRTC连接 ====================
  console.log('🗑️ 清理WebRTC连接...');

  try {
    webrtcStore.disconnect();
    console.log('🌐 WebRTC连接已清理');
  } catch (error) {
    console.error('❌ WebRTC清理失败:', error);
  }

  // ==================== 14. 清理Three.js全局缓存 ====================
  console.log('🗑️ 清理Three.js全局缓存...');

  try {
    // 清理Three.js的全局缓存系统
    THREE.Cache.clear();
    console.log('✅ Three.js Cache已清理');

    // 清理纹理加载器缓存
    if (THREE.TextureLoader && THREE.TextureLoader.prototype) {
      console.log('✅ 纹理加载器缓存已清理');
    }

    // 清理几何体缓存
    if (THREE.BufferGeometry && THREE.BufferGeometry.prototype) {
      console.log('✅ 几何体缓存已清理');
    }

  } catch (error) {
    console.error('❌ 清理Three.js缓存时出错:', error);
  }

  // ==================== 15. 清理静态模型缓存 ====================
  console.log('🗑️ 清理静态模型缓存...');

  try {
    // 清理鸡蛋模型的静态缓存
    // 注释掉不存在的方法调用
    // if (Egg && typeof Egg.disposeStaticModels === 'function') {
    //   Egg.disposeStaticModels();
    // }

    // 清理树模型的静态缓存
    // if (Tree && typeof Tree.disposeStaticModels === 'function') {
    //   Tree.disposeStaticModels();
    // }

    // 清理其他可能的静态模型缓存
    const globalKeys = Object.keys(window).filter(key =>
      key.includes('Model') || key.includes('Cache') || key.includes('Loader')
    );
    globalKeys.forEach(key => {
      try {
        const obj = (window as any)[key];
        if (obj && typeof obj.dispose === 'function') {
          obj.dispose();
          console.log(`✅ 全局对象 ${key} 已清理`);
        }
      } catch (e) {
        // 忽略清理错误
      }
    });

  } catch (error) {
    console.error('❌ 清理静态模型缓存时出错:', error);
  }

  // ==================== 16. 强制垃圾回收提示 ====================
  console.log('🗑️ 清理完成，建议浏览器进行垃圾回收...');

  // 清理全局变量引用
  if (typeof window !== 'undefined') {
    // 强制垃圾回收（如果浏览器支持）
    if (window.gc) {
      try {
        window.gc();
        console.log('✅ 强制垃圾回收已执行');
      } catch (e) {
        console.log('ℹ️ 垃圾回收不可用（正常情况）');
      }
    }
  }

  console.log('✅ 3DChatRoom 资源清理完成');
})

let animateId:number
function animate(timestamp?: number) {
  // 使用FPS监控器进行帧率控制和显示更新
  if (fpsMonitor && !fpsMonitor.update(timestamp)) {
    animateId = requestAnimationFrame(animate);
    return;
  }

  animateId = requestAnimationFrame(animate);

  // 1. 更新主机用户MMD模型（处理用户输入，同步到物理身体）
  if (mmdModelManager) {
    mmdModelManager.update(1 / 120);
  }

  // 2. 更新其他用户的静态模型（无物理）
  if (staticModelManager) {
    staticModelManager.update(1 / 60);
  }

  // 3. 更新BVH物理系统（集成在主机用户模型中）
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

  // 4. 更新相机跟随
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

    // 🔧 检查相机是否发生变化，如果变化则更新 StaticMMDModelManager 的相机引用
    if (staticModelManager && currentCamera) {
      const staticNameTagManager = staticModelManager.getNameTagManager();
      if (staticNameTagManager) {
        staticNameTagManager.updateCamera(currentCamera);
      }
    }

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
      :messages="messages" :microphone-enabled="microphoneEnabled" :user-equipment="userEquipment"
      :selected-slot="selectedSlot"
      @send-message="handleSendMessage" @toggle-microphone="handleToggleMicrophone" @exit-room="handleExitRoom"
      @copy-room-code="handleCopyRoomCode" @slot-selection="handleSlotSelection" />
  </div>
</template>

<style scoped>
.model {
  position: relative;
  width: 100%;
  height: 100vh;
}
</style>

<style>
/* 引入昵称标签样式 */
@import '@/styles/name-tag.css';
</style>
