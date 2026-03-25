# Skill 渐进式披露系统 Spec

## Why
当前系统的局限性：
- 每次查询都调用所有技能处理所有文件，没有按需调度
- 依赖模型原生 tool_calls 功能，但 MiniMax 等模型不支持
- 缺乏智能的意图分析和工具筛选机制

## What Changes
- 实现 **Router（路由）**：根据用户输入分析意图
- 实现 **Skill Selector（工具筛选）**：按意图映射到相关工具
- 实现 **Prompt Assembler（提示组装）**：只把相关工具描述拼入 system prompt
- 实现 **Tool Executor（工具执行）**：调用工具并收集结果
- 最终将工具结果组装为上下文发给 LLM 生成回答

## Impact
- Affected specs: 知识库检索、RAG 问答、用户交互界面
- Affected code: server/skills/index.js, server/routes/chat.js

## 技术架构

### 分层设计
```
用户输入
    ↓
Router（意图分类）
    ↓
Skill Selector（工具筛选）
    ↓
Prompt Assembler（提示组装）
    ↓
Tool Executor（工具执行）
    ↓
LLM 生成回答
```

### 核心原则
1. **最少够用原则（MVP Tools）**：模型只需要"刚好能完成任务"的工具
2. **可回退机制**：工具不够时自动扩容
3. **Token Budget 控制**：工具描述超过阈值时精简

## ADDED Requirements

### Requirement: Router 意图分析
系统 SHALL 根据用户输入分析意图类型

#### Scenario: 分析意图
- **WHEN** 用户输入"帮我搜索项目经理面试相关 PDF"
- **THEN** Router 输出 intent: "search_pdf"

### Requirement: Skill Selector 工具筛选
系统 SHALL 根据意图筛选相关工具

#### Scenario: 按意图映射工具
- **WHEN** intent 为 "search_pdf"
- **THEN** 筛选出 extract_pdf_text, search_knowledge_base 工具

### Requirement: Prompt Assembler 动态组装
系统 SHALL 只把相关工具描述拼入 system prompt

#### Scenario: 动态拼接提示
- **WHEN** 筛选出 ["extract_pdf_text", "search_knowledge_base"]
- **THEN** 拼接工具描述到 system prompt

### Requirement: Tool Executor 工具执行
系统 SHALL 调用筛选出的工具并收集结果

#### Scenario: 执行工具
- **WHEN** 需要调用 extract_pdf_text
- **THEN** 执行工具并返回结果

### Requirement: 结果组装与回答生成
系统 SHALL 将工具结果组装为上下文发给 LLM

#### Scenario: 生成最终回答
- **WHEN** 收集到所有工具结果
- **THEN** 组装上下文发送给 LLM 生成回答

## MODIFIED Requirements

### Requirement: 现有聊天路由
修改 chat.js 中的 `/api/chat` 路由：
- 先进行意图分析和工具调度
- 再将结果发送给 LLM

## REMOVED Requirements

无

## 工具定义（已有）

| 工具名 | 功能 | 触发关键词 |
|--------|------|-----------|
| search_knowledge_base | 搜索知识库 | 搜索、查询、找 |
| recognize_image | OCR图片识别 | 图片、照片、截图 |
| extract_pdf_text | PDF文本提取 | PDF、文档 |
| analyze_video | 视频内容分析 | 视频、录像 |