import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MMDModel } from '../MMDModel';
import { GLTFModel } from '../GLTFModel';
import { BVHPhysics } from '@/physics/BVHPhysics';
import { getModelFilePathByHash } from '@/api/modelApi';
import { NameTagManager } from '@/utils/NameTagManager';
import { StaticMMDModel } from '../StaticMMDModel';

/**
 * MMDModelManager类 - 专门管理MMD模型的类
 * 整合了模型加载、动画控制、GUI控制、键盘事件处理等功能
 */
export class MMDModelManager {
  private mmdModel: MMDModel | GLTFModel | null = null;
  private scene: THREE.Scene;
  private lookCamera: THREE.PerspectiveCamera | null = null;
  private cameraControls: OrbitControls | null = null;
  private renderer: THREE.WebGLRenderer;
  private bvhPhysics: BVHPhysics;
  private nameTagManager: NameTagManager | null = null;
  private nickname: string = '';

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, bvhPhysics: BVHPhysics) {
    this.scene = scene;
    this.renderer = renderer;
    this.bvhPhysics = bvhPhysics;
  }

  /**
   * 初始化昵称标签管理器
   */
  initializeNameTagManager(camera: THREE.Camera, container: HTMLElement): void {
    this.nameTagManager = new NameTagManager(camera, this.renderer, container);
    // 设置当前用户ID
    this.nameTagManager.setCurrentUserId('player');
    // 默认为第三人称视角
    this.nameTagManager.setFirstPersonMode(false);
  }

  /**
   * 设置用户昵称
   */
  setNickname(nickname: string): void {
    this.nickname = nickname;
    this.updateNameTag();
  }

  /**
   * 更新昵称标签
   */
  private updateNameTag(): void {
    if (!this.nameTagManager || !this.mmdModel || !this.nickname) return;

    const modelPosition = this.getModelPosition();
    const modelHeight = this.getModelHeight();

    this.nameTagManager.addNameTag('player', this.nickname, modelPosition, modelHeight);
  }

  /**
   * 获取模型当前位置
   */
  private getModelPosition(): THREE.Vector3 {
    if (!this.mmdModel || !this.mmdModel.mesh) {
      return new THREE.Vector3(0, 0, 0);
    }
    return this.mmdModel.mesh.position.clone();
  }

  /**
   * 获取模型高度
   */
  private getModelHeight(): number {
    if (!this.mmdModel) return 20;

    const dimensions = this.mmdModel.getModelDimensions();
    return dimensions.height;
  }

  /**
   * 添加其他玩家的昵称标签
   */
  addPlayerNameTag(playerId: string, nickname: string, position: THREE.Vector3, modelHeight: number = 20): void {
    if (this.nameTagManager) {
      this.nameTagManager.addNameTag(playerId, nickname, position, modelHeight);
    }
  }

  /**
   * 更新其他玩家的昵称标签位置
   */
  updatePlayerNameTag(playerId: string, position: THREE.Vector3): void {
    if (this.nameTagManager) {
      this.nameTagManager.updateModelPosition(playerId, position);
    }
  }

  /**
   * 移除其他玩家的昵称标签
   */
  removePlayerNameTag(playerId: string): void {
    if (this.nameTagManager) {
      this.nameTagManager.removeNameTag(playerId);
    }
  }

  /**
   * 获取昵称标签管理器（供外部使用）
   */
  getNameTagManager(): NameTagManager | null {
    return this.nameTagManager;
  }

  /**
   * @param modelHash
   */
  async loadModel(modelHash:string): Promise<void> {
    try {
      const modelPathRes = await getModelFilePathByHash(modelHash)
      if(modelPathRes.success){
        const isPMX = modelPathRes.data?.resources.some(resource => resource.ext === '.pmx')
        if(isPMX){
          const pmxPath = modelPathRes.data?.resources.find(resource => resource.ext === '.pmx')?.path!
          const walkAnimPath = modelPathRes.data?.resources.find(resource => resource.path.includes('walk.vmd'))?.path!
          const standAnimPath = modelPathRes.data?.resources.find(resource => resource.path.includes('stand.vmd'))?.path!
          this.mmdModel = new MMDModel(this.bvhPhysics);
          await this.mmdModel.load(this.scene, pmxPath, walkAnimPath, standAnimPath);
        }else{
          const glbPath = modelPathRes.data?.resources.find(resource => resource.ext === '.glb')?.path!
          this.mmdModel = new GLTFModel(this.bvhPhysics);
          await this.mmdModel.load(this.scene, glbPath);
        }
      }else{
        throw new Error(modelPathRes.error)
      }
      // this.mmdModel = new GLTFModel(this.bvhPhysics);
      // await this.mmdModel.load(this.scene, '/model/newtest.glb');
      // this.mmdModel = new MMDModel(this.bvhPhysics);
      // await this.mmdModel.load(this.scene, '/lm/楈柌v2.pmx', '/lm/走路.vmd', '/lm/站立.vmd');
      
      // 创建跟随相机
      this.lookCamera = this.mmdModel!.createLookCamera(this.scene);
      
      // 创建相机控制器
      this.cameraControls = this.mmdModel!.createCameraControls(
        this.lookCamera, 
        this.renderer.domElement, 
        this.renderer
      );
      
      console.log('MMD模型加载完成');
    } catch (error) {
      console.error('加载MMD模型时出错:', error);
    }
  }

  /**
   * 获取模型实例
   */
  getModel(): MMDModel | GLTFModel | null {
    return this.mmdModel;
  }

  /**
   * 获取跟随相机
   */
  getLookCamera(): THREE.PerspectiveCamera | null {
    return this.lookCamera;
  }

  /**
   * 获取相机控制器
   */
  getCameraControls(): OrbitControls | null {
    return this.cameraControls;
  }

  /**
   * 重置模型位置
   */
  resetPosition(): void {
    if (this.mmdModel && this.mmdModel.mesh) {
      this.mmdModel.mesh.position.set(0, 0, 0);
      this.mmdModel.mesh.rotation.set(0, 0, 0);
    }
    
    if (this.lookCamera) {
      this.lookCamera.position.set(0, 13, 2);
    }
    
    if (this.cameraControls) {
      this.cameraControls.minAzimuthAngle = Math.PI * 2;
      this.cameraControls.maxPolarAngle = Math.PI * 3 / 4;
    }
    

    
    // 重新渲染
    if (this.lookCamera) {
      this.renderer.render(this.scene, this.lookCamera);
    }
  }

  /**
   * 切换辅助线显示
   */
  toggleHelpers(): void {
    if (this.mmdModel && 'toggleHelpers' in this.mmdModel) {
      (this.mmdModel as any).toggleHelpers();
    } else {
      console.log('模型不支持辅助线切换');
    }
  }

  /**
   * 强制播放走路动画
   */
  forceWalk(): void {
    if (this.mmdModel) {
      this.mmdModel.startWalk();
      this.mmdModel.isWalking = true;
    }
  }

  /**
   * 强制播放站立动画
   */
  forceStand(): void {
    if (this.mmdModel) {
      this.mmdModel.stopWalk();
      this.mmdModel.isWalking = false;
    }
  }

  /**
   * 处理键盘按下事件
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (this.mmdModel) {
      this.mmdModel.handleKeyDown(event);
    }
  }

  /**
   * 处理键盘抬起事件
   */
  handleKeyUp(event: KeyboardEvent): void {
    if (this.mmdModel) {
      this.mmdModel.handleKeyUp(event);
    }
  }

  /**
   * 更新模型（在动画循环中调用）
   */
  update(deltaTime: number): void {
    if (this.mmdModel) {
      this.mmdModel.update();
      // 同时调用动画更新方法
      if ('updateAnimation' in this.mmdModel) {
        (this.mmdModel as any).updateAnimation(deltaTime);
      }

      // 更新跟随相机位置（按照three_study-main的实现）
      if (this.lookCamera && this.cameraControls) {
        this.mmdModel.updateCameraFollow(this.lookCamera, this.cameraControls);
      }

      // 更新昵称标签位置
      if (this.nameTagManager && this.nickname) {
        const modelPosition = this.getModelPosition();
        this.nameTagManager.updateModelPosition('player', modelPosition);
      }
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    console.log('🗑️ 开始清理MMDModelManager资源...');

    // 1. 清理MMD模型
    if (this.mmdModel) {
      // 调用模型的dispose方法彻底清理资源
      if (typeof this.mmdModel.dispose === 'function') {
        this.mmdModel.dispose();
      }
      this.mmdModel = null;
      console.log('✅ MMD模型已清理');
    }

    // 2. 释放相机控制器
    if (this.cameraControls) {
      this.cameraControls.dispose();
      this.cameraControls = null;
      console.log('✅ 相机控制器已清理');
    }

    // 3. 清理昵称标签管理器
    if (this.nameTagManager) {
      this.nameTagManager.dispose();
      this.nameTagManager = null;
      console.log('✅ 昵称标签管理器已清理');
    }

    // 4. 清理相机引用
    if (this.lookCamera) {
      this.lookCamera = null;
      console.log('✅ 相机引用已清理');
    }

    console.log('✅ MMDModelManager资源清理完成');
  }

  /**
   * 检查模型是否已加载
   */
  isModelLoaded(): boolean {
    return this.mmdModel !== null;
  }

  /**
   * 获取模型尺寸
   */
  getModelDimensions(): { width: number; height: number; depth: number } | null {
    if (this.mmdModel && this.mmdModel.mesh) {
      const box = new THREE.Box3().setFromObject(this.mmdModel.mesh);
      const size = box.getSize(new THREE.Vector3());
      return {
        width: size.x,
        height: size.y,
        depth: size.z
      };
    }
    return null;
  }
}
