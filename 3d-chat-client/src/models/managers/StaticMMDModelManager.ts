import * as THREE from 'three';
import { StaticMMDModel } from '../StaticMMDModel';
import { StaticGLTFModel } from '../StaticGLTFModel';
import { getModelFilePathByHash } from '@/api/modelApi';
import { NameTagManager } from '@/utils/NameTagManager';

/**
 * StaticMMDModelManager类 - 管理其他用户的静态模型
 * 参考MMDModelManager结构，但管理多个静态模型
 * 包含模型列表管理、昵称标签管理，无物理、无相机
 */
export class StaticMMDModelManager {
  private models: Map<string, StaticMMDModel | StaticGLTFModel> = new Map();
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private nameTagManager: NameTagManager | null = null;
  private nicknames: Map<string, string> = new Map();
  
  // 用于插值的缓存数据
  private targetStates: Map<string, {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    timestamp: number;
    animationState: string;
  }> = new Map();
  
  // 插值参数
  private interpolationFactor = 0.1; // 插值因子，控制平滑度
  private maxExtrapolationTime = 100; // 最大外推时间（毫秒）

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    console.log('🎭 StaticMMDModelManager 已创建');
  }

  /**
   * 初始化昵称标签管理器
   */
  initializeNameTagManager(camera: THREE.Camera, container: HTMLElement): void {
    this.nameTagManager = new NameTagManager(camera, this.renderer, container);
    // 设置为第三人称视角（静态模型总是显示昵称）
    this.nameTagManager.setFirstPersonMode(false);
  }

  /**
   * 加载用户模型
   */
  async loadModel(userId: string, modelHash: string): Promise<void> {
    try {
      console.log(`👤 开始加载用户 ${userId} 的静态模型...`);

      // 检查是否已存在该用户的模型
      if (this.models.has(userId)) {
        console.warn(`⚠️ 用户 ${userId} 的模型已存在，先移除旧模型`);
        this.removeModel(userId);
      }

      const modelPathRes = await getModelFilePathByHash(modelHash);
      if (modelPathRes.success) {
        const isPMX = modelPathRes.data?.resources.some(resource => resource.ext === '.pmx');

        if (isPMX) {
          // 创建静态MMD模型
          const pmxPath = modelPathRes.data?.resources.find(resource => resource.ext === '.pmx')?.path;
          const walkVmdPath = modelPathRes.data?.resources.find(resource => resource.ext === '.vmd' && resource.path.includes('walk'))?.path;
          const standVmdPath = modelPathRes.data?.resources.find(resource => resource.ext === '.vmd' && resource.path.includes('stand'))?.path;

          if (pmxPath) {
            const staticModel = new StaticMMDModel();
            // 🔧 实际加载模型数据
            await staticModel.load(this.scene, pmxPath, walkVmdPath || '', standVmdPath || '');
            this.models.set(userId, staticModel);
            console.log(`✅ 用户 ${userId} 的静态MMD模型加载完成`);
          }
        } else {
          // 创建静态GLTF模型
          const gltfPath = modelPathRes.data?.resources.find(resource => resource.ext === '.glb')?.path;
          if (gltfPath) {
            const staticModel = new StaticGLTFModel();
            // 🔧 实际加载模型数据
            await staticModel.load(this.scene, gltfPath);
            this.models.set(userId, staticModel);
            console.log(`✅ 用户 ${userId} 的静态GLTF模型加载完成`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ 加载用户 ${userId} 的静态模型失败:`, error);
    }
  }

  /**
   * 移除用户模型
   */
  removeModel(userId: string): void {
    const model = this.models.get(userId);
    if (model) {
      console.log(`🗑️ 开始移除用户 ${userId} 的静态模型...`);

      // 🔧 清理昵称标签
      if (this.nameTagManager) {
        this.nameTagManager.removeNameTag(userId);
        console.log(`✅ 用户 ${userId} 的昵称标签已清理`);
      }

      // 从场景中移除
      if (model.mesh && model.mesh.parent) {
        model.mesh.parent.remove(model.mesh);
        console.log(`✅ 用户 ${userId} 的模型已从场景移除`);
      }

      // 🔧 清理模型资源（包括胶囊体、包围盒、辅助器等）
      if (typeof model.dispose === 'function') {
        model.dispose();
        console.log(`✅ 用户 ${userId} 的模型资源已清理`);
      }

      // 从映射中移除
      this.models.delete(userId);
      this.nicknames.delete(userId);
      this.targetStates.delete(userId); // 同时清理目标状态

      console.log(`✅ 用户 ${userId} 的静态模型完全移除`);
    } else {
      console.warn(`⚠️ 用户 ${userId} 的模型不存在，无需移除`);
    }
  }

  /**
   * 设置用户昵称
   */
  setNickname(userId: string, nickname: string): void {
    this.nicknames.set(userId, nickname);
    this.updateNameTag(userId);
  }

  /**
   * 更新昵称标签
   */
  private updateNameTag(userId: string): void {
    const model = this.models.get(userId);
    const nickname = this.nicknames.get(userId);

    if (model && nickname && this.nameTagManager) {
      // 获取模型位置和高度
      const position = model.mesh.position;
      const modelHeight = 20; // 默认模型高度
      this.nameTagManager.addNameTag(userId, nickname, position, modelHeight);
    }
  }

  /**
   * 获取用户模型
   */
  getUserModel(userId: string): StaticMMDModel | StaticGLTFModel | null {
    return this.models.get(userId) || null;
  }

  /**
   * 检查模型是否已加载
   */
  isModelLoaded(userId: string): boolean {
    return this.models.has(userId);
  }

  /**
   * 获取昵称标签管理器
   */
  getNameTagManager(): NameTagManager | null {
    return this.nameTagManager;
  }

  /**
   * 更新所有模型（每帧调用）
   */
  update(_deltaTime: number): void {
    const currentTime = Date.now();
    
    this.models.forEach((model, userId) => {
      try {
        // 静态模型的update方法不需要参数
        if (typeof model.update === 'function') {
          model.update();
        }

        // 执行插值更新
        this.interpolateModel(userId, model, currentTime);

        // 🔧 每帧更新模型位置到 NameTagManager
        if (this.nameTagManager && model.mesh) {
          const nickname = this.nicknames.get(userId);
          if (nickname) {
            this.nameTagManager.updateModelPosition(userId, model.mesh.position);
          }
        }
      } catch (error) {
        console.error(`❌ 更新用户 ${userId} 的模型失败:`, error);
      }
    });

    // 更新昵称标签位置
    if (this.nameTagManager) {
      this.nameTagManager.updateAllNameTags();
    }
  }

  /**
   * 插值更新模型位置和旋转
   */
  private interpolateModel(userId: string, model: StaticMMDModel | StaticGLTFModel, currentTime: number): void {
    const targetState = this.targetStates.get(userId);
    if (!targetState || !model.mesh) return;

    // 计算时间差
    const timeDiff = currentTime - targetState.timestamp;
    
    // 如果时间差过大，直接设置位置（避免过度外推）
    if (timeDiff > this.maxExtrapolationTime) {
      model.mesh.position.copy(targetState.position);
      model.mesh.rotation.copy(targetState.rotation);
      
      // 更新动画状态
      this.updateAnimationState(model, targetState.animationState);
      return;
    }

    // 使用线性插值平滑更新位置和旋转
    model.mesh.position.lerp(targetState.position, this.interpolationFactor);
    
    // 对于旋转，使用球面线性插值
    model.mesh.quaternion.slerp(
      new THREE.Quaternion().setFromEuler(targetState.rotation),
      this.interpolationFactor
    );

    // 更新动画状态
    this.updateAnimationState(model, targetState.animationState);
  }

  /**
   * 更新动画状态
   */
  private updateAnimationState(model: StaticMMDModel | StaticGLTFModel, animationState: string): void {
    if(model.isWalking && animationState === 'standing'){
      model.stopWalking();
      model.isWalking = false
    }else if(!model.isWalking && animationState === 'walking'){
      model.startWalking();
      model.isWalking = true
    }
  }

  /**
   * 根据状态更新模型
   * @param userId 用户ID
   * @param state 模型状态数据
   */
  updateModelByState(userId: string, state: any): void {
    const model = this.models.get(userId);
    if (!model) {
      console.warn(`⚠️ 用户 ${userId} 的模型不存在，无法更新状态`);
      return;
    }

    try {
      // 缓存目标状态用于插值
      this.targetStates.set(userId, {
        position: new THREE.Vector3(state.position.x, state.position.y, state.position.z),
        rotation: new THREE.Euler(
          state.rotation.x * Math.PI / 180, // 转换回弧度
          state.rotation.y * Math.PI / 180,
          state.rotation.z * Math.PI / 180
        ),
        timestamp: Date.now(),
        animationState: state.animation.currentAnimation
      });

      // 更新昵称标签位置
      if (this.nameTagManager) {
        this.nameTagManager.updateModelPosition(userId, model.mesh.position);
      }

      console.log(`✅ 用户 ${userId} 的模型状态已更新`);
    } catch (error) {
      console.error(`❌ 更新用户 ${userId} 的模型状态失败:`, error);
    }
  }

  /**
   * 获取模型数量
   */
  getModelCount(): number {
    return this.models.size;
  }

  /**
   * 清理所有模型
   */
  cleanup(): void {
    console.log('🧹 开始清理StaticMMDModelManager...');

    // 清理所有模型
    const userIds = Array.from(this.models.keys());
    userIds.forEach(userId => {
      try {
        console.log(`🗑️ 清理用户 ${userId} 的静态模型...`);
        this.removeModel(userId);
      } catch (error) {
        console.error(`❌ 清理用户 ${userId} 的模型失败:`, error);
      }
    });

    // 🔧 清理昵称标签管理器
    if (this.nameTagManager) {
      // 清理所有剩余的昵称标签
      const remainingUserIds = Array.from(this.nicknames.keys());
      remainingUserIds.forEach(userId => {
        this.nameTagManager!.removeNameTag(userId);
      });

      this.nameTagManager = null;
      console.log('✅ 昵称标签管理器已清理');
    }

    // 清空集合
    this.models.clear();
    this.nicknames.clear();
    this.targetStates.clear(); // 清理目标状态缓存

    console.log('✅ StaticMMDModelManager 清理完成');
  }
}