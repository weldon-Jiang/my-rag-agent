# My RAG Agent

## 项目简介

My RAG Agent 是一个基于检索增强生成（RAG）的智能对话系统，支持多种工具调用、技能管理和知识库检索。系统能够根据用户输入自动识别意图并调用相应的工具，提供智能化的交互体验。

## 功能特性

### 🤖 AI 对话

- 支持多种大模型（DeepSeek、OpenAI、MiniMax 等）
- 混合模式：知识库检索 + 工具调用
- 多轮对话上下文记忆
- 智能意图识别

### 📚 知识库管理

- 支持多种文件格式：PDF、图片、视频、文本
- 自动内容提取和索引
- 全文检索功能
- 文件上传、删除管理

### 🛠️ 技能系统

系统内置多个技能模块：

| 技能名称 | 功能描述 | 触发关键词 |
|---------|---------|-----------|
| images-skill | 图片 OCR 识别 | 图片、照片、OCR |
| videos-skill | 视频内容分析 | 视频、录像 |
| pdfs-skill | PDF 文档解析 | PDF、文档 |
| weather-skill | 天气预报查询 | 天气、气温 |
| location-skill | 地理位置查询 | 省、市、区县 |
| web-search-skill | 网页搜索 | 搜索、百度 |
| windows-system-skill | Windows 系统操作 | cmd、命令 |

### 🔧 工具系统

工具系统分为以下类别：

#### 代码执行类
- **bash** - 执行 Shell 命令
- **python** - 执行 Python 代码

#### 文件操作类
- **ls** - 列出目录
- **read_file** - 读取文件
- **write_file** - 写入文件
- **str_replace** - 替换字符串

#### API 工具类
- **cat_image** - 获取猫咪图片
- **dog_api** - 获取狗狗图片
- **anime_image** - 获取动漫图片
- **wallpaper** - 获取壁纸
- **quotes** - 获取名言警句
- **weather** - 天气预报
- **qrcode** - 生成二维码
- **random_user** - 生成随机用户
- **random_image** - 获取随机图片
- **cat_facts** - 获取猫咪知识

## 系统架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  index.html                                                  │
│    ├── main.js (入口)                                       │
│    ├── router/router.js (路由)                               │
│    ├── pages/                                               │
│    │   ├── chat/chat.js (聊天页面)                          │
│    │   ├── knowledge/knowledge.js (知识库页面)              │
│    │   ├── skill-tools/skill-tools.js (技能工具页面)        │
│    │   └── models/models.js (模型管理页面)                   │
│    ├── components/ (组件)                                    │
│    └── utils/api.js (API封装)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端 (Node.js)                           │
├─────────────────────────────────────────────────────────────┤
│  server/index.js (主入口)                                    │
│                                                              │
│  ├── routes/ (路由层)                                        │
│  │   └── chat.js (聊天路由)                                  │
│                                                              │
│  ├── controllers/ (控制器层)                                   │
│  │   └── chat-controller.js                                  │
│                                                              │
│  ├── services/ (服务层)                                       │
│  │   └── chat-service.js                                    │
│                                                              │
│  ├── skills/ (技能系统)                                       │
│  │   ├── index.js (技能入口)                                 │
│  │   ├── skills-manager.js (技能管理器)                     │
│  │   └── skills-manifest.js (技能清单)                      │
│                                                              │
│  ├── tools/ (工具系统)                                       │
│  │   ├── index.js (工具入口)                                 │
│  │   ├── tools-manager.js (工具管理器)                      │
│  │   ├── tools-manifest.js (工具清单)                      │
│  │   └── sandbox/ (沙箱执行)                                │
│                                                              │
│  ├── middleware/ (中间件)                                    │
│  │   ├── logger.js (日志)                                    │
│  │   └── error-handler.js (错误处理)                        │
│                                                              │
│  └── config/ (配置)                                           │
│      └── constants.js (常量)                                  │
└─────────────────────────────────────────────────────────────┘
```

### 请求处理流程

```
用户输入 → HTTP POST /api/chat
    │
    ▼
路由层 (routes/chat.js)
    │
    ▼
意图识别 (extractMatchedIntents)
    │
    ├── 系统意图 (rename_bot, ask_name...) → 特殊处理
    │
    └── 工具意图 → matchTools (trigger匹配)
    │
    ▼
工具选择 (selectTools)
    │
    ▼
工具执行 (skillsCenter.executeTool)
    │
    ├── 知识库工具 → processFile
    ├── 技能工具 → skill.process
    ├── 沙箱工具 → sandbox.execute
    └── API工具 → HTTP请求
    │
    ▼
LLM调用 (generateResponse)
    │
    ▼
返回结果
```

## 目录结构

```
my-rag-agent/
├── public/                     # 前端静态资源
│   ├── index.html             # 主页面
│   ├── main.js                # 前端入口
│   ├── app.js                 # (旧) 应用主文件
│   ├── style.css              # (旧) 样式文件
│   ├── router/                # 路由模块
│   │   └── router.js
│   ├── pages/                 # 页面模块
│   │   ├── chat/chat.js
│   │   ├── knowledge/knowledge.js
│   │   ├── skill-tools/skill-tools.js
│   │   └── models/models.js
│   ├── components/            # 组件
│   │   └── navigation/
│   └── utils/                 # 工具函数
│       └── api.js
│
├── server/                    # 后端服务
│   ├── index.js               # 主入口
│   ├── routes/                # 路由
│   │   └── chat.js
│   ├── controllers/           # 控制器
│   │   └── chat-controller.js
│   ├── services/              # 服务层
│   │   └── chat-service.js
│   ├── skills/               # 技能系统
│   │   ├── index.js
│   │   ├── skills-manager.js
│   │   └── skills-manifest.js
│   ├── tools/                # 工具系统
│   │   ├── index.js
│   │   ├── tools-manager.js
│   │   ├── tools-manifest.js
│   │   ├── sandbox/
│   │   │   ├── sandbox.js
│   │   │   ├── bash.js
│   │   │   ├── python.js
│   │   │   └── ...
│   │   └── api-tools/
│   │       ├── cat-image.js
│   │       ├── weather.js
│   │       └── ...
│   ├── middleware/           # 中间件
│   │   ├── logger.js
│   │   └── error-handler.js
│   └── config/               # 配置
│       └── constants.js
│
├── knowledge/                 # 知识库文件存储
├── data/                      # 数据存储
│   └── models.json            # 模型配置
│
├── .trae/                     # Trae IDE 配置
│   └── documents/             # 文档
│
├── package.json
└── README.md
```

## API 接口

### 聊天接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/chat | 发送聊天消息 |
| GET | /api/chat/sessions | 获取会话列表 |
| POST | /api/chat/sessions | 创建新会话 |
| GET | /api/chat/history/:sessionId | 获取会话历史 |

### 文件接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/files | 获取文件列表 |
| POST | /api/files/upload | 上传文件 |
| DELETE | /api/files/:filename | 删除文件 |

### 技能接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/skills | 获取所有技能和工具 |

### 模型接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/models | 获取模型列表 |
| POST | /api/models/:id | 更新模型配置 |
| POST | /api/models/:id/test | 测试模型连接 |

## 配置说明

### 模型配置 (data/models.json)

```json
[
  {
    "id": "deepseek-r1",
    "name": "DeepSeek R1",
    "modelId": "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B",
    "url": "https://api.siliconflow.cn/v1/chat/completions",
    "apiKey": "your-api-key",
    "isActive": true
  }
]
```

### 工具配置 (tools-manifest.js)

每个工具定义包含：

```javascript
{
  name: '工具名称',
  category: '分类',
  description: '功能描述',
  trigger: ['触发关键词1', '触发关键词2'],
  usage: '使用方法说明',
  parameters: {
    paramName: {
      type: '类型',
      description: '参数描述'
    }
  },
  requiredParams: ['必填参数'],
  file: '工具文件路径',
  functionName: '函数名'
}
```

## 开发指南

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 项目结构说明

- `public/` - 前端资源，浏览器直接访问
- `server/` - 后端服务，Node.js 运行
- `knowledge/` - 用户上传的知识库文件
- `data/` - JSON 格式的数据存储

## 技术栈

- **前端**: 原生 JavaScript, HTML5, CSS3
- **后端**: Node.js, Express
- **AI 模型**: 支持 OpenAI 兼容 API
- **数据存储**: JSON 文件系统

## 扩展指南

### 添加新技能

1. 在 `server/skills/` 下创建技能文件
2. 在 `skills-manifest.js` 中注册技能
3. 实现技能处理逻辑

### 添加新工具

1. 在 `server/tools/` 下创建工具文件
2. 在 `tools-manifest.js` 中注册工具
3. 工具通过 `toolsManager.execute()` 自动适配

### 添加新页面

1. 在 `public/pages/` 下创建页面文件夹
2. 实现页面模块，导出 `init()` 函数
3. 在 `router.js` 中注册路由

## License

MIT