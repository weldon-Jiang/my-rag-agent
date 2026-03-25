# 聊天日志增强计划

## 目标
在 chat.js 中添加详细的调试日志，记录：
1. 用户的原始输入
2. 使用的工具及其参数
3. 发送给大模型的完整参数
4. 大模型返回的完整内容

## 修改文件
- `d:\chinatravel\my-rag-agent\server\routes\chat.js`

## 实现步骤

### Step 1: 在路由入口添加用户输入日志
位置: `router.post('/', ...)` 函数开头
```javascript
console.log('[Chat] 收到请求:');
console.log('  用户输入:', query);
console.log('  模式:', mode);
console.log('  模型:', modelId);
```

### Step 2: 在 Router 分析后添加日志
位置: `analyzeIntent()` 调用后
```javascript
console.log('[Router] 意图分析结果:', intent);
```

### Step 3: 在 Skill Selector 后添加工具日志
位置: `selectTools()` 调用后
```javascript
console.log('[Skill Selector] 选择的工具:', selectedTools);
```

### Step 4: 在 Tool Executor 执行后添加工具结果日志
位置: `executeTools()` 返回后
```javascript
console.log('[Tool Executor] 工具执行结果:', JSON.stringify(toolResults, null, 2));
```

### Step 5: 在 Prompt Assembler 后添加 system prompt 日志
位置: `buildSystemPrompt()` 调用后
```javascript
console.log('[Prompt Assembler] 组装后的 System Prompt:', systemPrompt);
```

### Step 6: 在调用 LLM 前添加请求参数日志
位置: `callAI()` 函数中，发送请求前
```javascript
console.log('[LLM Request] 发送的请求参数:');
console.log('  URL:', fullURL);
console.log('  Headers:', headers);
console.log('  Body:', JSON.stringify(requestBody, null, 2));
```

### Step 7: 在 LLM 返回后添加响应日志
位置: `callAI()` 函数中，收到响应后
```javascript
console.log('[LLM Response] 大模型返回内容:', response);
```

### Step 8: 在返回结果前添加最终日志
位置: 路由返回前
```javascript
console.log('[Chat] 最终响应:', response);
console.log('  来源:', source);
```

## 验证方法
1. 重启服务器
2. 发送测试请求到 `/api/chat`
3. 检查控制台输出是否包含完整的日志信息
