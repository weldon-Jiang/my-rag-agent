const axios = require('axios');
const BaseSkill = require('../base-skill');

const WEATHER_CODES = {
  0: '晴',
  1: '晴间多云',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾凇',
  51: '小毛毛雨',
  53: '中毛毛雨',
  55: '大毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  80: '小阵雨',
  81: '中阵雨',
  82: '强阵雨',
  85: '小阵雪',
  86: '大阵雪',
  95: '雷暴',
  96: '雷暴伴冰雹',
  99: '强雷暴伴冰雹',
};

function parseWeatherDate(query) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const patterns = [
    { regex: /今天/i, days: 0 },
    { regex: /明天/i, days: 1 },
    { regex: /后天/i, days: 2 },
    { regex: /大后天/i, days: 3 },
    { regex: /昨天/i, days: -1 },
    { regex: /前天/i, days: -2 },
  ];

  for (const p of patterns) {
    if (p.regex.test(query)) {
      const d = new Date(today);
      d.setDate(d.getDate() + p.days);
      return d;
    }
  }

  const datePattern = /(\d{4})[年\-](\d{1,2})[月\-](\d{1,2})[日]?/;
  const match = query.match(datePattern);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  return null;
}

function determineQueryType(targetDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!targetDate) return 'current';

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  if (target < today) return 'historical';
  if (target.getTime() === today.getTime()) return 'current';
  return 'forecast';
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function formatChineseDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getMonth() + 1}月${now.getDate()}日${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}`;
  }
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${month}月${day}日${weekday}`;
}

class WeatherSkill extends BaseSkill {
  constructor() {
    super({
      name: 'weather-skill',
      description: '查询城市天气信息，需要先获取位置坐标',
      version: '2.0.0',
      supportedTypes: ['.weather'],
    });
  }

  supports(fileType) {
    return fileType === '.weather';
  }

  async process(query, context = {}) {
    try {
      const targetDate = parseWeatherDate(query);
      const queryType = determineQueryType(targetDate);
      const now = new Date();
      console.log(`[WeatherSkill] 当前系统时间: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
      console.log(`[WeatherSkill] 解析日期: ${targetDate ? targetDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : 'null'}, 查询类型: ${queryType}`);

      let { latitude, longitude, cityName, country } = context.location || {};

      if (!latitude || !longitude) {
        console.log('[WeatherSkill] 上下文中没有位置信息，尝试从查询中提取地名并获取坐标');
        const locationData = await this.extractLocationFromQuery(query);
        if (locationData) {
          latitude = locationData.latitude;
          longitude = locationData.longitude;
          cityName = locationData.name;
          country = locationData.country;
        }
      }

      if (!latitude || !longitude) {
        return {
          success: false,
          error: '无法获取位置坐标，请先使用位置查询工具获取坐标',
        };
      }

      const weatherData = await this.getWeatherByCoords(latitude, longitude, cityName, country, targetDate);
      return {
        success: true,
        skill: this.name,
        textContent: this.formatWeatherText(weatherData),
        data: weatherData,
      };
    } catch (error) {
      console.error('[WeatherSkill] 获取天气失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async extractLocationFromQuery(query) {
    const dateWords = ['今天', '明天', '后天', '大后天', '昨天', '前天', '上周', '下周', '本周'];
    const weatherWords = ['天气', '气温', '温度', '下雨', '晴天', '多云', '冷', '热', '刮风'];
    let cleanQuery = query;
    for (const word of dateWords) {
      cleanQuery = cleanQuery.replace(new RegExp(word, 'g'), '');
    }

    for (const word of weatherWords) {
      cleanQuery = cleanQuery.replace(new RegExp(word, 'g'), '');
    }

    cleanQuery = cleanQuery.replace(/[?？!！。，、]/g, '').trim();

    const patterns = [
      /^([\u4e00-\u9fa5]{2,10})(?:[省市县区镇村])?/,
      /(?:在|到|去)([\u4e00-\u9fa5]{2,10})/,
      /^([\u4e00-\u9fa5]{2,6})/,
    ];

    let locationName = null;
    for (const pattern of patterns) {
      const match = cleanQuery.match(pattern);
      if (match && match[1]) {
        locationName = match[1];
        break;
      }
    }

    if (!locationName) {
      return null;
    }

    console.log(`[WeatherSkill] 从查询中提取到地名: ${locationName}`);
    return await this.geocodeLocation(locationName);
  }

  async geocodeLocation(locationName) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=5&language=zh&format=json`;
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        console.log(`[WeatherSkill] 地理编码成功: ${result.name} (${result.latitude}, ${result.longitude})`);
        return {
          name: result.name,
          country: result.country || '',
          countryCode: result.country_code || '',
          admin1: result.admin1 || '',
          admin2: result.admin2 || '',
          latitude: result.latitude,
          longitude: result.longitude,
          elevation: result.elevation,
          timezone: result.timezone,
        };
      }
    } catch (error) {
      console.error(`[WeatherSkill] 地理编码失败: ${locationName}`, error.message);
    }
    return null;
  }

  async getWeatherByCoords(latitude, longitude, cityName, country, targetDate) {
    const queryType = determineQueryType(targetDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let data;
    let dateStr = '';

    if (queryType === 'current') {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&timezone=Asia%2FShanghai&forecast_days=1`;
      const response = await axios.get(url, { timeout: 10000 });
      data = response.data;
      dateStr = formatChineseDate(today);
    } else if (queryType === 'forecast') {
      const daysAhead = getDaysDifference(today, targetDate);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset&hourly=temperature_2m,precipitation_probability&timezone=Asia%2FShanghai&forecast_days=${Math.min(daysAhead + 1, 16)}`;
      const response = await axios.get(url, { timeout: 10000 });
      data = response.data;
      dateStr = formatChineseDate(targetDate);

      const dayIndex = Math.min(daysAhead, (data.daily?.time?.length || 1) - 1);
      const daily = data.daily || {};
      const weatherCode = daily.weather_code?.[dayIndex] ?? 0;
      const maxTemp = daily.temperature_2m_max?.[dayIndex];
      const minTemp = daily.temperature_2m_min?.[dayIndex];
      const uvIndex = daily.uv_index_max?.[dayIndex];
      const precipProb = daily.precipitation_probability_max?.[dayIndex];
      const sunrise = daily.sunrise?.[dayIndex];
      const sunset = daily.sunset?.[dayIndex];

      return {
        city: cityName || '未知',
        country: country || '',
        latitude,
        longitude,
        queryType,
        date: dateStr,
        current: {
          temp_C: maxTemp ? String(Math.round((maxTemp + minTemp) / 2)) : 'N/A',
          temp_Max: maxTemp ? String(Math.round(maxTemp)) : 'N/A',
          temp_Min: minTemp ? String(Math.round(minTemp)) : 'N/A',
          humidity: 'N/A',
          weatherDesc: WEATHER_CODES[weatherCode] || '未知',
          windSpeed: '0',
          windDir: '无',
          feelsLike: 'N/A',
          isDay: '白天',
          uvIndex: uvIndex ? String(Math.round(uvIndex)) : 'N/A',
          precipProb: precipProb ? String(Math.round(precipProb)) : 'N/A',
          sunrise: sunrise ? sunrise.split('T')[1]?.substring(0, 5) : 'N/A',
          sunset: sunset ? sunset.split('T')[1]?.substring(0, 5) : 'N/A',
        },
        forecast: [],
        source: 'Open-Meteo Forecast',
      };
    } else {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${formatDate(targetDate)}&end_date=${formatDate(targetDate)}&hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility,uv_index&daily=sunrise,sunset&timezone=Asia%2FShanghai`;
      const response = await axios.get(url, { timeout: 10000 });
      data = response.data;
      dateStr = formatChineseDate(targetDate);
    }

    if (!data.current && !data.hourly) {
      throw new Error('天气数据格式错误');
    }

    const current = data.current || {};
    const hourly = data.hourly || {};

    let hourIndex = 12;
    if (hourly.time && hourly.time.length > 0) {
      const targetHour = targetDate ? new Date(targetDate).getHours() : 12;
      hourIndex = Math.min(targetHour, hourly.time.length - 1);
    }

    const weatherDesc = WEATHER_CODES[current.weather_code ?? hourly.weather_code?.[hourIndex]] || '未知';
    const uvIndex = current.uv_index ?? hourly.uv_index?.[hourIndex];
    const precipProb = hourly.precipitation_probability?.[hourIndex];
    const visibility = current.visibility;

    const forecast = [];
    if (hourly.time && hourly.temperature_2m) {
      const startHour = Math.max(0, hourIndex - 2);
      const endHour = Math.min(hourly.time.length, hourIndex + 3);
      for (let i = startHour; i < endHour; i++) {
        if (hourly.time[i] && hourly.temperature_2m[i] !== undefined) {
          forecast.push({
            time: String(i).padStart(2, '0') + ':00',
            temp_C: String(Math.round(hourly.temperature_2m[i])),
            weatherDesc: WEATHER_CODES[hourly.weather_code?.[i]] || '未知',
          });
        }
      }
    }

    const daily = data.daily || {};
    const sunrise = daily.sunrise?.[0] || (data.daily?.sunrise ? data.daily.sunrise.split('T')[1]?.substring(0, 5) : null);
    const sunset = daily.sunset?.[0] || (data.daily?.sunset ? data.daily.sunset.split('T')[1]?.substring(0, 5) : null);

    return {
      city: cityName || '未知',
      country: country || '',
      latitude,
      longitude,
      queryType,
      date: dateStr,
      current: {
        temp_C: current.temperature_2m ? String(Math.round(current.temperature_2m)) : (hourly.temperature_2m?.[hourIndex] ? String(Math.round(hourly.temperature_2m[hourIndex])) : 'N/A'),
        humidity: current.relative_humidity_2m ? String(current.relative_humidity_2m) : (hourly.relative_humidity_2m?.[hourIndex] ? String(hourly.relative_humidity_2m[hourIndex]) : 'N/A'),
        weatherDesc,
        windSpeed: current.wind_speed_10m ? String(Math.round(current.wind_speed_10m)) : (hourly.wind_speed_10m?.[hourIndex] ? String(Math.round(hourly.wind_speed_10m[hourIndex])) : '0'),
        windDir: current.wind_direction_10m ? this.getWindDir(current.wind_direction_10m) : (hourly.wind_direction_10m?.[hourIndex] ? this.getWindDir(hourly.wind_direction_10m[hourIndex]) : '无'),
        feelsLike: current.apparent_temperature ? String(Math.round(current.apparent_temperature)) : 'N/A',
        isDay: current.is_day !== undefined ? (current.is_day === 1 ? '白天' : '夜晚') : '白天',
        uvIndex: uvIndex ? String(Math.round(uvIndex)) : 'N/A',
        precipProb: precipProb ? String(Math.round(precipProb)) : 'N/A',
        sunrise: sunrise || 'N/A',
        sunset: sunset || 'N/A',
        visibility: visibility ? String(Math.round(visibility / 1000)) : 'N/A',
      },
      forecast,
      source: queryType === 'historical' ? 'Open-Meteo Archive' : 'Open-Meteo',
    };
  }

  getWindDir(degrees) {
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  formatWeatherText(data) {
    const { city, current, forecast, queryType, date } = data;

    let timePrefix = '';
    if (queryType === 'historical') {
      timePrefix = `${date}的天气是`;
    } else if (queryType === 'forecast') {
      timePrefix = `${date}的天气预计是`;
    } else {
      timePrefix = `今天的天气是`;
    }

    let text = `${city}${timePrefix}${current.weatherDesc}，气温${current.temp_C}°C`;

    if (current.temp_Max && current.temp_Min && queryType === 'forecast') {
      text += `（最高${current.temp_Max}°C，最低${current.temp_Min}°C）`;
    }

    if (current.feelsLike && current.feelsLike !== 'N/A') {
      text += `，体感温度${current.feelsLike}°C`;
    }

    if (current.humidity && current.humidity !== 'N/A') {
      text += `，湿度${current.humidity}%`;
    }

    if (current.uvIndex && current.uvIndex !== 'N/A') {
      const uvLevel = this.getUVLevel(parseInt(current.uvIndex));
      text += `，紫外线指数${current.uvIndex}（${uvLevel}）`;
    }

    if (current.precipProb && current.precipProb !== 'N/A' && parseInt(current.precipProb) > 0) {
      text += `，降水概率${current.precipProb}%`;
    }

    if (current.windSpeed && parseInt(current.windSpeed) > 0) {
      text += `，刮${current.windDir}风，风速${current.windSpeed}公里/小时`;
    }

    text += '。';

    if (current.sunrise && current.sunrise !== 'N/A' && current.sunset && current.sunset !== 'N/A') {
      text += ` 日出${current.sunrise}，日落${current.sunset}。`;
    }

    if (current.visibility && current.visibility !== 'N/A') {
      text += ` 能见度${current.visibility}公里。`;
    }

    if (forecast && forecast.length > 0 && queryType !== 'forecast') {
      const nextHour = forecast[0];
      text += ` 接下来几小时预计${nextHour.weatherDesc}，气温${nextHour.temp_C}°C。`;
    }

    return text;
  }

  getUVLevel(uvIndex) {
    if (uvIndex <= 2) return '较弱';
    if (uvIndex <= 5) return '中等';
    if (uvIndex <= 7) return '较高';
    if (uvIndex <= 10) return '很强';
    return '极强';
  }
}

module.exports = WeatherSkill;


