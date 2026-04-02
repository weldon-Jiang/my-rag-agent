/**
 * 常量配置文件
 * @description 定义系统级常量，包括路径、默认值、限制等
 * @module config/constants
 */

module.exports = {
  // 知识库目录
  KNOWLEDGE_DIR: 'knowledge',

  // 数据目录
  DATA_DIR: 'data',

  // 模型配置文件路径
  MODELS_FILE: 'data/models.json',

  // 会话配置文件路径
  SESSIONS_FILE: 'data/sessions.json',

  // 默认端口
  DEFAULT_PORT: 3000,

  // 文件上传限制
  FILE_UPLOAD: {
    MAX_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'video/mp4',
      'video/avi',
      'video/mov'
    ]
  },

  // 支持的文件类型
  SUPPORTED_FILE_TYPES: {
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
    PDF: ['.pdf'],
    VIDEO: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'],
    TEXT: ['.txt', '.md', '.json', '.xml', '.csv']
  },

  // 聊天配置
  CHAT: {
    MAX_HISTORY: 100,           // 最大历史消息数
    MAX_CONTEXT_MESSAGES: 10,   // 最大上下文消息数
    DEFAULT_TEMPERATURE: 0.7    // 默认温度参数
  },

  // 工具执行超时（毫秒）
  TOOL_TIMEOUT: 30000,

  // 日志级别
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // 系统预设意图
  SYSTEM_INTENTS: ['ask_name', 'rename_bot', 'rename_user', 'set_relationship'],

  // 默认系统提示
  DEFAULT_SYSTEM_PROMPT: `你是一个智能助手，名称为小通。

称呼方式：使用"您"称呼，保持恭敬、专业的语气。`,

  // 工具类别
  TOOL_CATEGORIES: {
    CODE_EXECUTION: '代码执行',
    FILE_OPERATION: '文件操作',
    INFO_QUERY: '信息查询',
    IMAGE_TOOLS: '图片工具',
    PET_TOOLS: '宠物工具',
    LIFE_TOOLS: '生活工具'
  }
};