class UserProfileSkill {
  constructor(options = {}) {
    this.name = options.name || 'user-profile-skill';
    this.description = '用户画像 - 提取用户信息、名称、关系等';
    this.version = '1.0.0';
    this.supportedTypes = [];
    this.RELATIONSHIPS = {
      '爸爸': { title: '爸爸', formal: '父亲', casual: '老爸' },
      '妈妈': { title: '妈妈', formal: '母亲', casual: '老妈' },
      '老公': { title: '老公', formal: '丈夫', casual: '老公' },
      '老婆': { title: '老婆', formal: '妻子', casual: '老婆' },
      '儿子': { title: '儿子', formal: '儿子', casual: '儿子' },
      '女儿': { title: '女儿', formal: '女儿', casual: '女儿' },
      '哥哥': { title: '哥哥', formal: '兄长', casual: '哥' },
      '姐姐': { title: '姐姐', formal: '姐姐', casual: '姐' },
      '弟弟': { title: '弟弟', formal: '弟弟', casual: '弟' },
      '妹妹': { title: '妹妹', formal: '妹妹', casual: '妹' },
      '老板': { title: '老板', formal: '老板', casual: '老板' },
      '上司': { title: '上司', formal: '上司', casual: '上司' },
      '同事': { title: '同事', formal: '同事', casual: '同事' },
      '朋友': { title: '朋友', formal: '朋友', casual: '朋友' },
      '闺蜜': { title: '闺蜜', formal: '闺蜜', casual: '闺蜜' },
      '兄弟': { title: '兄弟', formal: '兄弟', casual: '兄弟' },
      '老师': { title: '老师', formal: '老师', casual: '老师' },
      '学生': { title: '学生', formal: '学生', casual: '同学' },
      '老板': { title: '老板', formal: '老板', casual: '老板' },
    };
  }

  async process(query, context = {}) {
    const profile = {
      userName: this.extractUserName(query),
      relationship: this.extractRelationship(query),
      isRenameIntent: this.isRenameUserIntent(query),
      isSetRelationshipIntent: this.isSetRelationshipIntent(query)
    };

    if (profile.userName || profile.relationship || profile.isRenameIntent || profile.isSetRelationshipIntent) {
      return profile;
    }
    return null;
  }

  extractUserName(query) {
    if (this.isQuestion(query)) {
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

  extractRelationship(query) {
    if (this.isQuestion(query)) {
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
          if (this.RELATIONSHIPS[rel]) {
            return rel;
          }
          if (Object.values(this.RELATIONSHIPS).some(r => r.title === rel)) {
            return rel;
          }
          return rel;
        }
      }
    }
    return null;
  }

  isRenameUserIntent(query) {
    const lowerQuery = query.toLowerCase();
    const keywords = ['我叫', '我是', '以后叫我', '以后你叫我', '你就叫我', '我的名字是', '我以后叫', '我以后就是'];
    return keywords.some(kw => lowerQuery.includes(kw));
  }

  isSetRelationshipIntent(query) {
    const lowerQuery = query.toLowerCase();
    const keywords = ['你叫我', '以后叫我', '以后你叫我', '你以后叫我', '称呼我', '我是你的', '我是你'];
    return keywords.some(kw => lowerQuery.includes(kw));
  }

  isQuestion(query) {
    const questionPatterns = [
      /^是|是否|有没有|算不算|算不算/i,
      /\?|\？/,
      /^为什么|为何|怎么|怎样|如何/i,
      /^哪里|哪儿|哪个|哪里|哪样/i,
      /^谁|何人|什么人人/i,
      /^什么 |啥 |请问|打听/i,
      /^几 |多少 |多长时间/i,
      /^如何|怎么样|怎样的/i,
      /^是不是|有没有|算不算/i,
    ];

    const questionPatternsStart = [
      /^是[吗嘛]|^是否|^有没有|^算不算|^吗$|^嘛$/i,
      /[吗嘛？\?]$/,
    ];

    const trimmed = query.trim();

    if (questionPatterns.some(p => p.test(trimmed))) {
      return true;
    }

    if (questionPatternsStart.some(p => p.test(trimmed))) {
      return true;
    }

    return false;
  }

  getRelationshipInfo(rel) {
    return this.RELATIONSHIPS[rel] || null;
  }

  getAllRelationships() {
    return Object.keys(this.RELATIONSHIPS);
  }
}

module.exports = UserProfileSkill;