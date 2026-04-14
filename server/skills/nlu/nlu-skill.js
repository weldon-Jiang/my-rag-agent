const BaseSkill = require('../base-skill');

class NLUSkill extends BaseSkill {
  constructor() {
    super({
      name: 'nlu-skill',
      description: '自然语言理解 - 意图分析、实体提取、文本处理',
      version: '1.0.0',
      supportedTypes: []
    });

    this.intentKeywords = {
      weather: ['天气', '气温', '温度', '下雨', '晴天', 'weather', 'temperature', 'rain', '冷', '热', '暖和'],
      location: ['位置', '地址', '在哪里', 'location', 'address', 'where', '哪'],
      knowledge: ['知识', '查询', '搜索', 'knowledge', 'search', 'query', '什么是', '介绍一下'],
      image: ['图片', '图像', '识别', 'image', 'recognize', 'picture', '看图'],
      pdf: ['PDF', '文档', 'pdf', 'document', '文件'],
      video: ['视频', '录像', 'video', ' footage', '影片'],
      stock: ['股票', '股价', '涨跌', 'stock', 'shares', '指数'],
      clothing: ['穿什么', '穿啥', '衣服', '穿搭', '衣着', '外套', '裤子', '裙子'],
      activity: ['徒步', '爬山', '登山', '跑步', '骑行', '露营', '钓鱼', '运动', '健身', 'hiking', 'cycling', 'running', 'camping']
    };

    this.activityKeywords = {
      '徒步': ['徒步', '爬山', '登山', 'hiking', 'trekking', '健行'],
      '跑步': ['跑步', '晨跑', '夜跑', 'jogging', 'running', '慢跑'],
      '骑行': ['骑行', '骑车', '单车', '自行车', 'cycling', 'bike', '骑单车'],
      '露营': ['露营', '野营', 'camping', '帐篷'],
      '钓鱼': ['钓鱼', '垂钓', 'fishing', '渔具'],
      '运动': ['运动', '锻炼', 'gym', 'workout', '健身']
    };

    this.clothingKeywords = ['穿什么', '穿啥', '衣服', '穿搭', '衣着', '带什么', '带啥', '装备', '外套', '裤子', '裙子', '鞋子', '袜子'];

    this.stopWords = ['的', '是', '在', '和', '了', '有', '什么', '怎么', '如何', '为什么', '哪个', '哪些', '吗', '呢', '吧', '啊', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];

    this.questionPatterns = {
      questionEnd: /[？?]$/,
      questionStart: /^(谁|什么|哪|怎么|如何|为什么|多少|几)/,
      pronouns: /(?:你|您|他|她|它|他们)/
    };
  }

  async process(query, context = {}) {
    try {
      const normalizedQuery = this.normalizeQuery(query);
      const intent = this.analyzeIntent(query);
      const entities = this.extractEntities(query, context);
      const activities = this.detectActivities(query);
      const clothingIntent = this.detectClothingIntent(query);
      const keywords = this.extractKeywords(query);
      const isQuestion = this.isQuestion(query);

      return {
        success: true,
        skill: this.name,
        intent,
        entities,
        normalizedQuery,
        activities,
        clothingIntent,
        keywords,
        isQuestion,
        textContent: JSON.stringify({
          intent,
          entities,
          activities,
          clothingIntent,
          keywords,
          isQuestion
        }, null, 2)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  normalizeQuery(query) {
    if (!query) return '';

    let normalized = query
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized;
  }

  analyzeIntent(query) {
    const lowerQuery = query.toLowerCase();

    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          return intent;
        }
      }
    }

    return 'unknown';
  }

  extractEntities(query, context = {}) {
    const entities = {};

    const cityMatch = query.match(/在|到|去|([\u4e00-\u9fa5]{2,10})(?:市|省|县|区|镇|村)/);
    if (cityMatch) {
      entities.city = cityMatch[1] || cityMatch[2];
    }

    const datePatterns = [
      { regex: /今天|本日|今日/, value: '今天' },
      { regex: /明天|明日|明儿/, value: '明天' },
      { regex: /后天|后日/, value: '后天' },
      { regex: /昨天|昨日|昨儿/, value: '昨天' },
      { regex: /上周|本周|下周/, value: '本周' },
      { regex: /周六|周日|周末/, value: '周末' }
    ];

    for (const pattern of datePatterns) {
      if (pattern.regex.test(query)) {
        entities.date = pattern.value;
        break;
      }
    }

    if (context && context.originalQuery) {
      const originalLower = context.originalQuery.toLowerCase();
      for (const pattern of datePatterns) {
        if (pattern.regex.test(originalLower)) {
          entities.date = pattern.value;
          break;
        }
      }
    }

    return entities;
  }

  detectActivities(query) {
    const activities = [];
    const lowerQuery = query.toLowerCase();

    for (const [activity, keywords] of Object.entries(this.activityKeywords)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          if (!activities.includes(activity)) {
            activities.push(activity);
          }
          break;
        }
      }
    }

    return activities;
  }

  detectClothingIntent(query) {
    const lowerQuery = query.toLowerCase();
    for (const keyword of this.clothingKeywords) {
      if (lowerQuery.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  extractKeywords(query) {
    if (!query) return [];

    const words = query
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !this.stopWords.includes(w.toLowerCase()));

    return [...new Set(words)];
  }

  isQuestion(query) {
    if (!query) return false;

    if (this.questionPatterns.questionEnd.test(query.trim())) {
      return true;
    }

    if (this.questionPatterns.questionStart.test(query.trim())) {
      return true;
    }

    if (this.questionPatterns.pronouns.test(query)) {
      return true;
    }

    return false;
  }

  splitSentences(text) {
    if (!text) return [];

    return text
      .split(/[。！？\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  getNGrams(text, n = 2) {
    if (!text || n < 1) return [];

    const words = text.split(/\s+/);
    const ngrams = [];

    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(''));
    }

    return ngrams;
  }
}

module.exports = NLUSkill;
