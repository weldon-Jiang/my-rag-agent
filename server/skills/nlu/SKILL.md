---
name: nlu-skill
description: 自然语言理解 - 意图分析、实体提取、文本处理
trigger:
  - nlu
  - 理解
  - 分析
triggers:
  - 分析这句话的意图
  - 提取关键词
  - 理解用户需求
---

# NLU Skill

## 能力
- 意图分类
- 实体识别
- 查询规范化
- 文本分割
- 关键词提取

## 使用方法
调用 `process(query, context)` 方法

## 返回格式
```json
{
  "success": true,
  "intent": "weather",
  "entities": { "city": "北京", "date": "明天" },
  "normalizedQuery": "北京天气明天",
  "activities": ["徒步"],
  "clothingIntent": true,
  "keywords": ["天气", "徒步", "衣服"]
}
```
