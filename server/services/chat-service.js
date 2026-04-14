/**
 * 聊天服务 (Chat Service)
 * @description 聊天核心业务逻辑，包括意图分析、工具选择、Prompt构建等
 * @module services/chat-service
 */

const { respondToClarification, saveClarification } = require('../clarification');
const skillsCenter = require('../skills');
const sessionService = require('./session-service');

/**
 * 从文本中提取城市名
 * @param {string} query - 用户查询
 * @returns {string|null} 城市名或 null
 */
function extractCity(query) {
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆', '天津', '苏州', '长沙', '郑州', '青岛', '沈阳', '宁波', '昆明', '大连', '哈尔滨', '长春', '福州', '厦门', '济南', '东莞', '佛山', '无锡', '南通', '温州', '金华', '珠海', '惠州', '中山', '烟台', '泉州', '常州', '嘉兴', '台州', '绍兴', '镇江', '扬州', '泰州', '盐城', '淮安', '徐州', '连云港', '宿迁', '廊坊', '保定', '沧州', '邯郸', '秦皇岛', '唐山', '邢台', '衡水', '张家口', '承德', '吉林', '大庆', '齐齐哈尔', '牡丹江', '佳木斯', '鞍山', '抚顺', '锦州', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛', '三亚', '海口', '桂林', '南宁', '柳州', '北海', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐'];
  for (const city of cities) {
    if (query.includes(city)) {
      return city;
    }
  }
  return null;
}

/**
 * 从文本中提取日期
 * @param {string} query - 用户查询
 * @returns {string|null} 日期描述或 null
 */
function extractDate(query) {
  if (query.includes('今天') || query.includes('今日')) return '今天';
  if (query.includes('明天') || query.includes('明日')) return '明天';
  if (query.includes('后天') || query.includes('后日')) return '后天';
  if (query.includes('昨天') || query.includes('昨日')) return '昨天';
  if (query.includes('前天') || query.includes('前一日')) return '前天';
  return null;
}

/**
 * LLM 意图分析提示词模板
 * 用于让 AI 分析用户查询的意图、拆分任务、识别所需能力
 */
const INTENT_ANALYSIS_PROMPT = `你是意图分析专家，专注于精准理解用户需求。

【核心任务】
1. 精准意图识别：理解用户Query的真实意图
2. 追问检测：判断信息是否完整，是否需要追问澄清
3. 任务拆解：将复杂任务分解为可执行的步骤
4. 能力识别：识别完成任务所需的能力类型

【意图分类】
- greeting: 问候、打招呼、感谢
- chat: 闲聊、无特定目的的对话
- knowledge_query: 需要查询本地知识库/文档资料
- web_query: 需要搜索互联网信息
- weather_query: 需要查询天气预报
- location_query: 需要查询地理位置/行政区划
- file_read: 需要读取文件/代码/配置
- file_write: 需要创建或写入文件
- file_edit: 需要修改文件内容
- code_execute: 需要编写或执行代码
- command_execute: 需要执行系统命令
- image_understand: 需要理解图片内容
- document_understand: 需要理解PDF/Word等文档
- data_process: 需要处理或分析数据
- multi_step: 需要多个步骤组合完成

【分析维度】
1. 意图明确性：
   - 0.9-1.0: 完全明确，可直接执行
   - 0.7-0.9: 比较明确，有较高把握
   - 0.5-0.7: 有线索但不够确定
   - < 0.5: 模糊不清，需要追问

2. 参数完整性：
   - 必需参数是否齐全
   - 是否缺少时间、地点、范围等

3. 任务复杂度：
   - 单步任务：直接执行
   - 多步任务：需要拆解步骤

【能力类型清单】
识别以下能力类型（不要指定具体工具，只返回能力类型）：
- knowledge_search: 知识库检索、文档搜索
- web_search: 互联网搜索
- weather_query: 天气查询
- location_query: 地理位置查询
- file_read: 读取文件内容
- file_write: 创建或写入文件
- file_edit: 修改文件内容
- code_execute: 执行代码
- command_execute: 执行系统命令
- image_understand: 理解图片内容
- document_understand: 理解文档内容
- data_process: 数据处理分析

【追问策略】
当需要追问时：
1. 友好自然，像朋友聊天一样
2. 一次只问一个关键问题
3. 提供3-5个最可能的选项 + "其他"
4. 选项要符合常识和上下文

【输出格式】
{
  "intent": "意图分类",
  "intent_description": "意图的简短描述",
  "confidence": 0.0-1.0,
  "needs_clarification": true/false,
  "clarification_question": "如果需要追问，自然的反问",
  "clarification_options": ["选项1", "选项2", "其他"],
  "required_capabilities": ["所需能力类型，如: knowledge_search, file_read"],
  "task_breakdown": ["步骤1", "步骤2"]
}

用户Query：{query}

请直接输出JSON，不要有其他内容。`;

/**
 * 追问生成提示词模板
 * 用于生成自然语言追问
 */
const CLARIFICATION_PROMPT = `你是智能助手，擅长在用户需求不明确时进行友好的追问澄清。

【当前情境】
- 用户Query：{query}
- 识别到的意图：{intent}
- 当前状态：需要向用户确认缺失的关键信息

【追问原则】
1. 友好亲切：像朋友聊天一样自然，避免生硬的机械感
2. 具体明确：一次只问一个关键问题，不要堆砌多个问题
3. 选项合理：提供3-5个最可能的选项，符合常识和上下文
4. 留有余地：最后一个选项永远是"其他"，允许用户自由输入
5. 语境感知：结合用户Query的主题和意图来生成合理的选项

【选项生成策略】
- 如果询问地点/城市：提供该地区附近的城市或常用城市
- 如果询问时间：提供今天、明天、后天或具体日期选项
- 如果询问主题：提供该领域常见的分类或话题
- 如果无法推断：提供开放式选项如"具体说明"、"随便"等

【输出格式】
{
  "question": "自然的反问（像朋友聊天一样，友好而不生硬）",
  "options": ["选项1", "选项2", "选项3", "其他"],
  "reasoning": "选择这些选项的逻辑依据"
}

请直接输出JSON，不要有其他内容。`;

/**
 * 工具结果缓存类
 * @description 缓存工具执行结果，避免重复调用（TTL: 5分钟）
 */
class ToolResultCache {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
    this.enabled = true;
  }

  get(key) {
    if (!this.enabled) return null;
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value) {
    if (!this.enabled) return;
    this.cache.set(key, { value, expiry: Date.now() + this.ttl });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    let valid = 0;
    let expired = 0;
    for (const [key, item] of this.cache) {
      if (Date.now() > item.expiry) expired++;
      else valid++;
    }
    return { size: this.cache.size, valid, expired };
  }
}

const toolResultCache = new ToolResultCache(300000);

/**
 * 使用 LLM 分析意图
 * @description 调用 AI 模型分析用户意图，适用于复杂查询
 * @param {string} query - 用户查询
 * @param {Object} modelConfig - 模型配置
 * @returns {Object|null} { intent, confidence, needs_clarification, usage, ... }
 */
async function analyzeIntentWithLLM(query, modelConfig) {
  try {
    const prompt = INTENT_ANALYSIS_PROMPT.replace('{query}', query);
    const aiResult = await callAIService(query, prompt, modelConfig.id, modelConfig);
    const response = typeof aiResult === 'string' ? aiResult : (aiResult?.content || '');
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const result = JSON.parse(jsonMatch[0]);
    result.usage = aiResult.usage || null;
    return result;
  } catch (error) {
    console.error('[Intent LLM] 分析失败:', error.message || error.code);
    return null;
  }
}

/**
 * 生成追问
 * @description 当意图不明确时，生成自然语言追问
 * @param {string} query - 用户查询
 * @param {string} intent - 识别的意图
 * @param {Object} modelConfig - 模型配置
 * @returns {Object} { question, options, reasoning }
 */
async function generateClarification(query, intent, modelConfig) {
  try {
    const prompt = CLARIFICATION_PROMPT.replace('{query}', query).replace('{intent}', intent);
    const aiResult = await callAIService(query, prompt, modelConfig.id, modelConfig);
    const response = typeof aiResult === 'string' ? aiResult : (aiResult?.content || '');
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        question: '请问您能提供更多细节吗？',
        options: ['可以', '算了'],
        reasoning: '默认反问'
      };
    }
    const result = JSON.parse(jsonMatch[0]);
    return {
      question: result.question || '请问您能提供更多细节吗？',
      options: Array.isArray(result.options) ? result.options : ['可以', '算了'],
      reasoning: result.reasoning || '默认反问'
    };
  } catch (error) {
    console.error('[Clarification] 生成失败:', error);
    return {
      question: '请问您能提供更多细节吗？',
      options: ['可以', '算了'],
      reasoning: '默认反问'
    };
  }
}

/**
 * 选择工具
 * @description 根据LLM返回的能力需求和触发词匹配选择工具
 * @param {string} intent - 意图名称
 * @param {string} query - 用户查询
 * @param {string} mode - 模式: 'hybrid' | 'knowledge' | 'ai'
 * @param {Array<string>} requiredCapabilities - LLM返回的能力需求
 * @returns {Array<string>} 工具名称数组
 *
 * 选择逻辑:
 * - 优先使用LLM返回的能力需求匹配工具
 * - 如果没有能力需求，使用触发词匹配作为兜底
 * - knowledge 模式：确保包含 search_knowledge_base
 */
function selectTools(intent, query, mode = 'hybrid', requiredCapabilities = []) {
  console.log('\n========== 工具匹配 ==========');
  console.log('[Tool] 意图:', intent);
  console.log('[Tool] 用户Query:', query);
  console.log('[Tool] 对话模式:', mode);
  console.log('[Tool] LLM返回的能力需求:', requiredCapabilities.length > 0 ? requiredCapabilities.join(', ') : '无');

  let selectedTools = [];

  if (requiredCapabilities && requiredCapabilities.length > 0) {
    selectedTools = skillsCenter.matchToolsByCapability
      ? skillsCenter.matchToolsByCapability(requiredCapabilities)
      : [];
    console.log('[Tool] ✓ 能力匹配结果:', selectedTools.join(', '));
  }

  if (selectedTools.length === 0) {
    const triggeredTools = skillsCenter.matchTools(query);
    if (triggeredTools && triggeredTools.length > 0) {
      selectedTools = triggeredTools;
      console.log('[Tool] ✓ 触发词兜底匹配:', selectedTools.join(', '));
    } else {
      console.log('[Tool] ○ 触发词未匹配到任何工具');
    }
  }

  if (mode === 'knowledge') {
    if (!selectedTools.includes('search_knowledge_base')) {
      selectedTools.unshift('search_knowledge_base');
      console.log('[Tool] [Knowledge模式] 添加 search_knowledge_base');
    }
  }

  console.log('[Tool] 最终选择的工具:', selectedTools.join(', ') || '无');
  console.log('==============================');

  return selectedTools;
}

/**
 * 构建工具定义 Prompt
 * @description 将选中的工具格式化为 prompt 片段
 * @param {Array<string>} selectedTools - 选中的工具列表
 * @param {string} query - 用户查询
 * @returns {string} 格式化的工具定义文本
 */
function buildToolDefinitionsPrompt(selectedTools, query) {
  if (!selectedTools || selectedTools.length === 0) {
    return '';
  }
  const toolDefs = skillsCenter.getToolDefinitions();
  const selectedToolSet = new Set(selectedTools);
  const allSkills = skillsCenter.getAllSkillSummaries();
  const skillMap = new Map(allSkills.map(s => [s.name, s]));

  let prompt = '【可用工具】\n';
  for (const toolName of selectedTools) {
    const toolDef = toolDefs.find(t => t.function.name === toolName);
    if (toolDef) {
      prompt += `【${toolDef.function.name}】\n`;
      prompt += `${toolDef.function.description}\n`;
      const params = toolDef.function.parameters?.properties || {};
      const paramNames = Object.keys(params);
      if (paramNames.length > 0) {
        prompt += `参数: ${paramNames.map(name => `${name}`).join(', ')}\n`;
      }
      prompt += '\n';
    }
  }
  return prompt;
}

/**
 * 收集工具结果
 * @description 将多个工具的结果汇总为统一格式
 * @param {Array} toolResults - 工具执行结果数组
 * @returns {Array} 收集后的结果
 */
function collectToolResults(toolResults = []) {
  const collected = [];
  for (const result of toolResults) {
    if (result.tool === 'search_knowledge_base' && result.data) {
      for (const item of result.data) {
        if (item.content || item.textContent) {
          collected.push({
            tool: 'search_knowledge_base',
            content: item.content || item.textContent,
            filename: item.filename,
            metadata: item.metadata
          });
        }
      }
    } else if (result.tool === 'get_weather' && result.data) {
      for (const item of result.data) {
        if (item.success !== false) {
          collected.push({
            tool: 'get_weather',
            ...item
          });
        }
      }
    } else if (result.tool === 'get_location' && result.data) {
      for (const item of result.data) {
        if (item.success !== false) {
          collected.push({
            tool: 'get_location',
            ...item
          });
        }
      }
    }
  }
  return collected;
}

/**
 * 格式化工具结果为上下文字符串
 * @description 将工具执行结果格式化为 AI 对话的上下文
 * @param {Array} allResults - 工具结果数组
 * @param {string} originalQuery - 原始用户查询
 * @returns {string} 格式化的上下文
 */
function formatToolResults(allResults = [], originalQuery = '') {
  console.log('[formatToolResults] 被调用，allResults 数量:', allResults?.length || 0);
  if (allResults.length === 0) {
    console.log('[formatToolResults] 结果为空，直接返回');
    return '';
  }

  const sections = [];

  const hasKnowledgeSearch = allResults.some(r => r.tool === 'search_knowledge_base');
  if (hasKnowledgeSearch) {
    const kbResults = allResults.filter(r => r.tool === 'search_knowledge_base');
    const hasContent = kbResults.some(r => r.content && r.content.trim().length > 0);

    if (!hasContent) {
      sections.push(`【知识库】未找到与"${originalQuery}"相关的文档，请尝试其他查询或调整关键词。`);
    } else {
      for (const r of kbResults) {
        if (r.content) {
          sections.push(`【知识库】${r.filename || ''}\n${r.content}`);
        }
      }
    }
  }

  for (const r of allResults) {
    if (r.tool === 'search_knowledge_base') continue;
    console.log(`[formatToolResults] 工具 ${r.tool} 的结果:`, {
      textContent: r.textContent ? r.textContent.substring(0, 100) : '空',
      success: r.success,
      content: r.content ? r.content.substring(0, 100) : '空'
    });
    if (r.textContent) {
      sections.push(`【${r.tool}】\n${r.textContent}`);
    }
  }

  const resultContext = sections.join('\n---\n');
  console.log('[formatToolResults] 最终上下文长度:', resultContext.length, '字符');
  console.log('[formatToolResults] 最终上下文内容:\n' + resultContext.substring(0, 500));
  return resultContext;
}

/**
 * 构建系统提示词
 * @description 组装完整的 system prompt 给 AI
 *
 * @param {Array} selectedTools - 选中的工具列表
 * @param {string} context - 工具执行结果上下文
 * @param {string} originalQuery - 原始用户查询
 * @param {string} historyContext - 对话历史上下文
 * @param {string} botName - 机器人名称
 * @param {string} userName - 用户名称
 * @param {string} relationship - 用户关系
 * @param {string} mode - 模式: 'hybrid' | 'knowledge' | 'agent'
 * @returns {string} 完整的 system prompt
 *
 * Prompt 结构:
 * 1. 角色设定（你是XX，一个友善的AI助手）
 * 2. 用户信息（用户名、关系、对话风格）
 * 3. 能力范围（根据 mode 不同而变化）
 * 4. 工具定义（可用工具及参数）
 * 5. 对话历史
 * 6. 相关上下文（工具执行结果）
 */
function buildSystemPrompt(selectedTools, context, originalQuery, historyContext = '', botName = '助手', userName = null, relationship = null, mode = 'hybrid') {
  const RELATIONSHIPS = {
    '朋友': { title: '好朋友', pronouns: '你', style: '轻松随意、友好亲切' },
    '恋人': { title: '亲爱的', pronouns: '你', style: '温柔体贴、浪漫甜蜜' },
    '同事': { title: '同事', pronouns: '你', style: '专业友好、适度亲近' },
    '老师': { title: '老师', pronouns: '您', style: '尊敬谦虚、礼貌周到' },
    '上司': { title: '上司', pronouns: '您', style: '敬畏、感恩' },
    '开发者': { title: '开发者', pronouns: '您', style: '尊敬、技术性' }
  };

  let prompt = `【角色设定】\n你是${botName}，一个友善的AI助手。`;
  if (userName) {
    prompt += `\n用户名叫${userName}。`;
  }
  if (relationship && RELATIONSHIPS[relationship]) {
    const rel = RELATIONSHIPS[relationship];
    prompt += `\n与用户关系：${rel.title}，对话风格：${rel.style}。`;
  }

  prompt += '\n\n【能力范围】\n';
  if (mode === 'knowledge') {
    prompt += '1. 搜索本地知识库获取相关资料（主要功能）\n';
    prompt += '2. 回答各种问题，提供信息和建议\n';
    prompt += '3. 查询天气、位置等实用信息\n';
  } else if (mode === 'agent') {
    prompt += '1. 智能分析和处理各种任务\n';
    prompt += '2. 熟练使用各种工具完成任务\n';
    prompt += '3. 回答各种问题，提供信息和建议\n';
    prompt += '4. 查询天气、位置等实用信息\n';
  } else {
    prompt += '1. 回答各种问题，提供信息和建议\n';
    prompt += '2. 搜索本地知识库获取相关资料\n';
    prompt += '3. 查询天气、位置等实用信息\n';
    prompt += '4. 协助处理文件和数据分析\n';
  }

  if (selectedTools && selectedTools.length > 0) {
    prompt += buildToolDefinitionsPrompt(selectedTools, originalQuery);
  }

  if (historyContext) {
    prompt += `\n【对话历史】\n${historyContext}\n`;
  }

  if (context) {
    prompt += `\n【相关上下文】\n${context}\n`;
  }

  prompt += '\n\n【重要提醒】\n';
  prompt += '1. 工具已由系统自动执行，请在回答中直接使用上述【相关上下文】中的信息\n';
  prompt += '2. 不要在回复中输出工具调用格式（如<toolcall>等）\n';
  prompt += '3. 如果【相关上下文】中信息不足，请基于已有知识回答\n';

  prompt += '\n请根据上述信息回答用户问题。';

  return prompt;
}

/**
 * 执行单个工具
 * @description 调用 skillsCenter 执行指定工具
 *
 * @param {string} toolName - 工具名称
 * @param {string} query - 查询文本
 * @param {Object} modelConfig - 模型配置
 * @param {Object} toolContext - 工具执行上下文
 * @returns {Object} { tool, success, data, error }
 */
async function executeSingleTool(toolName, query, modelConfig, toolContext = {}) {
  console.log(`[Tool Executor] 处理工具: ${toolName}`);
  console.log(`[Tool Executor] toolContext.originalQuery: "${toolContext.originalQuery}"`);
  console.log(`[Tool Executor] query: "${query}"`);
  try {
    const context = {
      originalQuery: toolContext.originalQuery || query,
      model: modelConfig.modelId || modelConfig.id,
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.url,
    };
    console.log(`[Tool Executor] context.originalQuery: "${context.originalQuery}"`);

    let args = {};
    switch (toolName) {
      case 'search_knowledge_base':
        args = { query, description: `搜索知识库: ${query.substring(0, 50)}` };
        break;
      case 'recognize_image':
      case 'extract_pdf_text':
      case 'analyze_video':
        args = { query, description: `处理文件: ${query.substring(0, 50)}` };
        break;
      case 'get_weather':
    case 'weather':
      args = {
        city: extractCity(query) || '北京',
        date: extractDate(query) || '今天',
        description: `查询天气: ${query.substring(0, 50)}`
      };
      break;
      case 'get_location':
        args = { query, description: `查询位置: ${query.substring(0, 50)}` };
        break;
      default:
        args = { query, description: `执行工具: ${toolName}` };
    }

    const result = await skillsCenter.executeTool(toolName, args, context);
    console.log(`[executeSingleTool] ${toolName} 返回:`, JSON.stringify(result).substring(0, 300));
    const hasResult = (result.results && result.results.length > 0) || result.output || result.data || result.textContent;
    const success = result.success && !!hasResult;

    let content = '';
    if (result.results && result.results.length > 0) {
      content = result.results.map(r => {
        if (typeof r === 'string') return r;
        return r.content || r.text || r.output || JSON.stringify(r);
      }).join('\n');
    } else if (result.output) {
      content = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
    } else if (result.data) {
      content = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    } else if (result.textContent) {
      content = typeof result.textContent === 'string' ? result.textContent : JSON.stringify(result.textContent);
    }

    return {
      tool: toolName,
      success,
      content: content,
      textContent: result.textContent || null,
      data: result.results || result.data || [result],
      rawData: result.data || result.textContent || null,
      error: result.error
    };
  } catch (error) {
    console.error(`[Tool Executor] 工具执行失败: ${toolName}`, error);
    return { tool: toolName, success: false, error: error.message };
  }
}

/**
 * 并行执行多个工具
 * @description 使用 Promise.all 并行执行选中的工具
 *
 * @param {Array<string>} selectedTools - 工具名称数组
 * @param {string} query - 查询文本
 * @param {Object} modelConfig - 模型配置
 * @param {Object} toolContext - 工具上下文
 * @returns {Array<Object>} 工具执行结果数组
 */
async function executeTools(selectedTools, query, modelConfig, toolContext = {}) {
  if (!selectedTools || selectedTools.length === 0) {
    return [];
  }

  console.log(`[Tools Executor] 开始执行 ${selectedTools.length} 个工具`);
  const startTime = Date.now();

  const toolPromises = selectedTools.map(toolName =>
    executeSingleTool(toolName, query, modelConfig, toolContext)
  );

  const results = await Promise.all(toolPromises);

  const elapsed = Date.now() - startTime;
  console.log(`[Tools Executor] 并行执行完成，耗时: ${elapsed}ms`);

  return results;
}

/**
 * 解析 AI 响应中的工具调用
 * @description 从 AI 回复中提取 <invoke name="...">...</invoke> 格式的工具调用
 * @param {string} aiResponse - AI 响应文本
 * @returns {Array<{name: string, arguments: Object}>} 解析出的工具调用
 */
function parseToolCalls(aiResponse) {
  const toolCalls = [];
  const functionCallPattern = /<invoke name="([^"]+)">\s*<parameter name="([^"]+)">([^<]*)<\/parameter>/g;
  let match;

  while ((match = functionCallPattern.exec(aiResponse)) !== null) {
    const toolName = match[1];
    const paramName = match[2];
    const paramValue = match[3].trim();

    let existingCall = toolCalls.find(tc => tc.name === toolName);
    if (!existingCall) {
      existingCall = { name: toolName, arguments: {} };
      toolCalls.push(existingCall);
    }
    existingCall.arguments[paramName] = paramValue;
  }

  return toolCalls;
}

/**
 * 执行解析出的工具调用
 * @param {Object} toolCall - { name, arguments }
 * @param {Object} modelConfig - 模型配置
 * @returns {Object} 执行结果
 */
async function executeToolCall(toolCall, modelConfig = null) {
  const { name, arguments: args } = toolCall;
  console.log(`[Tool Call] 执行: ${name}`, args);

  try {
    const result = await executeSingleTool(name, args.query || args.city || args.location || '', modelConfig, {});
    return result;
  } catch (error) {
    console.error(`[Tool Call] 执行失败: ${name}`, error);
    return { tool: name, success: false, error: error.message };
  }
}

/**
 * 构建工具结果消息
 * @description 将工具执行结果格式化为可读消息
 * @param {Object} toolCall - 工具调用信息
 * @param {Object} result - 执行结果
 * @returns {string} 格式化的结果消息
 */
function buildToolResultMessage(toolCall, result) {
  if (result.success) {
    const data = Array.isArray(result.data) ? result.data : [result.data];
    const content = data.map(d => {
      if (typeof d === 'string') return d;
      if (d.content) return d.content;
      if (d.textContent) return d.textContent;
      if (d.description) return d.description;
      return JSON.stringify(d);
    }).join('\n');
    return `[${toolCall.name}] 执行成功:\n${content}`;
  } else {
    return `[${toolCall.name}] 执行失败: ${result.error || '未知错误'}`;
  }
}

/**
 * 调用 AI 服务
 * @description 封装 AI API 调用逻辑
 *
 * @param {string} query - 用户消息
 * @param {string} systemPrompt - 系统提示词
 * @param {string} modelId - 模型ID
 * @param {Object} modelConfig - 模型配置 { url, apiKey, protocol }
 * @returns {Object|string} AI 回复
 */
async function callAIService(query, systemPrompt, modelId, modelConfig) {
  const axios = require('axios');
  const { buildAPIURL, buildRequestBody, extractResponseContent } = require('./ai-service');

  const protocol = modelConfig.protocol || 'openai';
  const baseURL = modelConfig.url;
  const model = modelConfig.modelId || modelId;

  const fullURL = buildAPIURL(baseURL, protocol);
  // console.log('[AI Service] 模型配置 - protocol:', protocol, 'baseURL:', baseURL, 'modelId:', model);
  // console.log('[AI Service] 调用 URL:', fullURL);
  const requestBody = buildRequestBody(model, systemPrompt, query);

  try {
    const response = await axios.post(fullURL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`
      },
      timeout: 120000
    });

    return extractResponseContent(response);
  } catch (error) {
    console.error('[AI Service] 调用失败:', error.message || error.code || error);
    throw error;
  }
}

/**
 * 意图分析（强制使用LLM）
 * @description 所有模式统一使用LLM进行意图分析
 *
 * @param {string} query - 用户查询
 * @param {Object} modelConfig - 模型配置
 * @param {string} mode - 模式: 'hybrid' | 'knowledge' | 'ai'
 * @param {string} sessionId - 会话ID
 * @returns {Object} { intent, confidence, needsClarification, requiredCapabilities, ... }
 */
async function analyzeIntentWithFallback(query, modelConfig, mode = 'hybrid', sessionId = null) {
  console.log('\n========== 意图分析 ==========');
  console.log('[Intent] 用户Query:', query);
  console.log('[Intent] 对话模式:', mode);
  console.log('[Intent] 使用LLM进行意图分析...');

  const llmAnalysis = await analyzeIntentWithLLM(query, modelConfig);

  if (llmAnalysis && llmAnalysis.intent) {
    console.log('[Intent] ✓ LLM分析成功');
    console.log('[Intent]   - 意图:', llmAnalysis.intent);
    console.log('[Intent]   - 意图描述:', llmAnalysis.intent_description || 'N/A');
    console.log('[Intent]   - 置信度:', llmAnalysis.confidence);
    console.log('[Intent]   - 需要追问:', llmAnalysis.needs_clarification);

    if (llmAnalysis.required_capabilities && llmAnalysis.required_capabilities.length > 0) {
      console.log('[Intent]   - 所需能力:', llmAnalysis.required_capabilities.join(', '));
    }

    if (llmAnalysis.task_breakdown && llmAnalysis.task_breakdown.length > 0) {
      console.log('[Intent]   - 任务拆解:', llmAnalysis.task_breakdown.join(' → '));
    }

    if (llmAnalysis.usage) {
      console.log('[Intent]   - Token消耗:', llmAnalysis.usage.total_tokens, 'tokens');
    }

    const clarificationId = `clarification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (llmAnalysis.needs_clarification) {
      console.log('[Intent] ⚠️ 需要追问');
      const clarification = await generateClarification(query, llmAnalysis.intent, modelConfig);
      console.log('\n========== 追问 ==========');
      console.log('[Intent]   - 追问问题:', clarification.question);
      console.log('[Intent]   - 追问选项:', clarification.options.join(', '));
      console.log('==============================\n');
      const clarificationOptions = Array.isArray(clarification.options) ? clarification.options : ['可以', '算了'];
      saveClarification(clarificationId, clarification.question, clarificationOptions, sessionId);

      return {
        intent: llmAnalysis.intent,
        confidence: llmAnalysis.confidence,
        source: 'llm',
        needsClarification: true,
        clarification_id: clarificationId,
        clarificationQuestion: clarification.question,
        clarificationOptions: clarificationOptions,
        reasoning: clarification.reasoning,
        usage: llmAnalysis.usage,
        requiredCapabilities: llmAnalysis.required_capabilities || []
      };
    }

    console.log('[Intent] ✓ 无需追问，继续处理');

    return {
      intent: llmAnalysis.intent,
      confidence: llmAnalysis.confidence || 0.5,
      source: 'llm',
      needsClarification: false,
      usage: llmAnalysis.usage,
      requiredCapabilities: llmAnalysis.required_capabilities || [],
      taskBreakdown: llmAnalysis.task_breakdown || []
    };
  }

  console.log('[Intent] ✗ LLM分析失败，使用默认意图');
  return {
    intent: 'general',
    confidence: 0.5,
    source: 'llm',
    needsClarification: false,
    requiredCapabilities: [],
    taskBreakdown: []
  };
}

/**
 * 处理追问回应
 * @description 处理用户对追问的回应，将响应与原始问题组合后重新处理
 *
 * @param {string} clarificationId - 追问ID
 * @param {string} userResponse - 用户的响应
 * @param {string} originalQuery - 原始问题（如果已知）
 * @param {string} sessionId - 会话ID
 * @param {string} mode - 模式
 * @returns {Object} { type: 'retry'|'text', message?, sessionId?, mode? }
 */
async function processClarificationResponse(clarificationId, userResponse, originalQuery, sessionId, mode = 'hybrid') {
  console.log('[Clarification] processClarificationResponse 参数:', { clarificationId, userResponse, originalQuery, sessionId, mode });
  const clarification = respondToClarification(clarificationId, userResponse);

  if (!clarification.success) {
    console.log('[Clarification] 追问不存在或已过期');
    return {
      type: 'text',
      content: '抱歉，追问已过期，请重新发送您的问题。'
    };
  }

  const fullQuery = buildFullQuery(originalQuery, clarification.question, userResponse);

  console.log('[Clarification] 用户响应:', userResponse);
  console.log('[Clarification] 组合后查询:', fullQuery);

  return {
    type: 'retry',
    message: fullQuery,
    sessionId,
    mode,
    originalQuery,
    userResponse,
    clarificationId
  };
}

/**
 * 构建完整查询
 * @description 将用户的响应与原始问题组合成完整查询
 *
 * @param {string} originalQuery - 原始问题
 * @param {string} clarificationQuestion - 追问问题（仅用于日志）
 * @param {string} userResponse - 用户的响应
 * @returns {string} 组合后的完整查询
 *
 * 组合策略：直接拼接，让后续意图分析处理语义
 * 例：原始"天气怎么样" + 响应"北京" → "天气怎么样 北京"
 *     后续意图分析会正确识别为"北京天气"
 */
function buildFullQuery(originalQuery, clarificationQuestion, userResponse) {
  if (!userResponse || !userResponse.trim()) {
    return originalQuery || '';
  }

  if (!originalQuery || !originalQuery.trim()) {
    return userResponse.trim();
  }

  const combined = originalQuery.trim() + ' ' + userResponse.trim();
  console.log('[Clarification] 组合查询:', combined);
  return combined;
}

/**
 * 处理聊天消息（主入口）
 * @description 完整的聊天处理流程
 *
 * @param {string} message - 用户消息
 * @param {string} sessionId - 会话ID
 * @param {Object} modelConfig - 模型配置
 * @param {string} mode - 模式: 'hybrid' | 'knowledge' | 'agent'
 * @param {string} originalQuery - 原始查询（追问时传递，用于保留日期等上下文信息）
 * @returns {Object} { type: 'text'|'clarification', content?, intent?, tools?, ... }
 *
 * 处理流程:
 * 1. 意图分析 (analyzeIntentWithFallback) - 根据 mode 决定是否使用 LLM
 * 2. 如果需要追问，返回追问类型
 * 3. 选择工具 (selectTools) - 根据 mode 决定策略
 * 4. 执行工具 (executeTools)
 * 5. 格式化结果为上下文 (formatToolResults)
 * 6. 构建系统提示词 (buildSystemPrompt) - 根据 mode 决定策略
 * 7. 调用 AI (callAIService)
 * 8. 保存会话消息
 */
async function processChatMessage(message, sessionId, modelConfig, mode = 'hybrid', originalQuery = null, skipUserMessageSave = false) {
  console.log('========== 开始处理用户消息 ==========');
  console.log('[用户输入]:', message);
  console.log('[使用模型]:', modelConfig.name || modelConfig.id);
  console.log('[对话模式]:', mode);
  console.log('[会话保存]:', skipUserMessageSave ? '跳过用户消息保存' : '正常保存');

  const totalTokens = { prompt: 0, completion: 0, total: 0 };
  const modelName = modelConfig.name || modelConfig.id;

  // 意图分析 - 根据 mode 决定是否使用 LLM
  const intentResult = await analyzeIntentWithFallback(message, modelConfig, mode, sessionId);
  if (intentResult.usage) {
    totalTokens.prompt += intentResult.usage.prompt_tokens || 0;
    totalTokens.completion += intentResult.usage.completion_tokens || 0;
    totalTokens.total += intentResult.usage.total_tokens || 0;
  }
  console.log('[Intent] Token消耗:意图分析', intentResult.usage?.total_tokens || 0, 'tokens');

  if (intentResult.needsClarification) {
    if (sessionId && intentResult.usage) {
      const allSessions = sessionService.getAllSessions();
      const sessionData = allSessions.find(s => s.id === sessionId);
      if (sessionData) {
        const currentTokenUsage = sessionData.tokenUsage || { prompt: 0, completion: 0, total: 0 };
        sessionService.updateSession(sessionId, {
          tokenUsage: {
            prompt: currentTokenUsage.prompt + totalTokens.prompt,
            completion: currentTokenUsage.completion + totalTokens.completion,
            total: currentTokenUsage.total + totalTokens.total
          }
        });
      }
    }

    console.log('========== 消息处理完成 ==========');
    return {
      type: 'clarification',
      clarification_id: intentResult.clarification_id,
      question: intentResult.clarificationQuestion,
      options: intentResult.clarificationOptions,
      intent: intentResult.intent,
      reasoning: intentResult.reasoning,
      originalQuery: message,
      tokenUsage: totalTokens
    };
  }

  const selectedTools = selectTools(
    intentResult.intent,
    message,
    mode,
    intentResult.requiredCapabilities || []
  );
  console.log('[ChatService] 意图来源:', intentResult.source);
  console.log('[ChatService] 选择的工具:', selectedTools);
  console.log('[ChatService] 对话模式:', mode);

  const resultSources = [];

  const toolContext = { originalQuery: originalQuery };

  let toolResults = [];

  if (mode === 'knowledge') {
    const kbTools = ['search_knowledge_base'];
    const toolsToExecute = selectedTools.filter(t => !kbTools.includes(t));

    if (toolsToExecute.length > 0) {
      console.log('[ChatService] Knowledge模式：执行工具...');
      toolResults = await executeTools(toolsToExecute, message, modelConfig, toolContext);
      console.log('[ChatService] 工具执行完成，结果数量:', toolResults.length);
      if (toolResults.some(r => r.success)) {
        resultSources.push('工具');
      }
    }

    console.log('[ChatService] Knowledge模式：执行知识库检索...');
    const kbResults = await executeTools(kbTools, message, modelConfig, toolContext);
    toolResults = [...toolResults, ...kbResults];
    if (kbResults.some(r => r.success)) {
      resultSources.push('知识库');
    }

    console.log('[ChatService] Knowledge模式：直接返回结果，不调用LLM');
    const context = formatToolResults(toolResults, message);

    if (sessionId && !skipUserMessageSave) {
      sessionService.addSessionMessage(sessionId, { role: 'user', content: message });
    }
    if (sessionId) {
      sessionService.addSessionMessage(sessionId, { role: 'assistant', content: context, tokenUsage: totalTokens });
    }

    console.log('========== 消息处理完成 ==========');
    console.log('[ChatService] 返回结果来源:', resultSources.join(', '));
    return {
      type: 'text',
      content: context,
      intent: intentResult.intent,
      source: intentResult.source,
      tools: selectedTools,
      toolResults: toolResults,
      resultSources: resultSources,
      tokenUsage: totalTokens
    };
  } else if (mode === 'ai') {
    if (selectedTools.length > 0) {
      console.log('[ChatService] AI模式：执行工具...');
      toolResults = await executeTools(selectedTools, message, modelConfig, toolContext);
      console.log('[ChatService] 工具执行完成，结果数量:', toolResults.length);
      if (toolResults.some(r => r.success)) {
        resultSources.push('工具');
      }
    } else {
      console.log('[ChatService] AI模式：无工具，直接生成回复');
    }
  } else {
    const kbTools = ['search_knowledge_base'];
    const toolsToExecute = selectedTools.filter(t => !kbTools.includes(t));

    if (toolsToExecute.length > 0) {
      console.log('[ChatService] Hybrid模式：执行工具...');
      toolResults = await executeTools(toolsToExecute, message, modelConfig, toolContext);
      console.log('[ChatService] 工具执行完成，结果数量:', toolResults.length);
      if (toolResults.some(r => r.success)) {
        resultSources.push('工具');
      }
    }

    console.log('[ChatService] Hybrid模式：执行知识库检索...');
    const kbResults = await executeTools(kbTools, message, modelConfig, toolContext);
    if (kbResults.length > 0) {
      toolResults = [...toolResults, ...kbResults];
      if (kbResults.some(r => r.success)) {
        resultSources.push('知识库');
      }
    }
  }

  resultSources.push('AI');

  const context = formatToolResults(toolResults, message);
  const systemPrompt = buildSystemPrompt(selectedTools, context, message, '', '助手', null, null, mode);

  console.log('\n========== LLM回复生成 ==========');
  console.log('[LLM] 使用模型:', modelConfig.name || modelConfig.id);
  console.log('[LLM] 对话模式:', mode);
  console.log('[LLM] 工具上下文长度:', context.length, '字符');
  console.log('[LLM] 用户Query:', message);
  console.log('[LLM] 工具上下文(context):', context || '(无)');
  console.log('[LLM] 工具上下文长度:', context.length, '字符');
  if (context.length > 0) {
    console.log('[LLM] 工具上下文预览:', context.substring(0, 300) + (context.length > 300 ? '...' : ''));
  }
  console.log('[LLM] 正在调用LLM...');

  const aiResponse = await callAIService(message, systemPrompt, modelConfig.id, modelConfig);
  if (aiResponse.usage) {
    totalTokens.prompt += aiResponse.usage.prompt_tokens || 0;
    totalTokens.completion += aiResponse.usage.completion_tokens || 0;
    totalTokens.total += aiResponse.usage.total_tokens || 0;
  }
  const reply = typeof aiResponse === 'string' ? aiResponse : aiResponse.content;
  console.log('[LLM Response]', modelName, '| 回复消耗:', aiResponse.usage?.total_tokens || 0, 'tokens');
  console.log('[LLM Total]', modelName, '|', totalTokens.total, 'tokens (prompt:', totalTokens.prompt, ', completion:', totalTokens.completion, ')');

  if (sessionId && !skipUserMessageSave) {
    sessionService.addSessionMessage(sessionId, { role: 'user', content: message });
  }
  if (sessionId) {
    sessionService.addSessionMessage(sessionId, { role: 'assistant', content: reply, tokenUsage: totalTokens });
  }

  console.log('========== 消息处理完成 ==========');
  console.log('[ChatService] 返回结果来源:', resultSources.join(', '));

  return {
    type: 'text',
    content: reply,
    intent: intentResult.intent,
    source: intentResult.source,
    tools: selectedTools,
    toolResults: toolResults,
    resultSources: resultSources,
    tokenUsage: totalTokens
  };
}

module.exports = {
  analyzeIntentWithLLM,
  analyzeIntentWithFallback,
  generateClarification,
  selectTools,
  buildSystemPrompt,
  buildToolDefinitionsPrompt,
  collectToolResults,
  formatToolResults,
  executeSingleTool,
  executeTools,
  parseToolCalls,
  executeToolCall,
  buildToolResultMessage,
  callAIService,
  toolResultCache,
  processChatMessage,
  processClarificationResponse
};