# 使用官方 Node.js 镜像
FROM node:22

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package.json package-lock.json ./

# 安装依赖（包括 devDependencies，因为需要编译）
RUN npm install

# 复制所有源代码（排除 .dockerignore 里的内容）
COPY . .

# 复制并重命名环境变量文件（如果你用.env）
COPY .env .env

# 编译 TypeScript
RUN npm run build

# 暴露端口（请根据实际端口修改）
EXPOSE 3000

# 启动服务（假设编译后入口为 dist/app.js，按实际情况修改）
CMD ["node", "dist/app.js"]