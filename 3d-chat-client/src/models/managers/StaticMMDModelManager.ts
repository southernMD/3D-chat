import * as THREE from 'three';
import { StaticMMDModel } from '../StaticMMDModel';
import { StaticGLTFModel } from '../StaticGLTFModel';
import { getModelFilePathByHash } from '@/api/modelApi';
import { NameTagManager } from '@/utils/NameTagManager';
import { eventBus } from '@/utils/eventBus';

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
    moveSpeed: number; // 移动速度参数
    velocity: THREE.Vector3; // 速度向量
    acceleration: THREE.Vector3; // 加速度向量
    previousVelocity: THREE.Vector3; // 前一次的速度向量
    confidence: number; // 预测置信度 (0-1)
    isOnGround: boolean; // 🏃 地面状态判断参数
  }> = new Map();

  // 预测历史记录（用于轨迹预测和误差修正）
  private predictionHistory: Map<string, Array<{
    timestamp: number;
    predictedPosition: THREE.Vector3;
    actualPosition: THREE.Vector3;
    error: number;
  }>> = new Map();
  
  // 插值和预测参数
  private interpolationFactor = 0.1; // 插值因子，控制平滑度
  private maxExtrapolationTime = 150; // 最大外推时间（毫秒）
  private predictionHistorySize = 10; // 预测历史记录大小
  private confidenceDecayRate = 0.95; // 置信度衰减率

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

      // 🚌 发送胶囊体移除事件到BVHPhysics
      eventBus.emit('user-capsule-remove', { userId });

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
   * 插值更新模型位置和旋转（增强预测版本）
   */
  private interpolateModel(userId: string, model: StaticMMDModel | StaticGLTFModel, currentTime: number): void {
    const targetState = this.targetStates.get(userId);
    if (!targetState || !model.mesh) return;

    // 计算时间差（秒）
    const timeDiff = (currentTime - targetState.timestamp) / 1000;
    
    //  智能预测位置计算
    const predictedPosition = this.calculatePredictedPosition(userId, targetState, timeDiff);
    
    // 根据地面状态调整外推时间限制
    const maxExtrapolationTime = targetState.isOnGround ? 
      this.maxExtrapolationTime : 
      this.maxExtrapolationTime * 0.6; // 空中状态使用更短的外推时间
    
    // 如果时间差过大，直接设置位置（避免过度外推）
    if (timeDiff > maxExtrapolationTime / 1000) {
      model.mesh.position.copy(predictedPosition);
      model.mesh.rotation.copy(targetState.rotation);
      
      // 记录预测误差
      this.recordPredictionError(userId, predictedPosition, targetState.position, currentTime);
      
      // 🔧 同步更新胶囊体和包围盒位置
      // this.updateModelHelpers(model);
      
      // 🚌 发送胶囊体位置更新事件到BVHPhysics
      this.sendCapsuleUpdateEvent(userId, model);
      
      // 更新动画状态
      this.updateAnimationState(model, targetState.animationState);
      return;
    }

    // 🎯 自适应插值因子，基于预测置信度和移动速度
    const adaptiveInterpolationFactor = this.calculateAdaptiveInterpolationFactor(targetState, timeDiff);

    // 使用线性插值平滑更新位置和旋转
    model.mesh.position.lerp(predictedPosition, adaptiveInterpolationFactor);
    
    // 对于旋转，使用球面线性插值
    model.mesh.quaternion.slerp(
      new THREE.Quaternion().setFromEuler(targetState.rotation),
      this.interpolationFactor
    );

    // 🔧 同步更新胶囊体和包围盒位置
    // this.updateModelHelpers(model);

    // 🚌 发送胶囊体位置更新事件到BVHPhysics
    this.sendCapsuleUpdateEvent(userId, model);

    // 更新动画状态
    this.updateAnimationState(model, targetState.animationState);
  }

  /**
   *  智能预测位置计算（基于地面状态）
   */
  private calculatePredictedPosition(userId: string, targetState: any, timeDiff: number): THREE.Vector3 {
    const predictedPosition = new THREE.Vector3();
    predictedPosition.copy(targetState.position);

    // 如果时间差太小或没有速度，直接返回当前位置
    if (timeDiff <= 0 || targetState.velocity.length() === 0) {
      return predictedPosition;
    }

    //  地面状态：使用完整预测算法
    if (targetState.isOnGround) {
      //  基础线性预测（基于速度）
      const linearPrediction = targetState.velocity.clone().multiplyScalar(timeDiff);
      predictedPosition.add(linearPrediction);

      //加速度预测（二次项）- 地面状态下使用较小的系数
      if (targetState.acceleration.length() > 0) {
        const accelerationPrediction = targetState.acceleration.clone()
          .multiplyScalar(0.3 * timeDiff * timeDiff); // 地面状态下减少加速度影响
        predictedPosition.add(accelerationPrediction);
      }

      // 基于历史误差的修正
      const errorCorrection = this.calculateErrorCorrection(userId, timeDiff);
      if (errorCorrection) {
        predictedPosition.add(errorCorrection);
      }

      //  基于动画状态的修正
      const animationCorrection = this.calculateAnimationBasedCorrection(targetState, timeDiff);
      predictedPosition.add(animationCorrection);
    } else {
      // 空中状态：使用简单的线性预测，避免复杂计算
      const linearPrediction = targetState.velocity.clone().multiplyScalar(timeDiff);
      predictedPosition.add(linearPrediction);
    }

    return predictedPosition;
  }

  /**
   *  计算自适应插值因子（基于地面状态）
   */
  private calculateAdaptiveInterpolationFactor(targetState: any, timeDiff: number): number {
    //  地面状态：正常插值逻辑
    if (targetState.isOnGround) {
      let factor = this.interpolationFactor;

      // 基于移动速度调整
      const speedFactor = Math.min(targetState.moveSpeed / 10, 2.0);
      factor *= (1 + speedFactor);

      // 基于预测置信度调整
      factor *= targetState.confidence;

      // 基于时间差调整（时间差越大，插值越快）
      const timeFactor = Math.min(timeDiff * 5, 2.0);
      factor *= (1 + timeFactor);

      // 地面状态限制范围
      return Math.min(Math.max(factor, 0.05), 0.8);
    } else {
      //  空中状态：使用适中的插值因子，避免闪现效果
      let aerialFactor = 0.2; // 提高空中状态基础插值因子

      // 基于置信度调整
      aerialFactor *= targetState.confidence;

      // 基于时间差适当调整
      const timeFactor = Math.min(timeDiff * 3, 1.5);
      aerialFactor *= (1 + timeFactor * 0.5);

      // 空中状态使用合理的范围，避免过于保守
      return Math.min(Math.max(aerialFactor, 0.1), 0.6);
    }
  }

  /**
   * 基于历史误差计算修正值
   */
  private calculateErrorCorrection(userId: string, timeDiff: number): THREE.Vector3 | null {
    const history = this.predictionHistory.get(userId);
    if (!history || history.length < 3) {
      return null;
    }

    // 计算最近几次预测的平均误差
    const recentHistory = history.slice(-5);
    const avgError = new THREE.Vector3(0, 0, 0);
    
    recentHistory.forEach(record => {
      const error = record.actualPosition.clone().sub(record.predictedPosition);
      avgError.add(error);
    });
    
    avgError.divideScalar(recentHistory.length);

    // 基于时间差调整修正强度
    const correctionStrength = Math.min(timeDiff * 2, 1.0);
    return avgError.multiplyScalar(correctionStrength);
  }

  /**
   *  基于动画状态的位置修正
   */
  private calculateAnimationBasedCorrection(targetState: any, timeDiff: number): THREE.Vector3 {
    const correction = new THREE.Vector3(0, 0, 0);

    // 根据动画状态调整预测
    if (targetState.animationState === 'walking') {
      // 行走时，增加前进方向的预测
      const walkingBoost = targetState.velocity.clone().normalize().multiplyScalar(
        targetState.moveSpeed * timeDiff * 0.1
      );
      correction.add(walkingBoost);
    } else if (targetState.animationState === 'standing') {
      // 站立时，减少移动预测（添加阻尼）
      const dampingFactor = Math.max(0, 1 - timeDiff * 2);
      correction.multiplyScalar(dampingFactor);
    }

    return correction;
  }

  /**
   *  记录预测误差用于学习
   */
  private recordPredictionError(userId: string, predicted: THREE.Vector3, actual: THREE.Vector3, timestamp: number): void {
    const error = predicted.distanceTo(actual);
    
    if (!this.predictionHistory.has(userId)) {
      this.predictionHistory.set(userId, []);
    }

    const history = this.predictionHistory.get(userId)!;
    
    // 添加新记录
    history.push({
      timestamp,
      predictedPosition: predicted.clone(),
      actualPosition: actual.clone(),
      error
    });

    // 保持历史记录大小限制
    if (history.length > this.predictionHistorySize) {
      history.shift();
    }

    // 调试信息（偶尔打印）
    if (Math.random() < 0.05) {
      const avgError = history.reduce((sum, record) => sum + record.error, 0) / history.length;
      console.log(`📊 用户 ${userId} 平均预测误差: ${avgError.toFixed(2)}`);
    }
  }

  /**
   *  发送胶囊体更新事件到BVHPhysics
   */
  private sendCapsuleUpdateEvent(userId: string, model: StaticMMDModel | StaticGLTFModel): void {
    try {
      if (!model.mesh) return;
      
      // 获取胶囊体信息
      let capsuleInfo: { radius: number; height: number } | undefined;
      if (typeof (model as any).getCapsuleInfo === 'function') {
        const info = (model as any).getCapsuleInfo();
        if (info) {
          capsuleInfo = { radius: info.radius, height: info.height };
        }
      }
      
      // 发送胶囊体位置更新事件
      eventBus.emit('static-user-capsule-update', {
        userId: userId,
        position: {
          x: model.mesh.position.x,
          y: model.mesh.position.y,
          z: model.mesh.position.z
        },
        capsuleInfo: capsuleInfo // 包含胶囊体信息
      });
    } catch (error) {
      console.error(`❌ 发送用户 ${userId} 胶囊体更新事件失败:`, error);
    }
  }

  /**
   * 更新模型的辅助器（胶囊体和包围盒）
   */
  // private updateModelHelpers(model: StaticMMDModel | StaticGLTFModel): void {
  //   try {
  //     // 更新胶囊体可视化位置
  //     if (typeof model.updateCapsuleVisualPosition === 'function') {
  //       model.updateCapsuleVisualPosition();
  //     }

  //     // 更新模型辅助器（包围盒等）
  //     if (typeof model.updateModelHelpers === 'function') {
  //       model.updateModelHelpers();
  //     }
  //   } catch (error) {
  //     console.error('❌ 更新模型辅助器失败:', error);
  //   }
  // }

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
      const newPosition = new THREE.Vector3(state.position.x, state.position.y, state.position.z);
      const currentTime = Date.now();
      
      // 计算速度向量和加速度（如果有之前的状态）
      let velocity = new THREE.Vector3(0, 0, 0);
      let acceleration = new THREE.Vector3(0, 0, 0);
      let previousVelocity = new THREE.Vector3(0, 0, 0);
      let confidence = 1.0; // 初始置信度
      
      const previousState = this.targetStates.get(userId);
      
      if (previousState) {
        const timeDelta = (currentTime - previousState.timestamp) / 1000; // 转换为秒
        
        if (timeDelta > 0) {
          // 计算新的速度向量
          velocity = newPosition.clone().sub(previousState.position).divideScalar(timeDelta);
          
          // 计算加速度向量
          previousVelocity = previousState.velocity.clone();
          acceleration = velocity.clone().sub(previousVelocity).divideScalar(timeDelta);
          
          // 🎯 基于数据质量调整置信度
          confidence = this.calculateStateConfidence(timeDelta, velocity, previousState);
        }
      }


      // 🚀 缓存增强的目标状态用于智能插值
      this.targetStates.set(userId, {
        position: newPosition,
        rotation: new THREE.Euler(
          state.rotation.x * Math.PI / 180, // 转换回弧度
          state.rotation.y * Math.PI / 180,
          state.rotation.z * Math.PI / 180
        ),
        timestamp: currentTime,
        animationState: state.animation.currentAnimation,
        moveSpeed: state.moveSpeed || 0,
        velocity: velocity,
        acceleration: acceleration,
        previousVelocity: previousVelocity,
        confidence: confidence,
        isOnGround: state.physics?.isOnGround ?? true // 🏃 从状态数据获取地面判断参数
      });

      // 更新昵称标签位置
      if (this.nameTagManager) {
        this.nameTagManager.updateModelPosition(userId, model.mesh.position);
      }

      // console.log(`✅ 用户 ${userId} 的模型状态已更新，移动速度: ${state.moveSpeed || 0}，置信度: ${confidence.toFixed(2)}，地面状态: ${state.physics?.isOnGround ? '地面' : '空中'}`);
    } catch (error) {
      console.error(`❌ 更新用户 ${userId} 的模型状态失败:`, error);
    }
  }

  /**
   * 🎯 计算状态置信度
   */
  private calculateStateConfidence(timeDelta: number, velocity: THREE.Vector3, previousState: any): number {
    let confidence = 1.0;

    // 基于时间间隔调整置信度（时间间隔太大或太小都降低置信度）
    if (timeDelta > 0.2) { // 超过200ms
      confidence *= Math.max(0.3, 1 - (timeDelta - 0.2) * 2);
    } else if (timeDelta < 0.01) { // 少于10ms
      confidence *= 0.5;
    }

    // 基于速度变化调整置信度
    const velocityChange = velocity.distanceTo(previousState.velocity);
    const maxReasonableChange = 50; // 最大合理速度变化
    if (velocityChange > maxReasonableChange) {
      confidence *= Math.max(0.2, 1 - (velocityChange - maxReasonableChange) / maxReasonableChange);
    }

    // 基于之前的置信度进行平滑
    confidence = previousState.confidence * this.confidenceDecayRate + confidence * (1 - this.confidenceDecayRate);

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * 获取所有模型
   */
  getModels() {
    return this.models
  }

  // toggleHelpers(): void {
  //   this.models.forEach((model)=>{
  //     model?.toggleHelpers()
  //   })
  // }

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
        this.removeModel(userId); // removeModel方法内部会发送胶囊体移除事件
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
    this.predictionHistory.clear(); // 清理预测历史记录

    console.log('✅ StaticMMDModelManager 清理完成');
  }
}