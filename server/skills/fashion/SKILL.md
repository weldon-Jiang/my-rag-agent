---
name: fashion-skill
description: 穿衣建议 - 根据天气情况生成穿衣建议
trigger:
  - 穿什么
  - 穿啥
  - 衣服
  - 穿搭
  - 衣着
  - 建议
triggers:
  - 生成穿衣建议
  - 服装推荐
  - 搭配建议
---

# Fashion-Skill

穿衣建议技能，根据天气温度、湿度、紫外线、降水概率等生成具体穿衣建议。

## 核心功能

### process(query, weatherData, context)
输入天气数据，返回穿衣建议。

### generateRecommendation(temp, humidity, uvIndex, rainProbability, weatherCondition)
生成完整穿搭方案。

## 返回数据

```javascript
{
  temp: 18,           // 温度
  humidity: 65,       // 湿度
  uvIndex: 5,         // 紫外线指数
  rainProbability: 30, // 降水概率
  layers: { count: 2, description: '两层穿衣法' },
  items: ['长袖打底衫', '防风外套', '牛仔裤'],
  accessories: ['雨伞', '防晒霜'],
  colorSuggestion: '浅色系或明亮色彩',
  summary: '18°C 建议：两层穿衣法...'
}
```

## 温度分层

| 温度范围 | 层数 | 描述 |
|----------|------|------|
| < 5°C | 三层 | 内层保暖+中层抓绒+外层防风 |
| 5-15°C | 两层 | 内层打底+外层防风外套 |
| 15-25°C | 单层 | 轻便长袖或短袖 |
| > 25°C | 薄款 | 短袖或薄款上衣 |