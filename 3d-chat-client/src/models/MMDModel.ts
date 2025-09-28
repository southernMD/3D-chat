import * as THREE from 'three';
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { AnimationClip } from 'three/src/animation/AnimationClip.js';
import { AnimationAction } from 'three/src/animation/AnimationAction.js';

import type { KeyframeTrack } from 'three';
import { Model } from './Model';
import { BVHPhysics } from '@/physics/BVHPhysics';

// MMDModel类 - 继承自Model基类，特化为MMD模型
export class MMDModel extends Model {
  declare mesh: THREE.SkinnedMesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.Material | THREE.Material[]>;
  walkAction?: AnimationAction;
  standAction?: AnimationAction;
  private helper: MMDAnimationHelper | null = null;

  constructor(bvhPhysics: BVHPhysics) {
    super(bvhPhysics);
    this.mesh = new THREE.SkinnedMesh();
  }
  update(): void {
    // 更新动画
    if (this.helper) {
      this.helper.update(1/60);
    }

    // 更新动画混合器
    if (this.mixer) {
      this.mixer.update(1/60);
    }
  }

  /**
   * 切换辅助线可见性
   */
  toggleHelpers(): void {
    if (this.helpersVisible) {
      const { boxHelper } = this.helpersVisible;

      // 获取当前状态（以包围盒为准）
      const currentVisibility = boxHelper ? boxHelper.visible : false;
      const newVisibility = !currentVisibility;

      // 切换包围盒辅助线可见性
      if (boxHelper) {
        boxHelper.visible = newVisibility;
        console.log(`包围盒辅助线: ${newVisibility ? '显示' : '隐藏'}`);
      }

      console.log(`人物辅助线显示状态: ${newVisibility ? '显示' : '隐藏'}`);
    } else {
      console.log('❌ 辅助器未初始化');
    }
  }

  /**
   * 设置辅助视觉效果
   */
  setupHelpers(scene: THREE.Scene, capsuleVisual: THREE.Mesh): void {
    // 创建包围盒辅助线
    const boxHelper = new THREE.BoxHelper(this.mesh, 0xffff00);
    boxHelper.visible = true; // 默认显示

    // 添加到场景
    scene.add(boxHelper);

    // 保存引用以便控制可见性
    this.helpersVisible = {
      boxHelper,
      capsuleVisual
    };

    console.log('✅ 辅助器已创建:', {
      boxHelper: !!boxHelper,
      capsuleVisual: !!capsuleVisual,
      boxHelperVisible: boxHelper.visible,
      capsuleVisualVisible: capsuleVisual.visible
    });
  }

  // 加载模型
  async load(scene: THREE.Scene, modelPath: string, walkAnimPath: string, standAnimPath: string): Promise<void> {
    const loader = new MMDLoader();
    // 创建一个加载MMD模型的Promise
    const loadModel = (): Promise<THREE.SkinnedMesh> => {
      return new Promise((resolve, reject) => {
        loader.load(
          modelPath, 
          (mmd) => resolve(mmd), 
          undefined, 
          (err) => reject(err)
        );
      });
    };
    
    // 创建一个加载动画的Promise
    const loadAnimation = (mesh: THREE.SkinnedMesh, animPath: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        loader.loadAnimation(
          animPath, 
          mesh, 
          (animationData) => resolve(animationData), 
          undefined, 
          (err) => reject(err)
        );
      });
    };
    
    try {
      // 加载模型
      const mmd = await loadModel();
      this.helper = new MMDAnimationHelper();
      this.helper.add(mmd, { physics: false }); // 禁用MMD物理引擎，使用我们自己的Cannon.js物理引擎
      this.mesh = mmd;
      const meshSize = this.setModelDimensions()
      const minWidth = 8;  // 网格基本单位
      const scaleXZ = Math.max(minWidth / meshSize.width, minWidth / meshSize.depth);
      const scaleFactor = Math.max(1, scaleXZ); // 至少保持原大小
      this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.mesh.position.set(0,2,0)
      this.setModelDimensions()

      // 创建静态胶囊体几何
      const { capsuleInfo, capsuleVisual } = this.createCapsuleGeometry();

      // 添加胶囊体可视化到场景
      scene.add(capsuleVisual);
      console.log('✅ 胶囊体可视化已添加到场景:', {
        name: capsuleVisual.name,
        visible: capsuleVisual.visible,
        position: capsuleVisual.position,
        parent: capsuleVisual.parent?.type || 'Scene',
        geometry: capsuleVisual.geometry.type,
        material: Array.isArray(capsuleVisual.material) ? 'Array' : (capsuleVisual.material as THREE.Material).type
      });

      // 创建物理胶囊体
      const playerCapsule = this.createPhysicsCapsule();

      // 设置辅助器
      this.setupHelpers(scene, capsuleVisual);

      // 更新胶囊体位置
      this.updatePhysicsCapsulePosition();
      this.updateCapsuleVisualPosition();
      
      // 创建动画混合器
      this.mixer = new THREE.AnimationMixer(this.mesh);
      
      // 加载走路动画
      const walkAnimData = await loadAnimation(this.mesh, walkAnimPath);
      const walkClip = new AnimationClip('walk', -1, walkAnimData.tracks as KeyframeTrack[]);
      this.walkAction = this.mixer.clipAction(walkClip);
      this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
      
      // 加载站立动画
      const standAnimData = await loadAnimation(this.mesh, standAnimPath);
      const standClip = new AnimationClip('stand', -1, standAnimData.tracks as KeyframeTrack[]);
      this.standAction = this.mixer.clipAction(standClip);
      this.standAction.setLoop(THREE.LoopRepeat, Infinity);
      
      // 默认播放站立动画
      this.standAction.play();
      
      // 添加到场景
      scene.add(this.mesh);
      this.setModelDimensions()
    } catch (error) {
      console.error('加载模型或动画时出错:', error);
    }
  }

  
  // 更新动画
  updateAnimation(deltaTime: number): void {
    // 更新MMD动画助手
    if (this.helper) {
      this.helper.update(deltaTime);
    }

    // 更新动画混合器
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }
  
  // 开始行走动画 - 实现基类抽象方法
  startWalking(): void {
    if (this.walkAction && this.standAction) {
      this.walkAction.play();
      this.standAction.stop();
    }
  }
  
  // 停止行走动画 - 实现基类抽象方法
  stopWalking(): void {
    if (this.walkAction && this.standAction) {
      this.walkAction.stop();
      this.standAction.play();
    }
  }
  
  // 为了保持向后兼容，添加这些别名方法
  startWalk(): void {
    this.startWalking();
  }
  
  stopWalk(): void {
    this.stopWalking();
  }
  


  // 获取模型三维尺寸
  setModelDimensions(): { width: number; height: number; depth: number } {
    if (!this.mesh) {
      return { width: 0, height: 0, depth: 0 };
    }

    // 使用Box3.setFromObject计算整个模型的边界盒（包括所有子网格）
    const boundingBox = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 存储尺寸
    this.modelSize = {
      width: size.x,
      height: size.y,
      depth: size.z
    };

    return this.modelSize;
  }

  /**
   * 彻底清理MMD模型资源
   */
  dispose(): void {
    console.log('🗑️ 开始清理MMD模型资源...');

    // 1. 清理MMD动画助手
    if (this.helper) {
      // 停止所有动画
      this.helper = null;
      console.log('✅ MMD动画助手已清理');
    }

    // 2. 清理动画混合器
    if (this.mixer) {
      // 停止所有动画动作
      this.mixer.stopAllAction();
      // 清理所有剪辑
      this.mixer.uncacheRoot(this.mesh);
      this.mixer = null;
      console.log('✅ 动画混合器已清理');
    }

    // 3. 清理动画动作
    if (this.walkAction) {
      this.walkAction.stop();
      this.walkAction = null;
    }
    if (this.standAction) {
      this.standAction.stop();
      this.standAction = null;
    }

    // 4. 深度清理模型网格和所有资源
    if (this.mesh) {
      this.deepDisposeObject3D(this.mesh);
      this.mesh = null;
      console.log('✅ MMD模型网格已清理');
    }

    console.log('✅ MMD模型资源清理完成');
  }

  /**
   * 深度清理Three.js对象的所有资源
   */
  private deepDisposeObject3D(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      // 清理网格
      if (child instanceof THREE.Mesh) {
        // 清理几何体
        if (child.geometry) {
          child.geometry.dispose();
        }

        // 深度清理材质和纹理
        if (child.material) {
          this.deepDisposeMaterial(child.material);
        }
      }

      // 清理骨骼
      if (child instanceof THREE.Bone) {
        // 骨骼本身不需要特殊清理，但确保从父对象中移除
      }

      // 清理灯光
      if (child instanceof THREE.Light) {
        if (child.shadow && child.shadow.map) {
          child.shadow.map.dispose();
        }
      }

      // 清理相机
      if (child instanceof THREE.Camera) {
        // 相机本身不需要特殊清理
      }
    });

    // 清空子对象
    obj.clear();
  }

  /**
   * 深度清理材质和所有相关纹理
   */
  private deepDisposeMaterial(material: THREE.Material | THREE.Material[]): void {
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

      // 清理材质本身
      mat.dispose();
    });
  }
}

// 全局声明现在通过GlobalState接口管理，不再使用window全局变量