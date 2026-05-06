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
    print(f"\n{'='*60}")
    print(f"[Chat Router] ═══ 对话流程开始 ═══")
    print(f"[Chat Router] 收到请求 - mode: {message.mode}, session: {message.session_id}")
    print(f"[Chat Router] 用户消息: {message.message[:100]}{'...' if len(message.message) > 100 else ''}")
    print(f"[Chat Router] 模型配置: {message.model if message.model else '默认模型'}")

    model_config = None
    if message.model:
        model_config = get_model(message.model)
        print(f"[Chat Router] 已获取指定模型: {model_config.get('id', 'unknown')}")

    if not model_config:
        from routers.model import get_current_model_config
        model_config = get_current_model_config()
        print(f"[Chat Router] 使用当前默认模型: {model_config.get('id', 'unknown')}")

    print(f"[Chat Router] 步骤1: 添加用户消息到会话")
    if message.session_id:
        add_message_to_session(message.session_id, "user", message.message)
        print(f"[Chat Router] 用户消息已保存到会话: {message.session_id}")

    print(f"[Chat Router] 步骤2: 调用 process_chat_message")
    result = await process_chat_message(
        message=message.message,
        session_id=message.session_id,
        model_config=model_config,
        mode=message.mode,
        group_id=message.group_id
    )

    print(f"[Chat Router] 步骤3: 保存助手回复到会话")
    if message.session_id and result.get("content"):
        metadata = {
            "source": message.mode,
            "intent": result.get("intent", ""),
            "tools": result.get("tools", []),
            "thinking": f"[使用工具: {', '.join(result.get('tools', []))}]" if result.get("tools") else ""
        }
        add_message_to_session(message.session_id, "assistant", result["content"], metadata)
        print(f"[Chat Router] 助手回复已保存 - intent: {result.get('intent')}, tools: {result.get('tools')}")

    print(f"[Chat Router] ═══ 对话流程结束 ═══")
    print(f"{'='*60}\n")

    return ChatResponse(**result)


async def stream_chat_message(
    message: str,
    session_id: Optional[str],
    model_config,
    mode: str = "hybrid",
    group_id: str = None
) -> AsyncIterator[str]:
    """流式处理聊天消息"""
    print(f"[Chat Router] 流式对话流程 - mode: {mode}")

    try:
        from services.ai_service import get_recent_messages

        recent_history = []
        if session_id and mode in ["ai", "agent", "hybrid"]:
            try:
                recent_history = await get_recent_messages(session_id, limit=6)
                print(f"[Chat Router] 已获取历史消息: {len(recent_history)} 条")
            except Exception as e:
                print(f"[Chat Router] 获取历史消息失败: {e}")
                # 继续执行，不使用历史消息

        if mode == "knowledge":
            print(f"[Chat Router] 模式: knowledge - 知识库检索")
            try:
                from skills.skills_router import search_knowledge_base
                kb_result = await search_knowledge_base(message, max_results=10, group_id=group_id)
                if kb_result.get("success") and kb_result.get("results"):
                    kb_content = "📚 知识库检索结果:\n\n"
                    for i, r in enumerate(kb_result["results"], 1):
                        content_preview = r.get("content", "")[:150]
                        kb_content += f"{i}. **{r['file']}**\n   {content_preview}...\n\n"
                    print(f"[Chat Router] 知识库检索成功: {len(kb_result['results'])} 条结果")
                    yield json.dumps({"type": "content", "content": kb_content}, ensure_ascii=False)
                else:
                    content = "🔍 在知识库中没有找到相关内容。\n\n可以尝试：\n- 使用不同的关键词搜索\n- 选择其他知识库分组\n- 切换到AI模式直接提问"
                    print(f"[Chat Router] 知识库检索无结果")
                    yield json.dumps({"type": "content", "content": content}, ensure_ascii=False)
            except Exception as e:
                print(f"[Chat Router] 知识库检索失败: {e}")
                yield json.dumps({"type": "content", "content": f"错误：知识库检索失败 - {str(e)}"}, ensure_ascii=False)
            return

        if mode in ["ai", "agent"]:
            try:
                model_max_tokens = model_config.get("max_tokens", 128000) if model_config else 128000
                print(f"[Chat Router] 模式: {mode} - 直接LLM调用, max_tokens={model_max_tokens}")
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
                print(f"[Chat Router] {mode} 模式响应完成")
            except Exception as e:
                print(f"[Chat Router] {mode} 模式处理失败: {e}")
                yield json.dumps({"type": "content", "content": f"错误：处理失败 - {str(e)}"}, ensure_ascii=False)
            return

        if mode == "hybrid":
            try:
                from skills.skills_router import execute_tool
                from skills.skill_manager import skill_manager
                from skills.tools_registry import tool_registry

                print(f"[Chat Router] TOOL HYBRID 模式 - 技能+工具整合")
                
                matched_skills = []
                try:
                    matched_skills = skill_manager.match_skills(message)
                    print(f"[Chat Router] 匹配到的技能: {[(s.id, s.name, c) for s, c, p in matched_skills]}")
                except Exception as e:
                    print(f"[Chat Router] 技能匹配失败: {e}")
                    matched_skills = []

                tool_results = []
                used_tools = []
                used_skills = []
                skipped_skills = []

                for skill, confidence, params in matched_skills:
                    if confidence >= 0.3:
                        try:
                            skill_tool_names = skill_manager.get_skill_tools(skill.id)
                            print(f"[Chat Router] TOOL 匹配技能: {skill.name} (置信度: {confidence:.2f}), 需要工具: {skill_tool_names}")

                            if not skill_tool_names:
                                print(f"[Chat Router] WARN 技能 {skill.name} 没有配置工具，跳过")
                                skipped_skills.append(skill.name)
                                continue

                            skill_executed = False
                            for tool_name in skill_tool_names:
                                if not tool_registry.is_tool_executable(tool_name):
                                    print(f"[Chat Router] WARN 工具 {tool_name} 不存在或未注册，跳过")
                                    skipped_skills.append(f"{skill.name}({tool_name})")
                                    continue

                                yield json.dumps({"type": "thinking", "content": "技能 " + skill.name + " 调用工具 " + tool_name + "..."}, ensure_ascii=False)
                                print(f"[Chat Router] TOOL 执行工具: {tool_name}")
                                tool_result = await execute_tool(tool_name, {"query": message}, {})
                                if tool_result.get("success"):
                                    tool_results.append({
                                        "skill_id": skill.id,
                                        "skill_name": skill.name,
                                        "tool": tool_name,
                                        "result": tool_result,
                                        "confidence": confidence
                                    })
                                    used_tools.append(tool_name)
                                    used_skills.append(skill.name)
                                    skill_executed = True
                                    print(f"[Chat Router] OK 技能 {skill.name} 工具 {tool_name} 执行成功")
                                    yield json.dumps({"type": "thinking", "content": "技能 " + skill.name + " 执行完成"}, ensure_ascii=False)

                            if not skill_executed and skill_tool_names:
                                print(f"[Chat Router] WARN 技能 {skill.name} 的工具都不可用")
                        except Exception as e:
                            print(f"[Chat Router] 执行技能 {skill.name} 失败: {e}")
                            yield json.dumps({"type": "thinking", "content": "技能 " + skill.name + " 执行失败: " + str(e)}, ensure_ascii=False)

                if skipped_skills:
                    yield json.dumps({"type": "thinking", "content": "跳过 " + str(len(skipped_skills)) + " 个技能(工具不可用)"}, ensure_ascii=False)

                if tool_results:
                    yield json.dumps({"type": "thinking", "content": "已执行 " + str(len(tool_results)) + " 个技能工具"}, ensure_ascii=False)

                system_prompt = build_system_prompt(mode)
                model_max_tokens = model_config.get("max_tokens", 128000) if model_config else 128000
                print(f"[Chat Router] TOOL hybrid模式 - 整合技能结果后调用LLM, max_tokens={model_max_tokens}")
                if tool_results:
                    skill_context = "\n\n技能执行结果:\n"
                    for tr in tool_results:
                        skill_context += f"- **{tr['skill_name']}** (工具: {tr['tool']}): {tr['result']}\n"
                    system_prompt = f"{system_prompt}{skill_context}\n\n请根据上述技能执行结果，整合信息回答用户问题。"
                    print(f"[Chat Router] TOOL 已将 {len(tool_results)} 个技能结果注入提示词 (技能: {used_skills})")

                thinking_content = ""
                async for chunk in _stream_call_ai_service(
                    message, system_prompt, model_config, 0.7, model_max_tokens, recent_history
                ):
                    if chunk.get("type") == "thinking":
                        thinking_content += chunk.get("content", "")
                        yield json.dumps({"type": "thinking", "content": thinking_content}, ensure_ascii=False)
                    elif chunk.get("type") == "content":
                        yield json.dumps({"type": "content", "content": chunk.get("content", "")}, ensure_ascii=False)
                print(f"[Chat Router] TOOL hybrid 模式响应完成, 使用技能: {used_skills}")
            except Exception as e:
                print(f"[Chat Router] hybrid 模式处理失败: {e}")
                yield json.dumps({"type": "content", "content": f"错误：处理失败 - {str(e)}"}, ensure_ascii=False)
            return

        # fallback 模式
        try:
            thinking_content = ""
            fallback_max_tokens = model_config.get("max_tokens", 128000) if model_config else 128000
            print(f"[Chat Router] fallback 模式, max_tokens={fallback_max_tokens}")
            async for chunk in _stream_call_ai_service(
                message, build_system_prompt("ai"), model_config, 0.7, fallback_max_tokens, recent_history
            ):
                if chunk.get("type") == "thinking":
                    thinking_content += chunk.get("content", "")
                    yield json.dumps({"type": "thinking", "content": thinking_content}, ensure_ascii=False)
                elif chunk.get("type") == "content":
                    yield json.dumps({"type": "content", "content": chunk.get("content", "")}, ensure_ascii=False)
        except Exception as e:
            print(f"[Chat Router] fallback 模式处理失败: {e}")
            yield json.dumps({"type": "content", "content": f"错误：处理失败 - {str(e)}"}, ensure_ascii=False)

    except Exception as e:
        print(f"[Chat Router] stream_chat_message 发生未处理异常: {e}")
        yield json.dumps({"type": "content", "content": f"错误：{str(e)}"}, ensure_ascii=False)


@router.post("/stream")
async def chat_stream(message: ChatMessage, request: Request):
    """流式聊天接口"""
    print(f"\n{'='*60}")
    print(f"[Chat Router] ═══ 流式对话流程开始 ═══")
    print(f"[Chat Router] 收到流式请求 - mode: {message.mode}, session: {message.session_id}")
    print(f"[Chat Router] 用户消息: {message.message[:100]}{'...' if len(message.message) > 100 else ''}")

    model_config = None
    if message.model:
        model_config = get_model(message.model)
        print(f"[Chat Router] 使用指定模型: {model_config.get('id', 'unknown')}")

    if not model_config:
        from routers.model import get_current_model_config
        model_config = get_current_model_config()
        print(f"[Chat Router] 使用当前默认模型: {model_config.get('id', 'unknown')}")

    print(f"[Chat Router] 添加用户消息到会话")
    if message.session_id:
        add_message_to_session(message.session_id, "user", message.message, {"source": message.mode})

    full_content = []
    mode = message.mode

    async def generate():
        try:
            async for chunk in stream_chat_message(
                message=message.message,
                session_id=message.session_id,
                model_config=model_config,
                mode=mode,
                group_id=message.group_id
            ):
                full_content.append(chunk)
                yield f"data: {chunk}\n\n"
                await asyncio.sleep(0.005)

            print(f"[Chat Router] 流式响应完成，开始保存到会话")
            if message.session_id and full_content:
                try:
                    full_response = ""
                    thinking_content = ""
                    for fc in full_content:
                        try:
                            chunk_data = json.loads(fc)
                            if chunk_data.get("type") == "content":
                                full_response += chunk_data.get("content", "")
                            elif chunk_data.get("type") == "thinking":
                                thinking_content = chunk_data.get("content", "")
                        except:
                            pass
                    if full_response:
                        metadata = {
                            "source": mode,
                            "thinking": thinking_content
                        }
                        add_message_to_session(message.session_id, "assistant", full_response, metadata)
                        print(f"[Chat Router] 助手回复已保存到会话: {message.session_id}")
                except Exception as e:
                    print(f"[Chat Router] 保存会话消息失败: {e}")

            yield "data: {\"type\": \"done\"}\n\n"
            print(f"[Chat Router] ═══ 流式对话流程结束 ═══")
            print(f"{'='*60}\n")
            
        except Exception as e:
            print(f"[Chat Router] generate 函数异常: {e}")
            try:
                error_msg = json.dumps({"type": "content", "content": f"错误：{str(e)}"}, ensure_ascii=False)
                yield f"data: {error_msg}\n\n"
                yield "data: {\"type\": \"done\"}\n\n"
            except:
                pass

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
            "Content-Type": "text/event-stream; charset=utf-8",
            "Access-Control-Expose-Headers": "*"
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