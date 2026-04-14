class PreprocessorSkill {
  constructor(options = {}) {
    this.name = options.name || 'preprocessor-skill';
    this.description = '预处理器 - 封装命令检测、用户画像、Bot名称、历史上下文等预处理逻辑';
    this.version = '1.0.0';
    this.supportedTypes = [];
  }

  async process(query, options = {}) {
    const {
      history = [],
      botName = '智能助手',
      clarificationResponses = [],
      originalQuery = ''
    } = options;

    const result = {
      query,
      botName,
      effectiveQuery: query,
      historyContext: '',
      shouldReturn: false,
      returnData: null,
      context: {}
    };

    const commandSkill = options.skillsCenter ? options.skillsCenter.get('command-skill') : null;
    if (commandSkill) {
      const commandResult = await commandSkill.process(query, {});
      if (commandResult) {
        result.context.command = commandResult;
        if (commandResult.needEndSession) {
          result.shouldReturn = true;
          result.returnData = { response: commandResult.response, source: '系统', endSession: true };
          return result;
        }
      }
    }

    const userProfileSkill = options.skillsCenter ? options.skillsCenter.get('user-profile-skill') : null;
    if (userProfileSkill) {
      const userProfile = await userProfileSkill.process(query, {});
      if (userProfile) {
        result.context.userProfile = userProfile;
        if (userProfile.isSetRelationshipIntent && userProfile.relationship) {
          const relTitle = userProfileSkill.RELATIONSHIPS?.[userProfile.relationship]?.title || userProfile.relationship;
          result.shouldReturn = true;
          result.returnData = {
            response: `好的，明白了！从现在起，你就是我的${relTitle}，我会用正确的方式称呼你。有什么需要我帮忙的吗？`,
            source: '系统',
            newRelationship: userProfile.relationship
          };
          return result;
        }
        if (userProfile.isRenameIntent && userProfile.userName) {
          result.shouldReturn = true;
          result.returnData = {
            response: `好的，我以后就叫你"${userProfile.userName}"了！有什么可以帮你的吗？`,
            source: '系统',
            newUserName: userProfile.userName
          };
          return result;
        }
      }
    }

    const memorySkill = options.skillsCenter ? options.skillsCenter.get('memory-skill') : null;
    if (memorySkill) {
      const memoryResult = await memorySkill.process(query, history, {});
      if (memoryResult) {
        result.historyContext = memoryResult.formattedContext || '';
      }
    }

    const clarificationContext = this.buildClarificationContext(originalQuery, clarificationResponses, query);
    result.effectiveQuery = clarificationContext ? `${clarificationContext}\n用户当前回答：${query}` : query;

    return result;
  }

  buildClarificationContext(originalQuery, responses = [], currentAnswer = '') {
    if (!originalQuery || responses.length === 0) {
      return '';
    }

    let context = `【对话上下文】\n原始问题：${originalQuery}\n`;
    context += `追问历史：\n`;

    responses.forEach((r, index) => {
      context += `${index + 1}. 问：${r.question}\n   答：${r.answer}\n`;
    });

    return context;
  }

  detectBotNameIntent(query, botName) {
    const lowerQuery = query.toLowerCase();
    const renameBotKeywords = ['你叫', '以后叫你', '你以后叫', '称呼你', '你就叫', '以后我就叫', '叫我', '名字是', '从现在起你叫', '从现在开始你叫'];
    const askNameKeywords = ['你叫什么', '你叫啥', '你名字', '你是谁', '叫什么名字', '叫啥名字'];

    const isRenameBotIntent = renameBotKeywords.some(kw => lowerQuery.includes(kw)) && !lowerQuery.includes('我是');
    const isAskBotNameIntent = askNameKeywords.some(kw => lowerQuery.includes(kw));

    if (isRenameBotIntent) {
      const newName = this.extractBotName(query);
      if (newName) {
        return {
          shouldReturn: true,
          returnData: {
            response: `好的，以后我就叫"${newName}"了！有什么需要我帮忙的吗？`,
            source: '系统',
            newBotName: newName
          }
        };
      }
    }

    if (isAskBotNameIntent) {
      return {
        shouldReturn: true,
        returnData: {
          response: `我叫${botName}，是你的智能助手。有什么可以帮你的吗？`,
          source: '系统'
        }
      };
    }

    return null;
  }

  extractBotName(query) {
    if (!query) return null;

    const patterns = [
      /你叫([^\s，。,]{1,10})/,
      /以后叫你([^\s，。,]{1,10})/,
      /你以后叫([^\s，。,]{1,10})/,
      /称呼你([^\s，。,]{1,10})/,
      /称呼你叫([^\s，。,]{1,10})/,
      /你就叫([^\s，。,]{1,10})/,
      /以后我就叫([^\s，。,]{1,10})/,
      /叫我([^\s，。,]{1,10})/,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }
}

module.exports = PreprocessorSkill;