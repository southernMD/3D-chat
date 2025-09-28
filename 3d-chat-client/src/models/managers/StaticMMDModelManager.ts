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
          if (pmxPath) {
            const staticModel = new StaticMMDModel();
            // 添加到场景
            this.scene.add(staticModel.mesh);
            this.models.set(userId, staticModel);
            console.log(`✅ 用户 ${userId} 的静态MMD模型创建完成`);
          }
        } else {
          // 创建静态GLTF模型
          const gltfPath = modelPathRes.data?.resources.find(resource => resource.ext === '.glb')?.path;
          if (gltfPath) {
            const staticModel = new StaticGLTFModel();
            // 添加到场景
            this.scene.add(staticModel.mesh);
            this.models.set(userId, staticModel);
            console.log(`✅ 用户 ${userId} 的静态GLTF模型创建完成`);
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
      // 从场景中移除
      if (model.mesh && model.mesh.parent) {
        model.mesh.parent.remove(model.mesh);
      }

      // 清理资源
      if (typeof model.dispose === 'function') {
        model.dispose();
      }

      // 从映射中移除
      this.models.delete(userId);
      this.nicknames.delete(userId);

      console.log(`✅ 用户 ${userId} 的静态模型已移除`);
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
   * 更新所有模型（每帧调用）
   */
  update(_deltaTime: number): void {
    this.models.forEach((model, userId) => {
      try {
        // 静态模型的update方法不需要参数
        if (typeof model.update === 'function') {
          model.update();
        }
      } catch (error) {
        console.error(`❌ 更新用户 ${userId} 的模型失败:`, error);
      }
    });

    // 更新昵称标签
    if (this.nameTagManager) {
      this.nameTagManager.updateAllNameTags();
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

    // 清理昵称标签管理器
    if (this.nameTagManager) {
      // NameTagManager 没有 cleanup 方法，直接设为 null
      this.nameTagManager = null;
    }

    // 清空集合
    this.models.clear();
    this.nicknames.clear();

    console.log('✅ StaticMMDModelManager 清理完成');
  }
}
