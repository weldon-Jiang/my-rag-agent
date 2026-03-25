# 优化天气技能 - 支持时间旅行查询

## 问题
用户输入"今天"、"明天"或具体日期查询天气时，系统无法正确返回对应日期的天气数据。

## 目标
支持查询：
1. **历史天气** - 过去特定日期的天气
2. **当前天气** - 今天的实时天气
3. **未来天气预报** - 明天及之后日期的预测

## Open-Meteo API 能力分析

### 天气预报 (Forecast API)
- 支持最多 **16天** 未来预报
- 通过 `forecast_days` 参数控制

### 历史天气 (Archive API)
- 支持查询 **过去日期** 的天气数据
- 通过 `start_date` 和 `end_date` 参数

### 时间机器 (Time Machine)
- 统一接口：历史 + 未来
- 通过 `start_date` 和 `end_date` + `forecast_days` 实现

## 实现方案

### Step 1: 日期解析模块
创建 `parseWeatherDate(query)` 函数：
- 解析"今天"、"明天"、"后天"
- 解析具体日期："2024-01-15"
- 解析相对日期："上周"、"下周二"

### Step 2: 判断查询类型
```javascript
function determineQueryType(targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (targetDate < today) return 'historical';
  if (targetDate.getTime() === today.getTime()) return 'current';
  return 'forecast';
}
```

### Step 3: 重构 getWeatherByCoords
```javascript
async getWeatherByCoords(latitude, longitude, cityName, country, targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = targetDate || today;

  let url;
  if (target <= today) {
    // 历史/当前天气
    url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${formatDate(target)}&end_date=${formatDate(target)}&...`;
  } else {
    // 未来预报
    url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=${daysAhead}`;
  }
}
```

### Step 4: 修改 process 入口
- 从 query 中解析目标日期
- 传递给 getWeatherByCoords

### Step 5: 更新 formatWeatherText
- 历史天气："2024年3月15日的天气是..."
- 预报天气："明天（3月16日）的天气预计是..."

## 关键日期格式
- API 日期格式：`YYYY-MM-DD`
- Open-Meteo archive: 支持 `start_date` 和 `end_date`
- Open-Meteo forecast: 使用 `forecast_days` 计算日期范围

## 验证计划
1. 测试"今天天气" → 返回当前天气
2. 测试"明天天气" → 返回明天预报
3. 测试"昨天天气" → 返回历史天气（如果有数据）
4. 测试具体日期 → 返回对应日期数据
