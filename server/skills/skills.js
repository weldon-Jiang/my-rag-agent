const path = require('path');
const fs = require('fs');
const SkillsManager = require('./skills-manager');
const skillsManifest = require('./skills-manifest');

const BaseSkill = require('./base-skill');
const { askClarification } = require('../clarification');
const sandbox = require('../tools/tools');
const toolsManager = require('../tools/tools-manager');

const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');

const skillsManager = new SkillsManager();

function initializeSkills() {
  for (const manifest of skillsManifest) {
    skillsManager.registerManifest(manifest.name, manifest);
  }
  skillsManager.loadFromManifest();
  console.log(`[SkillsCenter] 已注册 ${skillsManager.getAll().length} 个技能`);
}

initializeSkills();

/**
 * 能力类型到工具名称的映射
 */
const CAPABILITY_TOOLS = {
  'knowledge_search': ['search_knowledge_base'],
  'web_search': ['web_search'],
  'weather_query': ['get_weather'],
  'location_query': ['get_location'],
  'file_read': ['read_file'],
  'file_write': ['write_file'],
  'file_edit': ['str_replace'],
  'code_execute': ['python'],
  'command_execute': ['bash'],
  'image_understand': ['recognize_image'],
  'document_understand': ['extract_pdf_text'],
  'data_process': ['python', 'bash']
};

/**
 * 根据能力类型匹配工具
 * @param {Array<string>} capabilities - 能力类型数组
 * @returns {Array<string>} 工具名称数组
 */
function matchToolsByCapability(capabilities) {
  const matchedTools = new Set();
  if (!capabilities || !Array.isArray(capabilities)) return [];

  for (const capability of capabilities) {
    const tools = CAPABILITY_TOOLS[capability];
    if (tools) {
      tools.forEach(t => matchedTools.add(t));
    }
  }

  return Array.from(matchedTools);
}

/**
 * 根据查询匹配工具（触发词匹配）
 * @param {string} query - 用户查询
 * @returns {Array} 工具名称数组
 */
function matchTools(query) {
  const matchedTools = [];
  const manifest = toolsManager.manifest;

  for (const [toolName, config] of manifest.entries()) {
    const triggers = config.trigger || [];
    for (const trigger of triggers) {
      if (query.toLowerCase().includes(trigger.toLowerCase())) {
        if (!matchedTools.includes(toolName)) {
          matchedTools.push(toolName);
        }
        break;
      }
    }
  }

  return matchedTools;
}

const intentKeywords = {
  image: ['图片', '图像', '照片', '截图', 'ocr', '识别文字', '图片内容', '照片里'],
  pdf: ['pdf', '文档', '文章', '合同', '报告', '说明书'],
  video: ['视频', '录像', '影片', 'movie', 'video'],
  text: ['文本', 'txt', '文档', '文章', '内容'],
  weather: ['天气', '气温', '湿度', '下雨', '晴天', '多云', '冷', '热', '温度', '刮风'],
};

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: '搜索本地知识库中的文档内容，支持文本、图片、PDF和视频文件的内容检索',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索查询内容' },
          file_types: { type: 'array', items: { type: 'string', enum: ['text', 'image', 'pdf', 'video', 'all'] }, description: '限定搜索的文件类型，默认为 all' },
          max_results: { type: 'integer', description: '最大返回结果数，默认为 5' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recognize_image',
      description: '使用 OCR 识别图片中的文字内容，支持中文和英文',
      parameters: {
        type: 'object',
        properties: { filename: { type: 'string', description: '图片文件名' } },
        required: ['filename'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_pdf_text',
      description: '提取 PDF 文档的文本内容',
      parameters: {
        type: 'object',
        properties: { filename: { type: 'string', description: 'PDF 文件名' } },
        required: ['filename'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_video',
      description: '分析视频内容，提取关键场景和描述',
      parameters: {
        type: 'object',
        properties: { filename: { type: 'string', description: '视频文件名' } },
        required: ['filename'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '查询指定城市的天气信息，包括温度、湿度、风速等',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string', description: '城市名称，如：北京、上海、广州' } },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_location',
      description: '查询省、市、区、县等行政区划信息，包括经纬度、海拔、时区等',
      parameters: {
        type: 'object',
        properties: { location: { type: 'string', description: '地名（省市县区镇村等），如：北京、深圳、盐城、朝阳区' } },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: '通过搜索引擎在互联网上搜索信息，返回网页标题、链接和摘要',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词或问题，如：Python 教程、北京天气' },
          max_results: { type: 'integer', description: '最大返回结果数，默认为 5' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bash',
      description: '在沙盒环境中执行 Shell 命令（Windows CMD 或 Linux Bash）。可以执行各种系统命令、脚本等。注意：优先使用 python 工具来运行 Python 代码',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: '要执行的完整命令字符串' },
          description: { type: 'string', description: '简短说明执行这个命令的目的和用途' },
        },
        required: ['command', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'python',
      description: '在沙盒环境中执行 Python 代码。适合进行计算、数据处理、文件操作等',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: '完整的 Python 代码' },
          description: { type: 'string', description: '简短说明这段 Python 代码的目的' },
        },
        required: ['code', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ls',
      description: '列出指定目录的内容（文件和文件夹），以树形结构显示',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '要列出的目录路径。使用虚拟路径：/mnt/user-data/workspace、/mnt/user-data/uploads' },
          description: { type: 'string', description: '简短说明为什么要列出这个目录' },
        },
        required: ['path', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取文本文件的内容。可以指定行号范围来只读取部分内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '要读取的文件路径。使用虚拟路径：/mnt/user-data/workspace/文件名' },
          start_line: { type: 'integer', description: '可选，起始行号（1-indexed）' },
          end_line: { type: 'integer', description: '可选，结束行号' },
          description: { type: 'string', description: '简短说明为什么要读取这个文件' },
        },
        required: ['path', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '创建新文件或覆盖/追加内容到已有文件',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '要写入的文件路径。使用虚拟路径：/mnt/user-data/workspace/文件名' },
          content: { type: 'string', description: '要写入的文件内容' },
          append: { type: 'boolean', description: '可选，追加模式。true=在文件末尾追加，false=覆盖整个文件（默认）' },
          description: { type: 'string', description: '简短说明写入这个文件的目的' },
        },
        required: ['path', 'content', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'str_replace',
      description: '替换文件中的指定字符串。可以用于修改代码、配置文件等',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '要修改的文件路径。使用虚拟路径：/mnt/user-data/workspace/文件名' },
          old_str: { type: 'string', description: '要替换的原始字符串（需要精确匹配）' },
          new_str: { type: 'string', description: '替换后的新字符串' },
          replace_all: { type: 'boolean', description: '可选，是否替换所有匹配项。true=全部替换，false=只替换第一个（默认）' },
          description: { type: 'string', description: '简短说明为什么要进行这个替换' },
        },
        required: ['path', 'old_str', 'new_str', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_clarification',
      description: '当需要用户澄清信息时使用。执行会中断，等待用户响应后再继续',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: '要询问用户的问题' },
          clarification_type: { type: 'string', enum: ['missing_info', 'ambiguous_requirement', 'approach_choice', 'risk_confirmation', 'suggestion'], description: '澄清类型' },
          context: { type: 'string', description: '可选，解释为什么需要澄清的背景信息' },
          options: { type: 'array', items: { type: 'string' }, description: '可选，供用户选择的选项列表' },
        },
        required: ['question', 'clarification_type'],
      },
    },
  },
];

function getRelevantFiles(query, fileTypes = 'all') {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return [];
    }
    const files = fs.readdirSync(KNOWLEDGE_DIR);

    let targetTypes = ['text', 'image', 'pdf', 'video'];
    if (fileTypes !== 'all' && Array.isArray(fileTypes)) {
      targetTypes = fileTypes;
    }

    const typeToExtensions = {
      text: ['.txt', '.md', '.json'],
      image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
      pdf: ['.pdf'],
      video: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'],
    };

    let allowedExtensions = [];
    if (targetTypes.includes('all')) {
      allowedExtensions = Object.values(typeToExtensions).flat();
    } else {
      targetTypes.forEach(t => {
        if (typeToExtensions[t]) {
          allowedExtensions.push(...typeToExtensions[t]);
        }
      });
    }

    const candidateFiles = files.filter(filename => {
      const ext = path.extname(filename).toLowerCase();
      return allowedExtensions.includes(ext);
    });

    const textExtensions = typeToExtensions.text;
    const scoredFiles = [];

    for (const filename of candidateFiles) {
      const ext = path.extname(filename).toLowerCase();
      if (textExtensions.includes(ext)) {
        const filepath = path.join(KNOWLEDGE_DIR, filename);
        try {
          const content = fs.readFileSync(filepath, 'utf-8');
          const score = calculateRelevanceScore(query, content, filename);
          if (score > 0) {
            scoredFiles.push({ filename, score, content });
          }
        } catch (err) {
          console.error(`[Knowledge] 读取文件失败: ${filename}`, err.message);
        }
      } else {
        scoredFiles.push({ filename, score: 0.3, content: '' });
      }
    }

    scoredFiles.sort((a, b) => b.score - a.score);

    console.log(`[Knowledge] 搜索"${query}": 找到 ${scoredFiles.length} 个相关文件`);

    return scoredFiles.map(f => f.filename);
  } catch (error) {
    console.error('获取相关文件失败:', error);
    return [];
  }
}

function calculateRelevanceScore(query, content, filename) {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  const words = queryLower.split(/[\s,.，。！？、]+/).filter(w => w.length > 1);

  let score = 0;

  if (filename.toLowerCase().includes(queryLower)) {
    score += 0.4;
  }

  for (const word of words) {
    if (contentLower.includes(word)) {
      const regex = new RegExp(word, 'gi');
      const matches = contentLower.match(regex);
      score += 0.15 * (matches ? matches.length : 1);
    }
  }

  const queryPhrases = queryLower.split(/[,，.。!！?？]/).filter(p => p.trim().length > 3);
  for (const phrase of queryPhrases) {
    if (contentLower.includes(phrase.trim())) {
      score += 0.3;
    }
  }

  return Math.min(score, 1.0);
}

async function processFile(file, context = {}) {
  const { filename, filepath } = file;
  const extension = path.extname(filename).toLowerCase();
  const entry = skillsManager.findByExtension(extension);

  if (!entry) {
    return { success: false, error: `不支持的文件类型: ${extension}` };
  }

  try {
    const result = await entry.skill.process({ filepath, filename }, context);
    return { ...result, skill: entry.config.name };
  } catch (error) {
    console.error(`[SkillsCenter] 处理文件失败:`, error);
    return { success: false, error: error.message, skill: entry.config.name };
  }
}

async function executeTool(toolName, args, context = {}) {
  try {
    switch (toolName) {
      case 'search_knowledge_base': {
        const { query, file_types = 'all', max_results = 5 } = args;
        const relevantFiles = getRelevantFiles(query, file_types);
        const results = [];
        for (const filename of relevantFiles.slice(0, max_results)) {
          const filepath = path.join(KNOWLEDGE_DIR, filename);
          const result = await processFile({ filepath, filename }, context);
          if (result.success) {
            results.push({ filename, content: result.textContent || result.content, skill: result.skill });
          }
        }
        return { success: true, results, total: results.length };
      }
      case 'recognize_image':
      case 'extract_pdf_text':
      case 'analyze_video': {
        const { filename } = args;
        const filepath = path.join(KNOWLEDGE_DIR, filename);
        return await processFile({ filepath, filename }, context);
      }
      case 'get_weather': {
        const skill = skillsManager.get('weather-skill');
        if (!skill) return { success: false, error: '天气技能未注册' };
        return await skill.process(args.query || args.city || '', context);
      }
      case 'get_location': {
        const skill = skillsManager.get('location-skill');
        if (!skill) return { success: false, error: '位置技能未注册' };
        return await skill.process(args.location || '', context);
      }
      case 'web_search': {
        const skill = skillsManager.get('web-search-skill');
        if (!skill) return { success: false, error: '网页搜索技能未注册' };
        return await skill.search(args.query, { maxResults: args.max_results || 5 });
      }
      case 'bash':
        return await sandbox.execute(args, context);
      case 'python':
        return await sandbox.executePythonCode(args, context);
      case 'ls':
        return await sandbox.listDir(args, context);
      case 'read_file':
        return await sandbox.read(args, context);
      case 'write_file':
        return await sandbox.write(args, context);
      case 'str_replace':
        return await sandbox.strReplace(args, context);
      case 'ask_clarification':
        return askClarification(args, context);
      default:
        return { success: false, error: `未知的工具: ${toolName}` };
    }
  } catch (error) {
    console.error(`[SkillsCenter] 执行工具失败: ${toolName}`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  skillsManager,
  get: (name) => skillsManager.get(name),
  getSkill: (name) => skillsManager.get(name),
  toolDefinitions,
  getRelevantFiles,
  processFile,
  executeTool,
  getAllSkills: () => skillsManager.getAll(),
  getSkillsByCategory: () => {
    const allSkills = skillsManager.getAll();
    const categoryMap = {
      '系统技能': { name: '系统技能', icon: '⚙️', skills: [] },
      '文件处理': { name: '文件处理', icon: '📦', skills: [] },
      '信息查询': { name: '信息查询', icon: '🔍', skills: [] },
      '用户交互': { name: '用户交互', icon: '💬', skills: [] },
      '系统操作': { name: '系统操作', icon: '🖥️', skills: [] }
    };

    for (const skill of allSkills) {
      let categorized = false;
      if (skill.name.includes('intent') || skill.name.includes('context') ||
          skill.name.includes('preprocessor') || skill.name.includes('memory') || skill.name.includes('nlu')) {
        categoryMap['系统技能'].skills.push(skill);
        categorized = true;
      }
      if (skill.supportedTypes && skill.supportedTypes.length > 0) {
        categoryMap['文件处理'].skills.push(skill);
        categorized = true;
      }
      if (skill.name.includes('weather') || skill.name.includes('location') || skill.name.includes('web-search')) {
        categoryMap['信息查询'].skills.push(skill);
        categorized = true;
      }
      if (skill.name.includes('user-profile') || skill.name.includes('command') ||
          skill.name.includes('fashion') || skill.name.includes('activity')) {
        categoryMap['用户交互'].skills.push(skill);
        categorized = true;
      }
      if (skill.name.includes('windows-system')) {
        categoryMap['系统操作'].skills.push(skill);
        categorized = true;
      }
      if (!categorized) {
        categoryMap['用户交互'].skills.push(skill);
      }
    }

    return Object.values(categoryMap).filter(c => c.skills.length > 0);
  },
  getToolsByCategory: () => {
    return toolsManager.getToolsWithFullDescriptions();
  },
  getSupportedExtensions: () => {
    const extensions = new Set();
    skillsManager.getAll().forEach(skill => {
      if (skill.supportedTypes) {
        skill.supportedTypes.forEach(ext => extensions.add(ext));
      }
    });
    return Array.from(extensions);
  },
  getToolsWithDescriptions: () => toolsManager.getToolsWithFullDescriptions(),
  getToolDefinitions: () => toolDefinitions,
  getToolDefinition: (name) => toolDefinitions.find(t => t.function.name === name),
  getSkillMarkdown: (name) => skillsManager.loadSkillMarkdown(name),
  parseSkillMarkdown: (content) => skillsManager.parseSkillMarkdown(content),
  getSkillSummary: (name) => skillsManager.getSkillSummary(name),
  getFullSkillContent: (name) => skillsManager.getFullSkillContent(name),
  getAllSkillSummaries: () => skillsManager.getAllSkillSummaries(),
  matchTools,
  matchToolsByCapability
};

