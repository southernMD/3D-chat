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
  createRoom: {
    tabs: {
      map: '地图选择',
      room: '房间设置',
      other: '其他设置'
    },
    map: {
      title: '选择地图环境',
      addMap: '添加地图',
      addMapDescription: '自定义地图环境',
      notSupported: '暂不支持',
      notSupportedDescription: '自定义地图功能正在开发中，敬请期待！',
      spaceStation: '太空站',
      spaceStationDescription: '未来科技风格的太空站环境，体验星际探索的奇妙之旅。高科技设施和宇宙景观为您的聊天增添科幻色彩。',
      spaceStationFeature1: '零重力体验',
      spaceStationFeature2: '星际景观',
      spaceStationFeature3: '科技设施',
      forestCabin: '森林小屋',
      forestCabinDescription: '自然清新的森林环境，享受大自然的宁静与美好。鸟语花香、绿树成荫，是放松心情的理想场所。',
      forestCabinFeature1: '自然音效',
      forestCabinFeature2: '清新空气',
      forestCabinFeature3: '动物伙伴',
      cityRooftop: '城市天台',
      cityRooftopDescription: '现代都市风格的城市环境，感受繁华都市的活力与节奏。高楼大厦、霓虹灯光营造现代感。',
      cityRooftopFeature1: '都市景观',
      cityRooftopFeature2: '霓虹灯光'
    },
    room: {
      title: '房间基本设置',
      name: '房间名称',
      namePlaceholder: '请输入房间名称',
      description: '房间描述',
      descriptionPlaceholder: '请输入房间描述（可选）',
      maxUsers: '最大用户数',
      selectMaxUsers: '选择最大用户数',
      users: '人',
      mode: '房间模式',
      selectMode: '选择房间模式',
      storyMode: '故事模式',
      storyModeDescription: '单人沉浸式体验',
      chatMode: '聊天模式',
      chatModeDescription: '多人互动聊天',
      privacy: '隐私设置',
      public: '公开房间',
      publicDescription: '任何人都可以搜索和加入',
      private: '私密房间',
      privateDescription: '仅限邀请用户加入'
    },
    other: {
      title: '功能设置',
      enableVoice: '启用语音聊天',
      enableText: '启用文本聊天'
    },
    info: {
      title: '功能说明',
      roomTitle: '房间配置说明',
      featureTitle: '功能设置说明',
      roomFeature1: {
        title: '房间模式',
        description: '选择故事模式进行单人体验，或聊天模式进行多人互动'
      },
      roomFeature2: {
        title: '用户管理',
        description: '设置房间最大用户数和隐私级别，控制访问权限'
      },
      featureFeature1: {
        title: '语音聊天',
        description: '启用实时语音通话，与朋友进行自然的语音交流'
      },
      featureFeature2: {
        title: '文本聊天',
        description: '启用文字消息功能，支持表情和文本交流'
      }
    },
    createButton: '创建房间',
    validation: {
      incomplete: '请完善房间信息'
    },
    success: '房间创建成功！',
    error: '房间创建失败，请重试'
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
  createRoom: {
    tabs: {
      map: 'Map Selection',
      room: 'Room Settings',
      other: 'Other Settings'
    },
    map: {
      title: 'Choose Map Environment',
      addMap: 'Add Map',
      addMapDescription: 'Custom map environment',
      notSupported: 'Not Supported',
      notSupportedDescription: 'Custom map feature is under development, stay tuned!',
      spaceStation: 'Space Station',
      spaceStationDescription: 'Futuristic space station environment, experience the wonder of interstellar exploration. High-tech facilities and cosmic views add sci-fi flair to your chat.',
      spaceStationFeature1: 'Zero Gravity Experience',
      spaceStationFeature2: 'Stellar Views',
      spaceStationFeature3: 'Tech Facilities',
      forestCabin: 'Forest Cabin',
      forestCabinDescription: 'Fresh and natural forest environment, enjoy the tranquility and beauty of nature. Birds singing and trees flourishing, an ideal place to relax.',
      forestCabinFeature1: 'Natural Sounds',
      forestCabinFeature2: 'Fresh Air',
      forestCabinFeature3: 'Animal Friends',
      cityRooftop: 'City Rooftop',
      cityRooftopDescription: 'Modern urban city environment, feel the vitality and rhythm of the bustling city. Skyscrapers and neon lights create a modern atmosphere.',
      cityRooftopFeature1: 'Urban Views',
      cityRooftopFeature2: 'Neon Lights'
    },
    room: {
      title: 'Basic Room Settings',
      name: 'Room Name',
      namePlaceholder: 'Enter room name',
      description: 'Room Description',
      descriptionPlaceholder: 'Enter room description (optional)',
      maxUsers: 'Max Users',
      selectMaxUsers: 'Select max users',
      users: 'users',
      mode: 'Room Mode',
      selectMode: 'Select room mode',
      storyMode: 'Story Mode',
      storyModeDescription: 'Single-player immersive experience',
      chatMode: 'Chat Mode',
      chatModeDescription: 'Multi-player interactive chat',
      privacy: 'Privacy Settings',
      public: 'Public Room',
      publicDescription: 'Anyone can search and join',
      private: 'Private Room',
      privateDescription: 'Invite-only access'
    },
    other: {
      title: 'Feature Settings',
      enableVoice: 'Enable Voice Chat',
      enableText: 'Enable Text Chat'
    },
    info: {
      title: 'Features',
      roomTitle: 'Room Configuration Guide',
      featureTitle: 'Feature Settings Guide',
      roomFeature1: {
        title: 'Room Mode',
        description: 'Choose story mode for single-player experience, or chat mode for multi-player interaction'
      },
      roomFeature2: {
        title: 'User Management',
        description: 'Set maximum users and privacy level to control access permissions'
      },
      featureFeature1: {
        title: 'Voice Chat',
        description: 'Enable real-time voice calls for natural voice communication with friends'
      },
      featureFeature2: {
        title: 'Text Chat',
        description: 'Enable text messaging with emoji and text communication support'
      }
    },
    createButton: 'Create Room',
    validation: {
      incomplete: 'Please complete room information'
    },
    success: 'Room created successfully!',
    error: 'Failed to create room, please try again'
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
