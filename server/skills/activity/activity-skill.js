class ActivitySkill {
  constructor(options = {}) {
    this.name = options.name || 'activity-skill';
    this.description = '活动理解 - 检测户外活动并生成建议';
    this.version = '1.0.0';
    this.supportedTypes = [];
    this.activityKeywords = {
      '徒步': ['徒步', '爬山', '登山', 'hiking', 'trekking'],
      '跑步': ['跑步', '晨跑', '夜跑', 'jogging', 'running'],
      '骑行': ['骑行', '骑车', '单车', '自行车', 'cycling', 'bike'],
      '露营': ['露营', '野营', 'camping'],
      '钓鱼': ['钓鱼', '垂钓', 'fishing'],
      '约会': ['约会', 'date'],
      '上班': ['上班', '工作', 'office'],
      '上学': ['上学', '上课', 'school'],
      '购物': ['购物', '逛街', 'shopping'],
      '运动': ['运动', '锻炼', 'gym', 'workout']
    };
  }

  async process(query, context = {}) {
    const activities = this.detectActivities(query);
    const hasClothingIntent = this.detectClothingIntent(query);

    if (activities.length === 0 && !hasClothingIntent) {
      return null;
    }

    const result = {
      activities,
      hasClothingIntent,
      guidance: this.generateGuidance(activities, hasClothingIntent, context)
    };

    return result;
  }

  detectActivities(query) {
    const intents = [];
    const lowerQuery = query.toLowerCase();

    for (const [activity, keywords] of Object.entries(this.activityKeywords)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          intents.push(activity);
          break;
        }
      }
    }

    return intents;
  }

  detectClothingIntent(query) {
    const lowerQuery = query.toLowerCase();
    const clothingKeywords = ['穿什么', '穿啥', '衣服', '穿搭', '衣着', '带什么', '带啥', '装备'];
    return clothingKeywords.some(k => lowerQuery.includes(k));
  }

  generateGuidance(activities, hasClothingIntent, context = {}) {
    const guidance = [];
    const hasWeatherContext = this.hasWeatherContext(context);

    if (activities.length > 0) {
      guidance.push('【活动建议】');
      guidance.push('用户提到进行户外活动，请根据天气情况提供：');
      guidance.push('- 适不适合该活动的建议');
      if (hasWeatherContext) {
        guidance.push('- 具体的穿着建议');
        guidance.push('- 需要注意的天气条件（如防晒、防雨、保暖等）');
        guidance.push('- 装备建议（如是否需要带伞、穿什么鞋子等）');
      }
      guidance.push('');
    }

    if (hasClothingIntent) {
      guidance.push('【穿衣建议】');
      guidance.push('用户询问穿着建议，请根据天气情况提供：');
      if (hasWeatherContext) {
        guidance.push('- 建议的具体穿着搭配');
        guidance.push('- 适合当前温度的衣物厚度');
        guidance.push('- 是否有雨需要带伞或穿防水衣物');
        guidance.push('- 紫外线强弱决定是否需要防晒');
      }
      guidance.push('');
    }

    return guidance.join('\n');
  }

  hasWeatherContext(context) {
    if (!context) return false;
    const ctx = context.toLowerCase();
    return ctx.includes('温度') ||
           ctx.includes('天气') ||
           ctx.includes('°c') ||
           ctx.includes('humidity') ||
           ctx.includes('降水') ||
           ctx.includes('紫外线');
  }

  getActivityInfo(activity) {
    const info = {
      '徒步': { name: '徒步/爬山', attention: ['注意防滑', '穿登山鞋', '带够饮用水', '注意防晒'] },
      '跑步': { name: '跑步', attention: ['选择合适时间', '注意补水', '穿着运动服装'] },
      '骑行': { name: '骑行', attention: ['注意交通安全', '戴头盔', '带备胎和工具'] },
      '露营': { name: '露营', attention: ['防蚊虫', '带睡袋', '注意天气变化'] },
      '钓鱼': { name: '钓鱼', attention: ['注意防晒', '带渔具', '注意安全'] },
      '约会': { name: '约会', attention: ['注意仪表', '根据场所选择穿着'] },
      '运动': { name: '运动', attention: ['热身运动', '带毛巾和水'] }
    };
    return info[activity] || null;
  }
}

module.exports = ActivitySkill;