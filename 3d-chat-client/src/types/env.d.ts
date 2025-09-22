/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 服务器配置
  readonly VITE_APP_HOST: string
  readonly VITE_APP_HOST_PORT: string
  
  // API配置
  readonly VITE_API_URL: string
  
  // 前端URL
  readonly VITE_FRONTEND_URL: string
  
  // WebSocket配置
  readonly VITE_WS_PROTOCOL?: string
  readonly VITE_WS_HOST?: string
  readonly VITE_WS_PORT?: string
  
  // 调试配置
  readonly VITE_DEBUG?: string
  
  // 应用信息
  readonly VITE_APP_TITLE?: string
  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
