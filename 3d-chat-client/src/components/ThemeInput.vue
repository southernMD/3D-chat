<template>
  <div class="theme-input-wrapper">
    <el-input
      v-if="type !== 'textarea'"
      v-model="inputValue"
      :type="type"
      class="theme-input"
      v-bind="$attrs"
      @input="handleInput"
      @change="handleChange"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <el-input
      v-else
      v-model="inputValue"
      type="textarea"
      class="theme-textarea"
      v-bind="$attrs"
      @input="handleInput"
      @change="handleChange"
      @focus="handleFocus"
      @blur="handleBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// Props
interface Props {
  modelValue?: string | number
  type?: 'text' | 'password' | 'email' | 'number' | 'textarea'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text'
})

// 禁用属性继承到根元素
defineOptions({
  inheritAttrs: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'input': [value: string | number]
  'change': [value: string | number]
  'focus': [event: FocusEvent]
  'blur': [event: FocusEvent]
}>()

// 内部值
const inputValue = ref(props.modelValue || '')

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue || ''
})

// 监听内部值变化
watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue)
})

// 事件处理
const handleInput = (value: string | number) => {
  emit('input', value)
}

const handleChange = (value: string | number) => {
  emit('change', value)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}
</script>

<style scoped lang="less">
.theme-input-wrapper {
  width: 100%;
}

.theme-input,
.theme-textarea {
  width: 100%;
  
  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(0, 255, 255, 0.3);
    border-radius: 10px;
    box-shadow: none;
    transition: all 0.3s ease;
    padding: 15px;
    
    &:hover {
      border-color: rgba(0, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.15);
    }
    
    &.is-focus {
      border-color: #00ffff;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.15);
    }
  }
  
  :deep(.el-input__inner) {
    color: #ffffff;
    font-size: 1rem;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
  }
  
  :deep(.el-input__prefix),
  :deep(.el-input__suffix) {
    color: rgba(0, 255, 255, 0.7);
  }
  
  :deep(.el-input__prefix-inner),
  :deep(.el-input__suffix-inner) {
    color: rgba(0, 255, 255, 0.7);
  }
  
  :deep(.el-input__clear),
  :deep(.el-input__password) {
    color: rgba(0, 255, 255, 0.7);
    
    &:hover {
      color: #00ffff;
    }
  }
}

// Textarea特殊样式
.theme-textarea {
  :deep(.el-textarea__inner) {
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(0, 255, 255, 0.3);
    border-radius: 10px;
    color: #ffffff;
    font-size: 1rem;
    padding: 15px;
    transition: all 0.3s ease;
    resize: vertical;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
    
    &:hover {
      border-color: rgba(0, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.15);
    }
    
    &:focus {
      border-color: #00ffff;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.15);
      outline: none;
    }
  }
  
  :deep(.el-input__count) {
    color: rgba(255, 255, 255, 0.6);
    background: transparent;
  }
}

// 尺寸变体
.theme-input {
  &.el-input--large {
    :deep(.el-input__wrapper) {
      padding: 18px;
      font-size: 1.1rem;
    }
  }
  
  &.el-input--small {
    :deep(.el-input__wrapper) {
      padding: 10px 12px;
      font-size: 0.9rem;
    }
  }
}

// 禁用状态
.theme-input.is-disabled,
.theme-textarea.is-disabled {
  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    cursor: not-allowed;
    
    .el-input__inner {
      color: rgba(255, 255, 255, 0.3);
      cursor: not-allowed;
    }
  }
}

// 错误状态
.theme-input.is-error,
.theme-textarea.is-error {
  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    border-color: #ff4757;
    
    &:hover,
    &.is-focus,
    &:focus {
      border-color: #ff4757;
      box-shadow: 0 0 15px rgba(255, 71, 87, 0.3);
    }
  }
}

// 成功状态
.theme-input.is-success,
.theme-textarea.is-success {
  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    border-color: #2ed573;
    
    &:hover,
    &.is-focus,
    &:focus {
      border-color: #2ed573;
      box-shadow: 0 0 15px rgba(46, 213, 115, 0.3);
    }
  }
}
</style>
