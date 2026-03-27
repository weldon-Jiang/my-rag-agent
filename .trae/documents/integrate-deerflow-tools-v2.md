# DeerFlow Skills 和 Tools 集成计划

## 目标
将 DeerFlow 中的内置 Skills 和 Tools（特别是 bash 工具和 ask_clarification）集成到本地知识库智能体（my-rag-agent）中，作为内外部智能体的基石。

---

## 一、现状分析

### 1.1 DeerFlow 2.0 架构

DeerFlow 是基于 LangGraph + LangChain 的 Super Agent 框架，核心组件包括：

- **Skills 系统**：基于 Markdown 的工作流定义，按需加载
- **Tools 系统**：内置工具 + MCP 扩展
- **子 Agent 机制**：隔离上下文的子任务执行
- **沙盒系统**：Local/Docker/K8s 三种执行环境

### 1.2 my-rag-agent 当前架构

- 基于 Express.js 的 Node.js 后端
- 技能系统（SkillsCenter）：images-skill, videos-skill, pdfs-skill, weather-skill, location-skill
- 意图识别和工具路由系统
- 大模型调用（支持多种协议）

### 1.3 需要集成的 DeerFlow 组件

| 组件 | 重要性 | 说明 |
|------|--------|------|
| **bash_tool** | 高 | 沙盒中的 Shell 命令执行，是外部智能体的基石 |
| **ask_clarification** | 高 | 澄清问题机制，是人机协作的关键 |
| **文件操作工具** | 中 | read_file, write_file, ls, str_replace |
| **Skills 加载机制** | 中 | DeerFlow 的 Skill 定义和加载方式 |

---

## 二、集成步骤

### 2.1 bash_tool 集成

**目标**：在 my-rag-agent 中实现类似 DeerFlow 的 bash 工具

**需要实现的功能**：

1. **命令执行沙盒**
   - 创建隔离的执行环境（类似 DeerFlow 的 sandbox）
   - 支持 Python 代码执行
   - 支持虚拟环境管理

2. **文件操作**
   - read_file：读取文件内容
   - write_file：写入文件
   - ls：列出目录内容
   - str_replace：字符串替换

3. **安全机制**
   - 路径验证（防止目录遍历）
   - 虚拟路径映射（/mnt/user-data → 实际工作目录）
   - 命令白名单

**实施步骤**：

```
步骤 1: 创建 sandbox 模块
- server/sandbox/index.js
- server/sandbox/bash.js
- server/sandbox/file-ops.js

步骤 2: 添加工具定义
- 更新 server/skills/index.js 中的 toolDefinitions
- 添加 bash 工具

步骤 3: 集成到 chat 路由
- 修改 server/routes/chat.js
- 支持工具调用
```

### 2.2 ask_clarification 集成

**目标**：实现 DeerFlow 的澄清问题机制

**需要实现的功能**：

1. **澄清类型定义**
   - missing_info：缺少必要信息
   - ambiguous_requirement：需求不明确
   - approach_choice：多种实现方式
   - risk_confirmation：风险操作确认
   - suggestion：建议采纳

2. **中断机制**
   - 工具调用时暂停执行
   - 返回澄清问题给用户
   - 等待用户响应后继续

3. **前端交互**
   - 显示澄清选项
   - 收集用户选择
   - 传递响应给后端

**实施步骤**：

```
步骤 1: 创建 clarification 模块
- server/clarification/index.js

步骤 2: 添加工具定义
- 在 toolDefinitions 中添加 ask_clarification

步骤 3: 修改 chat 路由
- 检测 ask_clarification 工具调用
- 返回澄清请求（特殊响应类型）
- 处理用户响应
```

### 2.3 Skills 加载机制借鉴

**目标**：借鉴 DeerFlow 的 Skill 定义方式

**需要借鉴的设计**：

1. **Skill 文件结构**
   - SKILL.md 定义技能元信息
   - workflow 描述执行流程
   - references 引用资源

2. **按需加载**
   - 只在需要时加载 Skill
   - 支持 Skill 缓存

3. **复合技能**
   - 支持技能组合
   - 支持子技能调用

---

## 三、具体实施计划

### 阶段一：bash_tool 实现

| 序号 | 任务 | 文件 |
|------|------|------|
| 1.1 | 创建 sandbox 模块目录结构 | server/sandbox/ |
| 1.2 | 实现命令执行器 | server/sandbox/executor.js |
| 1.3 | 实现文件操作工具 | server/sandbox/file-tools.js |
| 1.4 | 实现路径验证和安全机制 | server/sandbox/security.js |
| 1.5 | 添加工具定义到 SkillsCenter | server/skills/index.js |
| 1.6 | 集成到 chat 路由 | server/routes/chat.js |

### 阶段二：ask_clarification 实现

| 序号 | 任务 | 文件 |
|------|------|------|
| 2.1 | 创建 clarification 管理器 | server/clarification/index.js |
| 2.2 | 定义澄清类型和格式 | server/clarification/types.js |
| 2.3 | 添加工具定义 | server/skills/index.js |
| 2.4 | 修改 chat 路由支持澄清 | server/routes/chat.js |
| 2.5 | 添加前端澄清组件 | public/app.js |

### 阶段三：Skills 机制增强

| 序号 | 任务 | 文件 |
|------|------|------|
| 3.1 | 重构 SkillsCenter 支持 Skill 格式 | server/skills/index.js |
| 3.2 | 实现 Skill 加载器 | server/skills/loader.js |
| 3.3 | 添加 Skill 注册机制 | server/skills/registry.js |

---

## 四、输出成果

1. **bash_tool**：在知识库智能体中执行 Shell 命令的能力
2. **ask_clarification**：人机协作的澄清问题机制
3. **增强的 Skills 框架**：支持更灵活的技能定义和组合
4. **文档**：集成说明和使用示例
