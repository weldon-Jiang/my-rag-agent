# DeerFlow 代码解读计划

## 目标
解读 DeerFlow (bytedance/deer-flow) 项目，理解其内部如何利用 LangGraph 串联 Agent 流程，以及沙盒对接的实现机制。

---

## 一、项目概述

### 1.1 DeerFlow 核心定位
- **全称**: Deep Exploration and Efficient Research Flow
- **架构**: 基于 LangGraph + LangChain 的 Super Agent Harness
- **能力**: 编排子 Agent、记忆、沙盒，执行复杂多步骤任务（分钟级到小时级）
- **版本**: 2.0 是完全重写，与 1.x 无代码共享

### 1.2 核心特性
- **Skills & Tools**: 可扩展的技能系统，按需加载
- **Sub-Agents**: 主 Agent 动态生成分子 Agent，并行/串行执行
- **Sandbox**: 隔离的 Docker/K8s 执行环境
- **Memory**: 长期记忆和上下文压缩
- **Gateway**: HTTP API 网关，支持 IM 渠道集成

---

## 二、LangGraph Agent 流程解读步骤

### 2.1 入口与图定义
**文件**: `backend/app/graph.py`

解读要点:
1. LangGraph State 状态定义（AgentState 结构）
2. 图的节点（Nodes）配置
3. 边的条件路由（Conditional Edges）
4. 状态更新策略

### 2.2 Agent 类型与实现
**文件**:
- `backend/app/agents/lead_agent.py` - 主 Agent（Lead Agent）
- `backend/app/agents/sub_agent.py` - 子 Agent
- `backend/app/agents/nodes.py` - 图节点实现

解读要点:
1. **Lead Agent**: 任务分解、结果合成、工具调用决策
2. **Sub Agent**: 隔离上下文、专注单一子任务、结果返回格式
3. **Node 逻辑**: 节点输入输出处理、状态转换

### 2.3 状态管理
**文件**: `backend/app/agents/state.py`

解读要点:
1. 状态结构定义（messages, context, metadata 等）
2. 状态更新逻辑（add_messages, update_state）
3. 上下文压缩机制

### 2.4 工具系统
**文件**: `backend/app/agents/tools.py`

解读要点:
1. 内置工具集（web_search, web_fetch, file_operations, bash）
2. 工具绑定到 Agent 的方式
3. MCP 工具扩展

### 2.5 上下文工程
**文件**: `backend/app/agents/utils/context_compressor.py`

解读要点:
1. 上下文压缩策略
2. 子任务摘要生成
3. 中间结果持久化

---

## 三、沙盒对接解读步骤

### 3.1 沙盒抽象层
**文件**: `backend/app/sandbox/interface.py`

解读要点:
1. 沙盒接口定义（Sandbox Interface）
2. 文件系统操作抽象
3. 命令执行抽象

### 3.2 沙盒提供者
**文件**: `backend/app/sandbox/provider.py`

解读要点:
1. SandboxProvider 基类
2. 沙盒生命周期管理
3. 会话管理

### 3.3 Docker 模式实现
**文件**: `backend/app/sandbox/docker.py`

解读要点:
1. Docker 容器启动配置
2. 卷挂载（skills, workspace, uploads, outputs）
3. 网络配置
4. 容器内文件操作

### 3.4 Kubernetes 模式（Provisioner）
**文件**: `backend/app/sandbox/provisioner.py`

解读要点:
1. K8s Pod 调度
2. Provisioner 服务通信
3. 远程沙盒会话管理

### 3.5 沙盒初始化
**文件**: `backend/app/sandbox/__init__.py`

解读要点:
1. 沙盒模式配置（Local/Docker/K8s）
2. 多模式适配器

---

## 四、LangGraph 图结构详解

### 4.1 核心图结构（基于 langgraph.json）
```json
{
  "dependencies": ["./backend/app"],
  "graphs": {
    "deerflow": "./backend/app/graph.py:graph"
  }
}
```

### 4.2 工作流模式
1. **入口节点**: 接收用户消息
2. **Lead Agent 节点**: 分析任务、决定工具调用或生成分子 Agent
3. **工具执行节点**: Web Search, Web Fetch, File Ops, Bash 等
4. **Sub Agent 节点**: 并行/串行执行子任务
5. **结果合成节点**: 汇总子 Agent 结果
6. **终止判断**: 任务完成或达到递归限制

---

## 五、关键代码文件清单

| 路径 | 作用 |
|------|------|
| `backend/app/graph.py` | LangGraph 图定义 |
| `backend/app/agents/lead_agent.py` | 主 Agent 实现 |
| `backend/app/agents/sub_agent.py` | 子 Agent 实现 |
| `backend/app/agents/nodes.py` | 图节点逻辑 |
| `backend/app/agents/state.py` | 状态管理 |
| `backend/app/agents/tools.py` | 工具定义与绑定 |
| `backend/app/agents/utils/context_compressor.py` | 上下文压缩 |
| `backend/app/sandbox/interface.py` | 沙盒接口 |
| `backend/app/sandbox/provider.py` | 沙盒提供者 |
| `backend/app/sandbox/docker.py` | Docker 沙盒实现 |
| `backend/app/sandbox/provisioner.py` | K8s 沙盒实现 |
| `backend/app/services/__init__.py` | 服务层入口 |

---

## 六、输出成果

1. **LangGraph 工作流图解**: 绘制完整的 Agent 编排流程
2. **代码架构分析**: 各模块职责和交互关系
3. **沙盒对接机制详解**: 三种模式的实现差异
4. **关键代码片段解析**: 核心逻辑说明

---

## 七、验证方式

- 阅读上述核心文件
- 对比 LangGraph 官方文档
- 对比 DeerFlow 官方架构文档
