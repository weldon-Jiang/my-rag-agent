# Tasks

- [x] Task 1: 实现 Router 意图分析函数
  - [x] SubTask 1.1: 创建 analyzeIntent(query) 函数
  - [x] SubTask 1.2: 定义意图类型（search_knowledge, recognize_image, extract_pdf, analyze_video, general）
  - [x] SubTask 1.3: 根据关键词判断意图

- [x] Task 2: 实现 Skill Selector 工具筛选
  - [x] SubTask 2.1: 创建 intentToTools 映射表
  - [x] SubTask 2.2: 创建 selectTools(intent) 函数
  - [x] SubTask 2.3: 根据意图返回相关工具列表

- [x] Task 3: 实现 Prompt Assembler 动态组装
  - [x] SubTask 3.1: 创建 formatToolDescription(tool) 函数
  - [x] SubTask 3.2: 创建 buildSystemPrompt(tools) 函数
  - [x] SubTask 3.3: 只拼接相关工具描述

- [x] Task 4: 实现 Tool Executor 工具执行
  - [x] SubTask 4.1: 创建 executeTools(tools, query, context) 函数
  - [x] SubTask 4.2: 收集工具执行结果
  - [x] SubTask 4.3: 格式化工具结果为上下文

- [x] Task 5: 修改 chat.js 主流程
  - [x] SubTask 5.1: 在处理请求时先调用 Router 分析意图
  - [x] SubTask 5.2: 调用 Skill Selector 筛选工具
  - [x] SubTask 5.3: 调用 Tool Executor 执行工具
  - [x] SubTask 5.4: 将结果组装发送给 LLM

- [x] Task 6: 测试验证
  - [x] SubTask 6.1: 测试意图分析准确性
  - [x] SubTask 6.2: 测试工具筛选正确性
  - [x] SubTask 6.3: 测试最终回答质量

# Task Dependencies
- Task 2 依赖于 Task 1 完成
- Task 3 依赖于 Task 2 完成
- Task 4 依赖于 Task 2 完成
- Task 5 依赖于 Task 3、4 完成
- Task 6 依赖于 Task 5 完成
