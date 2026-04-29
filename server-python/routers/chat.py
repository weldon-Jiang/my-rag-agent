from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncIterator
import json
import asyncio

from models.schemas import ChatMessage, ChatResponse
from services.ai_service import process_chat_message, call_ai_service, build_system_prompt, _stream_call_ai_service
from routers.model import get_model
from routers.session import add_message_to_session

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(message: ChatMessage, request: Request):
    print(f"[Chat Router] 收到请求 - mode: {message.mode}, session: {message.session_id}")

    model_config = None
    if message.model:
        model_config = get_model(message.model)

    if not model_config:
        from routers.model import get_current_model_config
        model_config = get_current_model_config()

    if message.session_id:
        add_message_to_session(message.session_id, "user", message.message)

    result = await process_chat_message(
        message=message.message,
        session_id=message.session_id,
        model_config=model_config,
        mode=message.mode,
        group_id=message.group_id
    )

    if message.session_id and result.get("content"):
        add_message_to_session(message.session_id, "assistant", result["content"])

    return ChatResponse(**result)


async def stream_chat_message(
    message: str,
    session_id: Optional[str],
    model_config,
    mode: str = "hybrid",
    group_id: str = None
) -> AsyncIterator[str]:
    """流式处理聊天消息"""
    from services.ai_service import get_recent_messages

    recent_history = []
    if session_id and mode in ["ai", "agent", "hybrid"]:
        recent_history = await get_recent_messages(session_id, limit=6)

    if mode == "knowledge":
        from skills.skills_router import search_knowledge_base
        kb_result = await search_knowledge_base(message, max_results=10, group_id=group_id)
        if kb_result.get("success") and kb_result.get("results"):
            kb_content = "📚 知识库检索结果:\n\n"
            for i, r in enumerate(kb_result["results"], 1):
                content_preview = r.get("content", "")[:150]
                kb_content += f"{i}. **{r['file']}**\n   {content_preview}...\n\n"
            yield json.dumps({"type": "content", "content": kb_content}, ensure_ascii=False)
        else:
            content = "🔍 在知识库中没有找到相关内容。\n\n可以尝试：\n- 使用不同的关键词搜索\n- 选择其他知识库分组\n- 切换到AI模式直接提问"
            yield json.dumps({"type": "content", "content": content}, ensure_ascii=False)
        return

    if mode in ["ai", "agent"]:
        model_max_tokens = model_config.get("max_tokens", 128000) if model_config else 128000
        print(f"[Chat Router] mode={mode}, max_tokens={model_max_tokens}")
        system_prompt = build_system_prompt(mode)
        thinking_content = ""
        async for chunk in _stream_call_ai_service(
            message, system_prompt, model_config, 0.7, model_max_tokens, recent_history
        ):
            if chunk.get("type") == "thinking":
                thinking_content += chunk.get("content", "")
                yield json.dumps({"type": "thinking", "content": thinking_content}, ensure_ascii=False)
            elif chunk.get("type") == "content":
                yield json.dumps({"type": "content", "content": chunk.get("content", "")}, ensure_ascii=False)
        return

    if mode == "hybrid":
        from skills.skills_router import execute_tool
        from skills.tools import match_tools_by_capability

        suggested_tools = match_tools_by_capability(message)

        tool_results = []
        used_tools = []

        if suggested_tools:
            for tool_name in suggested_tools:
                if tool_name in ["get_weather", "get_location", "web_search", "read_file", "write_file"]:
                    yield json.dumps({"type": "thinking", "content": f"🔧 正在调用工具: {tool_name}..."}, ensure_ascii=False)
                    tool_result = await execute_tool(tool_name, {"query": message}, {})
                    if tool_result.get("success"):
                        tool_results.append({"tool": tool_name, "result": tool_result})
                        used_tools.append(tool_name)
                        yield json.dumps({"type": "thinking", "content": f"✅ 工具 {tool_name} 执行成功"}, ensure_ascii=False)

        system_prompt = build_system_prompt(mode)
        model_max_tokens = model_config.get("max_tokens", 128000) if model_config else 128000
        print(f"[Chat Router] mode={mode}, max_tokens={model_max_tokens}")
        if tool_results:
            tool_context = "\n\n🛠️ 工具执行结果:\n"
            for tr in tool_results:
                tool_context += f"- **{tr['tool']}**: {tr['result']}\n"
            system_prompt = f"{system_prompt}{tool_context}\n\n请根据上述工具执行结果，整合信息回答用户问题。"

        thinking_content = ""
        async for chunk in _stream_call_ai_service(
            message, system_prompt, model_config, 0.7, model_max_tokens, recent_history
        ):
            if chunk.get("type") == "thinking":
                thinking_content += chunk.get("content", "")
                yield json.dumps({"type": "thinking", "content": thinking_content}, ensure_ascii=False)
            elif chunk.get("type") == "content":
                yield json.dumps({"type": "content", "content": chunk.get("content", "")}, ensure_ascii=False)
        return

    thinking_content = ""
    fallback_max_tokens = model_config.get("max_tokens", 128000) if model_config else 128000
    print(f"[Chat Router] fallback mode, max_tokens={fallback_max_tokens}")
    async for chunk in _stream_call_ai_service(
        message, build_system_prompt("ai"), model_config, 0.7, fallback_max_tokens, recent_history
    ):
        if chunk.get("type") == "thinking":
            thinking_content += chunk.get("content", "")
            yield json.dumps({"type": "thinking", "content": thinking_content}, ensure_ascii=False)
        elif chunk.get("type") == "content":
            yield json.dumps({"type": "content", "content": chunk.get("content", "")}, ensure_ascii=False)


@router.post("/stream")
async def chat_stream(message: ChatMessage, request: Request):
    """流式聊天接口"""
    print(f"[Chat Router] 收到流式请求 - mode: {message.mode}, session: {message.session_id}")

    model_config = None
    if message.model:
        model_config = get_model(message.model)

    if not model_config:
        from routers.model import get_current_model_config
        model_config = get_current_model_config()

    if message.session_id:
        add_message_to_session(message.session_id, "user", message.message)

    full_content = []

    async def generate():
        async for chunk in stream_chat_message(
            message=message.message,
            session_id=message.session_id,
            model_config=model_config,
            mode=message.mode,
            group_id=message.group_id
        ):
            full_content.append(chunk)
            yield f"data: {chunk}\n\n"
            await asyncio.sleep(0.005)

        if message.session_id and full_content:
            try:
                full_response = ""
                for fc in full_content:
                    try:
                        chunk_data = json.loads(fc)
                        if chunk_data.get("type") == "content":
                            full_response += chunk_data.get("content", "")
                    except:
                        pass
                if full_response:
                    add_message_to_session(message.session_id, "assistant", full_response)
            except Exception as e:
                print(f"[Chat Router] 保存会话消息失败: {e}")

        yield "data: {\"type\": \"done\"}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/clarification/respond")
async def respond_clarification(
    clarification_id: str,
    response: str,
    original_query: Optional[str] = None,
    session_id: Optional[str] = None,
    mode: str = "hybrid"
):
    print(f"[Chat Router] 追问响应: {clarification_id} -> {response}")

    combined_message = f"{original_query}\n\n用户补充: {response}"

    model_config = get_model()

    result = await process_chat_message(
        message=combined_message,
        session_id=session_id,
        model_config=model_config,
        mode=mode
    )

    return result


@router.get("/clarification/{clarification_id}")
async def get_clarification(clarification_id: str):
    return {
        "clarification_id": clarification_id,
        "status": "pending"
    }