# 使用Node.js 22
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和yarn.lock
COPY package.json yarn.lock ./

RUN npm i yarn -g

# 安装依赖
RUN yarn install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN yarn build

# 安装nginx
RUN apk add --no-cache nginx

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制构建文件到nginx目录
RUN cp -r dist/* /var/www/html/

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
