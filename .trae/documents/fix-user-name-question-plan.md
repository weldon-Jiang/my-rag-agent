# 计划：优化用户名称识别 - 区分问句和陈述句

## 问题分析

当前问题：当用户问"我是谁"时，系统错误地将其理解为给用户起名叫"谁"

问题原因：
- "我是"关键词同时匹配了 rename_user 意图
- 没有区分陈述句和疑问句

## 解决方案

### 步骤1: 修改意图关键词
- 文件：`server/routes/chat.js`
- 从 rename_user 中移除容易混淆的短关键词
- 增加排除问句的模式

### 步骤2: 添加问句检测
- 添加 `isQuestion()` 函数
- 检测问句特征：谁、什么、哪里、为什么、吗、呢、？

### 步骤3: 修改提取函数
- 修改 `extractUserName()` 函数
- 如果检测到是问句，返回 null 不提取名称

## 具体改动

### 意图关键词优化
```javascript
// 移除容易混淆的
rename_user: [
  '我叫', '我是',    // 太短，容易误判
  '以后叫我', '以后你叫我', '你就叫我', 
  '我的名字是', '我以后叫', '我以后就是'
]

// 改用更明确的模式（通过正则判断）
```

### 问句检测函数
```javascript
function isQuestion(query) {
  const questionWords = ['谁', '什么', '哪', '怎么', '为什么', '吗', '呢', '?', '？'];
  const questionPatterns = [/是谁/, /叫什么/, /是啥/, /是什么呢/];
  
  // 如果包含问句关键词或问句模式
  return questionPatterns.some(p => p.test(query)) || 
         questionWords.some(w => query.includes(w));
}
```

### 修改 extractUserName
```javascript
function extractUserName(query) {
  // 首先检查是否是问句
  if (isQuestion(query)) {
    return null;  // 问句不提取名称
  }
  
  // ... 原有逻辑
}
```

## 预期效果
- "我是谁" → 不提取名称，返回询问身份的回答
- "我叫小明" → 提取名称"小明"，确认改名
- "我是谁？" → 问句，不改名
- "我叫小王" → 陈述句，改名为小王
