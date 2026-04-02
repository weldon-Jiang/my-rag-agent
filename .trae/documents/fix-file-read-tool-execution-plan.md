# 计划：修复文件读取工具不执行的问题

## 问题描述
用户输入 `查看文件 "C:\Users\54327\Downloads\1757485554199.yml"` 时，智能体只返回了工具调用字符串 `<tool_call><tool name="ReadFile">...</tool_call>`，但没有返回文件内容。

## 根本原因
当前系统缺少**函数调用执行机制**。AI可以生成工具调用，但系统不会：
1. 解析AI返回的工具调用格式
2. 执行相应的工具函数
3. 将工具执行结果返回给AI进行二次处理

## 解决方案
实现完整的函数调用循环（类似OpenAI的Function Calling）：

### 步骤1：创建工具执行模块
- 文件：`server/sandbox/executor.js`
- 功能：集中管理所有工具的执行
- 现有工具：read_file, write_file, str_replace, bash, ls, ask_clarification

### 步骤2：修改 chat.js 实现工具调用循环
- 文件：`server/routes/chat.js`
- 修改 `callAI` 函数：
  1. 解析AI返回的内容，检测`<tool_call>`格式
  2. 提取工具名称和参数
  3. 调用工具执行器
  4. 将工具结果格式化为消息
  5. 循环调用AI直到没有更多工具调用
  6. 返回最终回答

### 步骤3：定义工具调用格式规范
```
AI返回格式：
<tool_call>
<tool name="工具名称">
<param name="参数名">参数值</param>
</tool>
</tool_call>

系统解析后执行，然后返回：
<tool_result>
<tool name="工具名称">
<result>执行结果JSON</result>
</tool>
</tool_result>
```

### 步骤4：添加工具到系统提示
- 在systemPrompt中添加工具定义和使用说明
- 让AI知道有那些工具可用以及如何调用

### 步骤5：处理文件路径
- 用户输入的是Windows路径如 `C:\Users\54327\Downloads\1757485554199.yml`
- 需要转换为系统可识别的路径格式
- 或者支持虚拟路径映射

## 预期效果
1. 用户输入查看文件请求
2. AI识别需要调用read_file工具
3. 系统解析工具调用，执行read_file
4. 系统将文件内容作为上下文返回给AI
5. AI基于文件内容生成最终回答
6. 用户看到文件内容

## 实现细节

### 工具列表（来自 skills/index.js）
- read_file: 读取文件内容
- write_file: 写入文件
- str_replace: 替换文件内容
- bash: 执行bash命令
- python: 执行Python代码
- ls: 列出目录内容

### 工具调用解析正则
```javascript
const toolCallRegex = /<tool_call>\s*<tool name="(\w+)">([\s\S]*?)<\/tool>\s*<\/tool_call>/g;
const paramRegex = /<param name="(\w+)">([^<]*)<\/param>/g;
```

### 工具执行循环（最多3次）
```javascript
async function executeToolCalls(aiResponse, modelConfig) {
  let maxIterations = 3;
  let iterations = 0;
  let currentResponse = aiResponse;
  let toolMessages = [];

  while (iterations < maxIterations) {
    const toolCalls = parseToolCalls(currentResponse);
    if (toolCalls.length === 0) break;

    for (const call of toolCalls) {
      const result = await executeTool(call.name, call.args);
      toolMessages.push({
        role: 'tool',
        name: call.name,
        content: JSON.stringify(result)
      });
    }

    // 将工具结果返回给AI获取最终回答
    currentResponse = await callAIWithContext(query, toolMessages);
    iterations++;
  }

  return currentResponse;
}
```
