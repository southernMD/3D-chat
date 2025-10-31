import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BVHPhysics } from '../physics/BVHPhysics';
import { StaticModel } from './StaticModel';
import { Egg } from './Egg';
import { KeyBoardMessageManager } from '@/ImperativeComponents/keyBoardMessage';
import { doorGroups } from './architecture/doors';
import { filterColliders } from '@/utils/filterColliders';
import { eventBus } from '@/utils/eventBus';

// 基础模型类 - 继承StaticModel，专注于动态操作控制、物理、相机
export abstract class Model extends StaticModel {

  keys: {
    ArrowUp: boolean;
    ArrowDown: boolean;
    ArrowLeft: boolean;
    ArrowRight: boolean;
    Space: boolean;
  };

  // BVH物理系统 - 动态物理相关
  protected bvhPhysics?: BVHPhysics;
  private playerIsOnGround = true; // 初始化为在地面上
  private playerVelocity = new THREE.Vector3();
  private upVector = new THREE.Vector3(0, 1, 0);
  private delta = 0.016;

  // 物理胶囊体（包含物理）
  protected playerCapsule?: Capsule;

  // 相机辅助器
  // private cameraHelpers?: {
  //   lookCameraHelper?: THREE.CameraHelper;
  //   targetCameraHelper?: THREE.CameraHelper;
  // };

  // 相机控制器变化处理函数
  private cameraControlsChangeHandler?: (event: any) => void;
  private controlsChangeTimeout?: number;

  // BVH碰撞检测开关
  public bvhCollisionEnabled: boolean = false;

  protected moveSpeed = 150
  protected currentCameraAngle = 0 // 当前相机角度

  //bvh
  private tempVector = new THREE.Vector3();
  private tempVector2 = new THREE.Vector3();

  // 右键发射鸡蛋功能相关
  private eggs: Egg[] = [];
  private eggParams = {
    maxEggs: 30 // 最大鸡蛋数量，防止内存泄漏
  };

  //门与模型缓存
  private mapDoorNameMesh: Map<string, THREE.Mesh> = new Map();

  //用户位置与具体bvh距离缓存
  private mapUserPositionDistance: Map<string, THREE.Mesh> = new Map();

  private userPeerId:string

  constructor(bvhPhysics: BVHPhysics,userPeerId:string) {
    super(); // 调用父类构造函数（不传递物理系统）

    this.bvhPhysics = bvhPhysics; // 在Model中管理物理系统

    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false,
    };

    this.userPeerId = userPeerId
    // 监听清理鸡蛋距离映射事件
    eventBus.on('clear-egg-mapUserPositionDistance', ({ eggId }) => {
      this.mapUserPositionDistance.delete(eggId);
      console.log(`🥚 Model: 已清理鸡蛋 ${eggId} 的位置距离映射`);
    });

    // 监听门状态同步事件
    eventBus.on('door-state-sync', (data: any) => {
      this.syncDoorState(data);
    });
  }

  // 这些抽象方法已在 StaticModel 中定义，这里不需要重复声明


  /**
   * 创建物理胶囊体（基于StaticModel的几何信息）
   */
  protected createPhysicsCapsule(): Capsule | null {
    const capsuleInfo = this.getCapsuleInfo();
    if (!capsuleInfo || !this.mesh) {
      console.warn('⚠️ 无法创建物理胶囊体：缺少几何信息或网格');
      return null;
    }

    const { radius, height } = capsuleInfo;

    // 创建物理胶囊体的起点和终点
    const start = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + radius, // 将起点抬高半径的距离，防止穿透地面
      this.mesh.position.z
    );

    const end = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + height - radius, // 相应调整终点位置
      this.mesh.position.z
    );

    this.playerCapsule = new Capsule(start, end, radius);

    console.log('✅ 创建物理胶囊体成功:', {
      模型位置: this.mesh.position,
      半径: radius,
      高度: height,
      起点: start,
      终点: end
    });

    return this.playerCapsule;
  }

  /**
   * 更新物理胶囊体位置
   */
  protected updatePhysicsCapsulePosition(): void {
    const capsuleInfo = this.getCapsuleInfo();
    if (!this.playerCapsule || !this.mesh || !capsuleInfo) {
      return;
    }

    const { radius, height } = capsuleInfo;

    // 检查NaN值
    if (isNaN(this.mesh.position.x) || isNaN(this.mesh.position.y) || isNaN(this.mesh.position.z)) {
      console.error('❌ 网格位置包含NaN，跳过物理胶囊体更新');
      return;
    }

    // 更新物理胶囊体位置
    this.playerCapsule.start.copy(this.mesh.position);
    this.playerCapsule.start.y += radius;

    this.playerCapsule.end.copy(this.mesh.position);
    this.playerCapsule.end.y += height - radius;
  }

  /**
   * 使用BVH进行碰撞检测和物理更新（参考characterMovement.js）
   */
  handleBVHPhysics(delta: number, screen: THREE.Scene): void {
    const capsuleInfo = this.getCapsuleInfo();

    if (!this.bvhPhysics || !this.mesh || !this.playerCapsule || !capsuleInfo) {
      console.log('❌ BVH物理系统组件缺失:', {
        bvhPhysics: !!this.bvhPhysics,
        mesh: !!this.mesh,
        playerCapsule: !!this.playerCapsule,
        capsuleInfo: !!capsuleInfo
      });
      return;
    }

    // 应用重力 (完全按照characterMovement.js第307-315行)
    if (this.playerIsOnGround) {
      this.playerVelocity.y = delta * this.bvhPhysics.params.gravity;
    } else {
      this.playerVelocity.y += delta * this.bvhPhysics.params.gravity;
    }

    // 调试信息 (可选)
    // if (Math.random() < 0.01) { // 只偶尔打印，避免日志过多
    //   console.log('🏃 BVH物理更新:', {
    //     position: this.mesh.position.y.toFixed(2),
    //     velocity: this.playerVelocity.y.toFixed(2),
    //     onGround: this.playerIsOnGround,
    //     gravity: this.bvhPhysics.params.gravity
    //   });
    // }

    // 应用速度到位置
    this.mesh.position.addScaledVector(this.playerVelocity, delta);

    // 处理键盘输入移动（传入相机角度）
    this.handleMovementInput(delta, this.currentCameraAngle);

    // 更新模型矩阵
    this.mesh.updateMatrixWorld();

    // 使用新的分离碰撞体检测
    this.performSeparateCollidersDetection(delta, screen);

    // // 简单的地面检测
    // if (this.mesh.position.y < 0) {
    //   debugger
    //   this.mesh.position.y = 0;
    //   this.playerIsOnGround = true;
    //   this.playerVelocity.y = 0;
    // } else {
    //   this.playerIsOnGround = false;
    // }

    // 更新物理胶囊体位置
    this.updatePhysicsCapsulePosition();

    // 更新静态胶囊体可视化位置
    // this.updateCapsuleVisualPosition();

    //更新静态胶囊体
    this.bvhPhysics.updateUserCapsule(
      this.userPeerId,
      this.mesh.position,
      this.getCapsuleInfo()!
    )

    // 如果角色掉得太低，重置位置
    if (this.mesh.position.y < -25) {
      this.resetPosition();
    }
  }

  /**
   * 处理键盘输入移动（完全按照characterMovement.js实现）
   */
  private handleMovementInput(delta: number, cameraAngle: number = 0): void {
    // 🔥 跳跃逻辑已移至 handleKeyDown 中，参考 characterMovement.js

    if (!this.mesh || !this.isWalking) return;

    // 按照characterMovement.js的实现：
    // W键 - 向前移动（相对于相机朝向）
    if (this.keys.ArrowUp) {
      this.tempVector.set(0, 0, -1).applyAxisAngle(this.upVector, cameraAngle);
      this.mesh.position.addScaledVector(this.tempVector, this.moveSpeed * delta);
    }

    // S键 - 向后移动
    if (this.keys.ArrowDown) {
      this.tempVector.set(0, 0, 1).applyAxisAngle(this.upVector, cameraAngle);
      this.mesh.position.addScaledVector(this.tempVector, this.moveSpeed * delta);
    }

    // A键 - 向左移动
    if (this.keys.ArrowLeft) {
      this.tempVector.set(-1, 0, 0).applyAxisAngle(this.upVector, cameraAngle);
      this.mesh.position.addScaledVector(this.tempVector, this.moveSpeed * delta);
    }

    // D键 - 向右移动
    if (this.keys.ArrowRight) {
      this.tempVector.set(1, 0, 0).applyAxisAngle(this.upVector, cameraAngle);
      this.mesh.position.addScaledVector(this.tempVector, this.moveSpeed * delta);
    }


  }

  /**
   * 重置角色位置
   */
  private resetPosition(): void {
    this.playerVelocity.set(0, 0, 0);
    this.mesh.position.set(0, 5, 0); // 重置到安全位置
    this.updatePhysicsCapsulePosition();
    // this.updateCapsuleVisualPosition();
    console.log('🔄 角色位置已重置');
  }

  /**
   * 处理键盘事件
   */
  handleKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.ArrowUp = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.ArrowDown = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.ArrowLeft = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.ArrowRight = true;
        break;
      case 'Space':
        this.keys.Space = true;
        // 🔥 参考 characterMovement.js 第164-172行：在 keydown 事件中立即处理跳跃
        if (this.playerIsOnGround) {
          console.log('🦘 执行跳跃');
          // 不要直接设置一个很大的速度，而是直接改变位置，然后设置一个适当的速度
          // 先直接改变一点位置，模拟初始冲量
          this.mesh.position.y += 1.0;
          // 立即更新胶囊体位置，避免碰撞检测问题
          this.updatePhysicsCapsulePosition();
          // this.updateCapsuleVisualPosition();
          // 然后设置一个适当的向上速度
          this.playerVelocity.y = 40.0;
          this.playerIsOnGround = false;
        }
        break;
    }

    // 检查是否开始行走
    const anyDirectionKeyPressed = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;
    if (anyDirectionKeyPressed && !this.isWalking) {
      this.isWalking = true;
      this.startWalking();
    }

    // 🔥 跳跃逻辑已移至上面的 Space 按键处理中
  }

  handleKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.ArrowUp = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.ArrowDown = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.ArrowLeft = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.ArrowRight = false;
        break;
      case 'Space':
        this.keys.Space = false;
        break;
    }

    // 检查是否停止行走
    const anyDirectionKeyPressed = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;
    if (!anyDirectionKeyPressed && this.isWalking) {
      this.isWalking = false;
      this.stopWalking();
    }
  }

  /**
   * 主更新方法
   */
  updateMovement(screen: THREE.Scene): void {
    this.handleBVHPhysics(this.delta, screen);
  }

  /**
   * 对分离的碰撞体组执行碰撞检测
   */
  private performSeparateCollidersDetection(delta: number, screen: THREE.Scene): void {
    if (!this.bvhPhysics) return;

    const colliders = this.bvhPhysics.getColliders();
    const capsuleInfo = this.getCapsuleInfo();

    if (!this.mesh || !this.playerCapsule || !capsuleInfo) return;

    // 临时变量
    const tempBox = new THREE.Box3();
    const tempMat = new THREE.Matrix4();
    const tempSegment = new THREE.Line3();

    // 保存原始胶囊体位置
    const originalCapsuleStart = this.playerCapsule.start.clone();

    // 从 Capsule 创建 Line3 segment
    tempSegment.start.copy(this.playerCapsule.start);
    tempSegment.end.copy(this.playerCapsule.end);

    let totalDeltaVector = new THREE.Vector3();
    let hasCollision = false;
    let collisionInfo: Array<{ objectId: string; object: any; deltaVector: THREE.Vector3 }> = [];

    filterColliders(colliders, this.mapUserPositionDistance, this.mesh.position,this.userPeerId)

    // if(Math.random() < 0.05){
    //   console.log(this.mapUserPositionDistance);
    // }
    if(KeyBoardMessageManager.isActive() && this.mapUserPositionDistance.get(KeyBoardMessageManager.getActiveMeshName()!)){
      KeyBoardMessageManager.hide();
    }
    this.mapUserPositionDistance.forEach((collider, objectId) => {
      if (!collider.geometry || !(collider.geometry as any).boundsTree) return;
      // 重置临时变量
      tempBox.makeEmpty();
      tempMat.copy(collider.matrixWorld).invert();

      // 重置segment到原始位置
      if (this.playerCapsule) {
        tempSegment.start.copy(this.playerCapsule.start);
        tempSegment.end.copy(this.playerCapsule.end);
      }

      // 转换到碰撞体局部空间
      tempSegment.start.applyMatrix4(tempMat);
      tempSegment.end.applyMatrix4(tempMat);

      // 计算包围盒
      tempBox.expandByPoint(tempSegment.start);
      tempBox.expandByPoint(tempSegment.end);
      tempBox.min.addScalar(-capsuleInfo.radius);
      tempBox.max.addScalar(capsuleInfo.radius);

      let colliderHasCollision = false;

      // BVH碰撞检测 - 🚀 添加boundsTraverseOrder优化遍历顺序
      //TODO: OPEDNDOOR弹出消息窗口创建不正常
      (collider.geometry as THREE.BoxGeometry).boundsTree!.shapecast({
        intersectsBounds: (box: THREE.Box3) => box.intersectsBox(tempBox),

        intersectsTriangle: (tri: any) => {

          const triPoint = this.tempVector;
          const capsulePoint = this.tempVector2;

          const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);
          if (distance < capsuleInfo.radius) {
            if (objectId.startsWith("school-door-G") && collider.userData?.isOpen === true) return;
            const depth = capsuleInfo.radius - distance;
            const direction = capsulePoint.sub(triPoint).normalize();

            tempSegment.start.addScaledVector(direction, depth);
            tempSegment.end.addScaledVector(direction, depth);
            colliderHasCollision = true;

            // 早期退出优化：如果已经有足够的碰撞信息，可以提前退出
            // 对于性能敏感的场景，可以在检测到第一个碰撞后就退出
            // return true; // 取消注释以启用早期退出
          } else {
            if (objectId.startsWith('school-door-G')) {
              const doorName = objectId.split('school-door-')[1];
              const doorNearName = doorGroups.get(doorName)?.[0] as string;
              if (distance < 10) {
                // 先找到要删除的对象
                // 只在没有活跃实例或当前门不同且不是当前门的相邻门时才显示提示
                if (!KeyBoardMessageManager.isActive() ||
                  KeyBoardMessageManager.getActiveMeshName() !== doorName &&
                  KeyBoardMessageManager.getActiveMeshName() !== doorNearName
                ) {
                  if (collider.userData.isOpen === false) {
                    KeyBoardMessageManager.show({
                      targetKey: 'F',
                      message: '打开门',
                      visible: true,
                      hideDelay: 2000,
                      activeMeshName: doorName,
                      onKeyPress: () => {
                        collider.userData.isOpen = true;
                        if (doorNearName) {
                          const nearCollider = colliders.get(`school-door-${doorNearName}`);
                          if (nearCollider) nearCollider.userData.isOpen = true;
                        }
                        const child = this.mapDoorNameMesh.get(doorName)
                        const childNear = this.mapDoorNameMesh.get(doorNearName)
                        if (child) child.visible = false
                        if (childNear) childNear.visible = false
                        if (!child || !childNear) {
                          screen.traverse((child) => {
                            if (child.name === doorName) {
                              child.visible = false;
                              this.mapDoorNameMesh.set(doorName, child as THREE.Mesh)
                            } else if (child.name === doorNearName) {
                              child.visible = false;
                              this.mapDoorNameMesh.set(doorNearName, child as THREE.Mesh)
                            }
                          });
                        }

                        // 🚪 发送门打开状态同步事件
                        eventBus.emit('door-state-update', {
                          doorName,
                          doorNearName,
                          visible: false,
                          isOpen: true
                        });
                      }
                    });
                  } else {
                    KeyBoardMessageManager.show({
                      targetKey: 'F',
                      message: '关上门',
                      visible: true,
                      hideDelay: 2000,
                      activeMeshName: doorName,
                      onKeyPress: () => {
                        collider.userData.isOpen = false;
                        if (doorNearName) {
                          const nearCollider = colliders.get(`school-door-${doorNearName}`);
                          if (nearCollider) nearCollider.userData.isOpen = false;
                        }
                        const child = this.mapDoorNameMesh.get(doorName)
                        const childNear = this.mapDoorNameMesh.get(doorNearName)
                        if (child) child.visible = true
                        if (childNear) childNear.visible = true
                        if (!child || !childNear) {
                          screen.traverse((child) => {
                            if (child.name === doorName) {
                              child.visible = true;
                              this.mapDoorNameMesh.set(doorName, child as THREE.Mesh)
                            } else if (child.name === doorNearName) {
                              child.visible = true;
                              this.mapDoorNameMesh.set(doorNearName, child as THREE.Mesh)
                            }
                          });
                        }

                        // 🚪 发送门关闭状态同步事件
                        eventBus.emit('door-state-update', {
                          doorName,
                          doorNearName,
                          visible: true,
                          isOpen: false
                        });
                      }
                    });
                  }
                }
              } else if (KeyBoardMessageManager.isActive() && distance >= 20) {
                const activeMeshName = KeyBoardMessageManager.getActiveMeshName();
                const correspondingDoor = activeMeshName ? doorGroups.get(activeMeshName)?.[0] : undefined;
                if (doorName === activeMeshName || (correspondingDoor && activeMeshName === correspondingDoor)) {
                  KeyBoardMessageManager.hide();
                  KeyBoardMessageManager.setActiveMeshName('');
                }
              }
            }else if(objectId.startsWith('egg')){
              if(distance < 10 && !KeyBoardMessageManager.isActive()){
                KeyBoardMessageManager.show({
                  targetKey: 'F',
                  message: '拾取',
                  visible: true,
                  hideDelay: 2000,
                  activeMeshName: objectId,
                  onKeyPress: () => {
                    console.log('拾取鸡蛋', objectId);
                    KeyBoardMessageManager.hide();

                    // 通过事件总线通知ObjectManager清除鸡蛋
                    eventBus.emit('egg-clear', { eggId: objectId });

                    // 通过事件总线通知WebRTC清除服务器鸡蛋标记
                    eventBus.emit('clear-egg-server', {
                      eggId: objectId,
                    });

                    // 从BVH物理系统中移除鸡蛋碰撞体
                    this.bvhPhysics?.removeEggBVH(objectId)

                    // 清理本地映射
                    colliders.delete(objectId)
                    this.mapUserPositionDistance.delete(objectId)
                  }
                });
              }else if(distance > 20 && KeyBoardMessageManager.isActive() && (KeyBoardMessageManager.getActiveMeshName() === objectId || !this.mapUserPositionDistance.get(KeyBoardMessageManager.getActiveMeshName()!))){
                KeyBoardMessageManager.hide();
              }
            }
          }
          // console.log(KeyBoardMessageManager.getActiveMeshName(),"???<");
          // console.log(this.mapUserPositionDistance.get(KeyBoardMessageManager.getActiveMeshName()!),"???<");
          
          // if(KeyBoardMessageManager.isActive() && this.mapUserPositionDistance.get(KeyBoardMessageManager.getActiveMeshName()!)){
          //   KeyBoardMessageManager.hide();
          // }
        }
      });
      console.log(totalDeltaVector.y,Math.abs(delta * this.playerVelocity.y * 0.25));
      
      this.playerIsOnGround = totalDeltaVector.y > Math.abs(delta * this.playerVelocity.y * 0.25);
      if (colliderHasCollision) {
        // 计算该碰撞体的位置调整
        const newPosition = this.tempVector;
        newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);

        const deltaVector = new THREE.Vector3();
        deltaVector.subVectors(newPosition, originalCapsuleStart);

        // 累积位置调整
        totalDeltaVector.add(deltaVector);
        hasCollision = true;

        // 记录碰撞信息
        collisionInfo.push({
          objectId: objectId,
          object: null, // 移除了 colliderMapping
          deltaVector: deltaVector.clone()
        });

        // console.log(`🎯 角色碰撞: ${objectId}`, {
        //   objectName: 'Unknown',
        //   deltaVector: deltaVector
        // });
      }
    });

    if (hasCollision) {
      // 处理累积的碰撞结果
      const offset = Math.max(0.0, totalDeltaVector.length() - 1e-5);
      totalDeltaVector.normalize().multiplyScalar(offset);

      // 调整角色位置
      this.mesh.position.add(totalDeltaVector);

      if (!this.playerIsOnGround) {
        totalDeltaVector.normalize();
        this.playerVelocity.addScaledVector(totalDeltaVector, -totalDeltaVector.dot(this.playerVelocity));
      } else {
        this.playerVelocity.set(0, 0, 0);
      }

      // 触发角色碰撞事件
      // this.onPlayerCollision(collisionInfo);
    }

  }


  /**
   * 角色碰撞事件处理
   */
  // private onPlayerCollision(collisionInfo: Array<{ objectId: string; object: any; deltaVector: THREE.Vector3 }>): void {
  //   // 这里可以添加角色碰撞的特殊逻辑
  //   // 比如：触发机关、收集物品、受到伤害等

  //   // collisionInfo.forEach(info => {
  //   //   // console.log(`🚶 角色碰撞事件:`, {
  //   //   //   objectId: info.objectId,
  //   //   //   objectName: info.object?.constructor.name || 'Unknown',
  //   //   //   deltaVector: info.deltaVector
  //   //   // });
  //   // });
  // }

  /**
   * 获取BVH物理系统状态
   */
  public getBVHPhysicsStatus(): {
    isOnGround: boolean;
    velocity: THREE.Vector3;
    position: THREE.Vector3;
    hasPhysics: boolean;
  } {
    return {
      isOnGround: this.playerIsOnGround,
      velocity: this.playerVelocity.clone(),
      position: this.mesh ? this.mesh.position.clone() : new THREE.Vector3(),
      hasPhysics: !!this.bvhPhysics
    };
  }

  /**
   * 创建跟随相机 - 创建一个跟随模型的相机
   */
  public createLookCamera(capsuleRadiu?:number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight,  capsuleRadiu ?? 5, 1000);
    // const cameraHelper = new THREE.CameraHelper(camera);

    // 设置相机位置
    if (this.mesh) {
      const dimensions = this.getModelDimensions();
      camera.position.set(
        this.mesh.position.x,
        this.mesh.position.y + 1 * dimensions.height,
        this.mesh.position.z
      );
    } else {
      camera.position.set(0, 13, 2);
    }

    // 添加相机辅助线到场景
    // scene.add(cameraHelper);

    // 将相机辅助线存储到私有属性
    // if (!this.cameraHelpers) {
    //   this.cameraHelpers = {};
    // }
    // this.cameraHelpers.lookCameraHelper = cameraHelper;

    return camera;
  }

  /**
   * 创建相机控制器
   */
  public createCameraControls(
    camera: THREE.Camera,
    domElement: HTMLElement,
    renderer?: THREE.WebGLRenderer
  ): OrbitControls {
    const controls = new OrbitControls(camera, domElement);
    // 修复角度设置 - 不设置minAzimuthAngle以允许360度旋转
    // controls.minAzimuthAngle = -Infinity; // 允许无限制水平旋转
    // controls.maxAzimuthAngle = Infinity;
    controls.maxPolarAngle = Math.PI * 5 / 7; // 限制垂直角度
    controls.minPolarAngle = Math.PI * 3 / 7; // 限制垂直角度
    controls.enableZoom = false; // 禁止缩放
    controls.enablePan = false; // 禁止平移
    controls.maxDistance = 2;
    controls.keyPanSpeed = 2;

    // 设置控制器目标为模型位置上方
    if (this.mesh) {
      const dimensions = this.getModelDimensions();
      controls.target.set(
        this.mesh.position.x,
        this.mesh.position.y + 1 * dimensions.height,
        this.mesh.position.z
      );
    }

    // 创建一个具名的事件处理函数
    this.cameraControlsChangeHandler = (_event) => {
      this.handleCameraControlsChange(controls, camera, renderer);
    };

    // 添加控制器变化事件监听器
    controls.addEventListener('change', this.cameraControlsChangeHandler);
    controls.addEventListener('change', () => {
      // const polarAngle = controls.getPolarAngle();
      // console.log(`当前仰角: ${polarAngle} 弧度 (约 ${THREE.MathUtils.radToDeg(polarAngle)} 度)`);
    });
    return controls;
  }

  /**
   * 处理相机控制器变化事件
   */
  protected handleCameraControlsChange(controls: OrbitControls, camera: THREE.Camera, renderer?: THREE.WebGLRenderer): void {
    const azimuthAngle = controls.getAzimuthalAngle();

    // 更新模型旋转
    if (this.mesh) {
      this.mesh.rotation.y = azimuthAngle + Math.PI;
    }

    // 如果存在事件处理函数，临时移除它
    if (this.cameraControlsChangeHandler) {
      controls.removeEventListener('change', this.cameraControlsChangeHandler);

      // 清除之前的定时器（如果存在）
      if (this.controlsChangeTimeout) {
        clearTimeout(this.controlsChangeTimeout);
      }

      // 延迟重新添加事件监听器
      this.controlsChangeTimeout = window.setTimeout(() => {
        if (this.cameraControlsChangeHandler) {
          controls.addEventListener('change', this.cameraControlsChangeHandler);
        }
      }, 10); // 使用更短的延迟时间
    }

    // 如果提供了渲染器，则重新渲染场景
    if (renderer && camera instanceof THREE.Camera) {
      renderer.render(camera.parent || new THREE.Scene(), camera);
    }
  }

  /**
   * 清理相机控制器资源
   */
  public cleanupCameraControls(controls: OrbitControls): void {
    if (this.cameraControlsChangeHandler) {
      controls.removeEventListener('change', this.cameraControlsChangeHandler);
      this.cameraControlsChangeHandler = undefined;
    }

    if (this.controlsChangeTimeout) {
      clearTimeout(this.controlsChangeTimeout);
      this.controlsChangeTimeout = undefined;
    }
  }

  /**
   * 更新相机跟随（在动画循环中调用）
   */
  public updateCameraFollow(camera: THREE.PerspectiveCamera, controls: OrbitControls): void {
    if (!this.mesh) return;

    // 更新当前相机角度（这是关键！）
    this.currentCameraAngle = controls.getAzimuthalAngle();

    // 保存相机当前位置相对于目标点的偏移
    const cameraOffset = new THREE.Vector3().subVectors(
      camera.position,
      controls.target
    );

    // 更新控制器目标到角色位置
    controls.target.copy(this.mesh.position);

    // 根据角色高度调整目标点Y坐标
    const dimensions = this.getModelDimensions();
    controls.target.y += 1 * dimensions.height;

    // 根据保存的偏移更新相机位置
    camera.position.copy(controls.target).add(cameraOffset);

    // 更新控制器，应用变更
    controls.update();
  }

  /**
   * 更新相机辅助器
   */
  // public updateCameraHelpers(): void {
  //   this.cameraHelpers?.lookCameraHelper?.update();
  // }

  // updateModelHelpers 和 toggleCapsuleVisibility 方法已移至 StaticModel 基类

  // ==================== 右键发射鸡蛋功能 ====================

  /**
   * 发射鸡蛋（由外部调用，不处理事件）
   * @param camera 相机对象
   * @param scene 场景对象
   * @param mouseX 鼠标X坐标（标准化设备坐标）
   * @param mouseY 鼠标Y坐标（标准化设备坐标）
   * @returns 返回发射参数（用于同步给其他客户端）或 null
   */
  public shootEgg(camera: THREE.Camera, scene: THREE.Scene, mouseX: number, mouseY: number): { position: THREE.Vector3; velocity: THREE.Vector3 } | null {
    if (!this.bvhPhysics) {
      console.warn('❌ BVH物理系统未初始化，无法发射鸡蛋');
      return null;
    }
    const egg = new Egg(scene, this.bvhPhysics);

    // 等待鸡蛋模型加载完成后再发射
    if (egg.isReady()) {
      const shootParams = egg.shoot(camera, mouseX, mouseY);
      this.eggs.push(egg);

      // 限制鸡蛋数量，防止内存泄漏
      if (this.eggs.length > this.eggParams.maxEggs) {
        const oldEgg = this.eggs.shift();
        if (oldEgg) {
          oldEgg.removeEgg();
        }
      }
      return shootParams;
    }else{
      return null;
    }
  }

  /**
   * 发射其他客户端的鸡蛋（通过参数）
   * @param scene 场景对象
   * @param position 发射位置
   * @param velocity 发射速度
   */
  public shootOtherEgg(scene: THREE.Scene, position: THREE.Vector3, velocity: THREE.Vector3): void {
    if (!this.bvhPhysics) {
      console.warn('❌ BVH物理系统未初始化，无法发射其他客户端的鸡蛋');
      return;
    }

    const egg = new Egg(scene, this.bvhPhysics);

    // 等待鸡蛋模型加载完成后再发射
    if (egg.isReady()) {
      egg.shootByParams(position, velocity);
      this.eggs.push(egg);

      // 限制鸡蛋数量，防止内存泄漏
      if (this.eggs.length > this.eggParams.maxEggs) {
        const oldEgg = this.eggs.shift();
        if (oldEgg) {
          oldEgg.removeEgg();
        }
      }
      console.log('🥚🌐 其他客户端的鸡蛋已发射');
    } else {
      console.warn('❌ 鸡蛋模型未准备好，无法发射其他客户端的鸡蛋');
    }
  }

  /**
   * 更新所有发射的鸡蛋物理状态
   * @param delta 时间增量
   * @param camera 相机对象（用于视野检测优化）
   */
  public updateProjectileEggs(delta: number, camera?: THREE.Camera): void {
    if (!this.bvhPhysics) return;

    for (let i = 0; i < this.eggs.length; i++) {
      const egg = this.eggs[i];
      const isSuccess = egg.updateProjectileEgg(delta, camera);
      if (!isSuccess) {
        egg.removeEgg();
        this.eggs.splice(i, 1);
        i--;
      }
    }
  }

  /**
   * 清理所有发射的鸡蛋
   * @param scene 场景对象
   */
  public clearAllEggs(): void {
    this.eggs.forEach(egg => {
      egg.removeEgg();
    });
    this.eggs.length = 0;
    console.log('🧹 已清理所有发射的鸡蛋');
  }

  /**
   * 清理鸡蛋资源
   * @param scene 场景对象
   */
  public disposeEggShooter(): void {
    // 清理所有鸡蛋
    this.clearAllEggs();
    console.log('🗑️ 鸡蛋资源已清理');
  }

  /**
   * 获取模型的当前状态（扩展静态模型状态，添加物理信息）
   * @returns 包含位置、旋转、动画状态、物理状态的对象
   */
  public getModelState(): {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    animation: {
      currentAnimation: string;
      walkActionActive: boolean;
      standActionActive: boolean;
      isWalking: boolean; // Model 类特有的属性
    };
    modelInfo: {
      dimensions: { width: number; height: number; depth: number };
      hasAnimations: boolean;
    };
    physics: { // Model 类特有的物理信息
      isOnGround: boolean;
      velocity: { x: number; y: number; z: number };
    };
    moveSpeed:number;
    capsuleInfo?: { radius: number; height: number }; // 添加胶囊体信息
  } {
    // 获取位置信息
    const position = this.mesh ? {
      x: Number(this.mesh.position.x.toFixed(3)),
      y: Number(this.mesh.position.y.toFixed(3)),
      z: Number(this.mesh.position.z.toFixed(3))
    } : { x: 0, y: 0, z: 0 };

    // 获取旋转信息（转换为度数）
    const rotation = this.mesh ? {
      x: Number((this.mesh.rotation.x * 180 / Math.PI).toFixed(3)),
      y: Number((this.mesh.rotation.y * 180 / Math.PI).toFixed(3)),
      z: Number((this.mesh.rotation.z * 180 / Math.PI).toFixed(3))
    } : { x: 0, y: 0, z: 0 };

    // 获取动画状态
    const walkActionActive = this.getWalkActionActive();
    const standActionActive = this.getStandActionActive();

    let currentAnimation = 'none';
    if (walkActionActive) {
      currentAnimation = 'walking';
    } else if (standActionActive) {
      currentAnimation = 'standing';
    }

    // 获取物理状态
    const physics = {
      isOnGround: this.playerIsOnGround,
      velocity: {
        x: Number(this.playerVelocity.x.toFixed(3)),
        y: Number(this.playerVelocity.y.toFixed(3)),
        z: Number(this.playerVelocity.z.toFixed(3))
      }
    };

    // 获取模型信息
    const modelInfo = {
      dimensions: this.getModelDimensions(),
      hasAnimations: this.mixer !== undefined && this.mixer !== null
    };

    // 获取胶囊体信息
    const capsuleData = this.getCapsuleInfo();
    const capsuleInfo = capsuleData ? { radius: capsuleData.radius, height: capsuleData.height } : undefined;

    return {
      position,
      rotation,
      animation: {
        currentAnimation,
        walkActionActive,
        standActionActive,
        isWalking: this.isWalking
      },
      modelInfo,
      physics,
      moveSpeed:this.moveSpeed,
      capsuleInfo // 包含胶囊体信息
    };
  }

  /**
   * 检查走路动画是否激活
   * @returns 走路动画是否正在播放
   */
  protected getWalkActionActive(): boolean {
    // 这个方法需要在子类中被重写，因为不同模型类型的动画属性不同
    // 这里提供一个默认实现
    const model = this as any;
    if (model.walkAction) {
      return model.walkAction.isRunning() && model.walkAction.getEffectiveWeight() > 0;
    }
    return false;
  }

  /**
   * 检查站立动画是否激活
   * @returns 站立动画是否正在播放
   */
  protected getStandActionActive(): boolean {
    // 这个方法需要在子类中被重写，因为不同模型类型的动画属性不同
    // 这里提供一个默认实现
    const model = this as any;
    if (model.standAction) {
      return model.standAction.isRunning() && model.standAction.getEffectiveWeight() > 0;
    }
    return false;
  }

  /**
   * 🚪 同步门状态（接收其他客户端的门状态更新）
   * @param data 门状态数据
   * @param scene 场景对象（可选）
   */
  public syncDoorState(data: { doorName: string; doorNearName: string | undefined; visible: boolean; isOpen: boolean }, scene?: THREE.Scene): void {
    const { doorName, doorNearName, visible, isOpen } = data;
    
    console.log(`🚪 同步门状态: ${doorName}, 可见性: ${visible}, 开启状态: ${isOpen}`);

    // 更新物理碰撞体状态
    if (this.bvhPhysics) {
      const colliders = this.bvhPhysics.getColliders();
      const doorCollider = colliders.get(`school-door-${doorName}`);
      const nearCollider = doorNearName ? colliders.get(`school-door-${doorNearName}`) : null;

      if (doorCollider) {
        doorCollider.userData.isOpen = isOpen;
      }
      if (nearCollider) {
        nearCollider.userData.isOpen = isOpen;
      }
    }

    // 更新门的可视化状态
    const child = this.mapDoorNameMesh.get(doorName);
    const childNear = doorNearName ? this.mapDoorNameMesh.get(doorNearName) : null;

    if (child) {
      child.visible = visible;
    }
    if (childNear) {
      childNear.visible = visible;
    }

    // 如果缓存中没有门的网格，尝试从场景中查找
    if ((!child || (doorNearName && !childNear)) && scene) {
      scene.traverse((sceneChild) => {
        if (sceneChild.name === doorName && !child) {
          sceneChild.visible = visible;
          this.mapDoorNameMesh.set(doorName, sceneChild as THREE.Mesh);
        } else if (doorNearName && sceneChild.name === doorNearName && !childNear) {
          sceneChild.visible = visible;
          this.mapDoorNameMesh.set(doorNearName, sceneChild as THREE.Mesh);
        }
      });
    }

    console.log(`✅ 门状态同步完成: ${doorName}`);
  }

}