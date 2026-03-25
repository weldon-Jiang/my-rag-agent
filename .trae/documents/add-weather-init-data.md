# 添加本地天气初始信息

## 目标
为天气工具添加本地缓存/初始化数据，作为 API 调用失败时的备选方案，或用于快速响应常见城市的天气查询。

## 修改文件
1. `d:\chinatravel\my-rag-agent\server\skills\weather-skill.js` (修改)
2. 可选：`d:\chinatravel\my-rag-agent\knowledge\weather.json` (创建本地天气数据)

## 实现方案

### 方案 A：在 weather-skill.js 中添加静态天气数据
在类中添加常见城市的初始天气信息：

```javascript
const DEFAULT_WEATHER_DATA = {
  '深圳': { temp_C: '26', weatherDesc: '多云', humidity: '75', windSpeed: '15', feelsLike: '28' },
  '北京': { temp_C: '18', weatherDesc: '晴', humidity: '45', windSpeed: '8', feelsLike: '17' },
  '上海': { temp_C: '22', weatherDesc: '阴', humidity: '65', windSpeed: '12', feelsLike: '23' },
  // ... 更多城市
};
```

### 方案 B：创建本地天气知识库文件
创建 `knowledge/weather.json` 文件存储天气数据：

```json
{
  "cities": {
    "深圳": { "temp": 26, "desc": "多云", "humidity": 75 },
    "北京": { "temp": 18, "desc": "晴", "humidity": 45 }
  }
}
```

### 推荐：方案 A + 智能调度
1. 先尝试 API 获取实时天气
2. API 失败时使用本地缓存数据
3. 本地数据带有"数据更新时间"标记

## 修改步骤

### Step 1: 添加默认天气数据到 weather-skill.js
添加静态城市天气数据作为初始化数据

### Step 2: 修改 getWeather 方法实现智能调度
- 优先调用 API
- API 失败时返回本地数据并标注"数据来源：本地缓存"

### Step 3: 更新 formatWeatherText
区分实时数据和缓存数据
