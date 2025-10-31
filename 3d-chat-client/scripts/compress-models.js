/**
 * 3D模型压缩脚本
 * 使用 gltf-pipeline 压缩 GLB 文件，启用 Draco 压缩
 * 
 * 使用方法:
 * 1. 安装依赖: npm install gltf-pipeline --save-dev
 * 2. 运行脚本: node scripts/compress-models.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const MODEL_DIR = path.join(__dirname, '../public/model');
const BACKUP_DIR = path.join(__dirname, '../public/model-backup');

// 需要压缩的模型列表（相对于 MODEL_DIR）
const MODELS_TO_COMPRESS = [
  'outdoorGym/OutdoorGym.glb',
  'outdoorGym/OnePullUpBar.glb',
  'building/schoolBuild1.glb',
  'tree/tree.glb',
  'wall/graveyard_fence.glb',
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function checkDependencies() {
  try {
    execSync('npx gltf-pipeline --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    log('❌ gltf-pipeline 未安装', colors.red);
    log('请运行: npm install gltf-pipeline --save-dev', colors.yellow);
    return false;
  }
}

function createBackup(filePath) {
  const relativePath = path.relative(MODEL_DIR, filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  const backupDir = path.dirname(backupPath);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    log(`  📦 备份创建: ${relativePath}`, colors.cyan);
  } else {
    log(`  ⏭️  备份已存在，跳过`, colors.yellow);
  }
}

function compressModel(modelPath) {
  const fullPath = path.join(MODEL_DIR, modelPath);
  
  if (!fs.existsSync(fullPath)) {
    log(`  ❌ 文件不存在: ${modelPath}`, colors.red);
    return;
  }

  const originalSize = fs.statSync(fullPath).size;
  const tempPath = fullPath.replace('.glb', '-compressed.glb');

  log(`\n🔄 压缩: ${modelPath}`, colors.bright);
  log(`  原始大小: ${formatBytes(originalSize)}`, colors.cyan);

  try {
    // 创建备份
    createBackup(fullPath);

    // 执行压缩
    const command = `npx gltf-pipeline -i "${fullPath}" -o "${tempPath}" -d`;
    log(`  ⚙️  执行压缩...`, colors.yellow);
    
    execSync(command, { stdio: 'inherit' });

    const compressedSize = fs.statSync(tempPath).size;
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    log(`  压缩后大小: ${formatBytes(compressedSize)}`, colors.green);
    log(`  减少: ${reduction}%`, colors.green);

    // 替换原文件
    fs.unlinkSync(fullPath);
    fs.renameSync(tempPath, fullPath);

    log(`  ✅ 完成!`, colors.green);

    return {
      path: modelPath,
      originalSize,
      compressedSize,
      reduction: parseFloat(reduction),
    };
  } catch (error) {
    log(`  ❌ 压缩失败: ${error.message}`, colors.red);
    
    // 清理临时文件
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    
    return null;
  }
}

function main() {
  log('\n🚀 3D模型压缩工具\n', colors.bright);

  // 检查依赖
  if (!checkDependencies()) {
    process.exit(1);
  }

  // 创建备份目录
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log(`📁 创建备份目录: ${BACKUP_DIR}\n`, colors.cyan);
  }

  // 压缩所有模型
  const results = [];
  for (const modelPath of MODELS_TO_COMPRESS) {
    const result = compressModel(modelPath);
    if (result) {
      results.push(result);
    }
  }

  // 显示总结
  if (results.length > 0) {
    log('\n' + '='.repeat(60), colors.bright);
    log('📊 压缩总结\n', colors.bright);

    let totalOriginal = 0;
    let totalCompressed = 0;

    results.forEach((result) => {
      totalOriginal += result.originalSize;
      totalCompressed += result.compressedSize;
      log(
        `  ${result.path}\n    ${formatBytes(result.originalSize)} → ${formatBytes(
          result.compressedSize
        )} (减少 ${result.reduction}%)`,
        colors.cyan
      );
    });

    const totalReduction = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);

    log('\n' + '-'.repeat(60), colors.bright);
    log(
      `  总计: ${formatBytes(totalOriginal)} → ${formatBytes(totalCompressed)}`,
      colors.green
    );
    log(`  总减少: ${totalReduction}%`, colors.green);
    log('='.repeat(60) + '\n', colors.bright);

    log('✅ 所有模型压缩完成!', colors.green);
    log(`📦 原始文件备份在: ${BACKUP_DIR}`, colors.cyan);
  } else {
    log('\n⚠️  没有成功压缩任何模型', colors.yellow);
  }
}

// 运行脚本
main();
