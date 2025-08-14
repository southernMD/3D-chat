<template>
  <div class="theme-select-wrapper">
    <el-select
      v-model="selectedValue"
      class="theme-select"
      popper-class="theme-select-dropdown"
      v-bind="$attrs"
      filterable
      @change="handleChange"
    >
      <el-option
        v-for="option in options"
        :key="option.value"
        :label="option.label"
        :value="option.value"
        :disabled="option.disabled || false"
        class="theme-option"
      >
        <slot name="option" :option="option">
          <div class="option-content">
            <span v-if="option.icon" class="option-icon">{{ option.icon }}</span>
            <span class="option-label">{{ option.label }}</span>
            <span v-if="option.description" class="option-description">{{ option.description }}</span>
          </div>
        </slot>
      </el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 选项接口
export interface SelectOption {
  label: string
  value: string | number
  icon?: string
  description?: string
  disabled?: boolean
}

// Props
interface Props {
  modelValue?: string | number
  options: SelectOption[]
}

const props = defineProps<Props>()

// 禁用属性继承到根元素
defineOptions({
  inheritAttrs: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined]
  'change': [value: string | number | undefined]
}>()

// 内部值
const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 处理变化事件
const handleChange = (value: string | number | undefined) => {
  emit('change', value)
}
</script>

<style scoped lang="less">
.theme-select-wrapper {
  width: 100%;
}

.theme-select {
  width: 100%;
  
  :deep(.el-select__wrapper) {
    background: rgba(255, 255, 255, 0.1) !important;
    border: 2px solid rgba(0, 255, 255, 0.3) !important;
    border-radius: 10px !important;
    box-shadow: none !important;
    transition: all 0.3s ease !important;
    padding: 12px 15px !important;
    min-height: 48px !important;
    position: relative !important;

    &:hover {
      border-color: rgba(0, 255, 255, 0.5) !important;
      background: rgba(255, 255, 255, 0.15) !important;
    }

    &.is-focused {
      border-color: #00ffff !important;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.3) !important;
      background: rgba(255, 255, 255, 0.15) !important;
    }
  }
  
  :deep(.el-select__placeholder) {
    color: rgba(255, 255, 255, 0.5) !important;
  }

  :deep(.el-select__selected-item) {
    color: #ffffff !important;
  }

  :deep(.el-select__caret) {
    color: rgba(0, 255, 255, 0.7) !important;

    &.is-reverse {
      color: #00ffff !important;
    }
  }

  :deep(.el-select__input) {
    color: #ffffff !important;
    background: transparent !important;
    border: none !important;
    outline: none !important;

    &::placeholder {
      color: rgba(255, 255, 255, 0.5) !important;
    }
  }

  :deep(.el-input) {
    flex: 1 !important;

    .el-input__wrapper {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      height: auto !important;
    }

    .el-input__inner {
      color: #ffffff !important;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      padding: 0 !important;
      height: auto !important;
      line-height: 1.5 !important;

      &::placeholder {
        color: rgba(255, 255, 255, 0.5) !important;
      }
    }
  }

  // 修复filterable模式下的显示问题
  :deep(.el-select__selection) {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    align-items: center !important;
  }

  // 在非filterable状态下显示选中项
  &:not(.is-focused) {
    :deep(.el-select__selected-item) {
      display: block !important;
      color: #ffffff !important;
      width: 100% !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    :deep(.el-input) {
      opacity: 0 !important;
      position: absolute !important;
      pointer-events: none !important;
    }
  }

  // 在filterable状态下隐藏选中项，显示输入框
  &.is-focused {
    :deep(.el-select__selected-item) {
      opacity: 0 !important;
      position: absolute !important;
      pointer-events: none !important;
    }

    :deep(.el-input) {
      opacity: 1 !important;
      position: relative !important;
      pointer-events: auto !important;
    }
  }
}

// 下拉框选项样式
:global(.theme-select-dropdown) {
  background: rgba(20, 20, 40, 0.95) !important;
  border: 1px solid rgba(0, 255, 255, 0.3) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(10px) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}

:global(.theme-select-dropdown .el-select-dropdown__item) {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.8) !important;
  padding: 8px 16px !important;
  transition: all 0.3s ease !important;
  min-height: 44px !important;
  display: flex !important;
  align-items: center !important;
}

:global(.theme-select-dropdown .el-select-dropdown__item:hover) {
  background: rgba(0, 255, 255, 0.1) !important;
  color: #00ffff !important;
}

:global(.theme-select-dropdown .el-select-dropdown__item.is-selected) {
  background: rgba(0, 255, 255, 0.2) !important;
  color: #00ffff !important;
  font-weight: 600 !important;
}

:global(.theme-select-dropdown .el-select-dropdown__item.is-disabled) {
  color: rgba(255, 255, 255, 0.3) !important;
  cursor: not-allowed !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

:global(.theme-select-dropdown .el-select-dropdown__empty) {
  color: rgba(255, 255, 255, 0.5) !important;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 4px 0;
}

.option-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.option-label {
  flex: 1;
  font-weight: 500;
  color: inherit;
}

.option-description {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
  margin-left: auto;
}

// 尺寸变体
.theme-select {
  &.el-select--large {
    :deep(.el-select__wrapper) {
      padding: 15px;
      font-size: 1.1rem;
    }
  }
  
  &.el-select--small {
    :deep(.el-select__wrapper) {
      padding: 8px 12px;
      font-size: 0.9rem;
    }
  }
}

// 禁用状态
.theme-select.is-disabled {
  :deep(.el-select__wrapper) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    cursor: not-allowed;
    
    .el-select__placeholder,
    .el-select__selected-item {
      color: rgba(255, 255, 255, 0.3);
    }
  }
}
</style>
