const path = require('path');
const fs = require('fs');
const SkillsManager = require('./skills-manager');
const skillsManifest = require('./skills-manifest');
const toolsManifest = require('../tools/tools-manifest');

const BaseSkill = require('./base-skill');
const { askClarification } = require('../clarification');
const sandbox = require('../tools/tools');

const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');

const skillsManager = new SkillsManager();

/**
 * 初始化技能中心
 * @description 从技能清单注册并加载所有技能
 */
function initializeSkills() {
  for (const manifest of skillsManifest) {
    skillsManager.registerManifest(manifest.name, manifest);
  }
  skillsManager.loadFromManifest();
  console.log(`[SkillsCenter] 已注册 ${skillsManager.getAll().length} 个技能`);
}

initializeSkills();

/**
 * 工具定义数组
 * @description 定义所有可用的工具及其参数规范
 */
const toolDefinitions = [
  { type: 'function', function: { name: 'search_knowledge_base', description: '搜索本地知识库中的文档内容，支持文本、图片、PDF和视频文件的内容检索', parameters: { type: 'object', properties: { query: { type: 'string', description: '搜索查询内容' }, file_types: { type: 'array', items: { type: 'string', enum: ['text', 'image', 'pdf', 'video', 'all'] }, description: '限定搜索的文件类型，默认为 all' }, max_results: { type: 'integer', description: '最大返回结果数，默认为 5' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'recognize_image', description: '使用 OCR 识别图片中的文字内容', parameters: { type: 'object', properties: { filename: { type: 'string', description: '图片文件名' } }, required: ['filename'] } } },
  { type: 'function', function: { name: 'extract_pdf_text', description: '提取 PDF 文档的文本内容', parameters: { type: 'object', properties: { filename: { type: 'string', description: 'PDF 文件名' } }, required: ['filename'] } } },
  { type: 'function', function: { name: 'analyze_video', description: '分析视频内容，提取关键场景和描述', parameters: { type: 'object', properties: { filename: { type: 'string', description: '视频文件名' } }, required: ['filename'] } } },
  { type: 'function', function: { name: 'get_weather', description: '查询指定城市的天气信息', parameters: { type: 'object', properties: { city: { type: 'string', description: '城市名称' } }, required: ['city'] } } },
  { type: 'function', function: { name: 'get_location', description: '查询省、市、区、县等行政区划信息', parameters: { type: 'object', properties: { location: { type: 'string', description: '地名' } }, required: ['location'] } } },
  { type: 'function', function: { name: 'web_search', description: '通过搜索引擎在互联网上搜索信息', parameters: { type: 'object', properties: { query: { type: 'string', description: '搜索关键词' }, max_results: { type: 'integer', description: '最大返回结果数，默认为 5' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'bash', description: '在沙盒环境中执行 Shell 命令', parameters: { type: 'object', properties: { command: { type: 'string', description: '要执行的完整命令字符串' }, description: { type: 'string', description: '简短说明' } }, required: ['command', 'description'] } } },
  { type: 'function', function: { name: 'python', description: '在沙盒环境中执行 Python 代码', parameters: { type: 'object', properties: { code: { type: 'string', description: '完整的 Python 代码' }, description: { type: 'string', description: '简短说明' } }, required: ['code', 'description'] } } },
  { type: 'function', function: { name: 'ls', description: '列出目录的内容', parameters: { type: 'object', properties: { path: { type: 'string', description: '目录路径' }, description: { type: 'string', description: '简短说明' } }, required: ['path', 'description'] } } },
  { type: 'function', function: { name: 'read_file', description: '读取文本文件的内容', parameters: { type: 'object', properties: { path: { type: 'string', description: '文件路径' }, start_line: { type: 'integer', description: '起始行号' }, end_line: { type: 'integer', description: '结束行号' }, description: { type: 'string', description: '简短说明' } }, required: ['path', 'description'] } } },
  { type: 'function', function: { name: 'write_file', description: '创建新文件或覆盖/追加内容', parameters: { type: 'object', properties: { path: { type: 'string', description: '文件路径' }, content: { type: 'string', description: '文件内容' }, append: { type: 'boolean', description: '追加模式' }, description: { type: 'string', description: '简短说明' } }, required: ['path', 'content', 'description'] } } },
  { type: 'function', function: { name: 'str_replace', description: '替换文件中的指定字符串', parameters: { type: 'object', properties: { path: { type: 'string', description: '文件路径' }, old_str: { type: 'string', description: '原始字符串' }, new_str: { type: 'string', description: '新字符串' }, replace_all: { type: 'boolean', description: '全部替换' }, description: { type: 'string', description: '简短说明' } }, required: ['path', 'old_str', 'new_str', 'description'] } } },
  { type: 'function', function: { name: 'ask_clarification', description: '当需要用户澄清信息时使用', parameters: { type: 'object', properties: { question: { type: 'string', description: '要询问用户的问题' }, clarification_type: { type: 'string', enum: ['missing_info', 'ambiguous_requirement', 'approach_choice', 'risk_confirmation', 'suggestion'] }, context: { type: 'string', description: '背景信息' }, options: { type: 'array', items: { type: 'string' } } }, required: ['question', 'clarification_type'] } } },
  { type: 'function', function: { name: 'cat_image', description: '获取随机可爱的猫咪图片', parameters: { type: 'object', properties: { description: { type: 'string', description: '简短说明目的' } }, required: ['description'] } } },
  { type: 'function', function: { name: 'dog_api', description: '获取随机可爱的狗狗图片', parameters: { type: 'object', properties: { breed: { type: 'string', description: '可选，指定狗狗品种' }, description: { type: 'string', description: '简短说明目的' } }, required: ['description'] } } },
  { type: 'function', function: { name: 'anime_image', description: '获取随机动漫图片', parameters: { type: 'object', properties: { category: { type: 'string', description: '可选，动漫类型：hug, kiss, pat, waifu, neko' }, description: { type: 'string', description: '简短说明目的' } }, required: ['description'] } } },
  { type: 'function', function: { name: 'wallpaper', description: '获取高清壁纸图片', parameters: { type: 'object', properties: { description: { type: 'string', description: '简短说明目的' } }, required: ['description'] } } },
  { type: 'function', function: { name: 'random_image', description: '获取随机图片，用于占位图或测试', parameters: { type: 'object', properties: { width: { type: 'integer', description: '可选，图片宽度' }, height: { type: 'integer', description: '可选，图片高度' }, description: { type: 'string', description: '简短说明目的' } }, required: ['description'] } } },
  { type: 'function', function: { name: 'random_user', description: '生成随机用户数据，用于测试', parameters: { type: 'object', properties: { count: { type: 'integer', description: '可选，生成用户数量' }, description: { type: 'string', description: '简短说明目的' } }, required: ['description'] } } },
  { type: 'function', function: { name: 'quotes', description: '获取随机名言警句', parameters: { type: 'object', properties: { tags: { type: 'string', description: '可选，名言标签' }, description: { type: 'string', description: '简短说明目的' } }, required: ['description'] } } },
  { type: 'function', function: { name: 'cat_facts', description: '获取有趣的猫咪知识或趣闻', parameters: { type: 'object', properties: { description: { type: 'string', description: '简短说明目的' } }, required: ['description'] } } },
  { type: 'function', function: { name: 'qrcode', description: '生成二维码', parameters: { type: 'object', properties: { data: { type: 'string', description: '要编码的数据或URL' }, size: { type: 'string', description: '可选，二维码尺寸如 300x300' }, description: { type: 'string', description: '简短说明目的' } }, required: ['data', 'description'] } } },
];

/**
 * 获取所有意图关键词映射
 * @returns {Object} 意图名称到关键词数组的映射
 */
function getAllIntentKeywords() {
  const keywordsMap = {};
  for (const manifest of skillsManifest) {
    if (manifest.trigger && Array.isArray(manifest.trigger)) {
      keywordsMap[manifest.name] = manifest.trigger;
    }
  }
  return keywordsMap;
}

function getToolsForIntent(intentName) {
  const manifest = skillsManifest.find(s => s.name === intentName);
  if (manifest && manifest.tools) {
    return manifest.tools;
  }
  return ['search_knowledge_base'];
}

function getAllSkillTools() {
  const toolsMap = {};
  for (const manifest of skillsManifest) {
    if (manifest.tools) {
      toolsMap[manifest.name] = manifest.tools;
    }
  }
  return toolsMap;
}

function matchIntents(query) {
  const matchedIntents = [];
  const lowerQuery = query.toLowerCase();

  for (const manifest of skillsManifest) {
    if (!manifest.trigger || !Array.isArray(manifest.trigger)) continue;
    for (const trigger of manifest.trigger) {
      if (lowerQuery.includes(trigger.toLowerCase())) {
        if (!matchedIntents.includes(manifest.name)) {
          matchedIntents.push(manifest.name);
          console.log(`[SkillsCenter] 匹配到技能: ${manifest.name}, 关键词: ${trigger}`);
        }
        break;
      }
    }
  }

  return matchedIntents;
}

/**
 * 获取与查询相关的文件
 * @param {string} query - 查询文本
 * @param {string} fileTypes - 文件类型筛选
 * @returns {Array} 相关文件列表
 */
function getRelevantFiles(query, fileTypes = 'all') {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) return [];
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    let targetTypes = ['text', 'image', 'pdf', 'video'];
    if (fileTypes !== 'all' && Array.isArray(fileTypes)) targetTypes = fileTypes;
    const typeToExtensions = { text: ['.txt', '.md', '.json'], image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'], pdf: ['.pdf'], video: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'] };
    let allowedExtensions = [];
    if (targetTypes.includes('all')) allowedExtensions = Object.values(typeToExtensions).flat();
    else targetTypes.forEach(t => { if (typeToExtensions[t]) allowedExtensions.push(...typeToExtensions[t]); });
    return files.filter(filename => allowedExtensions.includes(path.extname(filename).toLowerCase()));
  } catch (error) { console.error('获取相关文件失败:', error); return []; }
}

/**
 * 处理单个文件
 * @param {Object} file - 文件对象
 * @param {Object} context - 执行上下文
 * @returns {Object} 处理结果
 */
async function processFile(file, context = {}) {
  const { filename, filepath } = file;
  const extension = path.extname(filename).toLowerCase();
  const entry = skillsManager.findByExtension(extension);
  if (!entry) return { success: false, error: `不支持的文件类型: ${extension}` };
  try {
    const result = await entry.skill.process({ filepath, filename }, context);
    return { ...result, skill: entry.config.name };
  } catch (error) { return { success: false, error: error.message, skill: entry.config.name }; }
}

async function processFiles(files, context = {}) {
  const results = [];
  const errors = [];
  for (const file of files) {
    const result = await processFile(file, context);
    if (result.success) results.push(result);
    else errors.push({ filename: file.filename, error: result.error });
  }
  return { success: errors.length === 0, results, errors, summary: { total: files.length, success: results.length, failed: errors.length } };
}

/**
 * 执行工具
 * @param {string} toolName - 工具名称
 * @param {Object} args - 工具参数
 * @param {Object} context - 执行上下文
 * @returns {Object} 执行结果
 */
async function executeTool(toolName, args, context = {}) {
  try {
    if (toolName === 'search_knowledge_base') {
      const { query, file_types = 'all', max_results = 5 } = args;
      const relevantFiles = getRelevantFiles(query, file_types);
      const results = [];
      for (const filename of relevantFiles.slice(0, max_results)) {
        const filepath = path.join(KNOWLEDGE_DIR, filename);
        const result = await processFile({ filepath, filename }, context);
        if (result.success) results.push({ filename, content: result.textContent || result.content, skill: result.skill });
      }
      return { success: true, results, total: results.length };
    }

    if (['recognize_image', 'extract_pdf_text', 'analyze_video'].includes(toolName)) {
      const { filename } = args;
      const filepath = path.join(KNOWLEDGE_DIR, filename);
      return await processFile({ filepath, filename }, context);
    }

    if (toolName === 'get_weather') {
      const skill = skillsManager.get('weather-skill');
      if (!skill) return { success: false, error: '天气技能未注册' };
      return await skill.process(args.query || args.city || '', context);
    }

    if (toolName === 'get_location') {
      const skill = skillsManager.get('location-skill');
      if (!skill) return { success: false, error: '位置技能未注册' };
      return await skill.process(args.location || '', context);
    }

    if (toolName === 'web_search') {
      const skill = skillsManager.get('web-search-skill');
      if (!skill) return { success: false, error: '网页搜索技能未注册' };
      return await skill.search(args.query, { maxResults: args.max_results || 5 });
    }

    if (toolName === 'ask_clarification') {
      return askClarification(args, context);
    }

    const sandboxMethods = {
      'bash': 'execute',
      'python': 'executePythonCode',
      'ls': 'listDir',
      'read_file': 'read',
      'write_file': 'write',
      'str_replace': 'strReplace'
    };
    if (sandboxMethods[toolName]) {
      return await sandbox[sandboxMethods[toolName]](args, context);
    }

    return await toolsManager.execute(toolName, args, context);
  } catch (error) {
    console.error(`[SkillsCenter] 执行工具失败: ${toolName}`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getToolDefinitions: () => toolDefinitions,
  getToolDefinition: (name) => toolDefinitions.find(t => t.function.name === name),
  getAllSkills: () => skillsManager.getAll(),
  getAllSkillsInfo: () => skillsManager.getAll().map(s => ({
    name: s.name,
    description: s.description,
    trigger: s.trigger,
    usage: s.usage || '',
    tools: s.tools,
    supportedTypes: s.supportedTypes
  })),
  getSkillsByCategory: () => {
    const allSkills = skillsManager.getAll();
    return {
      file_processing: allSkills.filter(s => s.supportedTypes && s.supportedTypes.length > 0),
      info_query: allSkills.filter(s => !s.supportedTypes || s.supportedTypes.length === 0)
    };
  },
  getSupportedExtensions: () => {
    const extensions = new Set();
    for (const skill of skillsManager.getAll()) {
      for (const ext of skill.supportedTypes || []) {
        extensions.add(ext);
      }
    }
    return Array.from(extensions);
  },
  getToolsWithDescriptions: () => {
    const categories = {};
    for (const tool of toolsManifest) {
      const category = tool.category || '其他工具';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({ name: tool.name, description: tool.description, trigger: tool.trigger ? tool.trigger.join(', ') : '', usage: tool.usage || '' });
    }
    return Object.entries(categories).map(([category, tools]) => ({ category, tools }));
  },
  getRelevantFiles,
  processFile,
  processFiles,
  executeTool,
  skillsManager,
  getAllIntentKeywords,
  getToolsForIntent,
  getAllSkillTools,
  matchIntents
};
