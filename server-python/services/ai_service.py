import httpx
import json
from typing import Optional, Dict, Any, List
from routers.model import get_model, get_current_model_config
from services.ai_cache import ai_cache, circuit_breaker, CircuitBreakerOpen
import asyncio

print("[AI Service] 初始化 AI 服务")

active_model = None


async def _raw_call_ai_service(
    prompt: str,
    system_prompt: str,
    model_config: Dict[str, Any],
    temperature: float,
    max_tokens: int,
    history: List[Dict[str, str]] = None
) -> Dict[str, Any]:
    content = ""
    async for chunk in _stream_call_ai_service(prompt, system_prompt, model_config, temperature, max_tokens, history):
        if chunk.get("type") == "content":
            content += chunk.get("content", "")

    return {
        "success": True,
        "content": content,
        "model": model_config.get("id", ""),
        "usage": {}
    }


async def _stream_call_ai_service(
    prompt: str,
    system_prompt: str,
    model_config: Dict[str, Any],
    temperature: float,
    max_tokens: int,
    history: List[Dict[str, str]] = None
):
    api_key = model_config.get("apiKey", "")
    api_url = model_config.get("url", "")

    if not api_key or not api_url:
        raise Exception(f"模型配置缺少 apiKey 或 url: {model_config.get('id')}")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    if history:
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant"]:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": prompt})

    model_id = model_config.get("modelId", model_config.get("id", ""))

    payload = {
        "model": model_id,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True
    }

    if not api_url.endswith("/"):
        api_url += "/"

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{api_url}chat/completions",
            headers=headers,
            json=payload
        ) as response:
            if response.status_code != 200:
                await response.aclose()
                raise Exception(f"API error: {response.status_code}")

            async for line in response.aiter_lines():
                if line.strip():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                if delta.get("content"):
                                    yield {
                                        "type": "content",
                                        "content": delta["content"]
                                    }
                                if delta.get("reasoning_content"):
                                    yield {
                                        "type": "thinking",
                                        "content": delta["reasoning_content"]
                                    }
                        except json.JSONDecodeError:
                            pass


async def call_ai_service(
    prompt: str,
    system_prompt: str = "",
    model_config: Optional[Dict[str, Any]] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    use_cache: bool = True,
    history: List[Dict[str, str]] = None
) -> Dict[str, Any]:
    global active_model

    if model_config is None:
        model_config = get_current_model_config()

    if not model_config:
        model_config = {
            "id": "minimax-m2.5",
            "protocol": "openai",
            "supports_multimodal": True
        }

    active_model = model_config["id"]
    model_id = model_config["id"]

    if use_cache:
        cached = ai_cache.get(prompt, model_id)
        if cached:
            print(f"[AI Service] 命中缓存: {model_id}")
            return {
                "success": True,
                "content": cached,
                "model": model_id,
                "cached": True
            }

    try:
        result = await circuit_breaker.call(
            _raw_call_ai_service,
            prompt,
            system_prompt,
            model_config,
            temperature,
            max_tokens,
            history
        )

        if result.get("success") and use_cache:
            ai_cache.set(prompt, model_id, result["content"])

        return result

    except CircuitBreakerOpen:
        print("[AI Service] 熔断器打开，拒绝请求")
        return {
            "success": False,
            "error": "Circuit breaker open",
            "content": "抱歉，AI 服务暂时不可用，请稍后重试",
            "circuit_breaker": True
        }
    except httpx.TimeoutException:
        print("[AI Service] 请求超时")
        return {
            "success": False,
            "error": "Request timeout",
            "content": "抱歉，AI 请求超时了，请稍后重试"
        }
    except Exception as e:
        print(f"[AI Service] 调用失败: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "content": f"抱歉，AI 服务暂时不可用: {str(e)}"
        }


async def analyze_intent(message: str, model_config: Optional[Dict] = None) -> Dict[str, Any]:
    print(f"[Intent Analysis] 分析消息: {message[:50]}...")

    intent_prompt = f"""分析用户消息的意图，只返回JSON格式：
{{
    "intent": "意图名称",
    "needs_clarification": false,
    "reasoning": "分析理由",
    "suggested_tools": ["tool1"],
    "task_breakdown": []
}}

用户消息：{message}

意图选项：
- weather_query: 天气查询
- web_search: 搜索信息
- knowledge_search: 知识库检索
- code_execute: 执行代码
- file_operation: 文件操作
- general_chat: 日常对话
- question_answering: 问答
- location_query: 位置查询

只返回JSON，不要其他内容。"""

    result = await call_ai_service(
        prompt=intent_prompt,
        system_prompt="你是一个意图分析专家，分析用户消息的意图。只返回JSON格式的结果。",
        model_config=model_config
    )

    if result["success"]:
        try:
            content = result["content"]
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                intent_data = json.loads(content[json_start:json_end])
                return {
                    "intent": intent_data.get("intent", "general_chat"),
                    "needs_clarification": intent_data.get("needs_clarification", False),
                    "reasoning": intent_data.get("reasoning", ""),
                    "suggested_tools": intent_data.get("suggested_tools", []),
                    "task_breakdown": intent_data.get("task_breakdown", [])
                }
        except json.JSONDecodeError:
            pass

    return {
        "intent": "general_chat",
        "needs_clarification": False,
        "reasoning": "默认意图",
        "suggested_tools": [],
        "task_breakdown": []
    }


def build_system_prompt(mode: str = "hybrid") -> str:
    if mode == "agent":
        return """你是一个友好的AI助手，名字叫小M。请直接回答用户的问题。"""
    elif mode == "knowledge":
        return """你是一个知识库助手，专门用于搜索和展示知识库中的内容。"""
    else:
        return """你是一个友好的AI助手，名字叫小M。用户跟你对话时，保持友好、专业的态度。"""


async def get_recent_messages(session_id: str, limit: int = 10) -> List[Dict[str, str]]:
    """获取最近的消息作为短期记忆"""
    from routers.session import get_session_messages_list
    messages = get_session_messages_list(session_id, limit=limit)
    return messages[-limit:] if len(messages) > limit else messages


async def process_chat_message(
    message: str,
    session_id: Optional[str],
    model_config: Optional[Dict] = None,
    mode: str = "hybrid",
    group_id: str = None
) -> Dict[str, Any]:
    print(f"[Chat Service] 处理消息: {message[:50]}..., mode: {mode}, group_id: {group_id}, session: {session_id}")

    if model_config is None:
        model_config = get_current_model_config()

    recent_history = []
    if session_id:
        recent_history = await get_recent_messages(session_id, limit=10)
        print(f"[Chat Service] 短期记忆: {len(recent_history)} 条消息")

    if mode == "knowledge":
        print(f"[Chat Service] 模式: knowledge - 向量分片检索知识库")
        from skills.skills_router import search_knowledge_base
        kb_result = await search_knowledge_base(message, max_results=10, group_id=group_id)
        if kb_result.get("success") and kb_result.get("results"):
            kb_content = "📚 知识库检索结果:\n\n"
            for i, r in enumerate(kb_result["results"], 1):
                content_preview = r.get("content", "")[:150]
                kb_content += f"{i}. **{r['file']}**\n   {content_preview}...\n\n"
            return {
                "type": "knowledge",
                "content": kb_content,
                "intent": "knowledge_search",
                "tools": ["search_knowledge_base"],
                "group_id": group_id
            }
        else:
            return {
                "type": "knowledge",
                "content": "🔍 在知识库中没有找到相关内容。\n\n可以尝试：\n- 使用不同的关键词搜索\n- 选择其他知识库分组\n- 切换到AI模式直接提问",
                "intent": "knowledge_search",
                "tools": ["search_knowledge_base"],
                "group_id": group_id
            }

    if mode == "ai":
        print(f"[Chat Service] 模式: ai - 只调用LLM")
        ai_result = await call_ai_service(
            prompt=message,
            system_prompt=build_system_prompt(mode),
            model_config=model_config,
            history=recent_history
        )
        return {
            "type": "text",
            "content": ai_result.get("content", "抱歉，我没有收到有效的回复。"),
            "intent": "ai_response",
            "tools": []
        }

    if mode == "hybrid":
        print(f"[Chat Service] 模式: hybrid - 工具 + LLM整合")
        from skills.skills_router import execute_tool
        from skills.tools import match_tools_by_capability

        suggested_tools = match_tools_by_capability(message)
        print(f"[Chat Service] 匹配的工具: {suggested_tools}")

        tool_results = []
        used_tools = []

        if suggested_tools:
            for tool_name in suggested_tools:
                if tool_name in ["get_weather", "get_location", "web_search", "read_file", "write_file"]:
                    tool_result = await execute_tool(tool_name, {"query": message}, {})
                    if tool_result.get("success"):
                        tool_results.append({"tool": tool_name, "result": tool_result})
                        used_tools.append(tool_name)
                        print(f"[Chat Service] 工具执行成功: {tool_name}")

        system_prompt = build_system_prompt(mode)
        if tool_results:
            tool_context = "\n\n🛠️ 工具执行结果:\n"
            for tr in tool_results:
                tool_context += f"- **{tr['tool']}**: {tr['result']}\n"
            system_prompt = f"{system_prompt}{tool_context}\n\n请根据上述工具执行结果，整合信息回答用户问题。如果工具执行失败，请直接回答用户问题。"

        ai_result = await call_ai_service(
            prompt=message,
            system_prompt=system_prompt,
            model_config=model_config,
            history=recent_history
        )
        return {
            "type": "text",
            "content": ai_result.get("content", "抱歉，我没有收到有效的回复。"),
            "intent": "hybrid_response",
            "tools": used_tools
        }

    ai_result = await call_ai_service(
        prompt=message,
        system_prompt=build_system_prompt("ai"),
        model_config=model_config,
        history=recent_history
    )
    return {
        "type": "text",
        "content": ai_result.get("content", "抱歉，我没有收到有效的回复。"),
        "intent": "default_response",
        "tools": []
    }