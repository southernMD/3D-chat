# 国际化功能说明

## 功能概述

已为3D Chat应用添加了完整的国际化支持，包括：

- 顶部导航栏（TopBar）
- 中英文语言切换
- 响应式设计
- 本地存储语言偏好

## 新增组件

### TopBar 组件
- 位置：`src/components/TopBar.vue`
- 功能：
  - 左侧显示 "NEXUS³" 品牌标志
  - 右侧语言选择器
  - 支持中文/英文切换
  - 响应式设计

### 国际化配置
- 位置：`src/i18n/index.ts`
- 支持语言：
  - 中文 (zh)
  - 英文 (en)
- 自动检测浏览器语言
- 本地存储用户选择

## 翻译内容

### 中文翻译
- 标题：在第三维度聊天
- 副标题：NEXUS³
- 按钮：进入维度
- 描述：体验前所未有的沉浸式3D交流

### 英文翻译
- 标题：Chat in the Third Dimension
- 副标题：NEXUS³
- 按钮：Enter the Dimension
- 描述：Experience immersive 3D communication like never before

## 技术实现

### 依赖
- vue-i18n@11.1.11
- TypeScript 支持

### 主要文件
1. `src/i18n/index.ts` - 国际化配置
2. `src/components/TopBar.vue` - 顶部导航栏
3. `src/types/i18n.d.ts` - TypeScript 类型定义
4. `src/view/home.vue` - 更新使用 i18n
5. `src/main.ts` - 注册 i18n 插件

### 响应式设计
- 桌面端：完整显示所有元素
- 平板端：隐藏语言文字，只显示图标
- 手机端：调整尺寸和间距

## 使用方法

### 在组件中使用翻译
```vue
<template>
  <div>{{ $t('home.title') }}</div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const title = t('home.title')
</script>
```

### 添加新翻译
在 `src/i18n/index.ts` 中添加：
```typescript
const zh = {
  // 添加中文翻译
  newSection: {
    newKey: '新的翻译'
  }
}

const en = {
  // 添加英文翻译
  newSection: {
    newKey: 'New Translation'
  }
}
```

## 特性

1. **自动语言检测**：根据浏览器语言自动选择
2. **持久化存储**：用户选择保存在 localStorage
3. **实时切换**：无需刷新页面
4. **类型安全**：完整的 TypeScript 支持
5. **响应式设计**：适配各种屏幕尺寸
6. **优雅动画**：平滑的过渡效果

## 样式特点

- 半透明背景与毛玻璃效果
- 青色主题配色
- 渐变文字动画
- 悬停交互效果
- 移动端优化
