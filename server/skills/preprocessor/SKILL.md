---
name: preprocessor-skill
description: 预处理器 - 封装命令检测、用户画像、历史上下文等预处理逻辑
trigger:
  - 预处理
  - 前置处理
triggers:
  - 命令检测
  - 用户画像
  - 历史上下文
---

# Preprocessor-Skill

预处理器技能，封装 router.post 中的预处理逻辑。

## 核心功能

### process(query, options)
主要入口方法，返回预处理结果：

```javascript
{
  query: string,              // 原始查询
  botName: string,             // Bot名称
  effectiveQuery: string,      // 有效查询（含澄清上下文）
  historyContext: string,      // 历史上下文
  shouldReturn: boolean,       // 是否应直接返回
  returnData: object,          // 返回数据
  context: {                   // 额外上下文
    command: object,
    userProfile: object
  }
}
```

## 处理流程

1. **命令检测** - 调用 CommandSkill
2. **用户画像** - 调用 UserProfileSkill
3. **历史上下文** - 调用 MemorySkill
4. **澄清上下文** - 构建澄清对话历史

## 使用方式

```javascript
const preprocessor = skillsCenter.get('preprocessor-skill');
const result = await preprocessor.process(query, {
  skillsCenter,
  history,
  botName,
  clarificationResponses,
  originalQuery
});

if (result.shouldReturn) {
  return res.json(result.returnData);
}
```