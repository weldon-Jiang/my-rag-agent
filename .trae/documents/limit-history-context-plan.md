# 计划：限制历史消息分析范围

## 需求

限制历史消息分析最多往前找两个问题，避免分析太久远的历史。

## 实现

### 步骤1: 修改 analyzeHistoryRelevance 函数
- 文件：`server/routes/chat.js`
- 只分析最近两条用户消息（history的最后两条）
- 移除过于久远的历史分析

### 修改逻辑
```javascript
// 修改前：遍历所有历史消息
for (let i = 0; i < history.length; i++)

// 修改后：只分析最近两条用户消息
const maxHistoryCheck = 2;  // 最多检查最近2条
for (let i = Math.max(0, history.length - maxHistoryCheck * 2); i < history.length; i++)
```
