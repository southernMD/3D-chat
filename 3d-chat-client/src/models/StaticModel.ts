import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

/**
 * StaticModel 基类 - 处理静态模型相关功能
 * 包括：模型尺寸计算、胶囊体几何形状、包围盒计算、动画播放等
 * 不包含物理系统，只处理静态几何和可视化
 */
export abstract class StaticModel {
    // 键盘控制相关
  public isWalking: boolean = false;
  abstract mesh: THREE.Object3D;
  protected mixer: THREE.AnimationMixer;
  protected modelSize: {
    width: number;
    height: number;
    depth: number;
  };

  // 静态胶囊体几何信息（不包含物理）
  protected capsuleGeometry?: {
    radius: number;
    height: number;
    // visual: THREE.Mesh;
  };

  // 模型辅助器
  // protected helpersVisible?: {
  //   skeletonHelper?: THREE.SkeletonHelper;
  //   boxHelper?: THREE.BoxHelper;
  //   capsuleVisual?: THREE.Mesh;
  // };

  constructor() {
    this.modelSize = { width: 0, height: 0, depth: 0 };
  }

  // 抽象方法 - 子类必须实现
  abstract update(): void;

  // 获取模型三维尺寸 - 抽象方法，子类需要实现
  abstract setModelDimensions(): { width: number; height: number; depth: number };

  // 开始行走动画 - 子类需要实现具体逻辑
  abstract startWalking(): void;

  // 停止行走动画 - 子类需要实现具体逻辑
  abstract stopWalking(): void;

  /**
   * 获取已计算的模型尺寸
   */
  getModelDimensions(): { width: number; height: number; depth: number } {
    return this.modelSize;
  }

  /**
   * 创建胶囊体几何形状（仅几何，不包含物理）
   */
  protected createCapsuleGeometry(): { capsuleInfo: { radius: number; height: number }} {
    // 使用this.modelSize获取模型精确尺寸
    const dimensions = this.getModelDimensions();

    // 安全检查：如果modelSize还没有计算，使用默认值
    if (dimensions.width === 0 || dimensions.height === 0 || dimensions.depth === 0) {
      console.warn('⚠️ 模型尺寸未计算，使用默认胶囊体尺寸');
      dimensions.width = 1;
      dimensions.height = 2;
      dimensions.depth = 1;
    }

    // 计算胶囊体参数 - 完全贴合模型
    // 半径设为模型宽度和深度中较大值的一半
    const radius = Math.max(Math.max(dimensions.width, dimensions.depth) / 4, 6);

    // 确保半径不为0或NaN
    const safeRadius = Math.max(0.1, radius || 0.1);

    // 调整高度，使圆弧部分完全包裹模型顶部和底部
    const safeHeight = Math.max(1, dimensions.height || 1);
    const cylinderHeight = Math.max(0, safeHeight - 2 * safeRadius);

    // 创建胶囊体可视化
    // const capsuleGeometry = new THREE.CapsuleGeometry(safeRadius, cylinderHeight, 16, 8);
    // const capsuleMaterial = new THREE.MeshBasicMaterial({
    //   color: 0x00ff00,
    //   wireframe: true,
    //   transparent: true,
    //   opacity: 0.5
    // });
    // const capsuleVisual = new THREE.Mesh(capsuleGeometry, capsuleMaterial);

    // 放置在正确位置
    // capsuleVisual.position.set(
    //   this.mesh.position.x,
    //   this.mesh.position.y,
    //   this.mesh.position.z
    // );

    // 保存胶囊体几何参数
    this.capsuleGeometry = {
      radius: safeRadius,
      height: safeHeight
    };

    console.log('✅ 创建胶囊体几何成功:', {
      模型位置: this.mesh.position,
      模型尺寸: dimensions,
      安全半径: safeRadius,
      安全高度: safeHeight,
      圆柱体高度: cylinderHeight,
      总高度: cylinderHeight + 2 * safeRadius
    });

    return {
      capsuleInfo: { radius: safeRadius, height: safeHeight },
    };
  }

  /**
   * 更新胶囊体可视化位置
   */
  // public updateCapsuleVisualPosition(): void {
  //   if (!this.mesh || !this.capsuleGeometry) {
  //     return;
  //   }

  //   const { radius, height } = this.capsuleGeometry;

  //   // 检查NaN值
  //   if (isNaN(this.mesh.position.x) || isNaN(this.mesh.position.y) || isNaN(this.mesh.position.z)) {
  //     console.error('❌ 网格位置包含NaN，跳过胶囊体可视化更新');
  //     return;
  //   }

  //   if (isNaN(radius) || isNaN(height) || radius <= 0 || height <= 0) {
  //     console.error('❌ 胶囊体参数无效:', { radius, height });
  //     return;
  //   }

  //   // 更新可视化位置
  //   this.capsuleGeometry.visual.position.copy(this.mesh.position);
  //   this.capsuleGeometry.visual.position.y += height / 2;

  //   // 调试信息（偶尔打印）
  //   if (Math.random() < 0.01) {
  //     console.log('🔄 胶囊体可视化位置更新:', {
  //       meshPosition: this.mesh.position,
  //       capsuleVisualPosition: this.capsuleGeometry.visual.position,
  //       visible: this.capsuleGeometry.visual.visible,
  //       inScene: !!this.capsuleGeometry.visual.parent
  //     });
  //   }
  // }

  /**
   * 更新模型辅助器
   */
  // public updateModelHelpers(): void {
  //   if (this.helpersVisible) {
  //     const { boxHelper, capsuleVisual } = this.helpersVisible;

  //     // 更新包围盒辅助线
  //     if (boxHelper && this.mesh) {
  //       boxHelper.update();
  //     }

  //     // 更新胶囊体可视化位置（使用正确的计算逻辑）
  //     if (capsuleVisual && this.mesh && this.capsuleGeometry) {
  //       const cylinderHeight = Math.max(0, this.capsuleGeometry.height ?? 0);
  //       capsuleVisual.position.set(
  //         this.mesh.position.x,
  //         this.mesh.position.y + cylinderHeight / 2,
  //         this.mesh.position.z
  //       );
  //     }
  //   }
  // }

  /**
   * 切换胶囊体可视化
   */
  // public toggleCapsuleVisibility(): void {
  //   if (this.capsuleGeometry && this.capsuleGeometry.visual) {
  //     this.capsuleGeometry.visual.visible = !this.capsuleGeometry.visual.visible;
  //     console.log(`胶囊体可视化: ${this.capsuleGeometry.visual.visible ? '显示' : '隐藏'}`);
  //     console.log('胶囊体信息:', {
  //       position: this.capsuleGeometry.visual.position,
  //       scale: this.capsuleGeometry.visual.scale,
  //       parent: this.capsuleGeometry.visual.parent?.name || 'no parent'
  //     });
  //   } else {
  //     console.log('❌ 胶囊体几何或可视化对象不存在:', {
  //       capsuleGeometry: !!this.capsuleGeometry,
  //       visual: !!(this.capsuleGeometry?.visual)
  //     });
  //   }
  // }

  /**
   * 获取胶囊体几何信息（供子类使用）
   */
  protected getCapsuleGeometry() {
    return this.capsuleGeometry;
  }

  /**
   * 获取胶囊体尺寸信息（供子类创建物理胶囊体使用）
   */
  protected getCapsuleInfo(): { radius: number; height: number } | undefined {
    if (!this.capsuleGeometry) return undefined;
    return {
      radius: this.capsuleGeometry.radius,
      height: this.capsuleGeometry.height
    };
  }

  
  getMesh(){
    return this.mesh
  }

  /**
   * 清理静态模型的基础资源（胶囊体、包围盒等）
   */
  dispose(): void {
    console.log('🗑️ 开始清理StaticModel基础资源...');

    // // 清理胶囊体可视化
    // if (this.capsuleGeometry?.visual) {
    //   if (this.capsuleGeometry.visual.parent) {
    //     this.capsuleGeometry.visual.parent.remove(this.capsuleGeometry.visual);
    //   }

    //   // 清理胶囊体几何体和材质
    //   if (this.capsuleGeometry.visual.geometry) {
    //     this.capsuleGeometry.visual.geometry.dispose();
    //   }
    //   if (this.capsuleGeometry.visual.material) {
    //     if (Array.isArray(this.capsuleGeometry.visual.material)) {
    //       this.capsuleGeometry.visual.material.forEach(mat => mat.dispose());
    //     } else {
    //       this.capsuleGeometry.visual.material.dispose();
    //     }
    //   }

    //   this.capsuleGeometry = undefined;
    //   console.log('✅ 胶囊体可视化已清理');
    // }

    // 清理辅助器
    // if (this.helpersVisible) {
    //   // 清理骨骼辅助器
    //   if (this.helpersVisible.skeletonHelper) {
    //     if (this.helpersVisible.skeletonHelper.parent) {
    //       this.helpersVisible.skeletonHelper.parent.remove(this.helpersVisible.skeletonHelper);
    //     }
    //     this.helpersVisible.skeletonHelper.dispose();
    //     console.log('✅ 骨骼辅助器已清理');
    //   }

    //   // 清理包围盒辅助器
    //   if (this.helpersVisible.boxHelper) {
    //     if (this.helpersVisible.boxHelper.parent) {
    //       this.helpersVisible.boxHelper.parent.remove(this.helpersVisible.boxHelper);
    //     }
    //     this.helpersVisible.boxHelper.dispose();
    //     console.log('✅ 包围盒辅助器已清理');
    //   }

    //   // 清理胶囊体辅助器
    //   if (this.helpersVisible.capsuleVisual) {
    //     if (this.helpersVisible.capsuleVisual.parent) {
    //       this.helpersVisible.capsuleVisual.parent.remove(this.helpersVisible.capsuleVisual);
    //     }

    //     if (this.helpersVisible.capsuleVisual.geometry) {
    //       this.helpersVisible.capsuleVisual.geometry.dispose();
    //     }
    //     if (this.helpersVisible.capsuleVisual.material) {
    //       if (Array.isArray(this.helpersVisible.capsuleVisual.material)) {
    //         this.helpersVisible.capsuleVisual.material.forEach(mat => mat.dispose());
    //       } else {
    //         this.helpersVisible.capsuleVisual.material.dispose();
    //       }
    //     }
    //     console.log('✅ 胶囊体辅助器已清理');
    //   }

    //   this.helpersVisible = undefined;
    // }

    // 清理动画混合器
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = undefined as any;
      console.log('✅ 动画混合器已清理');
    }

    console.log('✅ StaticModel基础资源清理完成');
  }

}
