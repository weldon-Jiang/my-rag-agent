const path = require('path');

const toolsManifest = [
  {
    name: 'bash',
    category: '代码执行',
    description: '在沙盒环境中执行 Shell 命令（Windows CMD 或 Linux Bash）',
    trigger: ['执行', '运行', '命令', 'shell', 'cmd'],
    usage: '输入要执行的命令，系统在沙盒环境中执行并返回结果',
    parameters: {
      command: { type: 'string', description: '要执行的完整命令字符串' },
      description: { type: 'string', description: '简短说明执行这个命令的目的' }
    },
    requiredParams: ['command', 'description'],
    file: path.join(__dirname, 'bash/bash.js'),
    functionName: 'execute'
  },
  {
    name: 'python',
    category: '代码执行',
    description: '在沙盒环境中执行 Python 代码',
    trigger: ['python', '代码', '执行', '运行python'],
    usage: '输入Python代码，系统执行并返回运行结果',
    parameters: {
      code: { type: 'string', description: '完整的 Python 代码' },
      description: { type: 'string', description: '简短说明这段 Python 代码的目的' }
    },
    requiredParams: ['code', 'description'],
    file: path.join(__dirname, 'python/python.js'),
    functionName: 'execute'
  },
  {
    name: 'ls',
    category: '文件操作',
    description: '列出指定目录的内容',
    trigger: ['列出', '列表', '目录', '查看文件'],
    usage: '输入目录路径，列出该目录下的所有文件和子目录',
    parameters: {
      path: { type: 'string', description: '要列出的目录路径' },
      description: { type: 'string', description: '简短说明为什么要列出这个目录' }
    },
    requiredParams: ['path', 'description'],
    file: path.join(__dirname, 'ls/ls.js'),
    functionName: 'execute'
  },
  {
    name: 'read_file',
    category: '文件操作',
    description: '读取文本文件的内容',
    trigger: ['读取', '查看', '看文件'],
    usage: '输入文件路径，系统读取并返回文件内容',
    parameters: {
      path: { type: 'string', description: '要读取的文件路径' },
      start_line: { type: 'integer', description: '可选，起始行号' },
      end_line: { type: 'integer', description: '可选，结束行号' },
      description: { type: 'string', description: '简短说明为什么要读取这个文件' }
    },
    requiredParams: ['path', 'description'],
    file: path.join(__dirname, 'read_file/read_file.js'),
    functionName: 'execute'
  },
  {
    name: 'write_file',
    category: '文件操作',
    description: '创建新文件或覆盖/追加内容到已有文件',
    trigger: ['写入', '创建', '保存', '写文件'],
    usage: '输入文件路径和内容，系统创建或更新文件',
    parameters: {
      path: { type: 'string', description: '要写入的文件路径' },
      content: { type: 'string', description: '要写入的文件内容' },
      append: { type: 'boolean', description: '可选，追加模式' },
      description: { type: 'string', description: '简短说明写入这个文件的目的' }
    },
    requiredParams: ['path', 'content', 'description'],
    file: path.join(__dirname, 'write_file/write_file.js'),
    functionName: 'execute'
  },
  {
    name: 'str_replace',
    category: '文件操作',
    description: '替换文件中的指定字符串',
    trigger: ['替换', '修改', '改内容'],
    usage: '输入文件路径、原字符串和新字符串，系统替换并更新文件',
    parameters: {
      path: { type: 'string', description: '要修改的文件路径' },
      old_str: { type: 'string', description: '要替换的原始字符串' },
      new_str: { type: 'string', description: '替换后的新字符串' },
      replace_all: { type: 'boolean', description: '可选，是否替换所有匹配项' },
      description: { type: 'string', description: '简短说明为什么要进行这个替换' }
    },
    requiredParams: ['path', 'old_str', 'new_str', 'description'],
    file: path.join(__dirname, 'str_replace/str_replace.js'),
    functionName: 'execute'
  },
  {
    name: 'random_user',
    category: '辅助工具',
    description: '获取随机用户数据（姓名、邮箱、头像等），用于测试数据生成',
    trigger: ['随机用户', '生成用户', '测试用户', 'random user'],
    usage: '生成随机用户数据，用于测试或演示',
    parameters: {
      count: { type: 'integer', description: '可选，生成用户数量，默认1' },
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'random-user/random-user.js'),
    functionName: 'execute'
  },
  {
    name: 'random_image',
    category: '辅助工具',
    description: '获取随机图片，用于占位图或测试素材',
    trigger: ['随机图片', '占位图', 'random image', 'picsum'],
    usage: '获取随机图片，可用于占位图或测试',
    parameters: {
      width: { type: 'integer', description: '可选，图片宽度，默认400' },
      height: { type: 'integer', description: '可选，图片高度，默认300' },
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'random-image/random-image.js'),
    functionName: 'execute'
  },
  {
    name: 'quotes',
    category: '辅助工具',
    description: '获取随机名言警句',
    trigger: ['名言', '警句', '格言', 'quote', '每日一句'],
    usage: '获取随机名言警句，提供灵感和鼓励',
    parameters: {
      tags: { type: 'string', description: '可选，名言标签，如 life, wisdom' },
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'quotes/quotes.js'),
    functionName: 'execute'
  },
  {
    name: 'cat_facts',
    category: '宠物工具',
    description: '获取随机猫咪知识/趣闻',
    trigger: ['猫知识', '猫的知识', '猫趣闻', '猫的趣闻', 'cat fact', '关于猫'],
    usage: '获取有趣的猫咪知识或趣闻',
    parameters: {
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'cat-facts/cat-facts.js'),
    functionName: 'execute'
  },
  {
    name: 'cat_image',
    category: '宠物工具',
    description: '获取随机猫咪图片，可用于展示',
    trigger: ['猫咪照片', '猫咪的照片', '猫照片', '猫的照片', '猫咪图片', '猫咪的图片', '猫图片', '猫的图片', 'cat photo', 'cat image', '吸猫照片'],
    usage: '获取随机猫咪图片，展示可爱的猫咪',
    parameters: {
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'cat-image/cat-image.js'),
    functionName: 'execute'
  },
  {
    name: 'dog_api',
    category: '宠物工具',
    description: '获取随机狗图片',
    trigger: ['狗狗照片', '狗狗的照片', '狗照片', '狗的照片', '狗狗图片', '狗狗的图片', '狗图片', 'dog photo', 'dog image', '汪星人照片'],
    usage: '获取随机狗狗图片，展示可爱的狗狗',
    parameters: {
      breed: { type: 'string', description: '可选，指定品种，如 labrador, husky' },
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'dog-api/dog-api.js'),
    functionName: 'execute'
  },
  {
    name: 'weather',
    category: '生活工具',
    description: '获取天气预报，支持全球城市',
    trigger: ['天气', '天气的', '气温', '温度', 'weather', '下雨'],
    usage: '查询指定城市的天气预报信息',
    parameters: {
      city: { type: 'string', description: '可选，城市名称，不填则默认北京' },
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'weather/weather.js'),
    functionName: 'execute'
  },
  {
    name: 'qrcode',
    category: '生活工具',
    description: '生成二维码',
    trigger: ['二维码', '二维码的图片', 'qrcode', '生成码'],
    usage: '输入文本或URL，生成对应的二维码图片',
    parameters: {
      data: { type: 'string', description: '要编码的数据' },
      size: { type: 'string', description: '可选，二维码尺寸，如 300x300' },
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['data', 'description'],
    file: path.join(__dirname, 'qrcode/qrcode.js'),
    functionName: 'execute'
  },
  {
    name: 'anime_image',
    category: '图片工具',
    description: '获取随机动漫图片',
    trigger: ['动漫图片', '动漫的图片', '动漫照片', '动漫的照片', '二次元', 'anime', '卡通图片'],
    usage: '获取随机动漫图片，展示二次元风格',
    parameters: {
      category: { type: 'string', description: '可选，类型：hug, kiss, pat, waifu, neko' },
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'anime-image/anime-image.js'),
    functionName: 'execute'
  },
  {
    name: 'wallpaper',
    category: '图片工具',
    description: '获取高清壁纸图片',
    trigger: ['壁纸', '壁纸的图片', 'wallpaper', '桌面图片', '高清壁纸'],
    usage: '获取随机高清壁纸图片',
    parameters: {
      description: { type: 'string', description: '简短说明目的' }
    },
    requiredParams: ['description'],
    file: path.join(__dirname, 'wallpaper/wallpaper.js'),
    functionName: 'execute'
  }
];

module.exports = toolsManifest;
