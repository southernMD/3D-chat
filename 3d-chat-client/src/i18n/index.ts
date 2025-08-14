import { createI18n } from 'vue-i18n'

// 中文翻译
const zh = {
  nav: {
    brand: 'NEXUS³',
    language: '语言',
    profile: '个人设置',
    logout: '退出登录'
  },
  home: {
    title: '在第三维度聊天',
    subtitle: 'NEXUS³',
    enterButton: '进入维度',
    description: '体验前所未有的沉浸式3D交流'
  },
  mode: {
    create: {
      title: '创建房间',
      description: '创建一个全新的3D聊天房间',
      feature1: '自定义房间设置',
      feature2: '邀请好友加入',
      feature3: '管理员权限',
      action: '立即创建'
    },
    join: {
      title: '加入房间',
      description: '通过Ping码加入现有房间',
      pingLabel: 'Ping码',
      pingPlaceholder: '请输入房间Ping码',
      feature1: '快速连接',
      feature2: '实时同步',
      action: '立即加入'
    }
  },
  auth: {
    login: {
      title: '登录',
      subtitle: '欢迎回来',
      loginField: '邮箱或用户名',
      loginFieldPlaceholder: '请输入邮箱或用户名',
      password: '密码',
      passwordPlaceholder: '请输入密码',
      loginButton: '登录',
      rememberMe: '记住我',
      forgotPassword: '忘记密码？',
      noAccount: '还没有账户？',
      registerLink: '立即注册',
      loginSuccess: '登录成功',
      loginFailed: '登录失败',
      resetPassword: '重置密码',
      resetPasswordPlaceholder: '请输入注册邮箱',
      sendResetEmail: '发送重置邮件'
    },
    register: {
      title: '注册',
      subtitle: '创建您的账户',
      email: '邮箱',
      emailPlaceholder: '请输入邮箱',
      username: '用户名',
      usernamePlaceholder: '请输入用户名',
      password: '密码',
      passwordPlaceholder: '请输入密码',
      confirmPassword: '确认密码',
      confirmPasswordPlaceholder: '请再次输入密码',
      verificationCode: '验证码',
      verificationCodePlaceholder: '请输入验证码',
      sendCode: '发送验证码',
      resendCode: '重新发送',
      registerButton: '注册',
      hasAccount: '已有账户？',
      loginLink: '立即登录',
      registerSuccess: '注册成功',
      registerFailed: '注册失败',
      agreement: '我已阅读并同意',
      termsOfService: '服务条款',
      privacyPolicy: '隐私政策',
      and: '和'
    },
    validation: {
      emailRequired: '请输入邮箱',
      emailInvalid: '请输入正确的邮箱格式',
      loginFieldRequired: '请输入邮箱或用户名',
      usernameRequired: '请输入用户名',
      usernameLength: '用户名长度为2-20位',
      usernameFormat: '用户名只能包含字母、数字、下划线和中文',
      passwordRequired: '请输入密码',
      passwordLength: '密码长度至少为8位',
      confirmPasswordRequired: '请确认密码',
      passwordMismatch: '两次输入的密码不一致',
      verificationCodeRequired: '请输入验证码',
      verificationCodeLength: '验证码为6位数字',
      verificationCodeFormat: '验证码必须为6位数字',
      agreementRequired: '请同意服务条款和隐私政策'
    },
    messages: {
      sendCodeSuccess: '验证码已发送',
      sendCodeFailed: '发送验证码失败',
      codeExpired: '验证码已过期',
      codeInvalid: '验证码无效',
      emailExists: '该邮箱已被注册',
      usernameExists: '该用户名已被使用',
      accountNotFound: '账号或密码错误',
      passwordIncorrect: '账号或密码错误',
      rateLimitExceeded: '操作过于频繁，请稍后再试',
      networkError: '网络错误，请检查网络连接',
      serverError: '服务器错误，请稍后再试'
    }
  },
  common: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认'
  },
  footer: {
    subtitle: '在第三维度聊天',
    product: '产品',
    features: '功能特性',
    pricing: '价格方案',
    demo: '演示',
    api: 'API接口',
    company: '公司',
    about: '关于我们',
    team: '团队',
    careers: '招聘',
    contact: '联系我们',
    resources: '资源',
    documentation: '文档',
    blog: '博客',
    support: '技术支持',
    community: '社区',
    connect: '联系我们',
    allRightsReserved: '版权所有。',
    privacy: '隐私政策',
    terms: '服务条款',
    cookies: 'Cookie政策',
    poweredBy: '技术支持'
  }
}

// 英文翻译
const en = {
  nav: {
    brand: 'NEXUS³',
    language: 'Language',
    profile: 'Profile',
    logout: 'Logout'
  },
  home: {
    title: 'Chat in the Third Dimension',
    subtitle: 'NEXUS³',
    enterButton: 'Enter the Dimension',
    description: 'Experience immersive 3D communication like never before'
  },
  mode: {
    create: {
      title: 'Create Room',
      description: 'Create a brand new 3D chat room',
      feature1: 'Custom room settings',
      feature2: 'Invite friends',
      feature3: 'Admin privileges',
      action: 'Create Now'
    },
    join: {
      title: 'Join Room',
      description: 'Join an existing room with Ping code',
      pingLabel: 'Ping Code',
      pingPlaceholder: 'Enter room Ping code',
      feature1: 'Quick connection',
      feature2: 'Real-time sync',
      action: 'Join Now'
    }
  },
  auth: {
    login: {
      title: 'Login',
      subtitle: 'Welcome back',
      loginField: 'Email or Username',
      loginFieldPlaceholder: 'Enter email or username',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      loginButton: 'Login',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      registerLink: 'Sign up now',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      resetPassword: 'Reset Password',
      resetPasswordPlaceholder: 'Enter your registered email',
      sendResetEmail: 'Send Reset Email'
    },
    register: {
      title: 'Register',
      subtitle: 'Create your account',
      email: 'Email',
      emailPlaceholder: 'Enter email',
      username: 'Username',
      usernamePlaceholder: 'Enter username',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Enter password again',
      verificationCode: 'Verification Code',
      verificationCodePlaceholder: 'Enter verification code',
      sendCode: 'Send Code',
      resendCode: 'Resend',
      registerButton: 'Register',
      hasAccount: 'Already have an account?',
      loginLink: 'Sign in now',
      registerSuccess: 'Registration successful',
      registerFailed: 'Registration failed',
      agreement: 'I have read and agree to the',
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      and: 'and'
    },
    validation: {
      emailRequired: 'Email is required',
      emailInvalid: 'Please enter a valid email',
      loginFieldRequired: 'Email or username is required',
      usernameRequired: 'Username is required',
      usernameLength: 'Username must be 2-20 characters',
      usernameFormat: 'Username can only contain letters, numbers, underscores and Chinese characters',
      passwordRequired: 'Password is required',
      passwordLength: 'Password must be at least 8 characters',
      confirmPasswordRequired: 'Please confirm password',
      passwordMismatch: 'Passwords do not match',
      verificationCodeRequired: 'Verification code is required',
      verificationCodeLength: 'Verification code must be 6 digits',
      verificationCodeFormat: 'Verification code must be 6 digits',
      agreementRequired: 'Please agree to the Terms of Service and Privacy Policy'
    },
    messages: {
      sendCodeSuccess: 'Verification code sent',
      sendCodeFailed: 'Failed to send verification code',
      codeExpired: 'Verification code expired',
      codeInvalid: 'Invalid verification code',
      emailExists: 'Email already registered',
      usernameExists: 'Username already taken',
      accountNotFound: 'Account or password incorrect',
      passwordIncorrect: 'Account or password incorrect',
      rateLimitExceeded: 'Too many requests, please try again later',
      networkError: 'Network error, please check your connection',
      serverError: 'Server error, please try again later'
    }
  },
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm'
  },
  footer: {
    subtitle: 'Chat in the Third Dimension',
    product: 'Product',
    features: 'Features',
    pricing: 'Pricing',
    demo: 'Demo',
    api: 'API',
    company: 'Company',
    about: 'About',
    team: 'Team',
    careers: 'Careers',
    contact: 'Contact',
    resources: 'Resources',
    documentation: 'Documentation',
    blog: 'Blog',
    support: 'Support',
    community: 'Community',
    connect: 'Connect',
    allRightsReserved: 'All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    cookies: 'Cookie Policy',
    poweredBy: 'Powered by'
  }
}

const messages = {
  zh,
  en
}

// 获取浏览器语言
const getDefaultLocale = () => {
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

// 创建i18n实例
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || getDefaultLocale(),
  fallbackLocale: 'en',
  messages
})

export default i18n
