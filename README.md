# My RAG Agent

## 项目简介

My RAG Agent 是一个基于检索增强生成（RAG）的智能对话系统，支持多种工具调用、技能管理和知识库检索。系统采用 **Python FastAPI** 构建后端服务，支持异步处理和高性能部署。

---

## 系统架构

### 技术栈

- **后端**: Python 3.10+, FastAPI, Uvicorn
- **前端**: 原生 JavaScript, HTML5, CSS3
- **向量数据库**: ChromaDB
- **AI 模型**: 支持 OpenAI 兼容 API

### 目录结构

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
├── server-python/            # Python FastAPI 后端
│   ├── main.py              # 应用入口
│   ├── config.py            # 配置管理
│   ├── requirements.txt     # Python 依赖
│   │
│   ├── routers/             # API 路由
│   │   ├── chat.py         # 聊天路由
│   │   ├── session.py       # 会话路由
│   │   ├── model.py         # 模型路由
│   │   └── file.py          # 文件路由
│   │
│   ├── services/            # 业务逻辑服务
│   │   ├── ai_service.py       # AI 服务
│   │   ├── chroma_service.py    # 向量搜索
│   │   ├── multi_agent.py       # 多 Agent 协作
│   │   ├── planning_service.py   # 任务规划
│   │   └── memory_service.py    # 记忆系统
│   │
│   ├── skills/              # 技能系统
│   │   ├── tools.py         # 工具定义
│   │   └── skills_router.py # 技能路由
│   │
│   ├── models/              # 数据模型
│   │   └── schemas.py       # Pydantic 模型
│   │
│   └── middleware/           # 中间件
│       └── logging.py       # 日志中间件
│
├── server-nodejs-old/        # 旧版 Node.js 后端（已备份）
│
├── knowledge/                # 知识库文件存储
├── data/                     # 数据存储
│   └── chroma_db/          # ChromaDB 向量数据库
│
├── .env                      # 环境变量配置
└── package.json
```

---

## 核心特性

### 1. 智能意图分析
- LLM 驱动意图分析
- 能力识别和动态工具匹配
- 智能追问系统

### 2. 三种对话模式
| 模式 | 工具执行 | 知识库 | LLM生成 | 适用场景 |
|------|---------|--------|---------|---------|
| **AI** | ✓ | ✗ | ✓ | 通用对话、工具辅助 |
| **Knowledge** | ✓ | ✓ | ✗ | 纯知识库问答 |
| **Hybrid** | ✓ | ✓ | ✓ | 综合问答 |

### 3. 多 Agent 协作
- 搜索 Agent - 互联网搜索专家
- 知识库 Agent - 知识检索专家
- 天气 Agent - 天气预报专家
- 位置 Agent - 地理位置专家
- 代码 Agent - 编程开发专家
- 文档 Agent - 文档理解专家

### 4. 任务规划系统
- 复杂任务自动分解
- 步骤进度跟踪
- 计划调整能力

### 5. 记忆系统
- 短期记忆 - 当前会话上下文
- 长期记忆 - 用户画像和偏好

### 6. 向量搜索 (ChromaDB)
- 语义相似度检索
- 知识库文档索引

---

## 快速开始

### 环境要求

- Python 3.10 或更高版本
- Node.js >= 16.0.0 (仅用于前端开发服务器)

### 安装依赖

```bash
# Python 依赖
cd server-python
pip install -r requirements.txt

# Node.js 依赖（可选，仅前端）
npm install
```

### 启动服务器

**方式一：使用 PowerShell 脚本**
```powershell
.\start.ps1
```

**方式二：使用批处理文件**
```cmd
start.bat
```

**方式三：手动启动**
```bash
cd server-python
python -m uvicorn main:app --host 0.0.0.0 --port 3030 --reload
```

访问 http://localhost:3030

---

## API 接口

### 聊天接口

#### POST /api/chat

发送聊天消息

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | ✓ | 用户输入 |
| session_id | string | ✗ | 会话ID |
| mode | string | ✓ | 模式: `ai` / `knowledge` / `hybrid` |
| model | string | ✗ | 模型ID |

### 会话接口

| 端点 | 方法 | 说明 |
|-----|------|------|
| `/api/chat/sessions` | GET | 获取会话列表 |
| `/api/chat/sessions` | POST | 创建新会话 |
| `/api/chat/sessions/{id}` | GET | 获取会话详情 |
| `/api/chat/sessions/{id}` | DELETE | 删除会话 |

### 模型接口

| 端点 | 方法 | 说明 |
|-----|------|------|
| `/api/models` | GET | 获取模型列表 |
| `/api/models/current` | GET | 获取当前模型 |
| `/api/models/switch` | POST | 切换模型 |

### 文件接口

| 端点 | 方法 | 说明 |
|-----|------|------|
| `/api/files/upload` | POST | 上传文件 |
| `/api/files/{id}` | GET | 下载文件 |

### 技能接口

| 端点 | 方法 | 说明 |
|-----|------|------|
| `/api/skills` | GET | 获取技能列表 |
| `/api/skills/execute` | POST | 执行工具 |
| `/api/skills/tools` | GET | 获取工具定义 |

---

## 环境变量

```bash
# .env 文件
PORT=3030
HOST=0.0.0.0

# AI 服务配置
API_KEY=your-api-key
API_BASE_URL=https://api.minimax.chat/v1

# 目录配置
KNOWLEDGE_DIR=./knowledge
DATA_DIR=./data
TEMP_DIR=./temp
CHROMA_DB_PATH=./data/chroma_db
```

---

## 开发指南

### 添加新工具

1. 在 `server-python/skills/tools.py` 的 `TOOL_DEFINITIONS` 中添加工具定义
2. 在 `CAPABILITY_TOOLS` 中添加能力映射
3. 在 `server-python/skills/skills_router.py` 的 `execute_tool` 函数中添加处理逻辑

### 修改 AI 模型

1. 在 `server-python/routers/model.py` 的 `MODELS` 字典中添加模型配置
2. 或通过 API `/api/models/switch` 动态切换

---

## License

MIT
