const path = require('path');
const fs = require('fs');

const BaseSkill = require('./base-skill');
const ImagesSkill = require('./images-skill');
const VideosSkill = require('./videos-skill');
const PdfsSkill = require('./pdfs-skill');
const WeatherSkill = require('./weather-skill');
const LocationSkill = require('./location-skill');

const sandbox = require('../sandbox/tools');
const { askClarification, getPendingClarification, respondToClarification, clearClarification } = require('../clarification');

const bashTool = sandbox.bashTool;
const pythonTool = sandbox.pythonTool;
const lsTool = sandbox.lsTool;
const readFileTool = sandbox.readFileTool;
const writeFileTool = sandbox.writeFileTool;
const strReplaceTool = sandbox.strReplaceTool;

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: '搜索本地知识库中的文档内容，支持文本、图片、PDF和视频文件的内容检索',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索查询内容',
          },
          file_types: {
            type: 'array',
            items: { type: 'string', enum: ['text', 'image', 'pdf', 'video', 'all'] },
            description: '限定搜索的文件类型，默认为 all',
          },
          max_results: {
            type: 'integer',
            description: '最大返回结果数，默认为 5',
          },
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
        properties: {
          filename: {
            type: 'string',
            description: '图片文件名',
          },
        },
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
        properties: {
          filename: {
            type: 'string',
            description: 'PDF 文件名',
          },
        },
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
        properties: {
          filename: {
            type: 'string',
            description: '视频文件名',
          },
        },
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
        properties: {
          city: {
            type: 'string',
            description: '城市名称，如：北京、上海、广州',
          },
        },
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
        properties: {
          location: {
            type: 'string',
            description: '地名（省市县区镇村等），如：北京、深圳、盐城、朝阳区',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bash',
      description: '在沙盒环境中执行 Shell 命令。优先使用 python 来运行 Python 代码',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要执行的 bash 命令，使用绝对路径访问文件',
          },
          description: {
            type: 'string',
            description: '简短说明为什么要执行这个命令',
          },
        },
        required: ['command', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'python',
      description: '执行 Python 代码，在沙盒环境中运行',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: '要执行的 Python 代码',
          },
          description: {
            type: 'string',
            description: '简短说明为什么要执行这段代码',
          },
        },
        required: ['code', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ls',
      description: '列出目录内容，以树形结构显示',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '要列出的目录绝对路径',
          },
          description: {
            type: 'string',
            description: '简短说明为什么要列出这个目录',
          },
        },
        required: ['path', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取文本文件内容，可以指定行号范围',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '要读取的文件绝对路径',
          },
          start_line: {
            type: 'integer',
            description: '可选，起始行号（1-indexed）',
          },
          end_line: {
            type: 'integer',
            description: '可选，结束行号（1-indexed）',
          },
          description: {
            type: 'string',
            description: '简短说明为什么要读取这个文件',
          },
        },
        required: ['path', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '写入文本内容到文件',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '要写入的文件绝对路径',
          },
          content: {
            type: 'string',
            description: '要写入的内容',
          },
          append: {
            type: 'boolean',
            description: '是否追加模式，默认为 false（覆盖）',
          },
          description: {
            type: 'string',
            description: '简短说明为什么要写入这个文件',
          },
        },
        required: ['path', 'content', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'str_replace',
      description: '替换文件中的字符串',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '要修改的文件绝对路径',
          },
          old_str: {
            type: 'string',
            description: '要替换的原始字符串',
          },
          new_str: {
            type: 'string',
            description: '替换后的新字符串',
          },
          replace_all: {
            type: 'boolean',
            description: '是否替换所有匹配项，默认为 false',
          },
          description: {
            type: 'string',
            description: '简短说明为什么要进行这个替换',
          },
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
          question: {
            type: 'string',
            description: '要询问用户的问题',
          },
          clarification_type: {
            type: 'string',
            enum: ['missing_info', 'ambiguous_requirement', 'approach_choice', 'risk_confirmation', 'suggestion'],
            description: '澄清类型：missing_info（缺少信息）, ambiguous_requirement（需求不明确）, approach_choice（实现方式选择）, risk_confirmation（风险确认）, suggestion（建议采纳）',
          },
          context: {
            type: 'string',
            description: '可选，解释为什么需要澄清的背景信息',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: '可选，供用户选择的选项列表',
          },
        },
        required: ['question', 'clarification_type'],
      },
    },
  },
];

const intentKeywords = {
  image: ['图片', '图像', '照片', '截图', 'ocr', '识别文字', '图片内容', '照片里'],
  pdf: ['pdf', '文档', '文章', '合同', '报告', '说明书'],
  video: ['视频', '录像', '影片', 'movie', 'video'],
  text: ['文本', 'txt', '文档', '文章', '内容'],
  weather: ['天气', '气温', '湿度', '下雨', '晴天', '多云', '冷', '热', '温度', '刮风'],
};

class SkillsCenter {
  constructor() {
    this.skills = new Map();
    this.toolDefinitions = toolDefinitions;
    this.skillExtensions = {
      '.jpg': 'images-skill',
      '.jpeg': 'images-skill',
      '.png': 'images-skill',
      '.gif': 'images-skill',
      '.bmp': 'images-skill',
      '.webp': 'images-skill',
      '.svg': 'images-skill',
      '.mp4': 'videos-skill',
      '.avi': 'videos-skill',
      '.mov': 'videos-skill',
      '.mkv': 'videos-skill',
      '.webm': 'videos-skill',
      '.flv': 'videos-skill',
      '.wmv': 'videos-skill',
      '.pdf': 'pdfs-skill',
    };

    this.registerBuiltInSkills();
  }

  registerBuiltInSkills() {
    this.register(new ImagesSkill());
    this.register(new VideosSkill());
    this.register(new PdfsSkill());
    this.register(new WeatherSkill());
    this.register(new LocationSkill());

    console.log(`[SkillsCenter] 已注册 ${this.skills.size} 个技能`);
  }

  register(skill) {
    if (!(skill instanceof BaseSkill)) {
      console.error(`[SkillsCenter] 无效的技能实例: ${skill}`);
      return false;
    }

    if (this.skills.has(skill.name)) {
      console.warn(`[SkillsCenter] 技能已存在: ${skill.name}`);
      return false;
    }

    this.skills.set(skill.name, skill);
    console.log(`[SkillsCenter] 注册技能: ${skill.name} (${skill.version})`);
    return true;
  }

  unregister(skillName) {
    if (!this.skills.has(skillName)) {
      console.warn(`[SkillsCenter] 技能不存在: ${skillName}`);
      return false;
    }

    this.skills.delete(skillName);
    console.log(`[SkillsCenter] 注销技能: ${skillName}`);
    return true;
  }

  get(skillName) {
    return this.skills.get(skillName);
  }

  getSkillByExtension(extension) {
    const skillName = this.skillExtensions[extension.toLowerCase()];
    if (skillName) {
      return this.skills.get(skillName);
    }
    return undefined;
  }

  getAllSkillsInfo() {
    const skillsInfo = [];
    this.skills.forEach((skill) => {
      skillsInfo.push(skill.getInfo());
    });
    return skillsInfo;
  }

  getToolDefinitions() {
    return this.toolDefinitions;
  }

  getToolDefinition(toolName) {
    return this.toolDefinitions.find(t => t.function.name === toolName);
  }

  getSupportedExtensions() {
    return Object.keys(this.skillExtensions);
  }

  isSupported(extension) {
    return this.skillExtensions.hasOwnProperty(extension.toLowerCase());
  }

  analyzeIntent(query) {
    const lowerQuery = query.toLowerCase();
    const relevantTypes = ['text', 'image', 'pdf', 'video'];

    for (const [type, keywords] of Object.entries(intentKeywords)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          return type;
        }
      }
    }

    return 'text';
  }

  getRelevantFiles(query, fileTypes = 'all') {
    try {
      if (!fs.existsSync(KNOWLEDGE_DIR)) {
        return [];
      }

      const files = fs.readdirSync(KNOWLEDGE_DIR);
      const intent = this.analyzeIntent(query);

      let targetTypes = ['text', 'image', 'pdf', 'video'];
      if (fileTypes !== 'all' && Array.isArray(fileTypes)) {
        targetTypes = fileTypes;
      }

      const textExtensions = ['.txt', '.md', '.json'];
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
      const pdfExtensions = ['.pdf'];
      const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'];

      const typeToExtensions = {
        text: textExtensions,
        image: imageExtensions,
        pdf: pdfExtensions,
        video: videoExtensions,
      };

      let allowedExtensions = [];
      if (targetTypes.includes('all')) {
        allowedExtensions = [...textExtensions, ...imageExtensions, ...pdfExtensions, ...videoExtensions];
      } else {
        targetTypes.forEach(t => {
          if (typeToExtensions[t]) {
            allowedExtensions.push(...typeToExtensions[t]);
          }
        });
      }

      return files.filter(filename => {
        const ext = path.extname(filename).toLowerCase();
        return allowedExtensions.includes(ext);
      });
    } catch (error) {
      console.error('获取相关文件失败:', error);
      return [];
    }
  }

  async processFile(file, context = {}) {
    const { filename } = file;
    const extension = path.extname(filename).toLowerCase();

    if (!this.isSupported(extension)) {
      return {
        success: false,
        error: `不支持的文件类型: ${extension}`,
        supportedTypes: this.getSupportedExtensions(),
      };
    }

    const skill = this.getSkillByExtension(extension);
    if (!skill) {
      return {
        success: false,
        error: `未找到处理 ${extension} 文件的技能`,
      };
    }

    const fileType = extension.replace('.', '');
    if (!skill.supports(`.${fileType}`)) {
      return {
        success: false,
        error: `技能 ${skill.name} 不支持 ${extension} 文件类型`,
      };
    }

    console.log(`[SkillsCenter] 使用技能 ${skill.name} 处理文件: ${filename}`);

    try {
      const result = await skill.process(file, context);
      return result;
    } catch (error) {
      console.error(`[SkillsCenter] 处理文件失败:`, error);
      return {
        success: false,
        error: error.message,
        skill: skill.name,
      };
    }
  }

  async processFiles(files, context = {}) {
    const results = [];
    const errors = [];

    for (const file of files) {
      const result = await this.processFile(file, context);
      if (result.success) {
        results.push(result);
      } else {
        errors.push({
          filename: file.filename,
          error: result.error,
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: files.length,
        success: results.length,
        failed: errors.length,
      },
    };
  }

  async executeTool(toolName, args, context = {}) {
    const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');

    try {
      switch (toolName) {
        case 'search_knowledge_base': {
          const { query, file_types = 'all', max_results = 5 } = args;
          const relevantFiles = this.getRelevantFiles(query, file_types);
          const results = [];

          for (const filename of relevantFiles.slice(0, max_results)) {
            const filepath = path.join(KNOWLEDGE_DIR, filename);
            const result = await this.processFile({ filepath, filename }, context);
            if (result.success) {
              results.push({
                filename,
                content: result.textContent || result.content,
                skill: result.skill,
              });
            }
          }

          return {
            success: true,
            results,
            total: results.length,
          };
        }

        case 'recognize_image': {
          const { filename } = args;
          const filepath = path.join(KNOWLEDGE_DIR, filename);
          const result = await this.processFile({ filepath, filename }, context);

          return result;
        }

        case 'extract_pdf_text': {
          const { filename } = args;
          const filepath = path.join(KNOWLEDGE_DIR, filename);
          const result = await this.processFile({ filepath, filename }, context);

          return result;
        }

        case 'analyze_video': {
          const { filename } = args;
          const filepath = path.join(KNOWLEDGE_DIR, filename);
          const result = await this.processFile({ filepath, filename }, context);

          return result;
        }

        case 'get_weather': {
          const weatherSkill = this.get('weather-skill');
          if (!weatherSkill) {
            return {
              success: false,
              error: '天气技能未注册',
            };
          }
          const result = await weatherSkill.process(args.query || args.city || '', context);
          return result;
        }

        case 'bash': {
          return await bashTool(args, context);
        }

        case 'python': {
          return await pythonTool(args, context);
        }

        case 'ls': {
          return await lsTool(args, context);
        }

        case 'read_file': {
          return await readFileTool(args, context);
        }

        case 'write_file': {
          return await writeFileTool(args, context);
        }

        case 'str_replace': {
          return await strReplaceTool(args, context);
        }

        case 'ask_clarification': {
          return askClarification(args, context);
        }

        default:
          return {
            success: false,
            error: `未知的工具: ${toolName}`,
          };
      }
    } catch (error) {
      console.error(`[SkillsCenter] 执行工具失败: ${toolName}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');
const skillsCenter = new SkillsCenter();

module.exports = skillsCenter;