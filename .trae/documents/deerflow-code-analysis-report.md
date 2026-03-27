# DeerFlow 代码架构深度解读

## 一、项目概述

DeerFlow（Deep Exploration and Efficient Research Flow）是字节跳动开源的 Super Agent 框架，基于 LangGraph 和 LangChain 构建。该项目于 2026 年 2 月 28 日登上 GitHub Trending 第一名，2.0 版本是完全重写，与 1.x 版本无代码共享。

DeerFlow 的核心定位是一个「超级智能体 harness」，能够编排子 Agent、记忆系统和沙盒环境，执行从分钟级到小时级的复杂多步骤任务。

***

## 二、LangGraph Agent 流程深度解析

### 2.1 LangGraph 图定义与状态管理

DeerFlow 的核心工作流定义在 `backend/app/graph.py` 文件中，采用 LangGraph 的状态图范式来编排整个 Agent 流程。

**LangGraph 配置文件（langgraph.json）**

```json
{
  "dependencies": ["./backend/app"],
  "graphs": {
    "deerflow": "./backend/app/graph.py:graph"
  }
}
```

这表明 DeerFlow 的主图名为 `deerflow`，入口函数为 `graph.py` 中的 `graph` 函数。

**状态定义（AgentState）**

DeerFlow 的状态管理采用 TypedDict 定义，确保类型安全。状态包含以下核心字段：

* `messages`：对话消息列表，存储用户和 AI 的所有交互

* `task`：当前任务对象，包含任务描述和元数据

* `context`：可序列化的上下文数据，用于跨节点传递信息

* `sub_agent_results`：子 Agent 的执行结果列表

* `sandbox`：沙盒会话对象，用于文件操作和命令执行

* `metadata`：元数据，包括线程 ID、递归深度等信息

**图结构构建**

DeerFlow 使用 `StateGraph` 构建有向无环图，核心节点包括：

```TypeScript
START → lead_agent → [tools / sub_agents] → synthesis → END
```

主要节点：

1. `lead_agent`：主 Agent 节点，负责任务分析和决策
2. `tools`：工具执行节点，包括 web\_search、web\_fetch、file\_operations、bash 等
3. `sub_agents`：子 Agent 编排节点，管理和执行子任务
4. `synthesis`：结果合成节点，将工具调用和子 Agent 结果汇总

### 2.2 Lead Agent（主 Agent）实现

Lead Agent 是整个系统的核心决策者，负责分析用户输入、决定调用哪些工具、以及是否需要生成分子 Agent 来处理复杂任务。

**核心职责**

Lead Agent 的 Prompt 模板定义了其行为模式：

1. **任务分析**：理解用户意图，将复杂任务分解为可执行的子步骤
2. **工具决策**：判断当前任务是否需要调用工具，以及使用哪个工具
3. **子 Agent 生成分解**：当任务过于复杂时，生成多个子 Agent 并行处理
4. **结果合成**：汇总子 Agent 的结果，生成最终响应

**工具绑定机制**

Lead Agent 通过 LangChain 的工具绑定机制获取工具能力：

```TypeScript
tools = get_tools(sandbox=sandbox)
lead_agent = create_lead_agent(llm, tools, ...)
```

工具列表包括：

* `web_search`：网络搜索（支持 Tavily、InfoQuest 等提供商）

* `web_fetch`：网页内容抓取

* `file_operations`：文件读写、列表、删除等操作

* `bash`：在沙盒中执行 Shell 命令

* `mcp_tools`：通过 MCP 协议扩展的自定义工具

**思考模式支持**

DeerFlow 支持模型的思考（Thinking）能力，通过 `supports_thinking` 标志启用。当模型支持时，可以开启更深入的推理过程。

### 2.3 Sub Agent（子 Agent）实现

子 Agent 是 DeerFlow 处理复杂任务的关键机制，允许 Lead Agent 将大型任务分解为多个独立的子任务并行或串行执行。

**隔离上下文设计**

DeerFlow 的子 Agent 设计采用「隔离上下文」模式，这是其核心架构决策之一：

> Each sub-agent runs in its own isolated context. This means that the sub-agent will not be able to see the context of the main agent or other sub-agents.

这种设计的优势：

1. **专注性**：子 Agent 专注于单一任务，不受其他任务干扰
2. **可控性**：避免上下文膨胀，控制 token 消耗
3. **并行性**：不同子 Agent 可以并行执行，提高效率

**子 Agent 配置**

每个子 Agent 可以有独立的配置：

```python
sub_agent_config = {
    "assistant_id": "research_agent",
    "config": {"recursion_limit": 100},
    "context": {
        "thinking_enabled": True,
        "is_plan_mode": False,
        "subagent_enabled": False
    }
}
```

**子任务结果聚合**

子 Agent 执行完成后，结果存储在 `AgentState.sub_agent_results` 中，由 Lead Agent 负责汇总合成。

### 2.4 节点逻辑（Nodes）

`backend/app/agents/nodes.py` 实现了 LangGraph 的节点函数，每个节点是一个 Python 函数，接收当前状态，返回更新后的状态。

**核心节点函数**

* `lead_agent_node(state)`：调用 Lead Agent 获取响应，更新消息列表

* `tools_node(state)`：执行工具调用，处理工具返回结果

* `sub_agents_node(state)`：管理子 Agent 的生成分配和结果收集

* `synthesis_node(state)`：合成最终响应

**条件边路由**

DeerFlow 使用条件边（Conditional Edge）实现动态路由：

```python
graph.add_conditional_edges(
    "lead_agent",
    should_continue,
    {
        "tools": ...,
        "sub_agents": ...,
        "end": END
    }
)
```

`should_continue` 函数根据 Agent 的输出决定下一跳：

* 如果 Agent 调用了工具 → 跳转到 `tools` 节点

* 如果 Agent 生成了子 Agent 请求 → 跳转到 `sub_agents` 节点

* 如果 Agent 返回最终响应 → 结束流程

### 2.5 工具系统

`backend/app/agents/tools.py` 定义了 DeerFlow 的工具生态。

**内置工具**

1. **WebSearchTool**：网络搜索

   * 支持多个提供商（Tavily、InfoQuest）

   * 返回搜索结果列表

2. **WebFetchTool**：网页抓取

   * 抓取 URL 内容

   * 支持 HTML 到 Markdown 转换

3. **FileOperationsTool**：文件操作

   * read\_file：读取文件内容

   * write\_file：写入文件

   * list\_directory：列出目录内容

   * delete\_file：删除文件

4. **BashTool**：Shell 命令执行

   * 在沙盒环境中执行命令

   * 返回命令输出

**MCP 工具扩展**

DeerFlow 支持通过 MCP（Model Context Protocol）扩展工具集：

```python
mcp_tools = get_mcp_tools(config)
all_tools = builtin_tools + mcp_tools
```

### 2.6 上下文压缩机制

DeerFlow 使用上下文压缩来管理长对话的 token 消耗。

**压缩策略**

`backend/app/agents/utils/context_compressor.py` 实现了上下文压缩逻辑：

1. **消息摘要**：将已完成的任务压缩为摘要
2. **中间结果持久化**：将中间结果写入文件系统，减少内存占用
3. **选择性保留**：保留关键信息，丢弃冗余内容

***

## 三、沙盒对接机制深度解析

DeerFlow 的沙盒系统是其核心差异化能力之一，为 Agent 提供了隔离的执行环境，使其能够读写文件、执行代码，而不是仅仅拥有工具调用的能力。

### 3.1 沙盒架构设计

DeerFlow 支持三种沙盒运行模式：

| 模式     | 说明             | 适用场景  |
| ------ | -------------- | ----- |
| Local  | 直接在主机执行        | 开发调试  |
| Docker | 隔离 Docker 容器   | 生产环境  |
| K8s    | Kubernetes Pod | 大规模部署 |

**抽象接口层**

`backend/app/sandbox/interface.py` 定义了统一的沙盒接口：

```python
class Sandbox(ABC):
    @abstractmethod
    async def execute(self, command: str, timeout: int = 60) -> CommandResult:
        pass
    
    @abstractmethod
    async def read_file(self, path: str) -> str:
        pass
    
    @abstractmethod
    async def write_file(self, path: str, content: str) -> None:
        pass
```

### 3.2 SandboxProvider 提供者

`backend/app/sandbox/provider.py` 实现了沙盒的生命周期管理。

**核心功能**

1. **会话管理**：每个任务对应一个沙盒会话
2. **生命周期**：启动、保持活跃、清理
3. **配置适配**：根据配置选择合适的沙盒模式

**文件结构映射**

沙盒内部的文件结构：

```
/mnt/user-data/
├── uploads/          # 用户上传的文件
├── workspace/        # Agent 工作目录
└── outputs/          # 最终输出

/mnt/skills/public/   # 内置技能
├── research/
├── report-generation/
├── slide-creation/
├── web-page/
└── image-generation/

/mnt/skills/custom/   # 自定义技能
```

### 3.3 Docker 模式实现

`backend/app/sandbox/docker.py` 实现了基于 Docker 的沙盒执行。

**容器启动配置**

```python
container = await client.containers.run(
    image="deerflow-sandbox:latest",
    detach=True,
    volumes={
        "skills": {"bind": "/mnt/skills", "mode": "ro"},
        "workspace": {"bind": "/mnt/user-data/workspace", "mode": "rw"},
        "uploads": {"bind": "/mnt/user-data/uploads", "mode": "rw"},
        "outputs": {"bind": "/mnt/user-data/outputs", "mode": "rw"}
    },
    working_dir="/mnt/user-data/workspace",
    network_mode="bridge"
)
```

**关键特性**

1. **卷挂载**：Skills、Workspace、Uploads、Outputs 分别挂载
2. **隔离性**：每个任务运行在独立容器中
3. **网络配置**：桥接模式，可配置代理
4. **资源限制**：可配置 CPU、内存限制

### 3.4 Kubernetes 模式（Provisioner）

`backend/app/sandbox/provisioner.py` 实现了基于 Kubernetes 的沙盒扩展。

**架构设计**

```
┌─────────────────────────────────────┐
│         DeerFlow Backend           │
│                                    │
│  ┌─────────────────────────────┐   │
│  │    Provisioner Service      │   │
│  │  (Kubernetes API Server)    │   │
│  └──────────────┬──────────────┘   │
│                 │                   │
│                 ▼                   │
│  ┌─────────────────────────────┐   │
│  │    K8s Pod (Sandbox)        │   │
│  │  ┌───────────────────────┐  │   │
│  │  │  Sandbox Container    │  │   │
│  │  └───────────────────────┘  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**远程通信**

Provisioner 模式通过 HTTP API 与 K8s 集群通信：

```python
response = await client.post(
    f"{provisioner_url}/sessions",
    json={
        "sandbox_image": "deerflow-sandbox:latest",
        "kubeconfig": kubeconfig_path,
        "resources": {...}
    }
)
session = SessionResponse(**response.json())
```

### 3.5 沙盒初始化流程

`backend/app/sandbox/__init__.py` 负责根据配置初始化合适的沙盒提供者。

**模式选择逻辑**

```python
if config.use == "deerflow.community.aio_sandbox:AioSandboxProvider":
    if config.provisioner_url:
        # K8s 模式
        return await AioSandboxProvider(...)
    else:
        # Docker 模式
        return await DockerSandbox(...)
else:
    # Local 模式
    return LocalSandbox(...)
```

***

## 四、整体架构图解

### 4.1 系统架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        DeerFlow System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐      ┌──────────────────────────────────┐ │
│  │   Gateway API   │──────│      LangGraph Server            │ │
│  │  (FastAPI)      │      │  ┌────────────────────────────┐  │ │
│  └─────────────────┘      │  │     StateGraph (deerflow)  │  │ │
│         │                 │  │                            │  │ │
│         ▼                 │  │  ┌──────────────────────┐  │  │ │
│  ┌─────────────────┐      │  │  │   Lead Agent Node    │  │  │ │
│  │   IM Channels   │      │  │  └──────────┬───────────┘  │  │ │
│  │ (Telegram,      │      │  │             │              │  │ │
│  │  Slack, Feishu) │      │  │    ┌────────┴────────┐     │  │ │
│  └─────────────────┘      │  │    ▼                 ▼     │  │ │
│                           │  │ ┌──────┐  ┌──────────────┐ │  │ │
│                           │  │ │Tools │  │ Sub Agents   │ │  │ │
│                           │  │ └──┬───┘  └──────┬───────┘ │  │ │
│                           │  │    └────────┬───────────┘  │  │ │
│                           │  │             ▼              │  │ │
│                           │  │  ┌──────────────────────┐  │  │ │
│                           │  │  │   Synthesis Node     │  │  │ │
│                           │  │  └──────────────────────┘  │  │ │
│                           │  └────────────────────────────┘  │ │
│                           └────────────────────────────────────┘ │
│                                       │                          │
│                                       ▼                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      Sandbox Layer                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │ │
│  │  │   Local     │  │   Docker    │  │   Kubernetes        │  │ │
│  │  │  Sandbox    │  │  Sandbox    │  │   (Provisioner)     │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                       │                          │
│                                       ▼                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   File System (Sandbox)                     │ │
│  │   /mnt/skills/public  │  /mnt/user-data/workspace           │ │
│  │   /mnt/skills/custom  │  /mnt/user-data/uploads             │ │
│  │   /mnt/user-data/outputs                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Agent 编排流程

```
    User Message
         │
         ▼
┌─────────────────┐
│  Lead Agent     │ ◄─── Tools + Sub Agents Config
│  (Analysis)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────────┐
│ Tools │ │ Sub Agents │
│ Node  │ │    Node    │
└───┬───┘ └─────┬──────┘
    │           │
    └─────┬─────┘
          │
          ▼
┌─────────────────┐
│  Synthesis      │
│  (Aggregation)  │
└────────┬────────┘
         │
         ▼
   Final Response
```

***

## 五、核心设计亮点

### 5.1 LangGraph 最佳实践

DeerFlow 展示了 LangGraph 的多个最佳实践：

1. **清晰的状态定义**：使用 TypedDict 定义 AgentState，确保类型安全
2. **模块化的节点设计**：每个节点职责单一，易于测试和维护
3. **条件边实现动态路由**：根据 Agent 输出灵活决定下一步
4. **子图支持复杂编排**：通过子 Agent 机制处理复杂任务

### 5.2 沙盒安全设计

1. **进程隔离**：Docker/K8s 模式提供强隔离
2. **卷挂载控制**：只挂载必要的目录，避免敏感文件暴露
3. **网络隔离**：可配置的网络策略
4. **资源限制**：CPU、内存限制防止资源耗尽

### 5.3 可扩展性设计

1. **工具抽象层**：易于添加新的工具提供商
2. **沙盒多模式**：Local/Docker/K8s 适配不同部署场景
3. **MCP 集成**：支持 MCP 协议扩展工具生态
4. **技能系统**：Skill 机制支持工作流复用

***

## 六、总结

DeerFlow 是一个架构设计精良的 Super Agent 框架，其 LangGraph 集成展示了如何构建复杂的多 Agent 系统。通过 Lead Agent + Sub Agents 的分层设计，实现了任务的优雅分解和并行处理。沙盒系统为 Agent 提供了真实的执行环境，使其不仅仅是一个对话系统，而是一个能够真正「干活」的数字助手。

三种沙盒模式（Local/Docker/K8s）的设计使得框架可以从容开发调试过渡到生产部署，Provisioner 模式更是为大规模企业部署提供了可扩展的方案。 
