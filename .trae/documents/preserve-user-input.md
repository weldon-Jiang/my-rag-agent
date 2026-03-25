# 优化 Skill/Tool 系统 - 保留用户原始输入

## 目标
确保用户输入的原始内容在整个处理流程中始终传递，不丢失。

## 当前问题
用户输入可能在以下环节丢失或被修改：
1. 工具执行时只传递了部分信息
2. 结果组装时丢失了原始查询上下文
3. System Prompt 中没有包含用户原始问题

## 优化方案

### 1. 在执行工具时保留原始查询
```javascript
// executeTools 函数中，传递给工具的不只是 query，还要保留完整上下文
```

### 2. 工具结果中包含原始查询
```javascript
// 每个工具执行时，都应该在结果中包含：
{
  originalQuery: '今天深圳天气怎么样',  // 原始用户输入
  toolName: 'get_weather',
  result: { ... }
}
```

### 3. System Prompt 中包含原始问题
```
用户问题: 今天深圳天气怎么样

相关工具结果:
- get_weather: 深圳当前天气...

请基于上述信息回答用户问题。
```

### 4. 创建统一的上下文传递对象
```javascript
const context = {
  originalQuery: query,        // 原始用户问题
  intent: intent,              // 识别的意图
  selectedTools: tools,        // 选择的工具
  toolResults: results,       // 工具执行结果
  timestamp: Date.now()       // 时间戳
};
```

## 修改文件
- `d:\chinatravel\my-rag-agent\server\routes\chat.js`

## 实现步骤

### Step 1: 创建统一上下文对象
在 `executeTools` 调用前创建，包含原始查询

### Step 2: 修改工具执行逻辑
每个工具结果都包含 `originalQuery` 字段

### Step 3: 修改 System Prompt 组装
始终在 system prompt 中包含用户原始问题

### Step 4: 修改结果格式化
`formatToolResults` 函数接收完整上下文
