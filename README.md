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

#### 步骤 1：创建技能处理文件

在 `server/skills/` 目录下创建技能类文件，例如 `server/skills/my-skill/my-skill.js`：

```javascript
const BaseSkill = require('../base-skill');

class MySkill extends BaseSkill {
  /**
   * 处理技能请求
   * @param {Object} params - 技能参数
   * @param {Object} context - 执行上下文
   * @returns {Object} 处理结果
   */
  async process(params, context) {
    // 实现技能逻辑
    return { success: true, result: '处理结果' };
  }
}

module.exports = MySkill;
```

#### 步骤 2：在技能清单中注册

在 `server/skills/skills-manifest.js` 中添加技能配置：

```javascript
{
  name: 'my-skill',              // 【必填】技能唯一标识名称
  description: '我的技能描述',     // 【必填】技能的详细功能描述
  trigger: ['关键词1', '关键词2'], // 【必填】触发技能的关键词数组
  usage: '如何使用这个技能',       // 【必填】技能的使用说明
  tools: ['tool1', 'tool2'],     // 【必填】该技能使用的工具名称数组
  supportedTypes: ['.pdf', '.doc'], // 【可选】支持的文件扩展名数组，空数组表示不处理文件
  requiredParams: ['param1'],     // 【必填】必需的参数名称数组
  file: path.join(__dirname, 'my-skill/my-skill.js')  // 【必填】技能文件路径
}
```

#### 技能属性说明

| 属性 | 必填 | 类型 | 说明 |
|-----|------|------|------|
| name | ✅ | string | 技能唯一标识，不能与其他技能重名 |
| description | ✅ | string | 技能的详细功能描述，会显示在技能工具管理页面 |
| trigger | ✅ | array | 触发关键词数组，当用户输入包含这些词时会激活该技能 |
| usage | ✅ | string | 技能的使用说明，告知用户如何正确使用 |
| tools | ✅ | array | 该技能使用的工具名称数组，工具必须在 tools-manifest 中定义 |
| supportedTypes | ❌ | array | 支持的文件扩展名，如 `['.pdf', '.jpg']`，空数组表示不处理文件 |
| requiredParams | ✅ | array | 必需的参数名称数组 |
| file | ✅ | string | 技能类的文件路径，使用 `path.join(__dirname, ...)` |

#### 步骤 3：重启服务器

新增技能后重启服务器，访问「技能工具管理」页面即可看到新增的技能。

---

### 添加新工具

#### 工具类型说明

系统中的工具有三种类型：

1. **沙箱工具**：在沙盒环境中执行代码（bash, python）
2. **技能工具**：需要配合技能使用的工具（recognize_image, extract_pdf_text）
3. **API 工具**：调用外部 API 获取数据的工具（cat_image, weather）

#### 步骤 1：创建工具文件

**对于 API 工具**（推荐），在 `server/tools/` 下创建工具文件，例如 `server/tools/my-api/my-api.js`：

```javascript
/**
 * 我的 API 工具
 * @param {Object} args - 工具参数
 * @param {Object} context - 执行上下文
 * @returns {Object} 执行结果
 */
module.exports = async function(args, context) {
  try {
    // 调用外部 API
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();

    return {
      success: true,
      result: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
```

**对于沙箱工具**，参考 `server/tools/bash/bash.js` 或 `server/tools/python/python.js`。

#### 步骤 2：在工具清单中注册

在 `server/tools/tools-manifest.js` 中添加工具配置：

```javascript
{
  name: 'my_tool',                // 【必填】工具唯一标识名称
  category: '我的分类',            // 【必填】工具分类，会显示在技能工具管理页面
  description: '我的工具描述',      // 【必填】工具的详细功能描述
  trigger: ['关键词1', '关键词2'], // 【必填】触发工具的关键词数组
  usage: '如何使用这个工具',        // 【必填】工具的使用说明
  parameters: {                    // 【可选】工具参数定义
    param1: {
      type: 'string',             // 参数类型：string, integer, boolean, object, array
      description: '参数描述'     // 参数的说明
    }
  },
  requiredParams: ['param1'],      // 【可选】必需的参数名称数组
  file: path.join(__dirname, 'my-api/my-api.js'),  // 【必填】工具文件路径
  functionName: 'execute'           // 【可选】导出函数名，默认 'execute'
}
```

#### 工具属性说明

| 属性 | 必填 | 类型 | 说明 |
|-----|------|------|------|
| name | ✅ | string | 工具唯一标识，不能与其他工具重名 |
| category | ✅ | string | 工具分类，用于在技能工具管理页面分组展示 |
| description | ✅ | string | 工具的详细功能描述 |
| trigger | ✅ | array | 触发关键词数组，当用户输入包含这些词时会匹配该工具 |
| usage | ✅ | string | 工具的使用说明，告知用户如何正确使用 |
| parameters | ❌ | object | 工具参数定义，键为参数名，值为参数类型和描述 |
| requiredParams | ❌ | array | 必需的参数名称数组 |
| file | ✅ | string | 工具文件的路径 |
| functionName | ❌ | string | 导出函数名，默认导出 `execute` 函数 |

#### 步骤 3：重启服务器

新增工具后重启服务器，访问「技能工具管理」页面即可看到新增的工具。

---

### 添加新页面

#### 页面开发规范

1. **创建页面目录**：在 `public/pages/` 下创建页面文件夹，如 `public/pages/my-page/`

2. **创建页面模块文件** `public/pages/my-page/my-page.js`：

```javascript
/**
 * 我的页面模块
 * @description 页面功能描述
 * @module pages/my-page
 */

/**
 * 页面初始化函数
 * @description 页面加载时调用的初始化函数
 */
function init() {
  console.log('[MyPage] 页面初始化');
  // 绑定事件监听
  // 加载数据
  // 渲染UI
}

/**
 * 页面退出函数（可选）
 * @description 页面切换时调用的清理函数
 */
function destroy() {
  // 清理事件监听
  // 取消定时器等
}

// 导出页面模块
window.myPageModule = {
  init,
  destroy  // 可选
};
```

3. **在 index.html 中添加页面容器**：

```html
<div id="myPage" class="page">
  <!-- 页面内容 -->
</div>
```

4. **在菜单中添加导航**（可选）：

在 `index.html` 的菜单中添加菜单项：

```html
<div class="menu-item" data-page="my-page">我的页面</div>
```

## License

MIT