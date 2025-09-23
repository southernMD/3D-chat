import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MMDModelManager } from './MMDModelManager';
import { ObjectManager } from './ObjectManager';
import { SceneManager } from './SceneManager';
import { PHYSICS_CONSTANTS } from '../../constants/PhysicsConstants';
import { FPSMonitor } from '../../utils/FPSMonitor';
import * as THREE from 'three';
import { BVHPhysics } from '@/physics/BVHPhysics';
import { nextTick } from 'vue';

export class GUIManager {
  private gui: GUI;
  private mmdModelManager?: MMDModelManager;
  private objectManager?: ObjectManager;
  private sceneManager?: SceneManager;
  private bvhPhysics?: BVHPhysics;
  private renderer?: THREE.WebGLRenderer;
  private fpsMonitor?: FPSMonitor;

  // GUI 控制对象
  private guiFunctions: any = {};
  private groundSizeControl: any = {};
  private wallScaleControl: any = {};
  private trackTransformControl: any = {};
  private physicsVisualizationControl: any = {};
  private performanceControl: any = {};

  // GUI 文件夹
  private groundSizeFolder?: any;
  private wallScaleFolder?: any;
  private trackFolder?: any;
  private bvhFolder?: any;
  private performanceFolder?: any;

  // 相机控制相关
  private ifFirstPerson:Boolean

  constructor(    
    mmdModelManager: MMDModelManager,
    objectManager: ObjectManager,
    sceneManager: SceneManager,
    bvhPhysics: BVHPhysics,
    renderer: THREE.WebGLRenderer,
    fpsMonitor: FPSMonitor,
    ifFirstPerson:Boolean
  ) {
    this.mmdModelManager = mmdModelManager;
    this.objectManager = objectManager;
    this.sceneManager = sceneManager;
    this.bvhPhysics = bvhPhysics;
    this.renderer = renderer;
    this.fpsMonitor = fpsMonitor;

    this.gui = new GUI();
    this.ifFirstPerson = ifFirstPerson;
    this.initializeControlObjects();
    this.gui.hide(); // 默认隐藏
    
    this.setupGUIFunctions();
    this.createGUIControls();
  }

  /**
   * 初始化控制对象
   */
  private initializeControlObjects() {
    // 地面尺寸控制对象
    this.groundSizeControl = {
      sizeX: PHYSICS_CONSTANTS.GROUND_SIZE_X,
      sizeZ: PHYSICS_CONSTANTS.GROUND_SIZE_Z,
      updateGroundSize: () => {
        // 更新物理常量
        (PHYSICS_CONSTANTS as any).GROUND_SIZE_X = this.groundSizeControl.sizeX;
        (PHYSICS_CONSTANTS as any).GROUND_SIZE_Z = this.groundSizeControl.sizeZ;

        // 通过 ObjectManager 重新生成地面和边界墙体
        if (this.objectManager) {
          this.objectManager.regenerateGroundAndWalls().then(() => {
            // 重新生成后恢复墙体缩放
            const wall = this.objectManager!.getWall('boundary-walls');
            if (wall) {
              wall.wallScale = this.wallScaleControl.scale;
              wall.recreateBoundaryWalls();
              console.log(`✅ 地面更新完成，墙体缩放恢复: ${this.wallScaleControl.scale}`);
            }

            // 重新生成BVH碰撞体
            nextTick(() => {
              this.bvhPhysics!.createSeparateColliders(this.objectManager!.getAllObjects());
            });
          });
          console.log(`🔄 地面尺寸更新: X=${this.groundSizeControl.sizeX}, Z=${this.groundSizeControl.sizeZ}`);
        }
      }
    };

    // 墙体缩放控制对象
    this.wallScaleControl = {
      scale: 14, // 默认缩放值
      updateWallScale: () => {
        console.log('🔧 尝试更新墙体缩放...');
        const wall = this.objectManager?.getWall('boundary-walls');
        console.log('🔍 获取到的墙体对象:', wall);
        if (wall) {
          wall.wallScale = this.wallScaleControl.scale;
          wall.recreateBoundaryWalls();
          console.log(`✅ 墙体缩放已更新为: ${this.wallScaleControl.scale}`);
        } else {
          console.log('❌ 边界墙体不存在，可能已被清除');
          // 尝试重新生成墙体
          if (this.objectManager) {
            this.objectManager.regenerateBoundaryWalls().then(() => {
              const newWall = this.objectManager!.getWall('boundary-walls');
              if (newWall) {
                newWall.wallScale = this.wallScaleControl.scale;
                newWall.recreateBoundaryWalls();
                console.log(`✅ 重新生成后墙体缩放已更新为: ${this.wallScaleControl.scale}`);
              }
            });
          }
        }
      }
    };

    // 物理体可视化控制对象
    this.physicsVisualizationControl = {
      displayBVH: false,
      toggleBVH: () => {
        console.log(`🔄 切换BVH辅助线可视化: ${this.physicsVisualizationControl.displayBVH ? '开启' : '关闭'}`);

        // 控制 BVHPhysics 系统的BVH可视化
        if (this.bvhPhysics) {
          this.bvhPhysics.params.displayBVH = this.physicsVisualizationControl.displayBVH;
          this.bvhPhysics.updateVisualization();
          console.log(`   🌍 BVHPhysics BVH辅助线: ${this.physicsVisualizationControl.displayBVH ? '显示' : '隐藏'}`);

          // 控制学校建筑碰撞体显示
          const colliders = this.bvhPhysics.getColliders();
          let schoolColliderCount = 0;
          let visibleCount = 0;

          colliders.forEach((collider, objectId) => {
            if (objectId.startsWith('school-')) {
              schoolColliderCount++;
              collider.visible = this.physicsVisualizationControl.displayBVH;

              // 强制更新材质颜色
              if (collider.material && (collider.material as any).color) {
                if (objectId.startsWith('school-door-') && !objectId.includes('nondoors')) {
                  (collider.material as any).color.setHex(0xff0000); // 红色门
                } else if (objectId.includes('nondoors')) {
                  (collider.material as any).color.setHex(0x00ff00); // 绿色非门
                }
                collider.material.needsUpdate = true;
              }

              if (collider.visible) visibleCount++;
            }
          });

          console.log(`   🏫 学校建筑碰撞体: ${schoolColliderCount} 个，当前可见: ${visibleCount} 个`);
        }

        // 控制墙体的BVH可视化
        const boundaryWalls = this.objectManager?.getWall('boundary-walls');
        if (boundaryWalls && 'setVisualizationParams' in boundaryWalls) {
          (boundaryWalls as any).setVisualizationParams({
            displayBVH: this.physicsVisualizationControl.displayBVH
          });
          console.log(`   🧱 边界墙体BVH: ${this.physicsVisualizationControl.displayBVH ? '显示' : '隐藏'}`);
        }
      }
    };

    // 性能设置控制
    this.performanceControl = {
      targetFPS: 60,
      lowQualityMode: false,
      updateFPSTarget: () => {
        if (this.fpsMonitor) {
          this.fpsMonitor.setTargetFPS(this.performanceControl.targetFPS);
        }
      },
      toggleLowQualityMode: () => {
        // 切换低质量模式
        if (this.renderer) {
          if (this.performanceControl.lowQualityMode) {
            // 低质量模式
            this.renderer.setPixelRatio(1.0);
            this.renderer.shadowMap.enabled = false;
            console.log('已启用低质量模式');
          } else {
            // 恢复正常质量
            this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
            console.log('已恢复正常质量模式');
          }
        }
      },
      toggleFPSDisplay: () => {
        if (this.fpsMonitor) {
          this.fpsMonitor.toggle();
          console.log('🔄 FPS显示状态已切换');
        }
      },
      showFPSStats: () => {
        if (this.fpsMonitor) {
          const stats = this.fpsMonitor.getStats();
          console.log('📊 FPS统计信息:', stats);
        }
      }
    };
  }

  /**
   * 设置GUI功能函数
   */
  private setupGUIFunctions() {
    this.guiFunctions = {
      changeCamera: () => {
        this.ifFirstPerson = !this.ifFirstPerson;
        console.log(`🎥 相机已切换到: ${this.getCameraStatus()}`);
      },
      reSetReimu: () => {
        // 使用MMDModelManager重置位置
        this.mmdModelManager?.resetPosition();
      },
      toggleHelpers: () => {
        // 使用MMDModelManager切换辅助线
        this.mmdModelManager?.toggleHelpers();
      },
      toggleCapsuleVisibility: () => {
        if (this.mmdModelManager && this.mmdModelManager.isModelLoaded()) {
          const model = this.mmdModelManager.getModel();
          if (model) {
            model.toggleCapsuleVisibility();
          }
        }
      },
      // 演示强制走路动画
      forceWalk: () => {
        this.mmdModelManager?.forceWalk();
      },
      // 演示强制站立动画
      forceStand: () => {
        this.mmdModelManager?.forceStand();
      },
      showCameraStatus: () => {
        console.log(`📷 当前相机状态: ${this.getCameraStatus()}`);
      },
      addPostionginLocalStorage:()=>{
        const postion = this.mmdModelManager?.getModel()?.mesh.position!
        const p = { x:postion.x.toFixed(2),y:postion.y.toFixed(2),z:postion.z.toFixed(2) }
        const hasP = localStorage.getItem('position')
        const Arr = hasP ? JSON.parse(hasP) : [] 
        Arr.push(p)
        localStorage.setItem('position',JSON.stringify(Arr))
      }
    };

    // 跑道变换控制
    this.trackTransformControl = {
      positionX: 0,
      positionZ: 0,
      rotationY: 0,
      scale: 8, // 默认值，会在跑道创建后更新
      updateTrackTransform: () => {
        const mainTrack = this.objectManager?.getMainTrack();
        if (mainTrack) {
          // 设置位置（只控制XZ，Y保持为0）
          mainTrack.setPosition(this.trackTransformControl.positionX, 0, this.trackTransformControl.positionZ);

          // 设置旋转（只控制Y轴旋转）
          mainTrack.setRotationDegrees(0, this.trackTransformControl.rotationY, 0);

          // 设置缩放
          mainTrack.setUniformScale(this.trackTransformControl.scale);

          // 更新所有健身器材的物理体和可视化
          if ('updateAllGymEquipmentPhysicsAndVisualization' in mainTrack) {
            (mainTrack as any).updateAllGymEquipmentPhysicsAndVisualization();
          }

          console.log(`跑道变换更新: 位置(${this.trackTransformControl.positionX}, 0, ${this.trackTransformControl.positionZ}), 旋转Y: ${this.trackTransformControl.rotationY}°, 缩放: ${this.trackTransformControl.scale}`);
          console.log(`健身器材物理体和可视化已同步更新`);
        }
      },
      resetTrack: () => {
        // 重置到ObjectManager中设置的初始值
        const mainTrack = this.objectManager?.getMainTrack();
        if (mainTrack) {
          const position = mainTrack.getPosition();
          const rotation = mainTrack.getRotationDegrees();
          const scale = mainTrack.getScale();

          this.trackTransformControl.positionX = position.x;
          this.trackTransformControl.positionZ = position.z;
          this.trackTransformControl.rotationY = rotation.y;
          this.trackTransformControl.scale = scale.x; // 假设是统一缩放

          // 更新GUI显示
          this.trackFolder?.controllers.forEach((controller: any) => {
            controller.updateDisplay();
          });
        }
      },
      // 从跑道对象同步当前值到GUI
      syncFromTrack: () => {
        const mainTrack = this.objectManager?.getMainTrack();
        if (mainTrack) {
          const position = mainTrack.getPosition();
          const rotation = mainTrack.getRotationDegrees();
          const scale = mainTrack.getScale();

          this.trackTransformControl.positionX = position.x;
          this.trackTransformControl.positionZ = position.z;
          this.trackTransformControl.rotationY = rotation.y;
          this.trackTransformControl.scale = scale.x; // 假设是统一缩放

          // 更新GUI显示
          this.trackFolder?.controllers.forEach((controller: any) => {
            controller.updateDisplay();
          });

          console.log(`从跑道同步GUI值: 位置(${position.x}, ${position.z}), 旋转Y: ${rotation.y}°, 缩放: ${scale.x}`);
        }
      }
    };
  }
  /**
   * 创建GUI控件
   */
  private createGUIControls() {
    
    // 基础功能控件
    this.gui.add(this.guiFunctions, 'changeCamera').name('改变相机');
    this.gui.add(this.guiFunctions, 'showCameraStatus').name('显示相机状态');
    this.gui.add(this.guiFunctions, 'reSetReimu').name('回到原点');
    this.gui.add(this.guiFunctions, 'toggleHelpers').name('显示/隐藏人物辅助线');
    this.gui.add(this.guiFunctions, 'toggleCapsuleVisibility').name('显示/隐藏胶囊体');
    this.gui.add(this.guiFunctions, 'forceWalk').name('播放走路动画');
    this.gui.add(this.guiFunctions, 'forceStand').name('播放站立动画');
    this.gui.add(this.guiFunctions, 'addPostionginLocalStorage').name('将当前位置添加到LocalStorage');

    // 地面尺寸控制
    this.groundSizeFolder = this.gui.addFolder('地面尺寸控制');
    this.groundSizeFolder.add(this.groundSizeControl, 'sizeX', 50, 5000, 10)
      .name('地面X轴半尺寸')
      .onFinishChange(() => {
        this.groundSizeControl.updateGroundSize();
      });
    this.groundSizeFolder.add(this.groundSizeControl, 'sizeZ', 50, 5000, 10)
      .name('地面Z轴半尺寸')
      .onFinishChange(() => {
        this.groundSizeControl.updateGroundSize();
      });

    // 墙体缩放控制
    this.wallScaleFolder = this.gui.addFolder('墙体缩放控制');
    this.wallScaleFolder.add(this.wallScaleControl, 'scale', 0.1, 50, 0.1)
      .name('墙体缩放')
      .onChange(() => {
        this.wallScaleControl.updateWallScale();
      });
    this.wallScaleFolder.add(this.wallScaleControl, 'updateWallScale').name('手动更新缩放');

    // 跑道变换控制
    this.trackFolder = this.gui.addFolder('跑道变换控制');
    this.trackFolder.add(this.trackTransformControl, 'positionX', -5000, 5000, 1)
      .name('X轴位置')
      .onChange(() => {
        this.trackTransformControl.updateTrackTransform();
      });
    this.trackFolder.add(this.trackTransformControl, 'positionZ', -5000, 5000, 1)
      .name('Z轴位置')
      .onChange(() => {
        this.trackTransformControl.updateTrackTransform();
      });
    this.trackFolder.add(this.trackTransformControl, 'rotationY', -180, 180, 1)
      .name('Y轴旋转(度)')
      .onChange(() => {
        this.trackTransformControl.updateTrackTransform();
      });
    this.trackFolder.add(this.trackTransformControl, 'scale', 0.1, 20, 0.1)
      .name('整体缩放')
      .onChange(() => {
        this.trackTransformControl.updateTrackTransform();
      });
    this.trackFolder.add(this.trackTransformControl, 'updateTrackTransform').name('手动更新变换');
    this.trackFolder.add(this.trackTransformControl, 'syncFromTrack').name('同步GUI值');
    this.trackFolder.add(this.trackTransformControl, 'resetTrack').name('重置跑道');

    // BVH 可视化控制
    this.bvhFolder = this.gui.addFolder('BVH 碰撞检测');
    this.bvhFolder.add(this.physicsVisualizationControl, 'displayBVH')
      .name('显示BVH辅助线')
      .onChange(() => {
        this.physicsVisualizationControl.toggleBVH();
      });
    this.bvhFolder.open();

    // 性能设置控制
    this.performanceFolder = this.gui.addFolder('性能设置');
    this.performanceFolder.add(this.performanceControl, 'targetFPS', 15, 60, 5)
      .name('目标FPS')
      .onChange(() => {
        this.performanceControl.updateFPSTarget();
      });
    this.performanceFolder.add(this.performanceControl, 'lowQualityMode')
      .name('低质量模式')
      .onChange(() => {
        this.performanceControl.toggleLowQualityMode();
      });
    this.performanceFolder.add(this.performanceControl, 'updateFPSTarget').name('应用FPS设置');
    this.performanceFolder.add(this.performanceControl, 'toggleFPSDisplay').name('切换FPS显示');
    this.performanceFolder.add(this.performanceControl, 'showFPSStats').name('显示FPS统计');
    this.performanceFolder.open();
  }

  /**
   * 同步跑道GUI值
   */
  public syncTrackFromObject() {
    this.trackTransformControl.syncFromTrack();
    // 更新GUI显示
    this.trackFolder?.controllers.forEach((controller: any) => {
      controller.updateDisplay();
    });
  }



  /**
   * 获取当前渲染相机
   */
  public getHadRenderCamera(): THREE.PerspectiveCamera | undefined {
    // 根据当前状态返回正确的相机
    if (this.ifFirstPerson) {
      return this.mmdModelManager?.getLookCamera() || undefined;
    } else {
      return this.sceneManager?.getCamera() || undefined;
    }
  }

  /**
   * 获取当前相机状态描述
   */
  public getCameraStatus(): string {
    return this.ifFirstPerson ? '跟随相机' : '场景相机';
  }

  /**
   * 显示GUI
   */
  public show() {
    this.gui.show();
  }

  /**
   * 隐藏GUI
   */
  public hide() {
    this.gui.hide();
  }

  /**
   * 切换GUI显示状态
   */
  public toggle() {
    if (this.gui._hidden) {
      this.gui.show();
    } else {
      this.gui.hide();
    }
  }

  /**
   * 获取GUI实例
   */
  public getGUI(): GUI {
    return this.gui;
  }

  /**
   * 清理资源
   */
  public cleanup() {
    this.gui.destroy();
  }
}
