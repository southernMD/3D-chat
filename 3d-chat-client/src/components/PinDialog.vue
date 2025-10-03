<template>
    <div v-if="visible" class="pin-dialog-overlay" @click.self="onCancel">
        <div class="pin-dialog">
            <div class="pin-dialog-header">
                <h3>{{ title }}</h3>
                <button class="close-btn" @click="onCancel">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path
                            d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                </button>
            </div>
            <div class="pin-dialog-content">
                <p>{{ message }}</p>
                <div class="pin-input-group">
                    <template v-if="inputType === 'password'">
                        <div class="password-input-wrapper">
                            <input v-model="localValue" :type="showPassword ? 'text' : 'password'" class="pin-input"
                                :placeholder="placeholder" :maxlength="maxlength" @keyup.enter="onConfirm"  />
                            <button type="button" class="password-toggle-btn" @click="togglePasswordVisibility"
                                :title="showPassword ? '隐藏密码' : '显示密码'" aria-label="toggle password visibility">
                                <svg v-if="showPassword" viewBox="0 0 24 24" width="20" height="20"
                                    fill="currentColor" aria-hidden="true">
                                    <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                                    <circle cx="12" cy="12" r="2.5" />
                                </svg>
                                <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor"
                                    aria-hidden="true">
                                    <path
                                        d="M2 5.27 3.28 4l16.97 16.97-1.27 1.27-2.3-2.3A13.05 13.05 0 0 1 12 19C5 19 1 12 1 12a21.65 21.65 0 0 1 5.18-6.33L2 5.27zM12 7c3.86 0 6.87 2.46 8.66 4.45-.45.5-1 1.06-1.66 1.64L16.1 10.3A4.99 4.99 0 0 0 12 7zm-3.9 3.08 1.54 1.54A3 3 0 0 0 12 15a3 3 0 0 0 2.38-1.22l1.54 1.54A5 5 0 0 1 7.1 10.08z" />
                                </svg>
                            </button>
                        </div>
                    </template>
                    <template v-else>
                        <input v-model="localValue" :type="inputType" class="pin-input" :placeholder="placeholder"
                            :maxlength="maxlength" @keyup.enter="onConfirm" autofocus />
                    </template>
                </div>
                <div v-if="error" class="pin-error">{{ error }}</div>
                <div class="pin-dialog-buttons">
                    <button class="pin-btn cancel-btn" @click="onCancel">{{ cancelText }}</button>
                    <button class="pin-btn confirm-btn" @click="onConfirm" :disabled="!localValue.trim()">{{ confirmText
                        }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs } from 'vue'

interface Props {
    modelValue: boolean
    title?: string
    message?: string
    placeholder?: string
    confirmText?: string
    cancelText?: string
    inputType?: string
    maxlength?: number
    error?: string
}

const props = withDefaults(defineProps<Props>(), {
    title: '输入PIN码',
    message: '请输入房间的PIN码：',
    placeholder: '请输入PIN码',
    confirmText: '确认',
    cancelText: '取消',
    inputType: 'password',
    maxlength: 10,
    error: ''
})

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'confirm', value: string): void
    (e: 'cancel'): void
}>()

const { modelValue } = toRefs(props)
const visible = ref<boolean>(modelValue.value)
const localValue = ref('')
const showPassword = ref(false)

watch(modelValue, (v) => (visible.value = v))
watch(visible, (v) => emit('update:modelValue', v))

const onCancel = () => {
    visible.value = false
    localValue.value = ''
    showPassword.value = false
    emit('cancel')
}

const onConfirm = () => {
    if (!localValue.value.trim()) return
    const value = localValue.value.trim()
    visible.value = false
    emit('confirm', value)
    localValue.value = ''
}

const togglePasswordVisibility = () => {
    showPassword.value = !showPassword.value
}
</script>

<style scoped lang="less">
.pin-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
}

.pin-dialog {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0a0a0a 100%);
    border: 2px solid rgba(255, 0, 255, 0.3);
    border-radius: 20px;
    padding: 0;
    min-width: 400px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(255, 0, 255, 0.3);
    backdrop-filter: blur(10px);
    animation: pinDialogShow 0.3s ease;
}

@keyframes pinDialogShow {
    from {
        opacity: 0;
        transform: scale(0.8) translateY(-20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.pin-dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 25px 30px 20px;
    border-bottom: 1px solid rgba(255, 0, 255, 0.2);

    h3 {
        color: #ff00ff;
        font-size: 1.4rem;
        margin: 0;
        font-weight: 600;
    }
}

.close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: all 0.3s ease;

    svg {
        width: 20px;
        height: 20px;
    }

    &:hover {
        color: #ff00ff;
        background: rgba(255, 0, 255, 0.1);
    }
}

.pin-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 25px 30px 30px;
}

.pin-input-group {
    margin-bottom: 15px;
}

.pin-input {
    width: 100%;
    padding: 15px 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 0, 255, 0.3);
    border-radius: 12px;
    color: #ffffff;
    font-size: 1.1rem;
    text-align: center;
    letter-spacing: 2px;
    transition: all 0.3s ease;

    &::placeholder {
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: normal;
    }

    &:focus {
        outline: none;
        border-color: #ff00ff;
        box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
        background: rgba(255, 255, 255, 0.15);
    }
}

.password-input-wrapper {
    position: relative;
}

.password-toggle-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.password-toggle-btn:hover {
    color: #ff00ff;
    background: rgba(255, 0, 255, 0.1);
}

.pin-error {
    color: #ff4444;
    font-size: 0.9rem;
    margin-bottom: 15px;
    text-align: center;
    padding: 8px;
    background: rgba(255, 68, 68, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(255, 68, 68, 0.3);
}

.pin-dialog-buttons {
    display: flex;
    gap: 15px;
    justify-content: flex-end;
}

.pin-btn {
    padding: 12px 25px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.cancel-btn {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);

    &:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
    }
}

.confirm-btn {
    background: linear-gradient(45deg, #ff00ff, #ff6bff);
    color: #ffffff;

    &:hover:not(:disabled) {
        background: linear-gradient(45deg, #ff6bff, #ff00ff);
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(255, 0, 255, 0.4);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

@media (max-width: 768px) {
    .pin-dialog {
        min-width: 320px;
        margin: 20px;
    }

    .pin-dialog-header,
    .pin-dialog-content {
        padding-left: 20px;
        padding-right: 20px;
    }

    .pin-dialog-buttons {
        flex-direction: column;

        .pin-btn {
            width: 100%;
        }
    }
}

input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear {
  display: none;
}

input[type="password"]::-webkit-credentials-auto-fill-button,
input[type="password"]::-webkit-clear-button {
  display: none !important;
}

input[type="password"]::-moz-password-toggle {
  display: none !important;
}
</style>
