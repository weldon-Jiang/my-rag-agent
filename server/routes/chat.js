const express = require('express');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const axios = require('axios');

const router = express.Router();
const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');
const MODELS_FILE = path.join(__dirname, '../../data/models.json');
const skillsCenter = require('../skills');
const { respondToClarification, getPendingClarification, clearSessionClarifications } = require('../clarification');
const toolExecutors = require('../sandbox/tools');

let modelCache = null;

function getModels() {
  if (!modelCache) {
    modelCache = loadModels();
  }
  return modelCache;
}

function invalidateModelCache() {
  modelCache = null;
}

const INTENT_KEYWORDS = {
  search_knowledge: ['搜索', '查询', '找', '查找', '查看', '检索', '相关', '关于', '有没有', '告诉我'],
  recognize_image: ['图片', '照片', '图像', '截图', 'ocr', '识别文字', '图片内容', '照片里', '这张图'],
  extract_pdf: ['pdf', 'ocr', '识别文字', '文档', '文章', '合同', '报告', '说明书', 'pdf文件'],
  analyze_video: ['视频', '录像', '影片', 'movie', 'video', '这段视频', '影像'],
  get_weather: ['天气', '气温', '湿度', '下雨', '晴天', '多云', '冷', '热', '温度', '刮风', '下雨吗'],
  get_location: ['省', '市', '县', '区', '镇', '村', '位置', '在哪里', '经纬度', '海拔', '行政区划', '的人口', '面积', '哪个省', '属于哪个', '位于', '位置在哪'],
  execute_bash: ['执行', '运行', '命令', 'cmd', '终端', 'shell', 'python', '代码', '脚本', '执行命令'],
  read_file: ['查看文件', '读取文件', '打开文件', '文件内容', '显示文件', '查看内容', '文件内容是什么', '看看这个文件', '读取', '查看'],
  web_search: ['搜索', '网上搜索', '百度', '谷歌', '查一下', '网上查', '搜索一下', 'search'],
  rename_bot: ['叫我', '改名', '叫', '名字是', '以后叫你', '你就叫', '以后你就叫', '以后你叫', '我以后叫你', '以后你就是我叫', '你叫', '我就叫', '从现在起你叫', '从现在开始你叫', '从现在开始，你叫', '从现在起，你叫'],
  rename_user: ['我叫', '我是', '以后叫我', '以后你叫我', '你就叫我', '我的名字是', '我以后叫', '我以后就是'],
  set_relationship: ['我是你的', '我是你', '以后我就是你', '以后你就是我', '是你的'],
  ask_name: ['你叫什么', '你是谁', '你的名字', '名字', '叫什麼', '叫甚麼', '你叫什麼', '你叫甚麼', '你叫啥', '你是谁的', '你是啥'],
  general: []
};

const INTENT_TO_TOOLS = {
  search_knowledge: ['search_knowledge_base'],
  recognize_image: ['recognize_image', 'search_knowledge_base'],
  extract_pdf: ['extract_pdf_text', 'search_knowledge_base'],
  analyze_video: ['analyze_video', 'search_knowledge_base'],
  get_weather: ['get_weather'],
  get_location: ['get_location'],
  read_file: ['read_file'],
  web_search: ['web_search'],
  execute_bash: ['bash', 'python', 'ls'],
  general: ['search_knowledge_base']
};

const TOOL_EXECUTOR_MAP = {
  'read_file': toolExecutors.read,
  'write_file': toolExecutors.write,
  'str_replace': toolExecutors.strReplace,
  'bash': toolExecutors.execute,
  'python': toolExecutors.executePythonCode,
  'ls': toolExecutors.listDir,
  'search_knowledge_base': null,
  'recognize_image': null,
  'extract_pdf_text': null,
  'analyze_video': null,
  'get_weather': null,
  'get_location': null,
  'web_search': null,
  'ask_clarification': null
};

function parseToolCalls(aiResponse) {
  const toolCalls = [];
  const toolCallRegex = /<tool_call>\s*<tool name="(\w+)">([\s\S]*?)<\/tool>\s*<\/tool_call>/g;
  
  let match;
  while ((match = toolCallRegex.exec(aiResponse)) !== null) {
    const toolName = match[1];
    const paramsStr = match[2];
    
    const args = {};
    const paramRegex = /<param name="(\w+)">([^<]*)<\/param>/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(paramsStr)) !== null) {
      args[paramMatch[1]] = paramMatch[2];
    }
    
    toolCalls.push({
      name: toolName,
      args: args,
      raw: match[0]
    });
  }
  
  if (toolCalls.length > 0) {
    console.log('[Tool Parser] 解析到工具调用:', toolCalls.map(t => t.name));
  }
  
  return toolCalls;
}

async function executeToolCall(toolCall, modelConfig = null) {
  const { name, args } = toolCall;
  const executor = TOOL_EXECUTOR_MAP[name];
  
  if (executor === null || executor === undefined) {
    console.log(`[Tool Executor] 使用 skillsCenter 执行工具: ${name}`);
    if (!modelConfig) {
      return {
        success: false,
        error: '需要 modelConfig 来执行此工具'
      };
    }
    
    const context = {
      model: modelConfig.modelId || modelConfig.id,
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.url,
    };
    
    const result = await skillsCenter.executeTool(name, args, context);
    console.log(`[Tool Executor] 工具 ${name} 执行结果:`, result.success ? '成功' : '失败');
    return result;
  }
  
  if (!executor) {
    console.log(`[Tool Executor] 未找到工具执行器: ${name}`);
    return {
      success: false,
      error: `未知工具: ${name}`
    };
  }
  
  console.log(`[Tool Executor] 执行工具: ${name}`, args);
  
  try {
    const result = await executor(args);
    console.log(`[Tool Executor] 工具 ${name} 执行结果:`, result.success ? '成功' : '失败');
    return result;
  } catch (error) {
    console.error(`[Tool Executor] 工具执行失败:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

function buildToolResultMessage(toolCall, result) {
  return `<tool_result>
<tool name="${toolCall.name}">
<result>${JSON.stringify(result)}</result>
</tool>
</tool_result>`;
}

async function executeToolLoop(query, systemPrompt, modelConfig, maxIterations = 3) {
  let currentQuery = query;
  let currentSystemPrompt = systemPrompt;
  let iterations = 0;
  let allToolResults = [];
  
  console.log('[Tool Loop] 开始工具调用循环...');
  
  while (iterations < maxIterations) {
    iterations++;
    console.log(`[Tool Loop] 第 ${iterations} 次迭代`);
    
    const response = await callAI(currentQuery, currentSystemPrompt, modelConfig.id);
    
    console.log(`[Tool Loop] AI响应:`, response.substring(0, 200));
    
    const toolCalls = parseToolCalls(response);
    
    if (toolCalls.length === 0) {
      console.log('[Tool Loop] 无更多工具调用，返回最终响应');
      return response;
    }
    
    for (const toolCall of toolCalls) {
      const result = await executeToolCall(toolCall, modelConfig);
      const resultMessage = buildToolResultMessage(toolCall, result);
      allToolResults.push({
        tool: toolCall.name,
        result: result
      });
      
      currentQuery = '';
      currentSystemPrompt = `${currentSystemPrompt}\n\n【工具执行结果】\n${resultMessage}\n\n请根据以上工具执行结果回答用户的问题。如果工具执行失败，请说明错误原因。`;
    }
  }
  
  console.log('[Tool Loop] 达到最大迭代次数，返回最后响应');
  return await callAI(query, currentSystemPrompt, modelConfig.id);
}

function loadModels() {
  try {
    if (fs.existsSync(MODELS_FILE)) {
      const data = fs.readFileSync(MODELS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载模型数据失败:', error);
  }
  return [];
}

function refreshModelCache() {
  modelCache = loadModels();
  return modelCache;
}

const COMMON_CITIES = [
  '北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉',
  '西安', '苏州', '天津', '南京', '长沙', '郑州', '东莞', '青岛',
  '沈阳', '宁波', '昆明', '大连', '厦门', '福州', '无锡', '合肥',
  '济南', '哈尔滨', '长春', '吉林', '大庆', '牡丹江', '佳木斯',
  '齐齐哈尔', '呼和浩特', '南宁', '桂林', '北海', '海口', '三亚',
  '贵阳', '遵义', '昆明', '大理', '丽江', '西藏', '拉萨', '林芝',
  '兰州', '白银', '天水', '张掖', '敦煌', '嘉峪关', '西宁', '格尔木',
  '银川', '石嘴山', '吴忠', '固原', '中卫', '乌鲁木齐', '克拉玛依',
  '唐山', '保定', '沧州', '邯郸', '秦皇岛', '张家口', '廊坊', '衡水',
  '邢台', '承德', '雄安', '深圳', '珠海', '汕头', '佛山', '韶关',
  '湛江', '肇庆', '江门', '茂名', '惠州', '梅州', '汕尾', '河源',
  '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮',
  '杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州',
  '舟山', '台州', '丽水', '义鸟', '东阳', '慈溪', '余姚', '诸暨',
  '南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安',
  '盐城', '扬州', '镇江', '泰州', '宿迁', '昆山', '常熟', '张家港',
  '南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安',
  '宜春', '抚州', '上饶', '武汉', '黄石', '十堰', '宜昌', '襄阳',
  '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施',
  '长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界',
  '益阳', '郴州', '永州', '怀化', '娄底', '湘西', '广州', '深圳',
  '珠海', '东莞', '佛山', '中山', '惠州', '江门', '肇庆', '汕头',
  '潮州', '揭阳', '汕尾', '阳江', '湛江', '茂名', '韶关', '清远',
  '成都', '绵阳', '自贡', '攀枝花', '泸州', '德阳', '广元', '遂宁',
  '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安',
  '巴中', '资阳', '阿坝', '甘孜', '凉山', '贵阳', '遵义', '六盘水',
  '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南', '昆明', '曲靖',
  '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河',
  '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆', '贵阳',
  '福州', '厦门', '泉州', '漳州', '莆田', '宁德', '三明', '南平',
  '龙岩', '南昌', '九江', '赣州', '吉安', '上饶', '抚州', '宜春',
  '沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口',
  '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛', '长春', '吉林',
  '四平', '辽源', '通化', '白山', '松原', '白城', '延边', '哈尔滨',
  '齐齐哈尔', '牡丹江', '佳木斯', '大庆', '鸡西', '双鸭山', '伊春',
  '七台河', '鹤岗', '黑河', '绥化', '大兴安岭', '济南', '青岛', '烟台',
  '威海', '潍坊', '淄博', '临沂', '济宁', '泰安', '德州', '聊城',
  '滨州', '菏泽', '枣庄', '日照', '东营', '兰州', '嘉峪关', '金昌',
  '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西',
  '陇南', '临夏', '甘南', '西宁', '海东', '海北', '黄南', '海南',
  '果洛', '玉树', '海西', '格尔木', '拉萨', '日喀则', '昌都', '林芝',
  '山南', '那曲', '阿里', '乌鲁木齐', '克拉玛依', '吐鲁番', '哈密',
  '阿克苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰', '石河子',
  '阿拉尔', '图木舒克', '五家渠', '北屯', '铁门关', '双河', '可克达拉',
  '昆玉', '胡杨河', '呼和浩特', '包头', '乌海', '赤峰', '通辽',
  '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安', '锡林郭勒',
  '阿拉善', '石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口',
  '承德', '沧州', '廊坊', '衡水', '郑州', '开封', '洛阳', '平顶山',
  '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡',
  '南阳', '商丘', '信阳', '周口', '驻马店', '济源', '武汉', '黄石',
  '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈',
  '咸宁', '随州', '恩施', '仙桃', '潜江', '天门', '神农架',
  '太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城',
  '忻州', '临汾', '吕梁', '西安', '宝鸡', '咸阳', '铜川', '渭南',
  '延安', '汉中', '榆林', '安康', '商洛', '石家庄', '天津', '重庆'
];

function detectLocationInQuery(query) {
  const locationIndicators = ['省', '市', '县', '区', '镇', '村', '街', '路', '道'];
  for (const indicator of locationIndicators) {
    if (query.includes(indicator)) return true;
  }

  for (const city of COMMON_CITIES) {
    if (query.includes(city)) return true;
  }

  const chineseWords = query.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  const dateWeatherWords = [
    '今天', '明天', '后天', '昨天', '前天', '大前天', '大后天',
    '天气', '气温', '温度', '下雨', '晴天', '多云', '阴天', '雪', '雾', '霾',
    '冷', '热', '刮风', '大风', '微风', '风速', '风向', '湿度', '气压',
    '周一', '周二', '周三', '周四', '周五', '周六', '周日', '星期一', '星期二',
    '星期三', '星期四', '星期五', '星期六', '星期日',
    '会不', '会不会', '怎么', '怎么样', '吗', '呢', '吧', '呀', '啊', '哦',
    '测试', '你好', '请问', '帮助', '问题', '回答', '查询', '搜索'
  ];

  for (const word of chineseWords) {
    const isExcluded = dateWeatherWords.some(ex => word.includes(ex));
    if (!isExcluded) {
      const hasCityChar = ['齐', '哈尔', '滨', '口', '门', '港', '岛', '州', '城', '市', '县', '区', '镇', '村', '街', '路', '道', '山', '水', '江', '河', '湖', '海'].some(c => word.includes(c));
      if (hasCityChar || word.length >= 4) {
        return true;
      }
    }
  }

  return false;
}

function extractMatchedIntents(query) {
  const lowerQuery = query.toLowerCase();
  const matchedIntents = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'general') continue;
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        if (!matchedIntents.includes(intent)) {
          matchedIntents.push(intent);
          console.log(`[Router] 匹配到意图: ${intent}, 关键词: ${keyword}`);
        }
        break;
      }
    }
  }

  if (matchedIntents.length === 0) {
    console.log('[Router] 未匹配到任何特定意图，尝试检测地名...');
    if (detectLocationInQuery(query)) {
      matchedIntents.push('get_location');
      console.log(`[Router] 检测到地名，自动添加 get_location 意图`);
    } else {
      console.log('[Router] 未检测到地名');
    }
  }

  return matchedIntents;
}

function analyzeIntent(query) {
  const intents = extractMatchedIntents(query);
  if (intents.length === 0) {
    return 'general';
  }
  return intents[0];
}

function extractEntities(query) {
  const entities = [];
  const chinesePattern = /[\u4e00-\u9fa5]{2,10}/g;
  let match;
  while ((match = chinesePattern.exec(query)) !== null) {
    const text = match[0];
    if (text.length >= 2) {
      entities.push({
        text,
        start: match.index,
        end: match.index + text.length
      });
    }
  }
  return entities;
}

function normalizeChineseQuery(query) {
  const DATE_WORDS = [
    '今天', '明天', '后天', '大后天',
    '昨天', '前天', '大前天',
    '这周', '下周', '上周', '本周',
    '上上周', '下下周'
  ];

  const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

  const DATE_FULL_PATTERNS = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/
  ];

  const DATE_MONTH_DAY = /(\d{1,2})月(\d{1,2})日/;

  const WEATHER_WORDS = ['天气', '气温', '温度', '下雨', '晴天', '多云', '冷', '热', '刮风', '下雨吗', '会不会下雨', '会不会冷', '会不会热', '气温多少', '温度多少', '冷不冷', '热不热', '会不会很热', '会不会很冷', '风大吗', '风大不大'];

  const QUESTION_WORDS = ['吗', '呢', '吧', '呀', '啊', '哦', '么', '怎样', '怎么样', '如何', '多少', '会不会', '会不会', '好不好', '如何'];

  let cleanQuery = query;
  let extractedDate = null;
  let extractedLocation = null;
  let extractedWeather = null;
  let extractedQuestion = null;

  const dateWordsRegex = new RegExp(DATE_WORDS.filter(w => w.length > 1).sort((a, b) => b.length - a.length).map(w => w.replace(/[|^\\]/g, '\\$&')).join('|'));
  const dateMatch = cleanQuery.match(dateWordsRegex);
  if (dateMatch) {
    extractedDate = dateMatch[0];
    cleanQuery = cleanQuery.replace(dateMatch[0], ' ');
  }

  for (const word of WEEKDAY_NAMES) {
    const pattern = new RegExp(word);
    if (pattern.test(cleanQuery)) {
      extractedDate = word;
      cleanQuery = cleanQuery.replace(pattern, ' ');
      break;
    }
  }

  const fullDateMatch = DATE_FULL_PATTERNS.find(p => p.test(cleanQuery));
  if (fullDateMatch) {
    const match = cleanQuery.match(fullDateMatch);
    extractedDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    cleanQuery = cleanQuery.replace(fullDateMatch, ' ');
  }

  const monthDayMatch = DATE_MONTH_DAY.exec(cleanQuery);
  if (monthDayMatch) {
    const today = new Date();
    const year = today.getFullYear();
    extractedDate = `${year}-${monthDayMatch[1].padStart(2, '0')}-${monthDayMatch[2].padStart(2, '0')}`;
    cleanQuery = cleanQuery.replace(DATE_MONTH_DAY, ' ');
  }

  for (const word of WEATHER_WORDS) {
    if (cleanQuery.includes(word)) {
      extractedWeather = word;
      cleanQuery = cleanQuery.replace(word, ' ');
      break;
    }
  }

  for (const word of QUESTION_WORDS) {
    if (cleanQuery.includes(word)) {
      extractedQuestion = word;
      cleanQuery = cleanQuery.replace(word, ' ');
    }
  }

  cleanQuery = cleanQuery.replace(/[?？!！。，、,.\s]+/g, ' ').trim();

  const chineseOnly = cleanQuery.match(/[\u4e00-\u9fa5]+/g);
  if (chineseOnly && chineseOnly.length > 0) {
    for (const word of chineseOnly) {
      if (word.length >= 2 && word.length <= 10) {
        const notDateOrWeather = !DATE_WORDS.includes(word) && !WEEKDAY_NAMES.includes(word);
        const notWeatherWord = !WEATHER_WORDS.some(w => word.includes(w) || w.includes(word));
        if (notDateOrWeather && notWeatherWord && !extractedLocation) {
          extractedLocation = word;
          cleanQuery = cleanQuery.replace(word, ' ');
          break;
        }
      }
    }
  }

  cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

  let intent = 'general';
  const weatherIndicators = ['天气', '气温', '温度', '下雨', '晴天', '多云', '冷', '热', '刮风', '会不会', '很热', '很冷', '风大'];
  for (const indicator of weatherIndicators) {
    if (query.includes(indicator)) {
      intent = 'get_weather';
      break;
    }
  }

  const locationIndicators = ['省', '市', '县', '区', '镇', '村', '位置', '在哪里', '经纬度', '海拔', '人口', '面积'];
  for (const indicator of locationIndicators) {
    if (query.includes(indicator)) {
      intent = 'get_location';
      break;
    }
  }

  return {
    original: query,
    location: extractedLocation,
    date: extractedDate,
    weather: extractedWeather,
    question: extractedQuestion,
    intent,
    cleanedQuery: cleanQuery,
    rawQuery: query
  };
}

function parseQueryStructure(query) {
  const structure = {
    originalQuery: query,
    segments: [],
    entities: [],
    lastEntity: null,
    normalized: null
  };

  const normalized = normalizeChineseQuery(query);
  structure.normalized = normalized;
  console.log('[Parser] 标准化解析结果:', JSON.stringify(normalized, null, 2));

  const separators = ['，', ',', '。', '、', '和', '与', '以及', '还有', '？', '?', '！', '!'];
  const pronounPatterns = ['它', '这个', '那里', '这边'];

  let currentSegment = query;
  let lastIntent = null;
  let lastEntity = null;

  for (const sep of separators) {
    if (currentSegment.includes(sep)) {
      const parts = currentSegment.split(sep).map(p => p.trim()).filter(p => p.length > 0);
      for (const part of parts) {
        const intents = extractMatchedIntents(part);
        const mainIntent = intents.length > 0 ? intents[0] : null;

        let resolvedPart = part;
        let entityUsed = null;

        if (lastEntity && pronounPatterns.some(p => part.includes(p))) {
          for (const pronoun of pronounPatterns) {
            if (part.includes(pronoun)) {
              resolvedPart = part.replace(pronoun, lastEntity);
              console.log(`[Parser] 解析指代词: "${part}" → "${resolvedPart}"`);
              break;
            }
          }
        }

        const segmentIntents = extractMatchedIntents(resolvedPart);
        const entityCandidates = extractEntities(resolvedPart);
        const primaryEntity = entityCandidates.length > 0 ? entityCandidates[entityCandidates.length - 1].text : null;

        structure.segments.push({
          text: resolvedPart,
          originalText: part,
          intents: segmentIntents,
          primaryIntent: segmentIntents.length > 0 ? segmentIntents[0] : null,
          entity: primaryEntity,
          dependsOn: lastIntent && mainIntent !== lastIntent ? structure.segments.length - 1 : null
        });

        if (primaryEntity) {
          lastEntity = primaryEntity;
          structure.lastEntity = primaryEntity;
        }
        if (mainIntent) {
          lastIntent = mainIntent;
        }
      }
      break;
    }
  }

  if (structure.segments.length === 0) {
    const intents = extractMatchedIntents(query);
    const entityCandidates = extractEntities(query);
    const normalizedEntity = normalized.location;

    structure.segments.push({
      text: query,
      originalText: query,
      intents,
      primaryIntent: normalized.intent || (intents.length > 0 ? intents[0] : null),
      entity: normalizedEntity || (entityCandidates.length > 0 ? entityCandidates[entityCandidates.length - 1].text : null),
      date: normalized.date,
      dependsOn: null
    });
  }

  return structure;
}

function selectToolsForSegments(segments) {
  const toolsMap = new Map();

  for (const segment of segments) {
    if (segment.primaryIntent) {
      const intentTools = INTENT_TO_TOOLS[segment.primaryIntent] || [];
      for (const tool of intentTools) {
        if (!toolsMap.has(tool)) {
          toolsMap.set(tool, []);
        }
        toolsMap.get(tool).push(segment);
      }
    }
  }

  return toolsMap;
}

function decomposeTasks(query) {
  const tasks = [];
  const separators = ['，', ',', '。', '、', '和', '与', '以及', '还有'];

  let currentTask = query.trim();

  for (const sep of separators) {
    if (currentTask.includes(sep)) {
      const parts = currentTask.split(sep).map(p => p.trim()).filter(p => p.length > 0);
      for (const part of parts) {
        tasks.push(...decomposeTasks(part));
      }
      return tasks;
    }
  }

  const lowerQuery = currentTask.toLowerCase();
  let foundIntent = null;
  let foundKeyword = null;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'general') continue;
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        foundIntent = intent;
        foundKeyword = keyword;
        break;
      }
    }
    if (foundIntent) break;
  }

  tasks.push({
    query: currentTask,
    intent: foundIntent || 'general',
    originalQuery: query
  });

  return tasks;
}

function matchSkillToTask(task) {
  const intent = task.intent;
  const tools = INTENT_TO_TOOLS[intent] || INTENT_TO_TOOLS.general;
  return tools;
}

async function executeSingleTask(task, modelConfig) {
  const tools = matchSkillToTask(task);
  const results = [];

  for (const toolName of tools) {
    try {
      console.log(`[Task Executor] 执行工具: ${toolName}, 任务: ${task.query}`);

      if (toolName === 'search_knowledge_base') {
        const knowledgeResults = await searchKnowledgeBase(task.query);
        if (knowledgeResults.length > 0) {
          results.push({
            tool: toolName,
            success: true,
            data: knowledgeResults,
            task: task
          });
        }
      } else if (toolName === 'get_weather') {
        const weatherResult = await getWeatherInfo(task.query, modelConfig);
        if (weatherResult.success) {
          results.push({
            tool: toolName,
            success: true,
            data: [weatherResult],
            task: task
          });
        }
      } else if (toolName === 'get_location') {
        const locationResult = await getLocationInfo(task.query, modelConfig);
        if (locationResult.success) {
          results.push({
            tool: toolName,
            success: true,
            data: [locationResult],
            task: task
          });
        }
      } else if (toolName === 'recognize_image') {
        const imageResults = await processImageFiles(task.query, modelConfig);
        if (imageResults.length > 0) {
          results.push({
            tool: toolName,
            success: true,
            data: imageResults,
            task: task
          });
        }
      } else if (toolName === 'extract_pdf_text') {
        const pdfResults = await processPdfFiles(task.query, modelConfig);
        if (pdfResults.length > 0) {
          results.push({
            tool: toolName,
            success: true,
            data: pdfResults,
            task: task
          });
        }
      } else if (toolName === 'analyze_video') {
        const videoResults = await processVideoFiles(task.query, modelConfig);
        if (videoResults.length > 0) {
          results.push({
            tool: toolName,
            success: true,
            data: videoResults,
            task: task
          });
        }
      }
    } catch (error) {
      console.error(`[Task Executor] 工具执行失败: ${toolName}`, error);
    }
  }

  return results;
}

async function executeTasksInParallel(tasks, modelConfig) {
  console.log('[Parallel Executor] 开始并行执行任务，数量:', tasks.length);

  const allResults = await Promise.all(
    tasks.map(task => executeSingleTask(task, modelConfig))
  );

  const flatResults = allResults.flat();
  console.log('[Parallel Executor] 执行完成，总结果数:', flatResults.length);

  return flatResults;
}

function aggregateResults(taskResults, originalQuery) {
  const sections = [];

  sections.push(`用户原始问题：${originalQuery}\n`);

  if (taskResults.length === 0) {
    return { context: '未找到相关信息。', results: [] };
  }

  const successResults = taskResults.filter(r => r.success);

  for (const result of successResults) {
    const task = result.task || {};
    sections.push(`【任务: ${task.query || '未知'}】`);

    if (Array.isArray(result.data)) {
      for (const item of result.data) {
        if (item.textContent) {
          sections.push(item.textContent);
        } else if (item.content) {
          const skillTag = item.skill ? ` [${item.skill}]` : '';
          sections.push(`文件: ${item.filename || 'unknown'}${skillTag}`);
          sections.push(`内容: ${item.content}`);
        }
      }
    }
    sections.push('');
  }

  return {
    context: sections.join('\n'),
    results: successResults
  };
}

function selectTools(intent) {
  const tools = INTENT_TO_TOOLS[intent] || INTENT_TO_TOOLS.general;
  console.log('[Skill Selector] 选择的工具:', tools);
  return tools;
}

function formatToolDescription(toolName) {
  const toolDefs = skillsCenter.getToolDefinitions();
  const toolDef = toolDefs.find(t => t.function.name === toolName);
  if (!toolDef) return '';

  const fn = toolDef.function;
  let desc = `【${fn.name}】\n`;
  desc += `功能: ${fn.description}\n`;
  desc += `参数: `;

  const params = fn.parameters?.properties || {};
  const paramNames = Object.keys(params);
  if (paramNames.length > 0) {
    desc += paramNames.map(name => {
      const p = params[name];
      return `${name}(${p.type}): ${p.description || ''}`;
    }).join(', ');
  } else {
    desc += '无';
  }

  return desc;
}

function buildToolDefinitionsPrompt() {
  const toolDefs = skillsCenter.getToolDefinitions();
  let prompt = '\n\n【可用工具】（当需要时必须使用以下工具）：\n\n';
  
  for (const tool of toolDefs) {
    const fn = tool.function;
    prompt += `【${fn.name}】\n`;
    prompt += `功能: ${fn.description}\n`;
    
    const params = fn.parameters?.properties || {};
    const paramNames = Object.keys(params);
    if (paramNames.length > 0) {
      prompt += `参数:\n`;
      for (const name of paramNames) {
        const p = params[name];
        prompt += `  - ${name} (${p.type}): ${p.description || ''}\n`;
      }
    }
    
    prompt += '\n';
  }
  
  prompt += `【重要】当你需要读取文件内容时，必须使用 read_file 工具并按照以下格式调用：\n`;
  prompt += `<tool_call>\n<tool name="read_file">\n<param name="path">文件路径</param>\n<param name="description">读取文件原因</param>\n</tool>\n</tool_call>\n\n`;
  
  prompt += `当你需要执行其他操作时，也请使用相应的工具。\n`;
  prompt += `注意：不需要输出任何其他内容，只需要输出工具调用或最终回答。\n`;
  
  return prompt;
}

function buildSystemPrompt(selectedTools, context, originalQuery, historyContext = '', botName = DEFAULT_BOT_NAME, userName = null, relationship = null) {
  let prompt = `你是一个智能助手，名称为${botName}。\n\n`;
  
  if (relationship && RELATIONSHIPS[relationship]) {
    const rel = RELATIONSHIPS[relationship];
    prompt += `用户与你的关系：${rel.title}\n`;
    prompt += `称呼方式：使用"${rel.pronouns}"称呼，保持${rel.style}的语气。\n`;
    prompt += `请在回答中用正确的方式称呼用户（如：${rel.title}，您好 / ${rel.title}，你觉得...）。\n\n`;
  } else if (userName) {
    prompt += `用户名称：${userName}\n`;
    prompt += `请在回答中适当称呼用户为"${userName}"，让对话更亲切自然。\n\n`;
  }

  if (historyContext) {
    prompt += `${historyContext}\n\n`;
  }

  if (originalQuery) {
    prompt += `用户当前问题：${originalQuery}\n\n`;
  }

  prompt += buildToolDefinitionsPrompt();

  if (context) {
    prompt += `\n【已查询到的信息】：\n${context}\n\n`;
    prompt += `【重要指示】：\n`;
    prompt += `1. 上面的信息是通过工具查询到的真实数据\n`;
    prompt += `2. 请基于这些信息，直接、简洁地回答用户的问题\n`;
    prompt += `3. 如果用户问天气，请明确说出具体温度和天气状况\n`;
    prompt += `4. 如果用户问位置，请说出具体的省份或国家\n`;
    prompt += `5. 回答要直接，不要说"我查询到"或"根据工具结果"\n`;
    prompt += `6. 只返回回答内容，不要重复查询过程\n`;
  } else {
    prompt += `【指示】：\n`;
    prompt += `1. 请直接回答用户的问题\n`;
    prompt += `2. 如果需要，可以基于你的知识回答\n`;
    prompt += `3. 回答要简洁、直接\n`;
  }

  return prompt;
}

function analyzeHistoryRelevance(currentQuery, history) {
  return '';
}

function extractKeywords(text) {
  
  for (let i = startIndex; i < history.length; i++) {
    const msg = history[i];
    if (msg.role !== 'user') continue;
    
    const historyKeywordsObj = extractKeywords(msg.content);
    const historyKeywords = historyKeywordsObj.words || [];
    const overlap = currentKeywords.filter(k => historyKeywords.includes(k));
    
    console.log(`[Memory] 历史问题 ${i + 1}:`, msg.content.substring(0, 30));
    console.log('[Memory] 历史关键词:', historyKeywords);
    console.log('[Memory] 关键词重叠:', overlap);
    
    if (overlap.length > 0) {
      const assistantMsg = history[i + 1];
      relevantHistory.push({
        question: msg.content,
        answer: assistantMsg && assistantMsg.role === 'assistant' ? assistantMsg.content : ''
      });
    }
  }
  
  if (relevantHistory.length > 0) {
    console.log('[Memory] 找到相关历史消息:', relevantHistory.length);
    const context = relevantHistory.map(h => 
      `之前的问题: ${h.question}\n之前的回答: ${h.answer}`
    ).join('\n\n---\n\n');
    
    return `\n【相关历史对话】\n${context}\n`;
  }
  
  console.log('[Memory] 未找到相关历史消息');
  return '';
}

function extractKeywords(text) {
  const stopWords = ['的', '是', '在', '和', '了', '有', '什么', '怎么', '如何', '为什么', '哪个', '哪些', '吗', '呢', '吧', '啊', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ').split(/\s+/);
  const keywords = words.filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()));
  return [...new Set(keywords)];
}

const DEFAULT_BOT_NAME = '智能助手';

const RELATIONSHIPS = {
  '老板': {
    title: '老板',
    pronouns: '您',
    style: '恭敬、专业'
  },
  '主人': {
    title: '主人',
    pronouns: '您',
    style: '忠诚、服从'
  },
  '爸爸': {
    title: '爸爸',
    pronouns: '你',
    style: '亲情、尊敬'
  },
  '妈妈': {
    title: '妈妈',
    pronouns: '你',
    style: '亲情、温暖'
  },
  '老师': {
    title: '老师',
    pronouns: '您',
    style: '尊敬、谦虚'
  },
  '朋友': {
    title: '朋友',
    pronouns: '你',
    style: '轻松、随意'
  },
  '上帝': {
    title: '上帝',
    pronouns: '您',
    style: '敬畏、崇拜'
  },
  '神': {
    title: '神',
    pronouns: '您',
    style: '敬畏、崇拜'
  },
  'Creator': {
    title: '创造者',
    pronouns: '您',
    style: '敬畏、感恩'
  },
  '开发者': {
    title: '开发者',
    pronouns: '您',
    style: '尊敬、技术性'
  },
};

function extractBotName(query) {
  if (isQuestion(query)) {
    return null;
  }
  
  const patterns = [
    /你叫([^\s，。,]{1,10})/,
    /以后叫你([^\s，。,]{1,10})/,
    /你以后叫([^\s，。,]{1,10})/,
    /称呼你([^\s，。,]{1,10})/,
    /称呼你叫([^\s，。,]{1,10})/,
    /你就叫([^\s，。,]{1,10})/,
    /以后我就叫([^\s，。,]{1,10})/,
    /叫我([^\s，。,]{1,10})/,
    /名字是([^\s，。,]{1,10})/,
    /(?:从现在起|从现在开始|从此刻起)[，,]?(?:你|我就)叫([^\s，。,]{1,10})/,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function isRenameIntent(query) {
  const lowerQuery = query.toLowerCase();
  const keywords = INTENT_KEYWORDS.rename_bot || [];
  return keywords.some(kw => lowerQuery.includes(kw));
}

function isAskNameIntent(query) {
  const lowerQuery = query.toLowerCase();
  const keywords = INTENT_KEYWORDS.ask_name || [];
  return keywords.some(kw => lowerQuery.includes(kw));
}

function isQuestion(query) {
  const trimmed = query.trim();
  if (!trimmed) return false;
  
  const questionPatternsEnd = [
    /[谁吗呢嘛]$/,
    /[吗呢嘛]$/,
    /是[谁啥]$/,
    /是谁[?？]?$/,
    /叫什么[?？]?$/,
    /是啥[?？]?$/,
    /你叫.*[?？]$/,
    /你是谁[?？]?$/,
    /你是.*吗[?？]?$/,
    /.*吗[?？]?$/,
    /.*呢[?？]?$/,
    /.*嘛[?？]?$/,
  ];
  
  if (questionPatternsEnd.some(p => p.test(trimmed))) {
    return true;
  }
  
  const questionPatternsStart = [
    /^你是谁/,
    /^你是.*吗/,
    /^谁.*[?？]$/,
    /^什么.*[?？]$/,
    /^怎[么么].*[?？]$/,
    /^为.*什么.*[?？]$/,
  ];
  
  if (questionPatternsStart.some(p => p.test(trimmed))) {
    return true;
  }
  
  return false;
}

function extractUserName(query) {
  if (isQuestion(query)) {
    return null;
  }
  
  const patterns = [
    /我叫([^\s，。,]{1,10})/,
    /我是([^\s，。,]{1,10})/,
    /我的名字是([^\s，。,]{1,10})/,
    /以后叫我([^\s，。,]{1,10})/,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function isRenameUserIntent(query) {
  const lowerQuery = query.toLowerCase();
  const keywords = INTENT_KEYWORDS.rename_user || [];
  return keywords.some(kw => lowerQuery.includes(kw));
}

function extractRelationship(query) {
  if (isQuestion(query)) {
    return null;
  }
  
  const patterns = [
    /你叫我([^\s，。,]{1,10})/,
    /以后叫我([^\s，。,]{1,10})/,
    /以后你叫我([^\s，。,]{1,10})/,
    /你以后叫我([^\s，。,]{1,10})/,
    /称呼我为([^\s，。,]{1,10})/,
    /称呼我([^\s，。,]{1,10})/,
    /我是你的([^\s，。,]{1,10})/,
    /我是你([^\s，。,]{1,10})/,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      let rel = match[1].trim();
      rel = rel.replace(/[，。,?!?？!]/g, '').trim();
      if (rel.length >= 1 && rel.length <= 10) {
        if (RELATIONSHIPS[rel]) {
          return rel;
        }
        if (Object.values(RELATIONSHIPS).some(r => r.title === rel)) {
          return rel;
        }
        return rel;
      }
    }
  }
  return null;
}

function isSetRelationshipIntent(query) {
  const lowerQuery = query.toLowerCase();
  const keywords = INTENT_KEYWORDS.set_relationship || [];
  return keywords.some(kw => lowerQuery.includes(kw));
}

function getNGrams(text, n = 2) {
  const ngrams = [];
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.push(text.substring(i, i + n));
  }
  return ngrams;
}

function calculateRelevance(content, queryInfo) {
  const lowerContent = content.toLowerCase();
  let score = 0;

  if (lowerContent.includes(queryInfo.full)) {
    score += 150;
  }

  const contentNGrams = getNGrams(lowerContent, 3);
  const queryNGrams = getNGrams(queryInfo.cleanQuery, 3);
  if (contentNGrams.length > 0 && queryNGrams.length > 0) {
    const set1 = new Set(contentNGrams);
    const set2 = new Set(queryNGrams);
    let matchCount = 0;
    set2.forEach(ng => {
      let found = false;
      for (const cng of set1) {
        if (cng.includes(ng) || ng.includes(cng)) {
          found = true;
          break;
        }
      }
      if (found) matchCount++;
    });
    score += (matchCount / set2.size) * 80;
  }

  const queryWords = queryInfo.cleanQuery.split(/\s+/).filter(w => w.length > 1);
  queryWords.forEach(word => {
    if (word.length >= 2) {
      if (lowerContent.includes(word)) {
        score += 40;
      } else {
        for (let i = 0; i <= word.length - 2; i++) {
          const substr = word.substring(i, i + 2);
          if (lowerContent.includes(substr) && substr.length >= 2) {
            score += 15;
            break;
          }
        }
      }
    }
  });

  queryInfo.words.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      score += 30;
    }
  });

  return score;
}

function splitIntoSentences(content) {
  const sentences = [];
  const regex = /[.。！？!?\n]+/g;
  const parts = content.split(regex);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      sentences.push(trimmed);
    }
  }

  if (sentences.length === 0 && content.trim().length > 0) {
    sentences.push(content.trim());
  }

  return sentences;
}

function findBestMatches(content, queryInfo, maxResults = 5) {
  const sentences = splitIntoSentences(content);
  const scored = [];

  for (const sentence of sentences) {
    const score = calculateRelevance(sentence, queryInfo);
    if (score > 0) {
      scored.push({ sentence, score });
    }
  }

  if (scored.length === 0) {
    if (content.length > 0) {
      const windowSize = 200;
      for (let i = 0; i <= content.length - windowSize; i += windowSize / 2) {
        const window = content.substring(i, Math.min(i + windowSize, content.length));
        const score = calculateRelevance(window, queryInfo);
        if (score > 0) {
          scored.push({ sentence: window, score });
        }
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

function extractKeywords(query) {
  const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '什么', '怎么', '为什么', '如何', '吗', '呢', '吧', '啊', '哦', '嗯', '啦', '呀', '怎样', '怎么样', '啥', '咋'];
  const cleanQuery = query.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ');
  const words = cleanQuery.split(/\s+/).filter(w => w.length > 1);
  const keywords = words.filter(w => !stopWords.includes(w) && !/^\d+$/.test(w));
  return {
    full: query.toLowerCase(),
    words: keywords,
    cleanQuery: cleanQuery.trim()
  };
}

async function executeTool(toolName, args, modelConfig) {
  const context = {
    model: modelConfig.modelId || modelConfig.id,
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.url,
  };

  const result = await skillsCenter.executeTool(toolName, args, context);
  return result;
}

async function getWeatherInfo(query, modelConfig) {
  try {
    const weatherSkill = skillsCenter.get('weather-skill');
    if (!weatherSkill) {
      return { success: false, error: '天气技能未注册' };
    }
    const result = await weatherSkill.process(query, modelConfig);
    return result;
  } catch (error) {
    console.error('[getWeatherInfo] 获取天气失败:', error);
    return { success: false, error: error.message };
  }
}

async function getLocationInfo(query, modelConfig) {
  try {
    const locationSkill = skillsCenter.get('location-skill');
    if (!locationSkill) {
      return { success: false, error: '位置技能未注册' };
    }
    const result = await locationSkill.process(query, modelConfig);
    return result;
  } catch (error) {
    console.error('[getLocationInfo] 查询位置失败:', error);
    return { success: false, error: error.message };
  }
}

async function executeTools(selectedTools, query, modelConfig) {
  console.log('[Tool Executor] 准备执行工具，传入参数:');
  console.log('  selectedTools:', selectedTools);
  console.log('  query:', query);
  console.log('  modelConfig:', { modelId: modelConfig.id, url: modelConfig.url });
  
  const queryInfo = extractKeywords(query);
  const results = [];

  for (const toolName of selectedTools) {
    try {
      console.log(`[Tool Executor] 执行工具: ${toolName}`);

      if (toolName === 'search_knowledge_base') {
        const knowledgeResults = await searchKnowledgeBase(query);
        console.log(`[Tool Executor] ${toolName} 返回结果数:`, knowledgeResults.length);
        if (knowledgeResults.length > 0) {
          results.push({
            tool: toolName,
            success: true,
            data: knowledgeResults
          });
        }
      } else if (toolName === 'recognize_image') {
        const imageResults = await processImageFiles(query, modelConfig);
        console.log(`[Tool Executor] ${toolName} 返回结果数:`, imageResults.length);
        if (imageResults.length > 0) {
          results.push({
            tool: toolName,
            success: true,
            data: imageResults
          });
        }
      } else if (toolName === 'extract_pdf_text') {
        const pdfResults = await processPdfFiles(query, modelConfig);
        console.log(`[Tool Executor] ${toolName} 返回结果数:`, pdfResults.length);
        if (pdfResults.length > 0) {
          results.push({
            tool: toolName,
            success: true,
            data: pdfResults
          });
        }
      } else if (toolName === 'analyze_video') {
        const videoResults = await processVideoFiles(query, modelConfig);
        console.log(`[Tool Executor] ${toolName} 返回结果数:`, videoResults.length);
        if (videoResults.length > 0) {
          results.push({
            tool: toolName,
            success: true,
            data: videoResults
          });
        }
      } else if (toolName === 'get_weather') {
        const weatherResult = await getWeatherInfo(query, modelConfig);
        console.log(`[Tool Executor] ${toolName} 返回结果:`, weatherResult.success ? '成功' : '失败');
        if (weatherResult.success) {
          results.push({
            tool: toolName,
            success: true,
            data: [weatherResult]
          });
        }
      } else if (toolName === 'get_location') {
        const locationResult = await getLocationInfo(query, modelConfig);
        console.log(`[Tool Executor] ${toolName} 返回结果:`, locationResult.success ? '成功' : '失败');
        if (locationResult.success) {
          results.push({
            tool: toolName,
            success: true,
            data: [locationResult]
          });
        }
      }
    } catch (error) {
      console.error(`[Tool Executor] 工具执行失败: ${toolName}`, error);
      results.push({
        tool: toolName,
        success: false,
        error: error.message
      });
    }
  }

  console.log('[Tool Executor] 所有工具执行完成，结果汇总:', JSON.stringify(results.map(r => ({ tool: r.tool, success: r.success, dataCount: r.data?.length || 0 })), null, 2));
  return results;
}

async function searchKnowledgeBase(query) {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return [];
    }

    const queryInfo = extractKeywords(query);
    if (queryInfo.words.length === 0 && queryInfo.cleanQuery.length < 2) {
      return [];
    }

    const results = [];
    const files = fs.readdirSync(KNOWLEDGE_DIR);

    for (const filename of files) {
      const filePath = path.join(KNOWLEDGE_DIR, filename);
      const ext = path.extname(filename).toLowerCase();

      if (!fs.statSync(filePath).isFile()) {
        continue;
      }

      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.pdf'].includes(ext)) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const bestMatches = findBestMatches(content, queryInfo, 3);

      if (bestMatches.length > 0 && bestMatches[0].score > 0) {
        const totalScore = bestMatches.reduce((sum, m) => sum + m.score, 0);
        results.push({
          filename,
          content: bestMatches.map(m => m.sentence).join('... '),
          fullContent: content,
          filePath,
          relevance: totalScore,
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, 10);
  } catch (error) {
    console.error('检索知识库时出错:', error);
    return [];
  }
}

async function processImageFiles(query, modelConfig) {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return [];
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    const imageFiles = files.filter(filename => {
      const ext = path.extname(filename).toLowerCase();
      return imageExtensions.includes(ext);
    });

    if (imageFiles.length === 0) {
      return [];
    }

    const results = [];
    const queryInfo = extractKeywords(query);

    for (const filename of imageFiles) {
      const filePath = path.join(KNOWLEDGE_DIR, filename);

      const file = { filepath: filePath, filename };

      const context = {
        model: modelConfig.modelId || modelConfig.id,
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.url,
      };

      const skillResult = await skillsCenter.processFile(file, context);

      if (skillResult.success && (skillResult.textContent || skillResult.content)) {
        const textContent = skillResult.textContent || skillResult.content;
        const bestMatches = findBestMatches(textContent, queryInfo, 2);

        if (bestMatches.length > 0 && bestMatches[0].score > 0) {
          results.push({
            filename: skillResult.filename,
            content: bestMatches.map(m => m.sentence).join('... '),
            fullContent: textContent,
            skill: skillResult.skill,
            metadata: skillResult.metadata,
            relevance: bestMatches.reduce((sum, m) => sum + m.score, 0),
          });
        }
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, 5);
  } catch (error) {
    console.error('处理图片文件时出错:', error);
    return [];
  }
}

async function processPdfFiles(query, modelConfig) {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return [];
    }

    const files = fs.readdirSync(KNOWLEDGE_DIR);
    const pdfFiles = files.filter(filename => {
      const ext = path.extname(filename).toLowerCase();
      return ext === '.pdf';
    });

    if (pdfFiles.length === 0) {
      return [];
    }

    const results = [];
    const queryInfo = extractKeywords(query);

    for (const filename of pdfFiles) {
      const filePath = path.join(KNOWLEDGE_DIR, filename);

      const file = { filepath: filePath, filename };

      const context = {
        model: modelConfig.modelId || modelConfig.id,
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.url,
      };

      const skillResult = await skillsCenter.processFile(file, context);

      if (skillResult.success && (skillResult.textContent || skillResult.content)) {
        const textContent = skillResult.textContent || skillResult.content;
        const bestMatches = findBestMatches(textContent, queryInfo, 2);

        if (bestMatches.length > 0 && bestMatches[0].score > 0) {
          results.push({
            filename: skillResult.filename,
            content: bestMatches.map(m => m.sentence).join('... '),
            fullContent: textContent,
            skill: skillResult.skill,
            metadata: skillResult.metadata,
            relevance: bestMatches.reduce((sum, m) => sum + m.score, 0),
          });
        }
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, 5);
  } catch (error) {
    console.error('处理 PDF 文件时出错:', error);
    return [];
  }
}

async function processVideoFiles(query, modelConfig) {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return [];
    }

    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'];
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    const videoFiles = files.filter(filename => {
      const ext = path.extname(filename).toLowerCase();
      return videoExtensions.includes(ext);
    });

    if (videoFiles.length === 0) {
      return [];
    }

    const results = [];
    const queryInfo = extractKeywords(query);

    for (const filename of videoFiles) {
      const filePath = path.join(KNOWLEDGE_DIR, filename);

      const file = { filepath: filePath, filename };

      const context = {
        model: modelConfig.modelId || modelConfig.id,
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.url,
      };

      const skillResult = await skillsCenter.processFile(file, context);

      if (skillResult.success && (skillResult.textContent || skillResult.content)) {
        const textContent = skillResult.textContent || skillResult.content;
        const bestMatches = findBestMatches(textContent, queryInfo, 2);

        if (bestMatches.length > 0 && bestMatches[0].score > 0) {
          results.push({
            filename: skillResult.filename,
            content: bestMatches.map(m => m.sentence).join('... '),
            fullContent: textContent,
            skill: skillResult.skill,
            metadata: skillResult.metadata,
            relevance: bestMatches.reduce((sum, m) => sum + m.score, 0),
          });
        }
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, 5);
  } catch (error) {
    console.error('处理视频文件时出错:', error);
    return [];
  }
}

function buildAPIURL(baseURL, protocol) {
  const url = baseURL.replace(/\/$/, '');

  if (protocol === 'minimax') {
    if (url.includes('/chat/completions') || url.includes('v1/chat')) {
      return url;
    }
    return url;
  }

  if (protocol === 'openai' || protocol === 'chat') {
    if (url.includes('/chat/completions') || url.includes('v1/chat')) {
      return url;
    }
    return `${url}/chat/completions`;
  }

  if (protocol === 'ollama') {
    return `${url}/api/generate`;
  }

  if (url.includes('/chat/completions') || url.includes('v1/chat')) {
    return url;
  }
  if (url.includes('/api/generate')) {
    return url;
  }

  return `${url}/chat/completions`;
}

function buildRequestBody(model, systemPrompt, query) {
  const modelName = model.modelId || model.id;
  const protocol = model.protocol || model.apiType || '';

  if (protocol === 'ollama' || (modelName && modelName.includes('ollama'))) {
    return {
      model: modelName,
      prompt: `${systemPrompt}${query}`,
      stream: false
    };
  }

  if (protocol === 'minimax') {
    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]
    };
  }

  return {
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ],
    temperature: model.temperature || 0.7
  };
}

function extractResponseContent(response) {
  if (response.data.choices && response.data.choices[0]) {
    return response.data.choices[0].message?.content ||
           response.data.choices[0].text ||
           response.data.choices[0].reasoning_content ||
           JSON.stringify(response.data);
  }
  if (response.data.output) {
    return response.data.output;
  }
  if (response.data.response) {
    return response.data.response;
  }
  return JSON.stringify(response.data);
}

async function callAI(query, systemPrompt, modelId) {
  try {
    const models = getModels();
    const model = models.find(m => m.id === modelId);

    if (!model) {
      throw new Error('未找到指定的模型');
    }

    const apiKey = model.apiKey;
    let baseURL = model.url;

    if (!baseURL) {
      throw new Error('模型URL未配置');
    }

    const protocol = model.protocol || model.apiType || '';
    const fullURL = buildAPIURL(baseURL, protocol);

    const requestBody = buildRequestBody(model, systemPrompt, query);

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      if (protocol === 'minimax') {
        headers['Authorization'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    try {
      console.log('[LLM Request] 发送的请求参数:');
      console.log('  URL:', fullURL);
      console.log('  Headers:', JSON.stringify(headers));
      console.log('  Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(fullURL, requestBody, {
        headers,
        timeout: 120000
      });
      
      console.log('[LLM Response] 大模型返回内容:');
      console.log(response.data);
      console.log('='.repeat(60));
      
      return extractResponseContent(response);
    } catch (apiError) {
      const statusCode = apiError.response?.status;
      const errorData = apiError.response?.data;
      const errorMessage = errorData?.error?.message || errorData?.message || apiError.message;

      console.error('API调用失败 - Status:', statusCode);
      console.error('API调用失败 - Error:', errorMessage);

      if (statusCode === 401 || statusCode === 403) {
        throw new Error('API密钥无效或未授权，请检查密钥配置');
      } else if (statusCode === 404) {
        throw new Error(`API端点不存在: ${fullURL}，请检查模型URL配置`);
      } else if (statusCode === 429) {
        throw new Error('请求频率超限，请稍后再试');
      } else if (statusCode === 400) {
        throw new Error(`请求参数错误: ${errorMessage}，请检查模型配置`);
      } else {
        throw new Error(`API调用失败: ${errorMessage}`);
      }
    }
  } catch (error) {
    console.error('调用AI时出错:', error);
    throw error;
  }
}

function formatToolResults(toolResults) {
  const lines = [];

  for (const result of toolResults) {
    if (!result.success) continue;

    const toolName = result.tool.replace(/_/g, ' ');
    lines.push(`【${toolName.toUpperCase()} 结果】`);

    if (Array.isArray(result.data)) {
      for (const item of result.data) {
        const skillTag = item.skill ? ` [${item.skill}]` : '';
        if (item.textContent) {
          lines.push(`内容: ${item.textContent}`);
        } else {
          lines.push(`文件: ${item.filename || 'unknown'}${skillTag}`);
          lines.push(`内容: ${item.content || 'no content'}`);
        }
        lines.push('');
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

router.post('/', async (req, res) => {
  try {
    const { query, mode, model: modelId, history = [], botName: clientBotName, userName: clientUserName, relationship: clientRelationship } = req.body;

    console.log('[Chat] ==================== 收到请求 ====================');
    console.log('[Chat] 用户输入:', query);
    console.log('[Chat] 模式:', mode);
    console.log('[Chat] 模型:', modelId);
    console.log('[Chat] 历史消息数:', history.length);
    console.log('[Chat] 客户端智能体名称:', clientBotName);
    console.log('[Chat] 客户端用户名称:', clientUserName);
    console.log('[Chat] 客户端用户关系:', clientRelationship);

    const botName = clientBotName || DEFAULT_BOT_NAME;
    const userName = clientUserName || null;
    const relationship = clientRelationship || null;

    if (!query || !mode || !modelId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (isSetRelationshipIntent(query) && !isQuestion(query)) {
      const newRel = extractRelationship(query);
      if (newRel) {
        console.log('[Chat] 检测到关系设定，新关系:', newRel);
        return res.json({
          response: `好的，明白了！从现在起，你就是我的${RELATIONSHIPS[newRel]?.title || newRel}，我会用正确的方式称呼你。有什么需要我帮忙的吗？`,
          source: '系统',
          newRelationship: newRel
        });
      }
    }

    if (isRenameUserIntent(query) && !isQuestion(query)) {
      const newName = extractUserName(query);
      if (newName) {
        console.log('[Chat] 检测到用户改名意图，新名称:', newName);
        return res.json({
          response: `好的，我以后就叫你"${newName}"了！有什么可以帮你的吗？`,
          source: '系统',
          newUserName: newName
        });
      }
    }

    if (isRenameIntent(query)) {
      const newName = extractBotName(query);
      if (newName) {
        console.log('[Chat] 检测到改名意图，新名称:', newName);
        return res.json({
          response: `好的，以后我就叫"${newName}"了！有什么需要我帮忙的吗？`,
          source: '系统',
          newBotName: newName
        });
      }
    }

    if (isAskNameIntent(query)) {
      console.log('[Chat] 检测到询问名称意图，当前名称:', botName);
      return res.json({
        response: `我叫${botName}，是你的智能助手。有什么可以帮你的吗？`,
        source: '系统'
      });
    }

    let updates = {};
    if (!isQuestion(query)) {
      const newBotName = extractBotName(query);
      if (newBotName) {
        updates.newBotName = newBotName;
        console.log('[Chat] 检测到智能体改名:', newBotName);
      }
      const newUserName = extractUserName(query);
      if (newUserName) {
        updates.newUserName = newUserName;
        console.log('[Chat] 检测到用户改名:', newUserName);
      }
      const newRel = extractRelationship(query);
      if (newRel) {
        updates.newRelationship = newRel;
        console.log('[Chat] 检测到关系设定:', newRel);
      }
    }

    const models = getModels();
    const modelConfig = models.find(m => m.id === modelId);

    if (!modelConfig) {
      return res.status(400).json({ error: '未找到指定的模型' });
    }

    let response = '';
    let source = '';
    const historyContext = '';

    if (mode === 'ai') {
      console.log('[Chat] 处理用户请求:', query);

      const matchedIntents = extractMatchedIntents(query);

      if (matchedIntents.length === 0) {
        console.log('[Chat] 未匹配到任何技能，直接发送问题给大模型');
        const systemPrompt = buildSystemPrompt([], '', query, historyContext, botName, userName, relationship);
        console.log('[Prompt Assembler] System Prompt:');
        console.log(systemPrompt);
        console.log('='.repeat(60));
        response = await executeToolLoop(query, systemPrompt, modelConfig);
        source = 'AI';
      } else {
        console.log('[Chat] 匹配到意图:', matchedIntents);

        const queryStructure = parseQueryStructure(query);
        console.log('[Parser] 查询结构解析:', JSON.stringify(queryStructure, null, 2));

        const toolsMap = selectToolsForSegments(queryStructure.segments);
        const selectedTools = Array.from(toolsMap.keys());
        console.log('[Skill Selector] 选择的工具:', selectedTools);

        const segmentResults = new Map();

        for (const [tool, segments] of toolsMap.entries()) {
          for (const segment of segments) {
            console.log(`[Tool Executor] 执行工具: ${tool}, 查询: ${segment.text}`);
            let toolResult;

            if (tool === 'get_weather') {
              toolResult = await getWeatherInfo(segment.text, modelConfig);
            } else if (tool === 'get_location') {
              toolResult = await getLocationInfo(segment.text, modelConfig);
            } else if (tool === 'search_knowledge_base') {
              toolResult = await searchKnowledgeBase(segment.text);
              if (toolResult.length > 0) {
                toolResult = { success: true, data: toolResult };
              } else {
                toolResult = { success: false };
              }
            } else {
              toolResult = { success: false };
            }

            if (toolResult.success) {
              const key = `${tool}_${segment.entity || 'default'}`;
              if (!segmentResults.has(key)) {
                segmentResults.set(key, []);
              }
              const dataArray = Array.isArray(toolResult.data) ? toolResult.data : [toolResult.data];
              segmentResults.get(key).push(...dataArray);
            }
          }
        }

        const allResults = [];
        for (const [key, items] of segmentResults.entries()) {
          for (const item of items) {
            allResults.push({
              content: item.textContent || item.content || null,
              skill: item.skill || key.split('_')[0],
              entity: key.split('_')[1] !== 'default' ? key.split('_')[1] : null
            });
          }
        }

        let context = '';
        if (allResults.length > 0) {
          context = allResults.map(r => {
            if (r.entity) {
              return `[关于 ${r.entity}] ${r.content || ''}`;
            }
            return r.content || '';
          }).join('\n\n');
        }

        const systemPrompt = buildSystemPrompt(selectedTools, context, query, historyContext, botName, userName, relationship);
        console.log('[Prompt Assembler] 组装后的 System Prompt:');
        console.log(systemPrompt);
        console.log('='.repeat(60));
        response = await executeToolLoop(query, systemPrompt, modelConfig);
        source = allResults.length > 0 ? 'AI + Tools' : 'AI';
      }
    } else if (mode === 'knowledge' || mode === 'hybrid') {
      const intent = analyzeIntent(query);
      const selectedTools = selectTools(intent);
      const toolResults = await executeTools(selectedTools, query, modelConfig);

      const allResults = [];
      toolResults.forEach(tr => {
        if (tr.success && Array.isArray(tr.data)) {
          tr.data.forEach(item => {
            allResults.push({
              filename: item.filename || null,
              content: item.textContent || item.content || null,
              skill: item.skill || null
            });
          });
        }
      });

      if (allResults.length === 0) {
        if (mode === 'knowledge') {
          response = '抱歉，在本地知识库中没有找到相关信息。';
          source = '知识库';
        } else {
          console.log('[Chat] 知识库无结果，但模式为hybrid，继续调用大模型');
          const systemPrompt = buildSystemPrompt(selectedTools, '', query, historyContext, botName, userName, relationship);
          console.log('[Prompt Assembler] 组装后的 System Prompt:');
          console.log(systemPrompt);
          console.log('='.repeat(60));
          response = await executeToolLoop(query, systemPrompt, modelConfig);
          source = '混合';
        }
      } else {
        const context = allResults.map(r => {
          if (r.content) {
            return r.content;
          }
          const skillTag = r.skill ? ` [${r.skill}]` : '';
          return `【${r.filename}】${skillTag}\n${r.content}`;
        }).join('\n\n');

        const systemPrompt = buildSystemPrompt(selectedTools, context, query, historyContext, botName, userName, relationship);
        console.log('[Prompt Assembler] 组装后的 System Prompt:');
        console.log(systemPrompt);
        console.log('='.repeat(60));
        response = await executeToolLoop(query, systemPrompt, modelConfig);
        source = mode === 'knowledge' ? '知识库' : '混合';
      }
    }

    if (Object.keys(updates).length > 0) {
      res.json({
        response,
        source,
        ...updates
      });
    } else {
      res.json({
        response,
        source
      });
    }
  } catch (error) {
    console.error('聊天错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

router.post('/clarification/respond', async (req, res) => {
  try {
    const { clarification_id, response, session_id } = req.body;

    if (!clarification_id || !response) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：clarification_id 和 response'
      });
    }

    const result = respondToClarification(clarification_id, response);

    res.json(result);
  } catch (error) {
    console.error('处理澄清响应错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/clarification/:clarification_id', async (req, res) => {
  try {
    const { clarification_id } = req.params;

    const clarification = getPendingClarification(clarification_id);

    if (!clarification) {
      return res.status(404).json({
        success: false,
        error: '澄清请求不存在或已过期'
      });
    }

    res.json({
      success: true,
      clarification
    });
  } catch (error) {
    console.error('获取澄清请求错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});