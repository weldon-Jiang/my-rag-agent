const path = require('path');

const skillsManifest = [
  {
    name: 'preprocessor-skill',
    description: '预处理器 - 封装命令检测、用户画像、历史上下文等预处理逻辑',
    trigger: ['预处理', '前置处理'],
    usage: '封装命令检测、用户画像、Bot名称、历史上下文等预处理逻辑',
    tools: [],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'preprocessor/preprocessor-skill.js')
  },
  {
    name: 'memory-skill',
    description: '记忆分析 - 分析对话历史、提取上下文相关性',
    trigger: ['历史', '记忆', '之前', '刚才', '上次', '之前说'],
    usage: '分析对话历史，提取与当前查询相关的上下文信息',
    tools: [],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'memory/memory-skill.js')
  },
  {
    name: 'fashion-skill',
    description: '穿衣建议 - 根据天气情况生成穿衣建议',
    trigger: ['穿什么', '穿啥', '衣服', '穿搭', '衣着', '建议', '带什么', '带啥', '装备'],
    usage: '根据天气情况生成具体穿衣建议和服装搭配推荐',
    tools: [],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'fashion/fashion-skill.js')
  },
  {
    name: 'activity-skill',
    description: '活动理解 - 检测户外活动并生成建议',
    trigger: ['徒步', '跑步', '骑行', '露营', '运动', '爬山', '登山', '钓鱼', '约会'],
    usage: '检测用户提到的户外活动，生成相应的活动建议和穿衣建议',
    tools: [],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'activity/activity-skill.js')
  },
  {
    name: 'user-profile-skill',
    description: '用户画像 - 提取用户信息、名称、关系等',
    trigger: ['我叫', '我是', '你叫我', '以后叫我', '称呼我', '我的名字'],
    usage: '从对话中提取用户信息，包括用户名、关系设定等',
    tools: [],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'user-profile/user-profile-skill.js')
  },
  {
    name: 'command-skill',
    description: '命令处理 - 处理系统命令如清空历史、重置会话、退出等',
    trigger: ['清空', '重置', '帮助', '退出', '新对话', '新会话', '重新开始'],
    usage: '处理系统命令，包括清空历史、重置会话、显示帮助、退出对话',
    tools: [],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'command/command-skill.js')
  },
  {
    name: 'nlu-skill',
    description: '自然语言理解 - 意图分析、实体提取、文本处理',
    trigger: ['nlu', '理解', '分析', '意图', '关键词', '分析这句话', '提取'],
    usage: '自然语言理解分析，提取用户意图和实体信息',
    tools: [],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'nlu/nlu-skill.js')
  },
  {
    name: 'images-skill',
    description: '图片识别/OCR - 提取图片中的文字和内容',
    trigger: ['图片', '照片', '截图', 'ocr', '识别文字', '图片内容', '照片里', 'image'],
    usage: '上传图片文件，系统自动识别图片中的文字内容',
    tools: ['recognize_image', 'search_knowledge_base'],
    supportedTypes: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
    requiredParams: ['filepath', 'filename'],
    file: path.join(__dirname, 'images/images-skill.js')
  },
  {
    name: 'videos-skill',
    description: '视频内容理解 - 分析视频关键帧和场景',
    trigger: ['视频', '录像', '影片', 'movie', 'video'],
    usage: '上传视频文件，系统分析视频的关键帧和场景信息',
    tools: ['analyze_video', 'search_knowledge_base'],
    supportedTypes: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'],
    requiredParams: ['filepath', 'filename'],
    file: path.join(__dirname, 'videos/videos-skill.js')
  },
  {
    name: 'pdfs-skill',
    description: 'PDF解析 - 提取PDF文档内容和结构',
    trigger: ['pdf', 'pdf文档', '文章', '合同', '报告', '说明书'],
    usage: '上传PDF文件，系统提取文档中的文字和结构',
    tools: ['extract_pdf_text', 'search_knowledge_base'],
    supportedTypes: ['.pdf'],
    requiredParams: ['filepath', 'filename'],
    file: path.join(__dirname, 'pdfs/pdfs-skill.js')
  },
  {
    name: 'weather-skill',
    description: '天气查询 - 查询城市天气信息',
    trigger: ['天气', '气温', '温度', '下雨', '晴天', '多云', '冷', '热'],
    usage: '输入城市名称，查询天气预报和气温信息',
    tools: ['get_weather'],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'weather/weather-skill.js')
  },
  {
    name: 'location-skill',
    description: '地理位置 - 查询省市区县等行政区划',
    trigger: ['省', '市', '县', '区', '镇', '村', '位置', '在哪里', '经纬度', '行政区划'],
    usage: '输入省市区县等地址，查询行政区划和位置信息',
    tools: ['get_location'],
    supportedTypes: [],
    requiredParams: ['location'],
    file: path.join(__dirname, 'location/location-skill.js')
  },
  {
    name: 'web-search-skill',
    description: '网页搜索 - 在互联网上搜索信息',
    trigger: ['搜索', '网上查', '百度', 'google', 'search', '查询'],
    usage: '输入关键词，在互联网上搜索相关信息',
    tools: ['web_search'],
    supportedTypes: [],
    requiredParams: ['query'],
    file: path.join(__dirname, 'web-search/web-search-skill.js')
  },
  {
    name: 'windows-system-skill',
    description: 'Windows系统操作 - 列出目录文件、查看磁盘信息、执行Windows命令(cmd)',
    trigger: ['磁盘', '硬盘', '盘符', '系统信息', '格式化', '删除文件', '移动文件', '复制文件', 'windows', '系统操作', '目录', '文件', '查看文件', '列出文件', 'E盘', 'D盘', 'C盘', 'F盘', 'G盘', '查看目录', '列出目录', 'cmd', '命令提示符', 'C:\\', 'D:\\', 'E:\\'],
    usage: '执行Windows系统命令，如列出目录、查看文件、执行cmd命令',
    tools: ['bash', 'ls', 'python', 'read_file', 'write_file', 'str_replace'],
    supportedTypes: [],
    requiredParams: ['command', 'operation'],
    file: path.join(__dirname, 'windows-system/windows-system-skill.js')
  }
];

module.exports = skillsManifest;