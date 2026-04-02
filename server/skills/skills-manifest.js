const path = require('path');

const skillsManifest = [
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