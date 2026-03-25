# 优化天气技能 - 确认免费 API 并增强功能

## 当前状态
天气技能已使用 **Open-Meteo 免费 API**（无需 API Key）：
- 地理编码：`geocoding-api.open-meteo.com/v1/search`
- 天气预报：`api.open-meteo.com/v1/forecast`
- 历史天气：`archive-api.open-meteo.com/v1/archive`

## 优化目标
1. 确认免费 API 稳定可用
2. 增强天气数据维度（紫外线、降水概率、能见度等）
3. 优化 API 调用效率

## 实现方案

### Step 1: 增强天气数据参数
当前获取的数据较基础，增强后可选参数：
- `uv_index_max` - 紫外线指数
- `precipitation_probability_max` - 降水概率
- `sunrise` / `sunset` - 日出日落时间
- `visibility` - 能见度（历史数据支持）

### Step 2: 优化 Forecast API 调用
在预报模式下，同时获取每日数据和小时数据：
```javascript
const url = `https://api.open-meteo.com/v1/forecast?
  latitude=${latitude}&longitude=${longitude}
  &daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset
  &hourly=temperature_2m,precipitation_probability
  &timezone=Asia%2FShanghai
  &forecast_days=${daysAhead}`;
```

### Step 3: 增强 formatWeatherText 输出
增加更多天气信息：
- 紫外线强度提醒
- 降水概率
- 日出日落时间

### Step 4: 增强历史天气查询
历史数据增加湿度、风速等参数：
```javascript
const url = `https://archive-api.open-meteo.com/v1/archive?
  latitude=${latitude}&longitude=${longitude}
  &start_date=${formatDate(targetDate)}&end_date=${formatDate(targetDate)}
  &hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility
  &daily=uv_index_max,sunrise,sunset
  &timezone=Asia%2FShanghai`;
```

## 预期输出示例
```
阜宁今天的天气是多云，气温26°C，体感28°C。紫外线指数6（中等），降水概率20%。日出06:15，日落18:42。
```

## 验证计划
1. 测试"深圳今天天气" - 确认返回完整数据
2. 测试"明天深圳天气" - 确认预报数据
3. 测试具体日期历史天气 - 确认历史数据
