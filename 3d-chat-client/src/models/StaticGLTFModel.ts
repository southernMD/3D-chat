import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { StaticModel } from './StaticModel';

// 定义GLTF类型
interface GLTF {
  scene: THREE.Group;
  scenes: THREE.Group[];
  animations: THREE.AnimationClip[];
  cameras: THREE.Camera[];
  asset: {
    copyright?: string;
    generator?: string;
    version?: string;
    minVersion?: string;
    extensions?: any;
    extras?: any;
  };
}

export class StaticGLTFModel extends StaticModel {
  // 声明必要的属性
  declare mesh: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  walkAction?: THREE.AnimationAction;
  standAction?: THREE.AnimationAction;
  animations: THREE.AnimationClip[] = [];
  constructor() {
    super();
    this.mesh = new THREE.Object3D();
    this.mixer = new THREE.AnimationMixer(this.mesh);
  }
  update(): void {
    // 更新动画混合器
    if (this.mixer) {
      this.mixer.update(1/60);
    }
  }

  /**
   * 切换辅助线可见性
   */
  // toggleHelpers(): void {
  //   if (this.helpersVisible) {
  //     const { boxHelper, capsuleVisual } = this.helpersVisible;

  //     // 获取当前状态（以胶囊体为准）
  //     const currentVisibility = capsuleVisual ? capsuleVisual.visible : true;
  //     const newVisibility = !currentVisibility;

  //     // 切换包围盒辅助线可见性
  //     if (boxHelper) {
  //       boxHelper.visible = newVisibility;
  //     }

  //     // 切换胶囊体可见性
  //     if (capsuleVisual) {
  //       capsuleVisual.visible = newVisibility;
  //     }

  //     console.log(`人物辅助线显示状态: ${newVisibility ? '显示' : '隐藏'}`);
  //   }
  // }

  /**
   * 设置辅助视觉效果
   */
  // setupHelpers(scene: THREE.Scene, capsuleVisual: THREE.Mesh): void {
  //   // 创建包围盒辅助线
  //   const boxHelper = new THREE.BoxHelper(this.mesh, 0xffff00);

  //   // 添加到场景
  //   scene.add(boxHelper);

  //   // 保存引用以便控制可见性
  //   this.helpersVisible = {
  //     boxHelper,
  //     capsuleVisual
  //   };
  // }

  // 加载GLTF模型
  async load(scene: THREE.Scene, modelPath: string): Promise<void> {
    try {
      const loader = new GLTFLoader();
      const loadModel = (): Promise<GLTF> => {
        return new Promise((resolve, reject) => {
          loader.load(
            modelPath, 
            (gltf) => resolve(gltf), 
            undefined, 
            (err) => reject(err)
          );
        });
      };
      const gltf = await loadModel();
      // 设置模型
      this.mesh = gltf.scene;
      const meshSize = this.setModelDimensions()
      const minWidth = 8;  // 网格基本单位
      const scaleXZ = Math.max(minWidth / meshSize.width, minWidth / meshSize.depth);
      const scaleFactor = Math.max(1, scaleXZ); // 至少保持原大小
      this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.mesh.position.set(0,5,0)
      this.setModelDimensions()
      
      // 创建混合器
      this.mixer = new THREE.AnimationMixer(this.mesh);

      // 保存动画
      this.animations = gltf.animations;
      
      // 设置动画
      this.setupAnimations();
      
      // 创建静态胶囊体几何
      this.createCapsuleGeometry();

      // 添加胶囊体可视化到场景
      // scene.add(capsuleVisual);

      // 设置辅助器
      // this.setupHelpers(scene, capsuleVisual);

      // 更新胶囊体位置
      // this.updateCapsuleVisualPosition();
      
      // 开始播放站立动画
      this.stopWalk();
      scene.add(this.mesh);
      console.log('GLTF模型加载成功');
      //设置模型大小
    } catch (error) {
      console.error('加载GLTF模型失败:', error);
    }
  }
  
  
  // 设置动画
  private setupAnimations(): void {
    if (this.animations.length === 0) {
      console.warn('没有找到动画');
      return;
    }
    
    // 查找walking和stand动画
    const walkAnimation = this.animations.find(anim => anim.name.toLowerCase().includes('walk'));
    const standAnimation = this.animations.find(anim => anim.name.toLowerCase().includes('stand'));
    
    if (walkAnimation) {
      this.walkAction = this.mixer.clipAction(walkAnimation);
      this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      console.warn('没有找到walking动画');
    }
    
    if (standAnimation) {
      this.standAction = this.mixer.clipAction(standAnimation);
      this.standAction.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      console.warn('没有找到stand动画');
    }
  }
  

  

  
  // 实现基类的抽象方法 - 开始行走
  startWalking(): void {
    this.startWalk();
  }
  
  // 实现基类的抽象方法 - 停止行走
  stopWalking(): void {
    this.stopWalk();
  }
  
  // 开始行走动画
  startWalk(): void {
    if (this.walkAction && this.standAction) {
      // 淡出站立动画
      this.standAction.fadeOut(0.5);
      
      // 淡入行走动画
      this.walkAction.reset();
      this.walkAction.fadeIn(0.5);
      this.walkAction.play();
    }
  }
  
  // 停止行走动画
  stopWalk(): void {
    if (this.walkAction && this.standAction) {
      // 淡出行走动画
      this.walkAction.fadeOut(0.5);
      
      // 淡入站立动画
      this.standAction.reset();
      this.standAction.fadeIn(0.5);
      this.standAction.play();
    }
  }

  // 获取模型三维尺寸
  setModelDimensions(): { width: number; height: number; depth: number } {
    if (!this.mesh) return { width: 0, height: 0, depth: 0 };

    // GLTF模型需要从整个场景计算包围盒
    const boundingBox = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 存储尺寸
    this.modelSize = {
      width: size.x,
      height: size.y,
      depth: size.z
    };
    console.log('modelSize:', this.modelSize);
    return this.modelSize;
  }

  /**
   * 彻底清理GLTF模型资源
   */
  dispose(): void {
    console.log('🗑️ 开始清理GLTF模型资源...');

    // 1. 清理动画混合器
    if (this.mixer) {
      // 停止所有动画动作
      this.mixer.stopAllAction();
      // 清理所有剪辑
      this.mixer.uncacheRoot(this.mesh);
      console.log('✅ GLTF动画混合器已清理');
    }

    // 2. 清理动画动作
    if (this.walkAction) {
      this.walkAction.stop();
    }
    if (this.standAction) {
      this.standAction.stop();
    }

    // 3. 清理动画剪辑
    if (this.animations) {
      // this.animations.forEach(clip => {
      //   // 清理动画轨道
      //   if (clip.tracks) {
      //     // clip.tracks.forEach(track => {
      //     //   // 动画轨道本身不需要特殊清理，但确保引用被清除
      //     // });
      //   }
      // });
      this.animations = [];
      console.log('✅ GLTF动画剪辑已清理');
    }

    // 4. 深度清理模型网格和所有资源
    if (this.mesh) {
      this.deepDisposeObject3D(this.mesh);
      console.log('✅ GLTF模型网格已清理');
    }

    // 5. 调用父类清理方法（清理胶囊体、包围盒、辅助器等）
    super.dispose();

    console.log('✅ GLTF模型资源清理完成');
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

      // 清理蒙皮网格
      if (child instanceof THREE.SkinnedMesh) {
        // 清理几何体
        if (child.geometry) {
          child.geometry.dispose();
        }

        // 清理材质
        if (child.material) {
          this.deepDisposeMaterial(child.material);
        }

        // 清理骨骼纹理
        if (child.skeleton && child.skeleton.boneTexture) {
          child.skeleton.boneTexture.dispose();
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