import { UserEquipment } from './room';
import { Equipment } from '../entities/Equipment';
import { AppDataSource } from '../config/database';

// 装备管理器类
export class EquipmentManager {
  private static instance: EquipmentManager;

  private constructor() {}

  public static getInstance(): EquipmentManager {
    if (!EquipmentManager.instance) {
      EquipmentManager.instance = new EquipmentManager();
    }
    return EquipmentManager.instance;
  }

  /**
   * 从数据库加载用户装备
   * @param userId 用户ID (字符串格式)
   * @param username 用户名
   * @returns 用户装备数据
   */
  public async loadUserEquipment(userId: string, username: string): Promise<UserEquipment> {
    try {
      console.log(`📦 加载用户装备: ${username}(${userId})`);

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        throw new Error(`无效的用户ID: ${userId}`);
      }

      // 从数据库查询用户装备
      const equipmentRepository = AppDataSource.getRepository(Equipment);
      const equipment = await equipmentRepository.findOne({
        where: { id: userIdNum },
        relations: ['user']
      });

      let eggCount = 0;
      if (equipment && equipment.egg) {
        eggCount = parseInt(equipment.egg) || 0;
      }

      const userEquipment: UserEquipment = {
        id: userIdNum,
        username,
        egg: eggCount,
        lastUpdated: new Date()
      };

      console.log(`✅ 用户装备加载完成: ${username}, 鸡蛋数量: ${eggCount}`);
      return userEquipment;
    } catch (error) {
      console.error(`❌ 加载用户装备失败: ${username}(${userId})`, error);

      // 返回默认装备数据
      return {
        id: parseInt(userId) || 0,
        username,
        egg: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * 保存用户装备到数据库
   * @param userEquipment 用户装备数据
   */
  public async saveUserEquipment(userEquipment: UserEquipment): Promise<boolean> {
    try {
      console.log(`💾 保存用户装备: ${userEquipment.username}(${userEquipment.id})`);

      const equipmentRepository = AppDataSource.getRepository(Equipment);

      // 查找现有装备记录
      let equipment = await equipmentRepository.findOne({
        where: { id: userEquipment.id }
      });

      if (equipment) {
        // 更新现有记录
        equipment.egg = userEquipment.egg.toString();
        await equipmentRepository.save(equipment);
        console.log(`🔄 更新用户装备: ${userEquipment.username}, 鸡蛋数量: ${userEquipment.egg}`);
      } else {
        // 创建新记录
        equipment = new Equipment();
        equipment.id = userEquipment.id;
        equipment.egg = userEquipment.egg.toString();
        await equipmentRepository.save(equipment);
        console.log(`➕ 创建用户装备: ${userEquipment.username}, 鸡蛋数量: ${userEquipment.egg}`);
      }

      console.log(`✅ 用户装备保存完成: ${userEquipment.username}`);
      return true;
    } catch (error) {
      console.error(`❌ 保存用户装备失败: ${userEquipment.username}(${userEquipment.id})`, error);
      return false;
    }
  }

  /**
   * 批量保存房间内所有用户装备
   * @param userEquipments 用户装备Map
   * @param roomId 房间ID
   */
  public async saveRoomEquipments(userEquipments: Map<string, UserEquipment>, roomId: string): Promise<void> {
    try {
      console.log(`🏠 批量保存房间装备: ${roomId}, 用户数量: ${userEquipments.size}`);

      const savePromises: Promise<boolean>[] = [];

      for (const [userId, userEquipment] of userEquipments) {
        // 更新最后修改时间
        userEquipment.lastUpdated = new Date();
        savePromises.push(this.saveUserEquipment(userEquipment));
      }

      const results = await Promise.all(savePromises);
      const successCount = results.filter(result => result).length;

      console.log(`✅ 房间装备保存完成: ${roomId}, 成功: ${successCount}/${userEquipments.size}`);
    } catch (error) {
      console.error(`❌ 批量保存房间装备失败: ${roomId}`, error);
    }
  }

  /**
   * 修改鸡蛋数量（正数增加，负数减少）
   * @param userEquipment 用户装备数据
   * @param change 变化量（正数增加，负数减少）
   */
  public modifyEggQuantity(userEquipment: UserEquipment, change: number): boolean {
    try {
      const oldQuantity = userEquipment.egg;
      userEquipment.egg = Math.max(0, userEquipment.egg + change); // 确保不会小于0
      userEquipment.lastUpdated = new Date();

      if (change > 0) {
        console.log(`➕ 鸡蛋增加: ${userEquipment.username} +${change} (${oldQuantity} → ${userEquipment.egg})`);
      } else if (change < 0) {
        console.log(`➖ 鸡蛋减少: ${userEquipment.username} ${change} (${oldQuantity} → ${userEquipment.egg})`);
      } else {
        console.log(`🔄 鸡蛋数量不变: ${userEquipment.username} = ${userEquipment.egg}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ 修改鸡蛋数量失败: ${userEquipment.username}`, error);
      return false;
    }
  }

  /**
   * 减少用户鸡蛋数量
   * @param userEquipment 用户装备数据
   * @param quantity 要减少的数量
   */
  public removeEggs(userEquipment: UserEquipment, quantity: number): boolean {
    if (userEquipment.egg >= quantity) {
      userEquipment.egg -= quantity;
      userEquipment.lastUpdated = new Date();
      console.log(`➖ 减少鸡蛋: ${userEquipment.username} - 鸡蛋 -${quantity}, 剩余: ${userEquipment.egg}`);
      return true;
    } else {
      console.log(`❌ 鸡蛋数量不足: ${userEquipment.username} - 当前: ${userEquipment.egg}, 需要: ${quantity}`);
      return false;
    }
  }
}

// 导出单例实例
export const equipmentManager = EquipmentManager.getInstance();
