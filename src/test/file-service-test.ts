import 'reflect-metadata';
import { FileService } from '../services/FileService';

/**
 * 测试 FileService 的 getModelByHash 方法
 */
async function testGetModelByHash() {
  console.log('🧪 测试 FileService.getModelByHash 方法...\n');

  const fileService = new FileService();

  // 测试1: 测试不存在的hash
  console.log('📋 测试1: 查询不存在的hash');
  try {
    const result1 = await fileService.getModelByHash('nonexistent-hash');
    console.log('结果:', result1);
    
    if (!result1.success && result1.error === '未找到指定的模型') {
      console.log('✅ 测试1通过: 正确处理不存在的hash\n');
    } else {
      console.log('❌ 测试1失败: 未正确处理不存在的hash\n');
    }
  } catch (error) {
    console.log('❌ 测试1异常:', error);
  }

  // 测试2: 测试空hash
  console.log('📋 测试2: 查询空hash');
  try {
    const result2 = await fileService.getModelByHash('');
    console.log('结果:', result2);
    
    if (!result2.success) {
      console.log('✅ 测试2通过: 正确处理空hash\n');
    } else {
      console.log('❌ 测试2失败: 未正确处理空hash\n');
    }
  } catch (error) {
    console.log('❌ 测试2异常:', error);
  }

  // 测试3: 测试方法返回的数据结构
  console.log('📋 测试3: 验证返回数据结构');
  try {
    const result3 = await fileService.getModelByHash('test-hash');
    console.log('返回结构包含的字段:', Object.keys(result3));
    
    const requiredFields = ['success'];
    const hasAllFields = requiredFields.every(field => field in result3);
    
    if (hasAllFields) {
      console.log('✅ 测试3通过: 返回数据结构正确\n');
    } else {
      console.log('❌ 测试3失败: 返回数据结构不完整\n');
    }
  } catch (error) {
    console.log('❌ 测试3异常:', error);
  }

  console.log('🎉 FileService.getModelByHash 测试完成！');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testGetModelByHash().catch(console.error);
}

export { testGetModelByHash };
