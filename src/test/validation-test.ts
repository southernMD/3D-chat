import 'reflect-metadata';
import { Validate, ValidationType, getValidationConfig } from '../decorators/validation';

// 测试类
class TestController {
  // 测试重复装饰器
  @Validate({ type: ValidationType.EMAIL, field: 'email' })
  @Validate({ type: ValidationType.EMAIL, field: 'email' })  // 重复！应该被忽略
  @Validate({ type: ValidationType.PASSWORD, field: 'password' })
  testMethod() {
    console.log('Test method');
  }

  // 测试不同字段的相同类型（不应该去重）
  @Validate({ type: ValidationType.EMAIL, field: 'email' })
  @Validate({ type: ValidationType.EMAIL, field: 'alternateEmail' })  // 不同字段，不应该去重
  testMethod2() {
    console.log('Test method 2');
  }
}

// 运行测试
function runValidationTest() {
  console.log('🧪 测试验证装饰器去重功能...\n');

  const testController = new TestController();

  // 测试1: 检查重复装饰器是否被去重
  console.log('📋 测试1: testMethod 的验证配置');
  const validations1 = getValidationConfig(testController, 'testMethod');
  console.log('验证配置数量:', validations1.length);
  console.log('验证配置:', validations1);
  
  // 应该只有2个配置（email重复的被去重了）
  const expectedCount1 = 2;
  if (validations1.length === expectedCount1) {
    console.log('✅ 测试1通过: 重复装饰器被正确去重\n');
  } else {
    console.log('❌ 测试1失败: 期望', expectedCount1, '个配置，实际', validations1.length, '个\n');
  }

  // 测试2: 检查不同字段的相同类型是否保留
  console.log('📋 测试2: testMethod2 的验证配置');
  const validations2 = getValidationConfig(testController, 'testMethod2');
  console.log('验证配置数量:', validations2.length);
  console.log('验证配置:', validations2);
  
  // 应该有2个配置（不同字段不应该去重）
  const expectedCount2 = 2;
  if (validations2.length === expectedCount2) {
    console.log('✅ 测试2通过: 不同字段的相同类型验证被正确保留\n');
  } else {
    console.log('❌ 测试2失败: 期望', expectedCount2, '个配置，实际', validations2.length, '个\n');
  }

  // 测试3: 检查具体的验证配置内容
  console.log('📋 测试3: 验证配置内容检查');
  const emailValidations = validations1.filter(v => v.type === ValidationType.EMAIL);
  const passwordValidations = validations1.filter(v => v.type === ValidationType.PASSWORD);
  
  if (emailValidations.length === 1 && passwordValidations.length === 1) {
    console.log('✅ 测试3通过: 验证配置内容正确\n');
  } else {
    console.log('❌ 测试3失败: 验证配置内容不正确\n');
  }

  console.log('🎉 验证装饰器测试完成！');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runValidationTest();
}

export { runValidationTest };
