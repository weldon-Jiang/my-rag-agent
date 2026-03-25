const axios = require('axios');
const BaseSkill = require('./base-skill');

class LocationSkill extends BaseSkill {
  constructor() {
    super({
      name: 'location-skill',
      description: '查询省、市、区、县等行政区划信息',
      version: '1.0.0',
      supportedTypes: ['.location', '.geo'],
    });
  }

  supports(fileType) {
    return fileType === '.location' || fileType === '.geo';
  }

  async process(query, context = {}) {
    try {
      const location = this.extractLocation(query);
      if (!location) {
        return {
          success: false,
          error: '无法从查询中提取地名',
        };
      }

      const locationData = await this.searchLocation(location);
      if (!locationData) {
        return {
          success: false,
          error: `未找到相关地名：${location}`,
        };
      }

      return {
        success: true,
        skill: this.name,
        textContent: this.formatLocationText(locationData),
        data: locationData,
      };
    } catch (error) {
      console.error('[LocationSkill] 查询位置失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  extractLocation(query) {
    query = query.trim();

    const patterns = [
      /(.+)省$/,
      /(.+)市$/,
      /(.+)县$/,
      /(.+)区$/,
      /(.+)镇$/,
      /(.+)村$/,
      /(.+)的位置/,
      /(.+)在哪里/,
      /关于(.+)/,
      /(.+)的信息/,
      /(.+)怎么样/,
      /(.+)的基本信息/,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const chinesePattern = /[\u4e00-\u9fa5]{2,10}/;
    const chineseMatch = query.match(chinesePattern);
    if (chineseMatch) {
      return chineseMatch[0];
    }

    return null;
  }

  async searchLocation(locationName) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=5&language=zh&format=json`;

      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      if (!data.results || data.results.length === 0) {
        return null;
      }

      const results = data.results.map(r => ({
        name: r.name,
        country: r.country || '',
        countryCode: r.country_code || '',
        admin1: r.admin1 || '',
        admin2: r.admin2 || '',
        admin3: r.admin3 || '',
        latitude: r.latitude,
        longitude: r.longitude,
        elevation: r.elevation,
        timezone: r.timezone,
        population: r.population,
        type: this.getLocationType(r),
      }));

      return results.length === 1 ? results[0] : results;
    } catch (error) {
      console.error(`[LocationSkill] API 调用失败:`, error.message);
      return null;
    }
  }

  getLocationType(place) {
    if (place.admin1 && !place.admin2) {
      return '省份';
    }
    if (place.admin2 && !place.admin3) {
      return '城市';
    }
    if (place.admin3) {
      return '区县';
    }
    return '地点';
  }

  formatLocationText(data) {
    if (Array.isArray(data)) {
      if (data.length === 1) {
        return this.formatLocationText(data[0]);
      }
      const names = data.slice(0, 3).map(item => item.name).join('、');
      return `找到了${data.length}个相关地点，主要有：${names}。`;
    }

    let text = `${data.name}位于`;
    if (data.admin2) text += `${data.admin2}市`;
    if (data.admin1) text += `，属于${data.admin1}省`;
    text += `。`;

    if (data.latitude && data.longitude) {
      text += ` 经纬度：${data.latitude?.toFixed(2)}°, ${data.longitude?.toFixed(2)}°。`;
    }

    if (data.elevation) {
      text += ` 海拔约${data.elevation}米。`;
    }

    if (data.population) {
      text += ` 人口约${this.formatPopulation(data.population)}。`;
    }

    return text;
  }

  formatPopulation(pop) {
    if (pop >= 100000000) {
      return (pop / 100000000).toFixed(2) + ' 亿';
    }
    if (pop >= 10000) {
      return (pop / 10000).toFixed(2) + ' 万';
    }
    return pop.toLocaleString();
  }
}

module.exports = LocationSkill;
