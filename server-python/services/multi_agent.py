from typing import Dict, List, Any, Optional
from skills import CAPABILITY_TOOLS


class SubAgent:
    def __init__(self, name: str, capabilities: List[str], description: str):
        self.name = name
        self.capabilities = capabilities
        self.description = description
        self.llm_config: Optional[Dict] = None
        print(f"[SubAgent:{self.name}] 初始化 - capabilities: {capabilities}")

    def set_llm_config(self, config: Dict):
        self.llm_config = config
        print(f"[SubAgent:{self.name}] LLM配置已设置")

    async def execute(self, task: str, context: Dict = None) -> Dict[str, Any]:
        print(f"\n[SubAgent:{self.name}] ══ 开始执行任务 ══")
        print(f"[SubAgent:{self.name}] 任务: {task[:80]}...")
        print(f"[SubAgent:{self.name}] 可用能力: {self.capabilities}")

        if context is None:
            context = {}

        matched_tools = []
        for cap in self.capabilities:
            tools = CAPABILITY_TOOLS.get(cap, [])
            matched_tools.extend(tools)

        matched_tools = list(set(matched_tools))
        print(f"[SubAgent:{self.name}] 匹配的工具: {matched_tools}")

        if not matched_tools:
            print(f"[SubAgent:{self.name}] ✗ 未找到匹配的工具")
            return {
                "success": False,
                "agent": self.name,
                "error": "未找到匹配的工具"
            }

        from skills.skills_router import execute_tool

        tool_results = []
        for tool_name in matched_tools[:3]:
            try:
                print(f"[SubAgent:{self.name}] 执行工具: {tool_name}")
                result = await execute_tool(tool_name, {"query": task}, context)
                tool_results.append({
                    "tool": tool_name,
                    "result": result
                })
                print(f"[SubAgent:{self.name}] ✓ 工具 {tool_name} 执行成功")
            except Exception as e:
                print(f"[SubAgent:{self.name}] ✗ 工具 {tool_name} 执行失败: {str(e)}")

        print(f"[SubAgent:{self.name}] ══ 任务执行完成 ══\n")
        return {
            "success": True,
            "agent": self.name,
            "task": task,
            "tools_used": matched_tools,
            "results": tool_results
        }


class MultiAgentCoordinator:
    def __init__(self):
        self.agents: Dict[str, SubAgent] = {}
        self._init_agents()

    def _init_agents(self):
        print(f"[MultiAgent] 初始化子Agent")
        self.register_agent(SubAgent(
            "search",
            ["web_search"],
            "互联网搜索专家"
        ))

        self.register_agent(SubAgent(
            "knowledge",
            ["knowledge_search"],
            "知识库检索专家"
        ))

        self.register_agent(SubAgent(
            "weather",
            ["weather_query"],
            "天气预报专家"
        ))

        self.register_agent(SubAgent(
            "location",
            ["location_query"],
            "地理位置专家"
        ))

        self.register_agent(SubAgent(
            "code",
            ["code_execute"],
            "编程开发专家"
        ))

        self.register_agent(SubAgent(
            "document",
            ["document_understand", "image_understand"],
            "文档理解专家"
        ))

        print(f"[MultiAgent] 已注册 {len(self.agents)} 个子Agent: {list(self.agents.keys())}")

    def register_agent(self, agent: SubAgent):
        self.agents[agent.name] = agent
        print(f"[MultiAgent] 注册子Agent: {agent.name}")

    def set_llm_config_for_all(self, config: Dict):
        for agent in self.agents.values():
            agent.set_llm_config(config)

    def select_agent(self, task: str) -> Optional[SubAgent]:
        task_lower = task.lower()
        print(f"[MultiAgent] 选择Agent - 任务: {task_lower[:50]}...")

        if any(k in task_lower for k in ["搜索", "查", "找"]):
            print(f"[MultiAgent] → 选择 search Agent")
            return self.agents.get("search")

        if any(k in task_lower for k in ["天气", "温度", "雨", "晴"]):
            print(f"[MultiAgent] → 选择 weather Agent")
            return self.agents.get("weather")

        if any(k in task_lower for k in ["位置", "地址", "在哪里", "城市"]):
            print(f"[MultiAgent] → 选择 location Agent")
            return self.agents.get("location")

        if any(k in task_lower for k in ["代码", "编程", "文件"]):
            print(f"[MultiAgent] → 选择 code Agent")
            return self.agents.get("code")

        if any(k in task_lower for k in ["文档", "pdf", "图片", "识别"]):
            print(f"[MultiAgent] → 选择 document Agent")
            return self.agents.get("document")

        if any(k in task_lower for k in ["知识", "文件"]):
            print(f"[MultiAgent] → 选择 knowledge Agent (默认)")
            return self.agents.get("knowledge")

        print(f"[MultiAgent] → 选择 knowledge Agent (默认)")
        return self.agents.get("knowledge")

    async def delegate_task(self, task: str, context: Dict = None) -> Dict[str, Any]:
        print(f"\n[MultiAgent] ══ 委托任务 ══")
        agent = self.select_agent(task)

        if not agent:
            print(f"[MultiAgent] ✗ 未找到合适的Agent")
            return {
                "success": False,
                "error": "未找到合适的Agent"
            }

        print(f"[MultiAgent] 委托给 {agent.name} Agent")
        result = await agent.execute(task, context)
        print(f"[MultiAgent] ══ 任务完成 ══\n")
        return result

    async def execute_parallel(self, tasks: List[str], context: Dict = None) -> Dict[str, Any]:
        print(f"\n[MultiAgent] ══ 并行执行 {len(tasks)} 个任务 ══")
        for i, t in enumerate(tasks):
            print(f"[MultiAgent]   任务{i+1}: {t[:50]}...")

        import asyncio
        promises = [self.delegate_task(task, context) for task in tasks]
        results = await asyncio.gather(*promises, return_exceptions=True)

        success_count = sum(1 for r in results if not isinstance(r, Exception) and r.get("success"))
        print(f"[MultiAgent] ✓ 并行执行完成: {success_count}/{len(tasks)} 成功")
        print(f"[MultiAgent] ══ 并行执行结束 ══\n")

        return {
            "success": True,
            "task_count": len(tasks),
            "results": [
                r if not isinstance(r, Exception) else {"success": False, "error": str(r)}
                for r in results
            ]
        }

    async def execute_sequential(self, tasks: List[str], context: Dict = None) -> Dict[str, Any]:
        print(f"\n[MultiAgent] ══ 顺序执行 {len(tasks)} 个任务 ══")
        for i, t in enumerate(tasks):
            print(f"[MultiAgent]   任务{i+1}: {t[:50]}...")

        results = []
        for i, task in enumerate(tasks):
            print(f"[MultiAgent] 执行任务 {i+1}/{len(tasks)}")
            result = await self.delegate_task(task, context)
            results.append(result)

            if not result.get("success", False):
                print(f"[MultiAgent] ✗ 任务失败，停止执行")
                break

        success_count = sum(1 for r in results if r.get("success"))
        print(f"[MultiAgent] ✓ 顺序执行完成: {success_count}/{len(tasks)} 成功")
        print(f"[MultiAgent] ══ 顺序执行结束 ══\n")

        return {
            "success": all(r.get("success", False) for r in results),
            "task_count": len(tasks),
            "completed_count": len(results),
            "results": results
        }


coordinator = MultiAgentCoordinator()