/// <reference types="vite/client" />

interface ImportMetaEnv {
  
  // API配置
  readonly VITE_API_URL: string
  
  // WebSocket配置
  readonly VITE_WS_PROTOCOL?: string
  readonly VITE_WS_HOST?: string
  readonly VITE_WS_PORT?: string
  
  
  // 应用信息
  readonly VITE_APP_TITLE?: string
  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
