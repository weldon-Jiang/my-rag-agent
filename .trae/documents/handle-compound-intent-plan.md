# 计划：处理复合意图 - 同时改名和设定关系

## 问题描述

用户输入"你叫小通，我是你的老板"时：
- 包含两个意图：智能体改名 + 关系设定
- 当前系统没有在调用大模型前检测这些意图
- 大模型回答了但没有保存新的名称和关系

## 解决方案

### 步骤1: 在调用大模型前检测复合意图
- 在 chat.js 中，调用大模型之前添加意图检测
- 提取所有需要保存的信息（newBotName, newUserName, newRelationship）

### 步骤2: 修改响应处理
- 如果检测到意图，在响应中添加对应的更新字段
- 前端自动更新 localStorage

## 实现逻辑

```javascript
// 在调用大模型之前
let updates = {};

// 检测改名意图
if (isRenameIntent(query) && !isQuestion(query)) {
  const newName = extractBotName(query);
  if (newName) {
    updates.newBotName = newName;
  }
}

// 检测用户改名意图
if (isRenameUserIntent(query) && !isQuestion(query)) {
  const newName = extractUserName(query);
  if (newName) {
    updates.newUserName = newName;
  }
}

// 检测关系设定意图
if (isSetRelationshipIntent(query) && !isQuestion(query)) {
  const newRel = extractRelationship(query);
  if (newRel) {
    updates.newRelationship = newRel;
  }
}

// 调用大模型获取回答
const response = await executeToolLoop(...);

// 如果有需要保存的更新，添加到响应中
if (Object.keys(updates).length > 0) {
  return res.json({
    response,
    ...updates
  });
}
```

## 预期效果

输入："你叫小通，我是你的老板"
- 检测到改名意图 → newBotName: "小通"
- 检测到关系设定意图 → newRelationship: "老板"
- 返回大模型回答 + 保存信息
- 前端更新 localStorage
