---
name: memory-skill
description: 记忆分析 - 分析对话历史、提取上下文相关性
trigger:
  - 历史
  - 记忆
  - 之前
  - 刚才
  - 上次
triggers:
  - 分析历史相关性
  - 提取上下文
  - 用户画像历史
---

# Memory-Skill

记忆分析技能，分析对话历史，提取上下文相关性信息。

## 核心功能

### process(query, history, context)
分析历史对话，返回相关上下文。

### analyzeHistoryRelevance(currentQuery, history)
分析历史消息与当前查询的相关性，返回最相关的消息。

### extractUserProfileFromHistory(history)
从历史中提取用户信息：提及的城市、日期、偏好等。

### buildHistoryContext(history)
将历史消息格式化为上下文字符串。

## 返回数据

```javascript
{
  relevantHistory: [...],      // 相关的历史消息
  formattedContext: "...",    // 格式化的历史上下文
  userProfile: {
    mentionedCities: [],      // 提及的城市
    mentionedDates: [],       // 提及的日期
    preferences: []           // 偏好
  },
  hasRelevantHistory: true/false
}
```