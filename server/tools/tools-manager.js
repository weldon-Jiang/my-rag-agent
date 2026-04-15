const toolsManifest = require('./tools-manifest');

/**
 * 工具管理器类
 * @description 负责注册、加载和执行各种工具
 */
class ToolsManager {
  constructor() {
    this.tools = new Map();
    this.manifest = new Map();
  }

  /**
   * 注册工具清单
   * @param {string} name - 工具名称
   * @param {Object} config - 工具配置
   */
  registerManifest(name, config) {
    this.manifest.set(name, {
      name,
      description: config.description || '',
      trigger: config.trigger || [],
      usage: config.usage || '',
      parameters: config.parameters || {},
      requiredParams: config.requiredParams || [],
      file: config.file,
      functionName: config.functionName
    });
  }

  loadFromManifest() {
    for (const [name, config] of this.manifest.entries()) {
      try {
        const module = require(config.file);
        const fn = module[config.functionName];
        if (typeof fn === 'function') {
          this.tools.set(name, { fn, config });
        }
      } catch (err) {
        console.error(`[ToolsManager] Failed to load tool ${name}:`, err.message);
      }
    }
  }

  get(name) {
    const entry = this.tools.get(name);
    return entry ? entry.fn : null;
  }

  /**
   * 获取工具配置
   * @param {string} name - 工具名称
   * @returns {Object|null} 工具配置
   */
  getConfig(name) {
    const entry = this.tools.get(name);
    return entry ? entry.config : null;
  }

  /**
   * 获取所有工具的完整描述（用于前端展示）
   * @returns {Array} 按类别分组的工具列表
   */
  getToolsWithFullDescriptions() {
    const categories = {};
    for (const [name, config] of this.manifest.entries()) {
      const category = config.category || '其他';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        name: config.name,
        description: config.description,
        trigger: config.trigger || [],
        usage: config.usage || ''
      });
    }

    const categoryNames = {
      '代码执行': '代码执行',
      '文件操作': '文件操作',
      '辅助工具': '辅助工具',
      '生活工具': '生活工具',
      '宠物工具': '宠物工具',
      '图片工具': '图片工具',
      '其他': '其他'
    };

    return Object.entries(categories).map(([category, tools]) => ({
      category: categoryNames[category] || category,
      tools
    }));
  }

  /**
   * 获取所有工具的概要描述
   * @returns {Array} 工具列表
   */
  getAllToolSummaries() {
    return Array.from(this.manifest.values()).map(config => ({
      name: config.name,
      description: config.description
    }));
  }

  getAll() {
    return Array.from(this.tools.values()).map(entry => ({
      name: entry.config.name,
      description: entry.config.description,
      trigger: entry.config.trigger
    }));
  }

  findByTrigger(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [name, entry] of this.tools.entries()) {
      const triggers = entry.config.trigger || [];
      for (const trigger of triggers) {
        if (lowerQuery.includes(trigger.toLowerCase())) {
          results.push({ name, fn: entry.fn, config: entry.config });
          break;
        }
      }
    }
    return results;
  }

  /**
   * 执行工具
   * @param {string} name - 工具名称
   * @param {Object} args - 工具参数
   * @param {Object} context - 执行上下文
   * @returns {Object} 执行结果
   */
  async execute(name, args, context) {
    const entry = this.tools.get(name);
    if (!entry) {
      return { success: false, error: `Tool not found: ${name}` };
    }
    try {
      return await entry.fn(args, context);
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

const toolsManager = new ToolsManager();

/**
 * 初始化工具管理器
 * @description 从工具清单注册并加载所有工具
 */
function initializeTools() {
  for (const manifest of toolsManifest) {
    toolsManager.registerManifest(manifest.name, manifest);
  }
  toolsManager.loadFromManifest();
  console.log(`[ToolsManager] 已加载 ${toolsManager.getAll().length} 个工具`);
}

function getAllIntentKeywords() {
  const keywordsMap = {};
  for (const manifest of toolsManifest) {
    if (manifest.trigger && Array.isArray(manifest.trigger)) {
      keywordsMap[manifest.name] = manifest.trigger;
    }
  }
  return keywordsMap;
}

/**
 * 匹配查询中的工具
 * @param {string} query - 用户查询
 * @returns {Array} 匹配的工具名称数组
 */
function matchTools(query) {
  const matchedTools = [];
  const lowerQuery = query.toLowerCase();

  for (const manifest of toolsManifest) {
    if (!manifest.trigger || !Array.isArray(manifest.trigger)) continue;
    for (const trigger of manifest.trigger) {
      if (lowerQuery.includes(trigger.toLowerCase())) {
        if (!matchedTools.includes(manifest.name)) {
          matchedTools.push(manifest.name);
          console.log(`[ToolsManager] 匹配到工具: ${manifest.name}, 关键词: ${trigger}`);
        }
        break;
      }
    }
  }

  return matchedTools;
}

initializeTools();

module.exports = toolsManager;
module.exports.getAllIntentKeywords = getAllIntentKeywords;
module.exports.matchTools = matchTools;
