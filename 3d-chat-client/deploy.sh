#!/bin/bash

# 简单的Docker部署脚本

echo "🚀 开始部署3D Chat Client..."

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，从env.example复制..."
    cp env.example .env
    echo "✅ 请编辑.env文件中的配置"
fi

# 构建并启动
echo "📦 构建Docker镜像..."
docker-compose build

echo "🚀 启动服务..."
docker-compose up -d

echo "✅ 部署完成！"
echo "🌐 访问地址: http://localhost:3001"
echo "📋 查看日志: docker-compose logs -f"
echo "🛑 停止服务: docker-compose down"
