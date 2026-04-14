# My RAG Agent

## 项目简介

My RAG Agent 是一个基于检索增强生成（RAG）的智能对话系统，支持多种工具调用、技能管理和知识库检索。系统能够根据用户输入自动识别意图并调用相应的工具，提供智能化的交互体验。

---

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      前端 (Browser)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   聊天页面   │  │  知识库页面  │  │ 技能工具页   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP
┌─────────────────────────────────────────────────────────────────┐
│                      后端 (Node.js Express)                     │
├─────────────────────────────────────────────────────────────────┤
│  Routes:                                                       │
│  ├── /api/chat/*        → chatRouter (对话主路由)              │
│  ├── /api/chat/clarification/* → 追问处理                       │
│  ├── /api/sessions/*    → sessionRouter (会话管理)             │
│  ├── /api/models/*      → modelsRouter (模型管理)              │
│  ├── /api/files/*       → filesRouter (文件管理)              │
│  └── /api/skills/*      → SkillsCenter API                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SkillsCenter (技能中心)                      │
├─────────────────────────────────────────────────────────────────┤
│  ├── SkillsManager     → 技能注册与管理                          │
│  ├── ToolsManager      → 工具注册与管理                          │
│  ├── Clarification     → 渐进式澄清系统                          │
│  └── AI Service        → AI模型调用封装                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心特性

### 1. 智能意图分析
- **LLM驱动**：全部使用大语言模型进行意图分析，不再使用关键词匹配
- **能力识别**：LLM返回抽象的能力需求，通过能力映射表匹配具体工具
- **动态工具匹配**：工具与能力解耦，新增工具只需更新映射表
- **智能追问**：当信息不完整时，LLM生成自然的追问

### 2. 三种对话模式
| 模式 | 工具执行 | 知识库 | LLM生成 | 适用场景 |
|------|---------|--------|---------|---------|
| **AI** | ✓ | ✗ | ✓ | 通用对话、工具辅助 |
| **Knowledge** | ✓ | ✓ | ✗ | 纯知识库问答 |
| **Hybrid** | ✓ | ✓ | ✓ | 综合问答 |

### 3. 渐进式澄清系统
- 智能检测缺失信息
- 生成自然的追问话术
- 提供合理的选项供用户选择

### 4. Token统计
- 会话级别的Token消耗统计
- 意图分析Token单独统计
- 每次对话的Token消耗明细

---

## AI 对话流程

### 完整流程图

```
用户消息
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 意图分析 (LLM)                                       │
│                                                              │
│ ├─ 意图识别 (intent)                                         │
│ ├─ 置信度评估 (confidence)                                   │
│ ├─ 追问检测 (needs_clarification)                            │
│ ├─ 能力识别 (required_capabilities)                          │
│ └─ 任务拆解 (task_breakdown)                                 │
└─────────────────────────────────────────────────────────────┘
    │
    ├──→ 需要追问? ──是──→ 返回追问选项
    │
    └──→ 不需要追问
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: 工具匹配                                             │
│                                                              │
│ 能力需求 ──→ CAPABILITY_TOOLS映射 ──→ 具体工具名称          │
│                                                              │
│ 例: knowledge_search → search_knowledge_base                │
│     weather_query → get_weather                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 工具执行 (按模式分发)                                │
│                                                              │
│ ┌──────────────┬──────────────┬──────────────┐            │
│ │    AI模式     │  Knowledge模式 │   Hybrid模式  │            │
│ ├──────────────┼──────────────┼──────────────┤            │
│ │ 执行工具      │ 执行工具      │ 执行工具      │            │
│ │ (如有)       │              │              │            │
│ │              │ 知识库检索    │ 知识库检索    │            │
│ │ 直接LLM生成  │              │              │            │
│ │              │ 直接返回结果  │ LLM整合结果  │            │
│ └──────────────┴──────────────┴──────────────┘            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: 返回结果                                             │
│                                                              │
│ {                                                           │
│   type: 'text' | 'clarification',                           │
│   content: '回复内容',                                        │
│   intent: '意图分类',                                         │
│   resultSources: ['知识库', '工具', 'LLM'],                 │
│   tools: ['tool1', 'tool2'],                               │
│   tokenUsage: { prompt, completion, total }                 │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

### 模式详细流程

#### AI模式
```
意图分析(LLM)
    │
    ▼
工具匹配 (能力映射)
    │
    ▼
├─ 有工具 → 执行工具 → 汇总上下文 → LLM生成 → 返回
│                              ↑
│                         formatToolResults
└─ 无工具 → 直接LLM生成 → 返回
```

#### Knowledge模式
```
意图分析(LLM)
    │
    ▼
工具匹配 (能力映射)
    │
    ▼
├─ 有工具 → 执行工具 ─┐
│                    │
└─ 无工具 ────────────┼─→ 知识库检索 → 汇总 → 直接返回(不调用LLM)
                                          ↑
                                     formatToolResults
```

#### Hybrid模式
```
意图分析(LLM)
    │
    ▼
工具匹配 (能力映射)
    │
    ▼
├─ 有工具 → 执行工具 ─┐
│                    │
└─ 无工具 ────────────┼─→ 知识库检索 → 汇总 → LLM整合 → 返回
                                          ↑              ↑
                                     formatToolResults  callAI
```

---

## 意图分析系统

### 意图分类体系

| 意图 | 描述 | 所需能力 |
|------|------|---------|
| greeting | 问候、打招呼 | - |
| chat | 闲聊 | - |
| knowledge_query | 知识库查询 | knowledge_search |
| web_query | 网络搜索 | web_search |
| weather_query | 天气查询 | weather_query |
| location_query | 位置查询 | location_query |
| file_read | 读取文件 | file_read |
| file_write | 写入文件 | file_write |
| file_edit | 修改文件 | file_edit |
| code_execute | 执行代码 | code_execute |
| command_execute | 执行命令 | command_execute |
| image_understand | 图片理解 | image_understand |
| document_understand | 文档理解 | document_understand |
| data_process | 数据处理 | data_process |

### 能力到工具映射

```javascript
const CAPABILITY_TOOLS = {
  'knowledge_search': ['search_knowledge_base'],
  'web_search': ['web_search'],
  'weather_query': ['get_weather'],
  'location_query': ['get_location'],
  'file_read': ['read_file'],
  'file_write': ['write_file'],
  'file_edit': ['str_replace'],
  'code_execute': ['python'],
  'command_execute': ['bash'],
  'image_understand': ['recognize_image'],
  'document_understand': ['extract_pdf_text'],
  'data_process': ['python', 'bash']
};
```

---

## 工具系统 (Tools)

### 工具定义 (13个)

| 工具名称 | 功能 | 参数 |
|---------|------|------|
| `search_knowledge_base` | 搜索知识库 | query, file_types, max_results |
| `get_weather` | 查询天气 | city |
| `get_location` | 查询位置 | location |
| `web_search` | 网页搜索 | query, max_results |
| `recognize_image` | OCR识别图片 | filename |
| `extract_pdf_text` | 提取PDF文字 | filename |
| `analyze_video` | 分析视频内容 | filename |
| `python` | 执行Python代码 | code, description |
| `bash` | 执行Shell命令 | command, description |
| `ls` | 列出目录 | path |
| `read_file` | 读取文件 | path |
| `write_file` | 写入文件 | path, content |
| `str_replace` | 替换文件内容 | path, old_str, new_str |

---

## API 接口文档

### 聊天接口

#### POST /api/chat

发送聊天消息

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | ✓ | 用户输入 |
| sessionId | string | ✗ | 会话ID |
| mode | string | ✓ | 模式: `ai` / `knowledge` / `hybrid` |
| model | string | ✗ | 模型ID（默认使用激活模型） |

**响应示例：**

```json
{
  "type": "text",
  "content": "北京今天天气晴朗，气温15-25度...",
  "intent": "weather_query",
  "source": "llm",
  "tools": ["get_weather"],
  "resultSources": ["工具", "LLM"],
  "tokenUsage": {
    "prompt": 128,
    "completion": 256,
    "total": 384
  }
}
```

**追问响应：**

```json
{
  "type": "clarification",
  "question": "请问您想查询哪个城市呢？",
  "options": ["北京", "上海", "广州", "其他"],
  "intent": "weather_query",
  "tokenUsage": {
    "prompt": 120,
    "completion": 45,
    "total": 165
  }
}
```

#### POST /api/chat/clarification/respond

回复追问

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clarification_id | string | ✓ | 追问ID |
| response | string | ✓ | 用户的选择/输入 |
| sessionId | string | ✗ | 会话ID |
| mode | string | ✗ | 模式 |

---

## 日志输出

系统提供完整的日志追踪：

```
========== 开始处理用户消息 ==========
[用户输入]: 今天北京天气怎么样？
[使用模型]: MiniMax-M2.5
[对话模式]: hybrid

========== 意图分析 ==========
[Intent] 用户Query: 今天北京天气怎么样？
[Intent] 对话模式: hybrid
[Intent] 强制使用LLM进行意图分析...
[Intent] ✓ LLM分析成功
[Intent]   - 意图: weather_query
[Intent]   - 意图描述: 用户查询北京今天的天气预报
[Intent]   - 置信度: 0.95
[Intent]   - 需要追问: false
[Intent]   - 所需能力: weather_query
[Intent]   - 任务拆解: 天气查询 → 返回结果
[Intent]   - Token消耗: 128 tokens
[Intent] ✓ 无需追问，继续处理

========== 工具匹配 ==========
[Tool] 意图: weather_query
[Tool] 用户Query: 今天北京天气怎么样？
[Tool] 对话模式: hybrid
[Tool] LLM返回的能力需求: weather_query
[Tool] ✓ 能力匹配结果: get_weather
[Tool] 最终选择的工具: get_weather

========== LLM回复生成 ==========
[LLM] 使用模型: MiniMax-M2.5
[LLM] 对话模式: hybrid
[LLM] 工具上下文长度: 89 字符
[LLM] 系统提示词长度: 1523 字符
[LLM] 正在调用LLM...
[LLM Response] | 回复消耗: 256 tokens
[LLM Total] | 384 tokens (prompt: 128, completion: 256)

========== 消息处理完成 ==========
```

---

## 目录结构

```
my-rag-agent/
├── public/                     # 前端静态资源
│   ├── index.html            # 主页面
│   ├── app.js               # 前端入口
│   ├── router/              # 路由模块
│   ├── pages/                # 页面模块
│   │   ├── chat/           # 聊天页面
│   │   ├── knowledge/       # 知识库页面
│   │   ├── skill-tools/     # 技能工具页面
│   │   └── models/          # 模型管理页面
│   ├── components/           # 公共组件
│   └── utils/                # 工具函数
│
├── server/                   # 后端服务
│   ├── index.js              # 服务入口
│   ├── controllers/           # HTTP处理层
│   │   ├── chat-controller.js
│   │   ├── session-controller.js
│   │   ├── model-controller.js
│   │   └── file-controller.js
│   │
│   ├── services/             # 业务逻辑层
│   │   ├── chat-service.js   # 聊天核心业务 ⭐
│   │   ├── ai-service.js     # AI调用封装
│   │   ├── session-service.js
│   │   ├── model-service.js
│   │   └── file-service.js
│   │
│   ├── skills/               # 技能系统
│   │   ├── index.js         # 技能中心入口
│   │   ├── skills.js        # 技能主逻辑
│   │   ├── skills-manager.js
│   │   ├── base-skill.js
│   │   └── [skill-folders]/
│   │
│   ├── tools/                # 工具系统
│   │   ├── index.js
│   │   ├── tools-manager.js
│   │   └── tool-definitions.js
│   │
│   ├── clarification/       # 追问系统
│   │   └── index.js
│   │
│   └── config/               # 配置
│
├── docs/                      # 文档
│   └── architecture.md       # 架构文档
│
├── knowledge/                # 知识库文件存储
├── data/                     # 数据存储
│   ├── models.json          # 模型配置
│   └── sessions.json         # 会话数据
│
└── package.json
```

---

## 配置说明

### 环境变量 (.env)

```bash
PORT=3000
API_KEY=your-api-key
API_BASE_URL=https://api.siliconflow.cn/v1
NODE_ENV=development
```

### 模型配置 (data/models.json)

```json
[
  {
    "id": "deepseek-r1",
    "name": "DeepSeek R1",
    "modelId": "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B",
    "type": "chat",
    "protocol": "openai",
    "url": "https://api.siliconflow.cn/v1/chat/completions",
    "apiKey": "your-api-key",
    "provider": "硅基流动",
    "published": true
  }
]
```

**模型配置字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 模型标识（唯一） |
| name | string | 显示名称 |
| modelId | string | API调用用的模型ID ⭐ |
| type | string | 模型类型（chat/embedding） |
| protocol | string | 通信协议（openai/anthropic/minimax） |
| url | string | API地址 |
| apiKey | string | API密钥 |
| provider | string | 供应商名称 |
| published | boolean | 发布状态（是否可用） |

---

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 启动服务器

```bash
npm run dev
# 或
node server/index.js
```

访问 http://localhost:3000

---

## 开发指南

### 添加新工具

#### 1. 定义工具能力映射

在 `server/skills/skills.js` 的 `CAPABILITY_TOOLS` 中添加工具映射：

```javascript
const CAPABILITY_TOOLS = {
  // ... 现有映射
  'my_capability': ['my_tool']  // 新增
};
```

#### 2. 添加工具定义

在 `toolDefinitions` 数组中添加：

```javascript
{
  type: 'function',
  function: {
    name: 'my_tool',
    description: '我的工具描述',
    parameters: { /* JSON Schema */ }
  }
}
```

#### 3. 实现工具逻辑

在 `executeTool` 函数中添加处理分支。

### 更新LLM意图分析

意图分析提示词位于 `server/services/chat-service.js` 的 `INTENT_ANALYSIS_PROMPT`。

---

## 技术栈

- **前端**: 原生 JavaScript, HTML5, CSS3
- **后端**: Node.js, Express
- **AI 模型**: 支持 OpenAI 兼容 API
- **数据存储**: JSON 文件系统

---

## License

MIT
