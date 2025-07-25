export interface MessageSchema {
  nav: {
    brand: string
    language: string
  }
  home: {
    title: string
    subtitle: string
    enterButton: string
    description: string
  }
  common: {
    loading: string
    error: string
    success: string
    cancel: string
    confirm: string
  }
}

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
}
