# 3D Chat Client - Vue.js Frontend

一个具有GSAP官网风格动画效果的Vue.js前端应用，展示"Chat in the Third Dimension"和"NEXUS³"。

## 功能特性

### 🎨 视觉效果
- **GSAP动画**: 采用与GSAP官网相似的动画风格
- **3D效果**: 立体文字、悬浮动画、3D变换
- **粒子背景**: 动态粒子系统，支持鼠标交互
- **渐变文字**: 多彩渐变文字效果，动态颜色变化
- **响应式设计**: 适配各种屏幕尺寸

### ⚡ 动画特效
- **文字入场动画**: 单词逐个3D翻转入场
- **悬浮效果**: 持续的Y轴悬浮动画
- **鼠标视差**: 鼠标移动触发的视差效果
- **按钮交互**: 悬停、点击的动态反馈
- **背景几何**: 浮动的几何图形背景元素

### 🎯 技术栈
- **Vue 3**: Composition API + `<script setup>`
- **TypeScript**: 类型安全开发
- **GSAP**: 高性能动画库
- **Less**: CSS预处理器
- **Vite**: 快速构建工具

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 构建生产版本
```bash
npm run build
```

## 项目结构

```
src/
├── components/
│   └── ParticleBackground.vue    # 粒子背景组件
├── view/
│   └── home.vue                  # 主页组件（GSAP动画）
├── router/
│   └── index.ts                  # 路由配置
├── assets/
│   └── base.css                  # 全局样式
└── App.vue                       # 根组件
```

## 动画实现详解

### 主标题 "Chat in the Third Dimension"
- 容器淡入 + 缩放动画
- 单词逐个3D翻转入场效果
- 持续的Y轴悬浮动画
- 鼠标移动视差效果
- 渐变色彩动画

### 副标题 "NEXUS³"
- 弹性入场效果 (`elastic.out`)
- 装饰线条动画
- 同步悬浮动画
- 发光文字效果

### 进入按钮
- 延迟入场动画 (`back.out`)
- 悬停缩放效果
- 发光效果变化
- 点击反馈动画
- 光线扫过效果

### 背景效果
- Canvas粒子系统
- 几何图形浮动
- 鼠标交互响应
- 粒子连线效果

## 性能优化

### GPU加速
- 使用`transform3d`触发硬件加速
- `will-change`属性优化
- `backface-visibility: hidden`

### 动画优化
- GSAP高性能动画引擎
- 避免布局重排的属性
- 合理的缓动函数选择

## 自定义配置

### 修改动画参数
在`home.vue`的动画函数中调整：
```javascript
// 修改动画持续时间
duration: 1.2

// 修改缓动函数
ease: "power3.out"

// 修改延迟时间
delay: 0.5
```

### 修改视觉效果
在CSS中调整渐变和颜色：
```css
background: linear-gradient(135deg, #00ffff, #ff00ff);
```

### 修改粒子效果
在`ParticleBackground.vue`中调整参数：
```javascript
// 粒子数量
const particleCount = 100

// 连线距离
if (distance < 100)
```

## 浏览器兼容性

- Chrome 60+ ✅
- Firefox 55+ ✅
- Safari 12+ ✅
- Edge 79+ ✅

## 开发指南

### 添加新动画
1. 在`onMounted`中初始化动画
2. 使用GSAP时间线管理复杂动画序列
3. 注意动画性能和内存清理

### 响应式适配
1. 使用`clamp()`实现流体字体
2. 媒体查询适配移动端
3. 触摸设备交互优化

## 部署

### 静态部署
```bash
npm run build
# 将dist目录部署到静态服务器
```

### 预览构建结果
```bash
npm run preview
```

## 技术文档

- [Vue 3 文档](https://vuejs.org/)
- [GSAP 文档](https://gsap.com/docs/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vite 文档](https://vitejs.dev/)

## 许可证

MIT License
