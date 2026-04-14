# RAG Agent 系统架构文档

## 1. 系统架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           前端 (Public)                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │   首页   │  │  聊天页  │  │ 模型页   │  │ 技能页   │  │ 文件页   │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘ │
│       └────────────┴────────────┴────────────┴────────────┘       │
│                               │                                     │
│                    ┌─────────┴─────────┐                         │
│                    │      API 工具层       │                         │
│                    │    (utils/api.js)     │                         │
│                    └─────────┬─────────┘                         │
└────────────────────────────────┼────────────────────────────────────┘
                                 │ HTTP Request
┌────────────────────────────────┼────────────────────────────────────┐
│                           后端 (Server)                              │
│                                │                                     │
│  ┌─────────────────────────────┴─────────────────────────────┐     │
│  │                    Controller 层                            │     │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │     │
│  │  │chat-controller│ │session-ctrl │ │model-ctrl   │          │     │
│  │  └─────────────┘ └─────────────┘ └─────────────┘          │     │
│  └─────────────────────────────┬─────────────────────────────┘     │
│                                │                                     │
│  ┌─────────────────────────────┴─────────────────────────────┐     │
│  │                    Service 层                              │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │     │
│  │  │  chat   │ │ session │ │  model  │ │  file   │        │     │
│  │  │ service │ │ service │ │ service │ │ service │        │     │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │     │
│  │       └───────────┴───────────┴───────────┘              │     │
│  │                        │                                 │     │
│  │               ┌────────┴────────┐                       │     │
│  │               │   AI Service    │                       │     │
│  │               │  (AI 调用封装)    │                       │     │
│  └───────────────┼─────────────────┼───────────────────────┘     │
│                  │                 │                                │
│  ┌───────────────┼─────────────────┼───────────────────────┐     │
│  │              Skills Center       │                       │     │
│  │  ┌─────────────┴─────────────┐  │                       │     │
│  │  │    Skills Manager         │  │                       │     │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐ │  │                       │     │
│  │  │  │tools│ │skill│ │     │ │  │                       │     │
│  │  │  │mgr  │ │manifest│   │ │  │                       │     │
│  │  └─────────────────────────┘  │                       │     │
│  └───────────────────────────────┼───────────────────────┘     │
│                                  │                                │
│  ┌───────────────────────────────┼───────────────────────┐     │
│  │           工具层              │                        │     │
│  │  ┌──────────┐ ┌──────────┐  │ ┌──────────┐          │     │
│  │  │ weather  │ │ location │  │ │ knowledge │          │     │
│  │  └──────────┘ └──────────┘  │ └──────────┘          │     │
│  │  ┌──────────┐ ┌──────────┐  │ ┌──────────┐          │     │
│  │  │  images  │ │   pdfs   │  │ │  videos  │          │     │
│  │  └──────────┘ └──────────┘  │ └──────────┘          │     │
│  └───────────────────────────────┴───────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## 2. 目录结构

```
my-rag-agent/
├── public/                          # 前端静态资源
│   ├── pages/
│   │   ├── chat/                   # 聊天页面
│   │   │   ├── chat.html
│   │   │   └── chat.js
│   │   ├── models/                 # 模型配置页面
│   │   └── skill-tools/           # 技能工具页面
│   ├── utils/
│   │   ├── api.js                  # API 请求封装
│   │   └── content-renderer.js     # 内容渲染
│   ├── components/                  # 公共组件
│   ├── router/                     # 前端路由
│   └── app.js                      # 前端入口
│
├── server/                         # 后端服务
│   ├── controllers/                # HTTP 处理层
│   │   ├── chat-controller.js      # 聊天接口
│   │   ├── session-controller.js   # 会话接口
│   │   ├── model-controller.js     # 模型接口
│   │   └── file-controller.js      # 文件接口
│   │
│   ├── services/                   # 业务逻辑层
│   │   ├── chat-service.js         # 聊天核心业务
│   │   ├── ai-service.js           # AI API 调用
│   │   ├── session-service.js       # 会话管理
│   │   ├── model-service.js        # 模型管理
│   │   └── file-service.js         # 文件管理
│   │
│   ├── skills/                     # 技能系统
│   │   ├── skills.js               # 技能中心（入口）
│   │   ├── skills-manager.js       # 技能管理器
│   │   ├── skills-manifest.js      # 技能清单
│   │   ├── base-skill.js           # 技能基类
│   │   └── [skill]/                # 各技能实现
│   │       ├── weather/
│   │       ├── location/
│   │       ├── knowledge/
│   │       └── ...
│   │
│   ├── tools/                      # 工具系统
│   │   ├── tools.js                # 工具中心
│   │   ├── tools-manager.js        # 工具管理器
│   │   ├── tool-definitions.js     # 工具定义
│   │   └── [tool]/                 # 各工具实现
│   │       ├── weather/
│   │       └── ...
│   │
│   ├── clarification/               # 追问系统
│   │   └── index.js                # 追问逻辑
│   │
│   └── index.js                    # 服务入口
│
├── docs/                           # 文档
│   └── architecture.md              # 本文档
│
└── knowledge/                      # 知识库文件存储
```

## 3. API 路由

| 方法 | 路径 | Controller | 作用 |
|------|------|------------|------|
| POST | `/api/chat` | chat-controller | 发送聊天消息 |
| POST | `/api/chat/clarification/respond` | chat-controller | 回复追问 |
| GET | `/api/chat/clarification/:id` | chat-controller | 获取追问状态 |
| GET | `/api/sessions` | session-controller | 获取会话列表 |
| POST | `/api/sessions` | session-controller | 创建会话 |
| GET | `/api/sessions/:id` | session-controller | 获取会话历史 |
| PUT | `/api/sessions/:id` | session-controller | 更新会话 |
| DELETE | `/api/sessions/:id` | session-controller | 删除会话 |
| GET | `/api/models` | model-controller | 获取模型列表 |
| POST | `/api/models` | model-controller | 添加模型 |
| PUT | `/api/models/:id` | model-controller | 更新模型 |
| DELETE | `/api/models/:id` | model-controller | 删除模型 |
| GET | `/api/files` | file-controller | 获取文件列表 |
| POST | `/api/files` | file-controller | 创建文件 |
| POST | `/api/files/upload` | file-controller | 上传文件 |
| DELETE | `/api/files/:filename` | file-controller | 删除文件 |
| GET | `/api/skills` | index.js | 获取技能列表 |
| POST | `/api/skills/process` | index.js | 处理单个文件 |
| POST | `/api/skills/process-multiple` | index.js | 批量处理文件 |

## 4. AI 对话核心流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI 对话流程图                                  │
└─────────────────────────────────────────────────────────────────────┘

用户输入
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. 意图分析 (Intent Analysis)                                       │
│                                                                      │
│ ┌─────────────────┐     ┌─────────────────┐                          │
│ │  关键词匹配      │────▶│  LLM 分析       │                          │
│ │ (fallback)      │     │ (置信度>0.7)    │                          │
│ └────────┬────────┘     └────────┬────────┘                          │
│          │                       │                                   │
│          │  意图不明确            │  置信度不足                       │
│          ▼                       ▼                                   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 2. 追问生成 (Clarification)                                       │ │
│ │     生成自然语言追问，返回选项让用户确认                            │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                    需要追问   │   不需要追问                         │
│                              ▼                                       │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. 工具选择 (Tool Selection)                                         │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │  意图 → 工具映射                                                   ││
│ │  weather → get_weather                                           ││
│ │  location → get_location                                        ││
│ │  knowledge → search_knowledge_base                              ││
│ │                                                                  ││
│ │  查询触发词匹配 (trigger keywords)                                ││
│ └──────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                    匹配到工具 │   无工具匹配                         │
│                              ▼                                       │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. 工具执行 (Tool Execution) - 并行执行                              │
│                                                                      │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                              │
│ │ Tool 1  │  │ Tool 2  │  │ Tool 3  │                              │
│ └────┬────┘  └────┬────┘  └────┬────┘                              │
│      │            │            │                                    │
│      ▼            ▼            ▼                                    │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                              │
│ │天气结果 │  │位置结果 │  │知识结果 │                              │
│ └────┬────┘  └────┬────┘  └────┬────┘                              │
│      │            │            │                                    │
│      └────────────┼────────────┘                                    │
│                   ▼                                                  │
│        ┌──────────────────┐                                          │
│        │ 结果格式化为      │                                         │
│        │ 上下文字符串      │                                         │
│        └────────┬─────────┘                                         │
└─────────────────┼───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. 构建 Prompt                                                       │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ systemPrompt = 角色设定 + 工具定义 + 上下文 + 历史               ││
│ └──────────────────────────────────────────────────────────────────┘│
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. 调用 AI                                                          │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │  ai-service.callAI(model, systemPrompt, userMessage)           ││
│ │                         │                                        ││
│ │         ┌───────────────┴───────────────┐                       ││
│ │         ▼                               ▼                       ││
│ │  ┌─────────────┐              ┌─────────────┐                   ││
│ │  │ OpenAI      │              │ Anthropic   │                   ││
│ │  │ /v1/chat/   │              │ /v1/messages │                   ││
│ │  │ completions │              │              │                   ││
│ │  └─────────────┘              └─────────────┘                   ││
│ └──────────────────────────────────────────────────────────────────┘│
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. 返回结果                                                         │
│                                                                      │
│         ┌──────────────────┐                                        │
│         │ {                │                                        │
│         │   type: 'text',  │                                        │
│         │   content: '...' │                                        │
│         │   intent: '...'  │                                        │
│         │   tools: [...]   │                                        │
│         │ }                 │                                        │
│         └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 5. 核心模块调用链

### 5.1 聊天消息处理

```
chat-controller.js
    │
    ▼
chat-service.processChatMessage(message, sessionId, modelConfig)
    │
    ├──▶ analyzeIntentWithFallback(query, modelConfig)
    │       │
    │       ├──▶ skillsCenter.analyzeIntent(query)  [关键词匹配]
    │       │
    │       └──▶ analyzeIntentWithLLM(query, modelConfig)  [LLM分析]
    │               │
    │               └──▶ aiService.callAI() → 调用大模型
    │
    ├──▶ selectTools(intent, query)
    │       │
    │       ├──▶ skillsCenter.matchTools(query)  [触发词匹配]
    │       │
    │       └──▶ skillsCenter.getToolsForIntent(intent)  [意图映射]
    │
    ├──▶ executeTools(selectedTools, query, modelConfig)
    │       │
    │       └──▶ skillsCenter.executeTool(toolName, args, context)
    │               │
    │               ├──▶ skillsManager.execute(skillName, args)
    │               │       │
    │               │       └──▶ [skill].process(args, context)
    │               │
    │               └──▶ toolsManager.execute(toolName, args)
    │                       │
    │                       └──▶ [tool].execute(args)
    │
    ├──▶ formatToolResults(toolResults, query)
    │
    ├──▶ buildSystemPrompt(selectedTools, context, query, ...)
    │
    └──▶ aiService.callAI(query, systemPrompt, ...)
            │
            └──▶ 返回 AI 回复
```

### 5.2 工具执行流程

```
skillsCenter.executeTool(toolName, args, context)
    │
    ├──▶ skillsManager.execute(skillName, args)
    │       │
    │       └──▶ skill.process(args, context)
    │               │
    │               └──▶ 调用外部 API / 读取文件 / 处理数据
    │
    └──▶ toolsManager.execute(toolName, args)
            │
            └──▶ tool-executor.execute(toolName, args)
                    │
                    └──▶ sandbox.execute(code, args)
```

## 6. 意图分析详解

### 6.1 意图分类

| 意图 | 关键词示例 | 对应工具 |
|------|-----------|----------|
| `ask_weather` | 天气、气温、温度、下雨 | `get_weather` |
| `ask_location` | 在哪里、位置、地址、省份 | `get_location` |
| `ask_knowledge` | 知识库、文档、搜索 | `search_knowledge_base` |
| `ask_general` | 你好、谢谢、再见 | 无需工具 |
| `rename_bot` | 叫我、改名 | 无需工具 |
| `rename_user` | 我叫、我是 | 无需工具 |

### 6.2 分析流程

```
用户查询
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 步骤1: 关键词匹配 (skillsCenter.analyzeIntent)               │
│                                                              │
│ 遍历 INTENT_KEYWORDS，查找匹配的关键词                       │
│                                                              │
│ 返回: 意图名称 (如 'weather')                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 步骤2: LLM 分析 (可选，置信度不足时)                         │
│                                                              │
│ 使用 INTENT_ANALYSIS_PROMPT 让 AI 分析意图                  │
│                                                              │
│ 返回: { intent, confidence, needs_clarification, ... }     │
└──────────────────────────┬──────────────────────────────────┘
                           │
              置信度 > 0.7 │ 置信度 ≤ 0.7
                           ▼
              ┌─────────────────────────┐
              │ 使用 LLM 结果           │
              └─────────────────────────┘
```

## 7. 数据流

### 7.1 会话数据

```
前端 SessionStorage / LocalStorage
    │
    ▼
session-controller → session-service
    │                      │
    │                      ▼
    │              data/sessions.json
    │
    ▼
返回会话列表 / 消息历史
```

### 7.2 模型配置

```
前端表单
    │
    ▼
model-controller → model-service
    │                      │
    │                      ▼
    │              data/models.json
    │
    ▼
返回模型列表 / 设置激活模型
```

### 7.3 知识库文件

```
前端上传
    │
    ▼
file-controller → file-service
    │                      │
    │                      ▼
    │              knowledge/ 目录
    │
    ▼
文件列表 / 文件内容
```

## 8. 前端页面流程

```
index.html (SPA 入口)
    │
    ├──▶ app.js (前端主入口)
    │           │
    │           ├──▶ router.js (前端路由)
    │           │
    │           └──▶ 加载对应页面模块
    │
    ├──▶ chat.html (聊天页面)
    │           │
    │           └──▶ chat.js
    │                   │
    │                   ├──▶ api.chat.send() → /api/chat
    │                   │
    │                   └──▶ appendMessage() 渲染消息
    │
    ├──▶ models.html (模型配置)
    │           │
    │           └──▶ models.js
    │                   │
    │                   └──▶ api.models.* → /api/models
    │
    └──▶ skill-tools.html (技能工具)
            │
            └──▶ skill-tools.js
                    │
                    └──▶ api.skills.* → /api/skills
```

## 9. 关键类和数据结构

### 9.1 ToolResultCache

```javascript
// 服务端工具结果缓存 (TTL: 5分钟)
class ToolResultCache {
  cache: Map<string, { value: any, expiry: number }>

  get(key)      // 获取缓存
  set(key, val) // 设置缓存
  delete(key)   // 删除缓存
  clear()       // 清空缓存
  getStats()    // 获取统计信息
}
```

### 9.2 SkillsManager

```javascript
// 技能管理器
class SkillsManager {
  skills: Map<string, Skill>

  registerManifest(name, manifest)  // 注册技能
  loadFromManifest()              // 从清单加载
  get(name)                        // 获取技能
  getAll()                         // 获取所有技能
  execute(skillName, args, context) // 执行技能
}
```

### 9.3 ToolsManager

```javascript
// 工具管理器
class ToolsManager {
  manifest: Map<string, ToolConfig>

  getManifest()                    // 获取工具清单
  getTools()                       // 获取所有工具
  execute(toolName, args)          // 执行工具
  getToolDefinitions()             // 获取工具定义
}
```

## 10. 配置文件

### 10.1 .env 配置

```bash
PORT=3000                    # 服务端口
API_KEY=your-api-key         # AI API 密钥
API_BASE_URL=https://api.xxx.com  # AI API 地址
NODE_ENV=development         # 环境
```

### 10.2 数据文件

```
data/
├── sessions.json    # 会话数据
└── models.json      # 模型配置
```

## 11. 错误处理

```
请求
  │
  ▼
Controller (try-catch)
  │
  ├──▶ 业务逻辑
  │
  └──▶ 捕获异常
          │
          ▼
      res.status(500).json({ error: error.message })
```

## 12. 依赖关系

```
package.json
    │
    ├──▶ express        # Web 框架
    ├──▶ cors           # 跨域
    ├──▶ dotenv         # 环境变量
    ├──▶ axios          # HTTP 客户端
    ├──▶ multer         # 文件上传
    └──▶ ...
```