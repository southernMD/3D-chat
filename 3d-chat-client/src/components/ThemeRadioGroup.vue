<template>
  <div class="theme-radio-group">
    <el-radio-group
      v-model="selectedValue"
      :class="['theme-radio-group-inner', direction]"
      v-bind="$attrs"
      @change="handleChange"
    >
      <el-radio
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
        class="theme-radio-option"
      >
        <slot :option="option" :index="options.indexOf(option)" :direction="direction">
          <div :class="['radio-content', direction]">
            <span v-if="option.icon" class="radio-icon">{{ option.icon }}</span>
            <div class="radio-text">
              <span class="radio-label">{{ option.label }}</span>
              <span v-if="option.description" class="radio-description">{{ option.description }}</span>
            </div>
          </div>
        </slot>
      </el-radio>
    </el-radio-group>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// 选项接口
export interface RadioOption {
  label: string
  value: string | number | boolean
  icon?: string
  description?: string
  disabled?: boolean
}

// Props
interface Props {
  modelValue?: string | number | boolean
  options: RadioOption[]
  direction?: 'horizontal' | 'vertical'
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'vertical'
})

// 禁用属性继承到根元素
defineOptions({
  inheritAttrs: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean]
  'change': [value: string | number | boolean]
}>()

// 内部值
const selectedValue = ref(props.modelValue)

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue
})

// 监听内部值变化
watch(selectedValue, (newValue) => {
  emit('update:modelValue', newValue!)
})

// 处理变化事件
const handleChange = (value: string | number | boolean) => {
  emit('change', value)
}
</script>

<style scoped lang="less">
.theme-radio-group {
  width: 100%;
}

.theme-radio-group-inner {
  width: 100%;
  display: flex;
  gap: 12px;

  :deep(.el-radio) {
    margin-right: 0;
    margin-bottom: 0;
  }

  // 纵向排列（默认）
  &.vertical {
    flex-direction: column;

    :deep(.el-radio) {
      width: 100%;
    }
  }

  // 横向排列
  &.horizontal {
    flex-direction: row;
    flex-wrap: wrap;

    :deep(.el-radio) {
      flex: 1;
      min-width: 200px;
    }
  }
}

.theme-radio-option {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 2px solid rgba(0, 255, 255, 0.2) !important;
  border-radius: 12px !important;
  padding: 16px !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;

  &:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(0, 255, 255, 0.4) !important;
  }
  
  :deep(.el-radio__input) {
    margin-right: 0 !important;

    .el-radio__inner {
      background: transparent !important;
      border: 2px solid rgba(0, 255, 255, 0.5) !important;
      width: 18px !important;
      height: 18px !important;

      &:hover {
        border-color: #00ffff !important;
      }

      &::after {
        background: #00ffff !important;
        width: 8px !important;
        height: 8px !important;
      }
    }

    &.is-checked {
      .el-radio__inner {
        background: rgba(0, 255, 255, 0.2) !important;
        border-color: #00ffff !important;
      }
    }
  }
  
  :deep(.el-radio__label) {
    color: transparent !important;
    padding-left: 0 !important;
    width: 0 !important;
    margin-left: 0 !important;
  }
  
  &.is-checked {
    background: rgba(0, 255, 255, 0.1) !important;
    border-color: #00ffff !important;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.2) !important;
  }
  
  &.is-disabled {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.1);
    cursor: not-allowed;
    
    .radio-content {
      opacity: 0.5;
    }
    
    :deep(.el-radio__input) {
      .el-radio__inner {
        border-color: rgba(255, 255, 255, 0.2);
        
        &::after {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }
}

.radio-content {
  display: flex;
  gap: 12px;
  flex: 1;

  // 纵向排列时：图标和文本横向排列
  &.vertical {
    flex-direction: row;
    align-items: flex-start;
  }

  // 横向排列时：图标和文本横向排列
  &.horizontal {
    flex-direction: row;
    align-items: center;
  }
}

.radio-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.radio-text {
  flex: 1;
  display: flex;
  gap: 4px;

  // 在纵向排列的radio中，文本纵向排列（标签在上，描述在下）
  .vertical & {
    flex-direction: column;
    align-items: flex-start;
  }

  // 在横向排列的radio中，文本横向排列（标签在左，描述在右）
  .horizontal & {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    text-align: left;
  }
}

.radio-label {
  color: #ffffff;
  font-weight: 600;
  font-size: 1rem;
}

.radio-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  line-height: 1.4;
}

// 水平布局变体
.theme-radio-group.horizontal {
  .theme-radio-group-inner {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .theme-radio-option {
    flex: 1;
    min-width: 200px;
  }
}

// 紧凑布局变体
.theme-radio-group.compact {
  .theme-radio-option {
    padding: 12px;
  }
  
  .radio-content {
    margin-left: 24px;
  }
  
  .radio-icon {
    font-size: 1.2rem;
  }
  
  .radio-label {
    font-size: 0.9rem;
  }
  
  .radio-description {
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  .theme-radio-group.horizontal {
    .theme-radio-group-inner {
      flex-direction: column;
    }
  }
  
  .theme-radio-option {
    padding: 12px;
  }
  
  .radio-content {
    margin-left: 24px;
  }
}
</style>
