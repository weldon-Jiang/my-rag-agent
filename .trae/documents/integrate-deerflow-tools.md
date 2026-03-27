# 集成 DeerFlow 的 bash 和 ask_clarification 工具

## 背景分析

### DeerFlow 核心架构
DeerFlow 是一个基于 **LangGraph** 的 AI 超级智能体，主要特点：
1. **LangGraph Agent 流程**：Lead Agent + Middleware Chain (9个中间件)
2. **沙盒系统**：Per-thread 隔离执行，支持 Local/Docker/Kubernetes
3. **工具生态**：bash、ls、read_file、write_file、ask_clarification 等
4. **子智能体**：支持并行任务执行

### 需要集成的关键工具

#### 1. bash 工具
- 在沙盒环境中执行命令行
- 支持 ls、cat、grep 等基本命令
- 是内部/外部智能体的基石

#### 2. ask_clarification 工具
- 用于向用户请求澄清
- 当智能体不确定用户意图时中断执行并询问
- 是智能交互的关键组件

## 实现方案

### Step 1: 创建 BashSkill
```javascript
// server/skills/bash-skill.js
class BashSkill {
  name = 'bash';
  description = '执行 bash 命令，如 ls、cat、grep 等';

  async process(command, context = {}) {
    // 执行命令并返回结果
  }
}
```

### Step 2: 创建 ClarificationSkill
```javascript
// server/skills/clarification-skill.js
class ClarificationSkill {
  name = 'ask_clarification';
  description = '向用户请求澄清问题';

  async process(question, options, context = {}) {
    // 返回需要澄清的问题
  }
}
```

### Step 3: 修改路由逻辑
在 chat.js 中添加对这些工具的支持

### Step 4: 集成到智能体流程
确保在任务执行过程中可以调用这些工具

## 改动文件
- `server/skills/bash-skill.js` - 新建
- `server/skills/clarification-skill.js` - 新建
- `server/skills/index.js` - 注册新技能
- `server/routes/chat.js` - 添加支持
