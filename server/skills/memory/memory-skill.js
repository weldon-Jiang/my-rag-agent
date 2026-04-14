class MemorySkill {
  constructor(options = {}) {
    this.name = options.name || 'memory-skill';
    this.description = '记忆分析 - 分析对话历史、提取上下文相关性';
    this.version = '1.0.0';
    this.supportedTypes = [];
    this.maxMessages = 10;
  }

  async process(query, history = [], context = {}) {
    if (!history || history.length === 0) {
      return null;
    }

    const relevantHistory = this.analyzeHistoryRelevance(query, history);
    const formattedContext = this.buildHistoryContext(relevantHistory);
    const userProfile = this.extractUserProfileFromHistory(history);

    return {
      relevantHistory,
      formattedContext,
      userProfile,
      hasRelevantHistory: relevantHistory.length > 0
    };
  }

  analyzeHistoryRelevance(currentQuery, history = []) {
    if (!history || history.length === 0) {
      return [];
    }

    const recentHistory = history.slice(-this.maxMessages);
    const currentLower = currentQuery.toLowerCase();
    const currentWords = this.extractKeywords(currentQuery);

    const scoredHistory = recentHistory.map((msg, index) => {
      let score = 0;
      const content = msg.content || '';
      const contentLower = content.toLowerCase();

      if (contentLower.includes(currentLower)) {
        score += 50;
      }

      const contentWords = this.extractKeywords(content);
      const overlap = currentWords.filter(w => contentWords.includes(w));
      score += overlap.length * 10;

      if (contentLower.includes('天气') && currentLower.includes('天气')) {
        score += 30;
      }
      if (contentLower.includes('城市') && currentLower.includes('城市')) {
        score += 30;
      }

      score += (recentHistory.length - index) * 2;

      return { msg, score };
    });

    scoredHistory.sort((a, b) => b.score - a.score);

    return scoredHistory.slice(0, 5).map(item => item.msg);
  }

  extractKeywords(text) {
    if (!text) return [];

    const stopWords = ['的', '了', '在', '是', '我', '你', '他', '她', '它', '这', '那', '有', '和', '与', '或', '的', '吗', '呢', '吧', '啊'];

    const words = text.toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.includes(w));

    return [...new Set(words)];
  }

  buildHistoryContext(history = []) {
    if (!history || history.length === 0) {
      return '';
    }

    const recentHistory = history.slice(-this.maxMessages);
    let context = '\n【对话历史】：\n';

    recentHistory.forEach(msg => {
      const role = msg.role === 'user' ? '用户' : '助手';
      context += `${role}：${msg.content}\n`;
    });

    context += '\n';
    return context;
  }

  extractUserProfileFromHistory(history) {
    const profile = {
      mentionedCities: [],
      mentionedDates: [],
      preferences: []
    };

    const cityPatterns = [
      /([\u4e00-\u9fa5]{2,6})(?:省|市|县|区|镇|村)/g,
      /在([\u4e00-\u9fa5]{2,6})(?:天气|怎么样|好吗)/g,
    ];

    const datePatterns = [
      /([\u4e00-\u9fa5]{1,4})(?:天|日|号)/g,
      /(?:明|今|后)儿/g,
      /(?:周|星期)[一二三四五六日天]/g,
    ];

    history.forEach(msg => {
      const content = msg.content || '';

      let match;
      while ((match = cityPatterns[0].exec(content)) !== null) {
        profile.mentionedCities.push(match[1]);
      }
      while ((match = cityPatterns[1].exec(content)) !== null) {
        profile.mentionedCities.push(match[1]);
      }
      while ((match = datePatterns[0].exec(content)) !== null) {
        profile.mentionedDates.push(match[1]);
      }
      while ((match = datePatterns[1].exec(content)) !== null) {
        profile.mentionedDates.push(match[0]);
      }
      while ((match = datePatterns[2].exec(content)) !== null) {
        profile.mentionedDates.push(match[0]);
      }
    });

    profile.mentionedCities = [...new Set(profile.mentionedCities)];
    profile.mentionedDates = [...new Set(profile.mentionedDates)];

    return profile;
  }

  getNGrams(text, n = 2) {
    const ngrams = [];
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.push(text.substring(i, i + n));
    }
    return ngrams;
  }
}

module.exports = MemorySkill;