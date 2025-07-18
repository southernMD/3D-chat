# 3D聊天 WebRTC演示

这是一个使用 Vite 和 TypeScript 构建的 WebRTC 聊天应用程序，利用 mediasoup-client 实现数据通道通信。

## 功能

- 创建或加入房间
- 自动建立 WebRTC 数据通道连接
- 向房间内的其他成员发送文本消息
- 查看房间成员和连接状态

## 技术栈

- Vite - 现代前端构建工具
- TypeScript - 带类型的 JavaScript
- mediasoup-client - WebRTC 库
- Socket.IO - 实时通信库

## 开发环境搭建

### 前提条件

- Node.js 18+ 和 npm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 使用方法

1. 打开应用程序
2. 输入您的用户名
3. 输入现有房间ID加入，或留空创建新房间
4. 连接建立后，可以在消息框中输入文本并发送
5. 其他用户加入同一房间后，您发送的消息将自动显示在他们的界面上

## 与后端服务器连接

此应用程序需要配合 3D-chat 服务端一起使用。确保服务器已启动并正确配置。 