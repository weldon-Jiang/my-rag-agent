# 更新天气 API 接口

## 目标
替换不可用的 wttr.in API，使用 Open-Meteo 免费天气 API。

## 推荐 API

### Open-Meteo API
- **优点**: 完全免费，无需 API key，支持全球天气数据
- **URL**: `https://api.open-meteo.com/v1/forecast`
- **文档**: https://open-meteo.com/

### API 使用示例
```
GET https://api.open-meteo.com/v1/forecast?latitude=22.5431&longitude=114.0579&current_weather=true
```

## 中国城市经纬度表
| 城市 | 纬度 | 经度 |
|------|------|------|
| 深圳 | 22.5431 | 114.0579 |
| 北京 | 39.9042 | 116.4074 |
| 上海 | 31.2304 | 121.4737 |
| 广州 | 23.1291 | 113.2644 |
| 杭州 | 30.2741 | 120.1551 |
| 成都 | 30.5728 | 104.0668 |
| 武汉 | 30.5926 | 114.3055 |
| 重庆 | 29.4316 | 106.9123 |

## 实现步骤

### Step 1: 创建城市坐标映射
添加中国主要城市的经纬度映射

### Step 2: 修改 getWeather 方法
使用 Open-Meteo API 替换 wttr.in

### Step 3: 更新 formatWeatherText
适配新的 API 返回格式

## 修改文件
- `d:\chinatravel\my-rag-agent\server\skills\weather-skill.js`
