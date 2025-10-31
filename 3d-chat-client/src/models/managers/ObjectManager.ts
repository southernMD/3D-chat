import * as THREE from 'three';
import { OvalRunningTrack } from '../architecture/OvalRunningTrack';
import { WallAndDoor } from '../architecture/WallAndDoor';
import { SchoolBuilding } from '../architecture/SchoolBuilding';
import { Ground } from '../architecture/Ground';
import { BaseModel } from '../architecture/BaseModel';
import { PHYSICS_CONSTANTS } from '../../constants/PhysicsConstants';
import { Tree } from '../architecture/Tree';
import { Egg } from '../Egg';
import type { EggBroadcastData, EggClearData } from '@/utils/eventBus';
import { eventBus } from '@/utils/eventBus';

/**
 * 对象管理器 - 统一管理所有静态模型对象
 */
export class ObjectManager {
  private scene: THREE.Scene;
  private objects: Map<string, BaseModel> = new Map();
  private isCreated = false;

  // 鸡蛋管理
  private eggs: Map<string, THREE.Object3D> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 监听鸡蛋清除事件
    eventBus.on('egg-clear', this.handleEggClear);
  }

  async create(): Promise<void> {
    if (this.isCreated) return
    await Promise.all([
      this.createGround('main-ground', {
        sizeX: PHYSICS_CONSTANTS.GROUND_SIZE_X,
        sizeZ: PHYSICS_CONSTANTS.GROUND_SIZE_Z,
        position: { x: 0, y: 0, z: 0 }
      }),
      this.createOvalTrack('main-track', {
        position: { x: 0, y: 5, z: 675 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 8 // 支持x、z轴独立缩放
      }),
      this.createSchoolBuilding('school-building', {
        position: { x: 500, y: 0, z: -500 },
        rotation: { x: 0, y: 90, z: 0 },
        scale: 0.75
      }),
      this.createMultipleTrees(),
      this.createBoundaryWalls(),
      this.createEgg()
    ])
    this.isCreated = true;
  }

  /**
   * 创建边界墙体
   */
  private async createBoundaryWalls(): Promise<void> {
    await this.createWallAndDoor('boundary-walls', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1
    });
    console.log('✅ 边界墙体创建完成');
  }

  /**
   * 重新生成边界墙体
   */
  async regenerateBoundaryWalls(): Promise<void> {
    console.log('🔄 开始重新生成边界墙体...');

    // 强制清除现有的边界墙体
    await this.forceClearBoundaryWalls();

    // 重新创建边界墙体
    await this.createBoundaryWalls();
    console.log('✅ 边界墙体重新生成完成');
  }

  /**
   * 强制清除边界墙体
   */
  private async forceClearBoundaryWalls(): Promise<void> {
    console.log('🗑️ 强制清除边界墙体...');

    // 方法1：通过对象管理器清除
    if (this.objects.has('boundary-walls')) {
      const wallObject = this.objects.get('boundary-walls');
      if (wallObject) {
        wallObject.dispose();
        this.objects.delete('boundary-walls');
        console.log('✅ 通过对象管理器清除完成');
      }
    }

    // 方法2：直接从场景中查找并清除所有边界墙体相关对象
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child.name.includes('BoundaryWall') ||
        child.name.includes('ClippingPlane') ||
        child.name.includes('BoundaryPoint') ||
        child.name.includes('PhysicsWallVisualization')) {
        objectsToRemove.push(child);
      }
    });

    objectsToRemove.forEach(obj => {
      this.scene.remove(obj);
      // 释放资源
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });

    console.log(`🗑️ 从场景中清除了 ${objectsToRemove.length} 个边界墙体相关对象`);
  }

  /**
   * 重新生成地面和边界墙体
   */
  async regenerateGroundAndWalls(): Promise<void> {
    console.log('🔄 开始重新生成地面和边界墙体...');

    // 🔥 重新创建可视化地面
    await this.recreateGround();

    // 🔥 不再需要物理地面，因为已经移除了 PhysicsManager

    // 重新生成边界墙体
    await this.regenerateBoundaryWalls();

    console.log('✅ 地面和边界墙体重新生成完成');
  }

  /**
   * 创建地面
   */
  async createGround(
    id: string = 'main-ground',
    options: {
      sizeX?: number;
      sizeZ?: number;
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: number;
    } = {}
  ): Promise<Ground> {
    console.log(`🌍 创建地面: ${id}`);

    // 创建地面实例
    const ground = new Ground(this.scene, id, {
      sizeX: options.sizeX || PHYSICS_CONSTANTS.GROUND_SIZE_X,
      sizeZ: options.sizeZ || PHYSICS_CONSTANTS.GROUND_SIZE_Z,
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || 1
    });

    // 创建地面
    await ground.create();

    // 存储到对象集合中
    this.objects.set(id, ground);

    console.log(`✅ 地面创建完成: ${id}`);
    return ground;
  }

  /**
   * 重新创建地面
   */
  async recreateGround(): Promise<void> {
    console.log('🔄 重新创建地面...');

    // 移除现有地面
    if (this.objects.has('main-ground')) {
      this.removeObject('main-ground');
    }

    // 重新创建地面
    await this.createGround('main-ground', {
      sizeX: PHYSICS_CONSTANTS.GROUND_SIZE_X,
      sizeZ: PHYSICS_CONSTANTS.GROUND_SIZE_Z,
      position: { x: 0, y: 0, z: 0 }
    });

    console.log('✅ 地面重新创建完成');
  }

  /**
   * 创建椭圆跑道
   */
  async createOvalTrack(
    id: string = 'main-track',
    options: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: number | { x: number; y: number; z: number };
    } = {}
  ): Promise<OvalRunningTrack> {
    console.log(`🏃 创建椭圆跑道: ${id}`);

    // 设置默认参数

    // 创建跑道实例
    const track = new OvalRunningTrack(this.scene, {
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || 2
    });

    // 创建跑道
    await track.create();

    // 存储到对象集合中
    this.objects.set(id, track);

    console.log(`✅ 椭圆跑道创建完成: ${id}`);
    return track;
  }

  /**
   * 创建墙体和门
   */
  async createWallAndDoor(
    id: string,
    options: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: number;
    } = {}
  ): Promise<WallAndDoor> {
    console.log(`🧱 创建墙体和门: ${id}`);

    // 设置默认参数
    const config = {
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || 1
    };

    // 创建墙体实例
    const wall = new WallAndDoor(this.scene, 14, config);

    // 创建墙体
    await wall.create();

    // 存储到对象集合中
    this.objects.set(id, wall);

    console.log(`✅ 墙体和门创建完成: ${id}`);
    return wall;
  }

  /**
   * 创建学校建筑
   */
  async createSchoolBuilding(
    id: string,
    options: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: number;
    } = {}
  ): Promise<SchoolBuilding> {
    console.log(`🏫 开始创建学校建筑: ${id}`);

    // 创建变换参数
    const transform = {
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || 1
    };

    const building = new SchoolBuilding(
      this.scene,
      transform
    );

    await building.create();
    this.objects.set(id, building);
    console.log(`✅ 学校建筑创建完成: ${id}`);
    return building;
  }
  async createTree(
    id: string,
    options: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: number;
    } = {}
  ): Promise<Tree> {
    console.log(`🌳 创建树: ${id}`);

    // 创建变换参数
    const transform = {
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || 1
    };

    const tree = new Tree(
      this.scene,
      transform,
      id
    );

    await tree.create();

    this.objects.set(id, tree);
    console.log(`✅ 树创建完成: ${id}`);
    return tree;
  }

  /**
   * 创建多棵树（20棵）
   */
  async createMultipleTrees(): Promise<void> {
    console.log('🌲 开始创建20棵树...');
    const tree = new Tree(this.scene, undefined, 'treeGroup');
    await tree.create();
    const oneTree = tree.getModelGroup().children[0]
    console.log(oneTree);
    const group = new THREE.Group();
    group.name = 'treeGroup'

    group.add(this.createOneTree(oneTree, new THREE.Vector3(500 * 2, 0, 500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(300 * 2, 0, 500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(100 * 2, 0, 500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-100 * 2, 0, 500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-300 * 2, 0, 500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-500 * 2, 0, 500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-500 * 2, 0, 300 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-500 * 2, 0, 100 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-500 * 2, 0, -100 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-500 * 2, 0, -300 * 2)));

    group.add(this.createOneTree(oneTree, new THREE.Vector3(-500 * 2, 0, -500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-300 * 2, 0, -500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(-100 * 2, 0, -500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(100 * 2, 0, -500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(300 * 2, 0, -500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(500 * 2, 0, -500 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(500 * 2, 0, -300 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(500 * 2, 0, -100 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(500 * 2, 0, 100 * 2)));
    group.add(this.createOneTree(oneTree, new THREE.Vector3(500 * 2, 0, 300 * 2)));

    tree.setModelGroup(group);
    tree.addToScene()
    this.objects.set("tree-group", tree);
  }

  createOneTree(tree: THREE.Object3D<THREE.Object3DEventMap>, position: THREE.Vector3) {
    const newOne = tree.clone()
    newOne.position.set(position.x, position.y, position.z)
    return newOne
  }

  /**
   * 获取对象
   */
  getObject<T extends BaseModel>(id: string): T | undefined {
    return this.objects.get(id) as T;
  }

  /**
   * 获取跑道
   */
  getTrack(id: string): OvalRunningTrack | undefined {
    return this.getObject<OvalRunningTrack>(id);
  }

  /**
   * 获取主跑道
   */
  getMainTrack(): OvalRunningTrack | undefined {
    return this.getTrack('main-track');
  }

  /**
   * 获取墙体
   */
  getWall(id: string): WallAndDoor | undefined {
    return this.getObject<WallAndDoor>(id);
  }

  /**
   * 获取学校建筑
   */
  getSchoolBuilding(id: string): SchoolBuilding | undefined {
    return this.getObject<SchoolBuilding>(id);
  }

  /**
   * 获取主学校建筑
   */
  getMainSchoolBuilding(): SchoolBuilding | undefined {
    return this.getSchoolBuilding('school-building');
  }

  /**
   * 获取地面
   */
  getGround(id: string): Ground | undefined {
    return this.getObject<Ground>(id);
  }

  /**
   * 获取主地面
   */
  getMainGround(): Ground | undefined {
    return this.getGround('main-ground');
  }

  /**
   * 移除对象
   */
  removeObject(id: string): boolean {
    const obj = this.objects.get(id);
    if (obj) {
      obj.dispose();
      this.objects.delete(id);
      console.log(`🗑️ 移除对象: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * 移除跑道（兼容性方法）
   */
  removeTrack(id: string): boolean {
    return this.removeObject(id);
  }

  /**
   * 获取所有对象
   */
  getAllObjects(): Map<string, BaseModel> {
    return this.objects;
  }



  /**
   * 获取所有跑道（兼容性方法）
   */
  getAllTracks(): Map<string, OvalRunningTrack> {
    const tracks = new Map<string, OvalRunningTrack>();
    for (const [id, obj] of this.objects) {
      if (obj instanceof OvalRunningTrack) {
        tracks.set(id, obj);
      }
    }
    return tracks;
  }

  /**
   * 获取所有墙体
   */
  getAllWalls(): Map<string, WallAndDoor> {
    const walls = new Map<string, WallAndDoor>();
    for (const [id, obj] of this.objects) {
      if (obj instanceof WallAndDoor) {
        walls.set(id, obj);
      }
    }
    return walls;
  }

  /**
   * 清理所有对象
   */
  dispose(): void {
    console.log('🧹 清理所有静态对象...');
    for (const [id, obj] of this.objects) {
      obj.dispose();
      console.log(`🗑️ 清理对象: ${id}`);
    }
    this.objects.clear();
  }

  /**
   * 获取对象数量
   */
  getObjectCount(): number {
    return this.objects.size;
  }

  /**
   * 获取跑道数量（兼容性方法）
   */
  getTrackCount(): number {
    return this.getAllTracks().size;
  }

  /**
   * 检查对象是否存在
   */
  hasObject(id: string): boolean {
    return this.objects.has(id);
  }

  /**
   * 检查跑道是否存在（兼容性方法）
   */
  hasTrack(id: string): boolean {
    return this.hasObject(id) && this.objects.get(id) instanceof OvalRunningTrack;
  }

  /**
   * 获取对象类型统计
   */
  getObjectTypeStats(): { [type: string]: number } {
    const stats: { [type: string]: number } = {};
    for (const obj of this.objects.values()) {
      const type = obj.constructor.name;
      stats[type] = (stats[type] || 0) + 1;
    }
    return stats;
  }

  /**
   * 预加载鸡蛋模型（调用Egg类的静态方法）
   */
  async createEgg(): Promise<void> {
    await Egg.createEgg();
  }

  /**
   * 处理鸡蛋广播事件
   * @returns 创建的鸡蛋信息数组
   */
  createEggBroadcast = (data: EggBroadcastData): Array<{ id: string, model: THREE.Object3D }> => {
    console.log('🥚 ObjectManager收到鸡蛋广播:', data)

    const createdEggs: Array<{ id: string, model: THREE.Object3D }> = []

    // 在3D场景中插入鸡蛋
    data.eggs.forEach(egg => {
      const eggModel = this.insertEggIntoScene(egg.id, egg.x, egg.y, egg.z)
      if (eggModel) {
        createdEggs.push({ id: egg.id, model: eggModel })
      }
    })

    return createdEggs
  }

  /**
   * 处理鸡蛋清除事件
   */
  handleEggClear = (data: EggClearData) => {
    console.log('🥚 ObjectManager收到鸡蛋清除请求:', data.eggId);
    const success = this.clearEgg(data.eggId);
    if (success) {
      console.log(`🥚 鸡蛋 ${data.eggId} 已成功清除`);
    } else {
      console.warn(`⚠️ 鸡蛋 ${data.eggId} 清除失败`);
    }
  }

  /**
   * 在3D场景中插入鸡蛋
   * @returns 创建的鸡蛋模型或null
   */
  public insertEggIntoScene(id: string, x: number, y: number, z: number): THREE.Object3D | null {
    try {
      // 获取鸡蛋模型实例
      const eggModel = Egg.getEggInstance()
      if (!eggModel) {
        console.error(`❌ 无法获取鸡蛋模型实例，鸡蛋 ${id} 创建失败`)
        return null
      }
      // 设置鸡蛋模型属性
      eggModel.name = `egg_${id}`
      eggModel.userData = { type: 'egg', id: id }
      eggModel.position.set(x, y, z)
      eggModel.scale.set(1, 1, 1)

      // 添加到场景
      this.scene.add(eggModel)

      // 设置随机旋转角度
      // eggModel.rotation.x = Math.random() * Math.PI * 2 // 0 到 2π
      // eggModel.rotation.y = Math.random() * Math.PI * 2
      // eggModel.rotation.z = Math.random() * Math.PI * 2

      // 保存到鸡蛋集合中（直接保存模型，不是组）
      this.eggs.set(id, eggModel as any)

      console.log(`🥚 鸡蛋 ${id} 已插入场景位置: (${x}, ${y}, ${z})`)

      return eggModel

    } catch (error) {
      console.error(`❌ 插入鸡蛋 ${id} 失败:`, error)
      return null
    }
  }

  /**
   * 清除指定鸡蛋
   */
  clearEgg(eggId: string): boolean {
    try {
      console.log(this.eggs, eggId);
      const eggModel = this.eggs.get(eggId)
      if (eggModel) {
        // 从场景中移除
        this.scene.remove(eggModel)

        // 清理几何体和材质
        eggModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose())
            } else {
              child.material.dispose()
            }
          }
        })

        // 从集合中移除
        this.eggs.delete(eggId)

        console.log(`🥚 鸡蛋 ${eggId} 已清除`)
        return true
      }
      return false
    } catch (error) {
      console.error(`❌ 清除鸡蛋 ${eggId} 失败:`, error)
      return false
    }
  }

  /**
   * 清除所有鸡蛋
   */
  clearAllEggs() {
    const eggIds = Array.from(this.eggs.keys())
    eggIds.forEach(id => this.clearEgg(id))
    console.log(`🥚 已清除所有鸡蛋 (${eggIds.length}个)`)
  }

  /**
   * 获取当前鸡蛋数量
   */
  getEggCount(): number {
    return this.eggs.size
  }

  /**
   * 获取所有鸡蛋ID
   */
  getEggIds(): string[] {
    return Array.from(this.eggs.keys())
  }
}
