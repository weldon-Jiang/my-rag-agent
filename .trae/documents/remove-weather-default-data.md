# 清除天气初始化数据模板

## 目标
移除 `weather-skill.js` 中的静态默认天气数据（DEFAULT_WEATHER_DATA）。

## 修改文件
- `d:\chinatravel\my-rag-agent\server\skills\weather-skill.js`

## 修改步骤

### Step 1: 删除 DEFAULT_WEATHER_DATA 常量
删除第 4-36 行的默认天气数据

### Step 2: 修改 getDefaultWeather 方法
简化为返回错误或空数据，强制使用 API
