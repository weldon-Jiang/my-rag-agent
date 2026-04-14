class FashionSkill {
  constructor(options = {}) {
    this.name = options.name || 'fashion-skill';
    this.description = '穿衣建议 - 根据天气情况生成穿衣建议';
    this.version = '1.0.0';
    this.supportedTypes = [];
  }

  async process(query, weatherData, context = {}) {
    if (!weatherData || !weatherData.temp) {
      return null;
    }

    const temp = weatherData.temp;
    const humidity = weatherData.humidity || 50;
    const uvIndex = weatherData.uvIndex || 0;
    const rainProbability = weatherData.rainProbability || 0;
    const weatherCondition = weatherData.condition || '';

    const recommendation = this.generateRecommendation(temp, humidity, uvIndex, rainProbability, weatherCondition);

    return {
      temp,
      humidity,
      uvIndex,
      rainProbability,
      weatherCondition,
      ...recommendation
    };
  }

  generateRecommendation(temp, humidity, uvIndex, rainProbability, weatherCondition) {
    const layers = this.calculateLayers(temp);
    const items = this.selectItems(temp, weatherCondition);
    const accessories = this.selectAccessories(temp, uvIndex, rainProbability);
    const colorSuggestion = this.suggestColors(temp, weatherCondition);

    return {
      layers,
      items,
      accessories,
      colorSuggestion,
      summary: this.generateSummary(temp, layers, weatherCondition)
    };
  }

  calculateLayers(temp) {
    if (temp < 5) return { count: 3, description: '三层穿衣法：内层保暖+中层抓绒+外层防风' };
    if (temp < 15) return { count: 2, description: '两层穿衣法：内层打底+外层防风外套' };
    if (temp < 25) return { count: 1, description: '单层穿搭：轻便长袖或短袖' };
    return { count: 1, description: '轻薄透气：短袖或薄款上衣' };
  }

  selectItems(temp, weatherCondition) {
    const isRainy = weatherCondition.includes('雨') || weatherCondition.includes('雪');
    const isCloudy = weatherCondition.includes('阴') || weatherCondition.includes('多云');

    const items = [];

    if (temp < 5) {
      items.push('保暖内衣', '厚羽绒服或厚棉外套', '保暖裤或厚裤子');
      if (isRainy) items.push('防水外套');
    } else if (temp < 15) {
      items.push('长袖打底衫', '中等厚度外套（毛衣、卫衣、夹克）');
      if (isRainy) items.push('带帽防风外套或冲锋衣');
      items.push('牛仔裤或休闲裤');
    } else if (temp < 25) {
      items.push('长袖衬衫或薄款毛衣', '牛仔裤或长裤');
      if (isCloudy) items.push('薄外套备用');
    } else {
      items.push('短袖T恤或薄款上衣', '短裤或薄长裤');
    }

    return items;
  }

  selectAccessories(temp, uvIndex, rainProbability) {
    const accessories = [];

    if (temp < 10) {
      accessories.push('围巾', '手套（如果长时间户外）', '保暖帽');
    } else if (temp < 20) {
      accessories.push('轻薄围巾（可选）');
    }

    if (uvIndex >= 3) {
      accessories.push('防晒霜', '太阳镜', '遮阳帽或撑伞');
    }

    if (rainProbability > 50) {
      accessories.push('雨伞或雨衣');
    }

    if (temp >= 25 && humidity > 70) {
      accessories.push('备用更换衣物（易出汗体质）');
    }

    return accessories;
  }

  suggestColors(temp, weatherCondition) {
    const isRainy = weatherCondition.includes('雨');
    const isSunny = weatherCondition.includes('晴') && temp > 20;

    if (isRainy) {
      return '建议浅色系衣服，提升心情亮度；雨鞋或防水鞋履';
    }

    if (isSunny) {
      return '建议浅色系或明亮色彩，反光散热；避免深色吸热';
    }

    if (temp < 10) {
      return '深色系或暖色调衣物，帮助吸收热量';
    }

    return '百搭色系均可，根据个人喜好选择';
  }

  generateSummary(temp, layers, weatherCondition) {
    const isRainy = weatherCondition.includes('雨');
    const isSunny = weatherCondition.includes('晴');

    let summary = `${temp}°C 建议：${layers.description}。`;

    if (isRainy) {
      summary += '有降水天气，请注意防雨。';
    }

    if (isSunny && temp > 25) {
      summary += '阳光强烈，请注意防晒。';
    }

    if (temp < 5) {
      summary += '天气寒冷，请特别注意保暖。';
    }

    return summary;
  }
}

module.exports = FashionSkill;