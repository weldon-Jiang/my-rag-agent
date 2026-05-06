import httpx
import json
from typing import Optional, Dict, Any, List
import asyncio

print("[AI Service] 初始化 AI 服务")

active_model = None


def _get_model_config():
    """延迟导入避免循环依赖"""
    from routers.model import get_model, get_current_model_config
    return get_model, get_current_model_config


async def _raw_call_ai_service(
    prompt: str,
    system_prompt: str,
    model_config: Dict[str, Any],
    temperature: float,
    max_tokens: int,
    history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    print(f"[AI Service] _raw_call_ai_service 开始调用")
    content = ""
    async for chunk in _stream_call_ai_service(prompt, system_prompt, model_config, temperature, max_tokens, history):
        if chunk.get("type") == "content":
            content += chunk.get("content", "")

    print(f"[AI Service] _raw_call_ai_service 调用完成，响应长度: {len(content)}")
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
    history: Optional[List[Dict[str, str]]] = None
):
    import time
    start_time = time.time()
    
    print(f"\n{'='*60}")
    print(f"[AI Service] ═══ LLM 调用开始 ═══")
    print(f"[AI Service] 时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[AI Service] 模型ID: {model_config.get('id', 'unknown')}")
    print(f"[AI Service] API URL: {model_config.get('url', 'unknown')}")
    print(f"[AI Service] Temperature: {temperature}")
    print(f"[AI Service] Max Tokens: {max_tokens}")

    api_key = model_config.get("apiKey", "")
    api_url = model_config.get("url", "")

    if not api_key or not api_url:
        elapsed = time.time() - start_time
        yield {
            "type": "content",
            "content": f"错误：模型配置缺少 apiKey 或 url"
        }
        print(f"[AI Service] ERROR 错误: 模型配置缺少 apiKey 或 url: {model_config.get('id')}")
        print(f"[AI Service] ═══ LLM 调用结束 ═══ 耗时: {elapsed:.2f}s")
        print(f"{'='*60}\n")
        return

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
        print(f"[AI Service] 系统提示词长度: {len(system_prompt)} 字符")

    if history:
        print(f"[AI Service] 历史消息数量: {len(history)}")
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant"]:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": prompt})
    print(f"[AI Service] 用户提示词长度: {len(prompt)} 字符")
    print(f"[AI Service] 总消息数量: {len(messages)}")

    model_id = model_config.get("modelId", model_config.get("id", ""))
    protocol = model_config.get("protocol", "openai").lower()

    payload = {
        "model": model_id,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True
    }
    
    # 根据协议类型确定API端点
    if protocol in ["openai", "ollama", "minimax"] or (protocol == "openai" and model_id.startswith("MiniMax")):
        # OpenAI/Ollama/MiniMax 风格：使用 /chat/completions 端点
        if not api_url.endswith("/"):
            api_url += "/"
        full_url = f"{api_url}chat/completions"
    else:
        # 其他协议或阿里云PAI-EAS服务：直接使用配置的URL
        full_url = api_url
    
    # 打印脱敏后的payload用于调试
    debug_payload = payload.copy()
    if api_key:
        debug_headers = {"Content-Type": "application/json", "Authorization": "Bearer ***"}
    print(f"[AI Service] 协议类型: {protocol}")
    print(f"[AI Service] 请求URL: {full_url}")
    print(f"[AI Service] 请求头: {json.dumps(debug_headers)}")
    print(f"[AI Service] 请求体模型: {model_id}")
    print(f"[AI Service] 请求体消息数: {len(messages)}")
    print(f"[AI Service] 开始发送请求...")

    content_buffer = ""
    thinking_buffer = ""
    response_received = False
    
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(timeout=120.0, read=60.0, write=60.0, connect=30.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            follow_redirects=True
        ) as client:
            async with client.stream(
                "POST",
                full_url,
                headers=headers,
                json=payload,
                timeout=120.0
            ) as response:
                print(f"[AI Service] OK 收到响应，状态码: {response.status_code}")
                
                if response.status_code != 200:
                    elapsed = time.time() - start_time
                    error_content = await response.aread()
                    await response.aclose()
                    
                    status_code = response.status_code
                    error_msg = f"API错误 {status_code}"
                    
                    if status_code == 308:
                        error_msg = "API错误 308：请求被永久重定向，请检查API URL是否正确（可能需要使用HTTPS）"
                    elif status_code == 404:
                        error_msg = "API错误 404：请求的端点不存在，请检查API URL和模型配置"
                    elif status_code == 401:
                        error_msg = "API错误 401：未授权，请检查API密钥是否正确"
                    elif status_code == 403:
                        error_msg = "API错误 403：禁止访问，请检查API密钥权限"
                    elif status_code >= 300 and status_code < 400:
                        error_msg = f"API错误 {status_code}：请求被重定向，可能需要检查URL配置"
                    
                    try:
                        error_data = json.loads(error_content)
                        error_detail = error_data.get("error", {}).get("message", "")
                        if error_detail:
                            error_msg = f"{error_msg} - {error_detail}"
                    except:
                        pass
                    
                    yield {
                        "type": "content",
                        "content": f"错误：{error_msg}"
                    }
                    print(f"[AI Service] ERROR API错误: {error_msg}")
                    print(f"[AI Service] ═══ LLM 调用结束 ═══ 耗时: {elapsed:.2f}s")
                    print(f"{'='*60}\n")
                    return

                print(f"[AI Service] 📡 开始接收流式响应...")
                chunk_count = 0
                async for line in response.aiter_lines():
                    response_received = True
                    chunk_count += 1
                    if line.strip():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                print(f"[AI Service] 🔚 收到 [DONE]，流式响应结束")
                                break
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    if delta.get("content"):
                                        content_buffer += delta["content"]
                                        yield {
                                            "type": "content",
                                            "content": delta["content"]
                                        }
                                    if delta.get("reasoning_content"):
                                        thinking_buffer += delta["reasoning_content"]
                                        yield {
                                            "type": "thinking",
                                            "content": delta["reasoning_content"]
                                        }
                                    if delta.get("role"):
                                        continue
                            except json.JSONDecodeError as e:
                                print(f"[AI Service] WARN JSON解析错误: {e}")
                                continue
                            except Exception as e:
                                print(f"[AI Service] WARN 处理响应数据错误: {e}")
                                continue

                elapsed = time.time() - start_time
                print(f"[AI Service] 🎉 流式响应完成")
                print(f"[AI Service]   - 响应内容长度: {len(content_buffer)} 字符")
                print(f"[AI Service]   - 思考内容长度: {len(thinking_buffer)} 字符")
                print(f"[AI Service]   - 接收块数: {chunk_count}")
                print(f"[AI Service]   - 耗时: {elapsed:.2f}s")
                print(f"[AI Service] ═══ LLM 调用结束 ═══")
                print(f"{'='*60}\n")
                
                if not response_received:
                    yield {
                        "type": "content",
                        "content": "错误：未收到任何响应数据"
                    }
                    print(f"[AI Service] ERROR 错误: 未收到任何响应数据")
                    
    except httpx.TimeoutException:
        elapsed = time.time() - start_time
        yield {
            "type": "content",
            "content": "错误：请求超时，请稍后重试"
        }
        print(f"[AI Service] ERROR 错误: 请求超时")
        print(f"[AI Service] ═══ LLM 调用结束 ═══ 耗时: {elapsed:.2f}s")
        print(f"{'='*60}\n")
    except httpx.ConnectError:
        elapsed = time.time() - start_time
        yield {
            "type": "content",
            "content": "错误：无法连接到服务器，请检查网络连接或API配置"
        }
        print(f"[AI Service] ERROR 错误: 无法连接到服务器")
        print(f"[AI Service] ═══ LLM 调用结束 ═══ 耗时: {elapsed:.2f}s")
        print(f"{'='*60}\n")
    except httpx.ProtocolError as e:
        elapsed = time.time() - start_time
        yield {
            "type": "content",
            "content": f"错误：网络协议错误: {str(e)}"
        }
        print(f"[AI Service] ERROR 错误: 网络协议错误 - {e}")
        print(f"[AI Service] ═══ LLM 调用结束 ═══ 耗时: {elapsed:.2f}s")
        print(f"{'='*60}\n")
    except Exception as e:
        elapsed = time.time() - start_time
        yield {
            "type": "content",
            "content": f"错误：{str(e)}"
        }
        print(f"[AI Service] ERROR 未知错误: {e}")
        print(f"[AI Service] ═══ LLM 调用结束 ═══ 耗时: {elapsed:.2f}s")
        print(f"{'='*60}\n")


async def call_ai_service(
    prompt: str,
    system_prompt: str = "",
    model_config: Optional[Dict[str, Any]] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    use_cache: bool = True,
    history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    from services.ai_cache import ai_cache, circuit_breaker, CircuitBreakerOpen
    
    global active_model

    print(f"[AI Service] call_ai_service 调用开始")
    print(f"[AI Service] 提示词长度: {len(prompt)}, 系统提示词长度: {len(system_prompt) if system_prompt else 0}")

    if model_config is None:
        _, get_current_model_config = _get_model_config()
        model_config = get_current_model_config()

    if not model_config:
        model_config = {
            "id": "minimax-m2.5",
            "protocol": "openai",
            "supports_multimodal": True
        }

    active_model = model_config["id"]
    model_id = model_config["id"]
    print(f"[AI Service] 使用模型: {model_id}")

    if use_cache:
        cached = ai_cache.get(prompt, model_id)
        if cached:
            print(f"[AI Service] OK 命中缓存: {model_id}")
            return {
                "success": True,
                "content": cached,
                "model": model_id,
                "cached": True
            }
        print(f"[AI Service] 缓存未命中")

    try:
        print(f"[AI Service] 通过熔断器调用 _raw_call_ai_service")
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
            print(f"[AI Service] 结果已缓存")

        print(f"[AI Service] call_ai_service 调用成功")
        return result

    except CircuitBreakerOpen:
        print(f"[AI Service] FAIL 熔断器打开，拒绝请求")
        return {
            "success": False,
            "error": "Circuit breaker open",
            "content": "抱歉，AI 服务暂时不可用，请稍后重试",
            "circuit_breaker": True
        }
    except httpx.TimeoutException:
        print(f"[AI Service] FAIL 请求超时")
        return {
            "success": False,
            "error": "Request timeout",
            "content": "抱歉，AI 请求超时了，请稍后重试"
        }
    except Exception as e:
        print(f"[AI Service] FAIL 调用失败: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "content": f"抱歉，AI 服务暂时不可用: {str(e)}"
        }


async def analyze_intent(message: str, model_config: Optional[Dict] = None) -> Dict[str, Any]:
    print(f"\n[AI Service] ═══ 意图分析开始 ═══")
    print(f"[AI Service] 待分析消息: {message[:50]}...")

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

    print(f"[AI Service] 调用 call_ai_service 进行意图分析")
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
                print(f"[AI Service] OK 意图分析成功: {intent_data.get('intent')}")
                print(f"[AI Service] 建议工具: {intent_data.get('suggested_tools')}")
                print(f"[AI Service] ═══ 意图分析结束 ═══\n")
                return {
                    "intent": intent_data.get("intent", "general_chat"),
                    "needs_clarification": intent_data.get("needs_clarification", False),
                    "reasoning": intent_data.get("reasoning", ""),
                    "suggested_tools": intent_data.get("suggested_tools", []),
                    "task_breakdown": intent_data.get("task_breakdown", [])
                }
        except json.JSONDecodeError:
            print(f"[AI Service] FAIL 意图分析JSON解析失败")

    print(f"[AI Service] 使用默认意图: general_chat")
    print(f"[AI Service] ═══ 意图分析结束 ═══\n")
    return {
        "intent": "general_chat",
        "needs_clarification": False,
        "reasoning": "默认意图",
        "suggested_tools": [],
        "task_breakdown": []
    }


def build_system_prompt(mode: str = "hybrid", skills_info: str = "") -> str:
    base_prompt = ""
    if mode == "agent":
        base_prompt = """你是一个友好、专业的AI助手，名字叫小M。请直接回答用户的问题。"""
    elif mode == "knowledge":
        base_prompt = """你是一个智能的知识库助手，专门用于搜索和展示知识库中的内容。"""
    else:
        base_prompt = """你是一个友好、专业的AI助手，名字叫小M。用户跟你对话时，保持友好、专业的态度。"""

    if skills_info:
        base_prompt = f"""{base_prompt}

可用技能（渐进式披露）：
{skills_info}

当你需要使用某个技能时，请告诉用户你正在使用该技能。"""

    return base_prompt


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
    print(f"\n{'='*60}")
    print(f"[AI Service] ═══ process_chat_message 开始 ═══")
    print(f"[AI Service] 消息: {message[:80]}{'...' if len(message) > 80 else ''}")
    print(f"[AI Service] 模式: {mode}, session: {session_id}, group_id: {group_id}")

    if model_config is None:
        _, get_current_model_config = _get_model_config()
        model_config = get_current_model_config()
        print(f"[AI Service] 使用默认模型配置")

    recent_history = []
    if session_id:
        recent_history = await get_recent_messages(session_id, limit=10)
        print(f"[AI Service] 已加载 {len(recent_history)} 条历史消息")

    if mode == "knowledge":
        print(f"\n[AI Service] ══ 模式: knowledge - 知识库检索 ══")
        from skills.skills_router import search_knowledge_base
        print(f"[AI Service] 调用 search_knowledge_base, 查询: {message[:50]}...")
        kb_result = await search_knowledge_base(message, max_results=10, group_id=group_id)
        if kb_result.get("success") and kb_result.get("results"):
            kb_content = "📚 知识库检索结果:\n\n"
            for i, r in enumerate(kb_result["results"], 1):
                content_preview = r.get("content", "")[:150]
                kb_content += f"{i}. **{r['file']}**\n   {content_preview}...\n\n"
            print(f"[AI Service] OK 知识库检索成功: {len(kb_result['results'])} 条结果")
            print(f"[AI Service] ═══ process_chat_message 结束 ═══")
            print(f"{'='*60}\n")
            return {
                "type": "knowledge",
                "content": kb_content,
                "intent": "knowledge_search",
                "tools": ["search_knowledge_base"],
                "group_id": group_id
            }
        else:
            print(f"[AI Service] FAIL 知识库检索无结果")
            print(f"[AI Service] ═══ process_chat_message 结束 ═══")
            print(f"{'='*60}\n")
            return {
                "type": "knowledge",
                "content": "🔍 在知识库中没有找到相关内容。\n\n可以尝试：\n- 使用不同的关键词搜索\n- 选择其他知识库分组\n- 切换到AI模式直接提问",
                "intent": "knowledge_search",
                "tools": ["search_knowledge_base"],
                "group_id": group_id
            }

    if mode == "ai":
        print(f"\n[AI Service] ══ 模式: ai - 直接LLM调用 ══")
        ai_result = await call_ai_service(
            prompt=message,
            system_prompt=build_system_prompt(mode),
            model_config=model_config,
            history=recent_history
        )
        print(f"[AI Service] OK LLM调用完成, 响应长度: {len(ai_result.get('content', ''))}")
        print(f"[AI Service] ═══ process_chat_message 结束 ═══")
        print(f"{'='*60}\n")
        return {
            "type": "text",
            "content": ai_result.get("content", "抱歉，我没有收到有效的回复。"),
            "intent": "ai_response",
            "tools": []
        }

    if mode == "hybrid":
        print(f"\n[AI Service] TOOL HYBRID 模式 - 渐进式技能匹配与执行")

        # Step 1: 意图分析
        intent_result = None
        intent = "general_chat"
        try:
            intent_result = await analyze_intent(message, model_config)
            intent = intent_result["intent"]
            print(f"[AI Service] 意图分析结果: {intent}")
        except Exception as e:
            print(f"[AI Service] 意图分析失败: {e}，使用默认意图")
            intent = "general_chat"

        # Step 2: 使用渐进式执行器
        try:
            from skills.progressive_executor import progressive_executor
            
            skill_result = await progressive_executor.progressive_execute(
                message, 
                recent_history, 
                intent
            )
            
            print(f"[AI Service] 渐进式执行结果: tier={skill_result.get('tier')}, confidence={skill_result.get('confidence', 0):.2f}")
            
            # 获取技能信息用于系统提示词
            skills_info = ""
            from skills.skill_manager import skill_manager
            enabled_skills = skill_manager.get_enabled_skills_tier1()
            if enabled_skills:
                skills_lines = []
                for skill in enabled_skills:
                    tier_label = "🌱" if skill.get("tier", 1) == 1 else "🌿" if skill.get("tier", 1) == 2 else "🌳"
                    skills_lines.append(f"- {tier_label} [{skill.get('name')}] {skill.get('description', '')}")
                skills_info = "\n".join(skills_lines)

            system_prompt = build_system_prompt(mode, skills_info)
            
            # 如果有技能执行结果，注入到提示词
            if skill_result.get("success") and skill_result.get("action") == "executed":
                skill_context = f"\n\n⚡ 技能执行结果:\n"
                if "tool_results" in skill_result:
                    for tr in skill_result["tool_results"]:
                        skill_context += f"- **{tr['tool']}**: {tr['result']}\n"
                elif "result" in skill_result:
                    skill_context += f"- **{skill_result['skill_name']}**: {skill_result['result'].get('content', '')[:200]}...\n"
                
                system_prompt = f"{system_prompt}{skill_context}\n\n请根据上述技能执行结果，整合信息回答用户问题。"
                print(f"[AI Service] 已注入技能执行结果")
            
            # Step 3: 调用 LLM 整合响应
            ai_result = await call_ai_service(
                prompt=message,
                system_prompt=system_prompt,
                model_config=model_config,
                history=recent_history
            )
            
            print(f"[AI Service] OK LLM调用完成, 响应长度: {len(ai_result.get('content', ''))}")
            print(f"[AI Service] ═══ process_chat_message 结束 ═══")
            print(f"{'='*60}\n")
            
            return {
                "type": "text",
                "content": ai_result.get("content", "抱歉，我没有收到有效的回复。"),
                "intent": intent,
                "skills_used": [skill_result.get("skill_id")] if skill_result.get("skill_id") else [],
                "confidence": skill_result.get("confidence", 0),
                "tier": skill_result.get("tier", 1)
            }
            
        except Exception as e:
            print(f"[AI Service] 渐进式执行失败: {e}，回退到传统模式")
            
            # 回退到传统混合模式
            skills_info = ""
            try:
                from skills.skill_manager import skill_manager
                enabled_skills = skill_manager.get_enabled_skills_tier1()
                if enabled_skills:
                    skills_lines = []
                    for skill in enabled_skills:
                        tier_label = "🌱" if skill.get("tier", 1) == 1 else "🌿" if skill.get("tier", 1) == 2 else "🌳"
                        skills_lines.append(f"- {tier_label} [{skill.get('name')}] {skill.get('description', '')}")
                    skills_info = "\n".join(skills_lines)
                    print(f"[AI Service] 已启用技能数量: {len(enabled_skills)}")
            except Exception as e:
                print(f"[AI Service] 获取技能信息失败: {e}")

            from skills.tools_registry import tool_registry
            from skills.skills_router import execute_tool

            matched_tools = tool_registry.match_tools(message)
            print(f"[AI Service] 匹配的工具: {matched_tools}")

            tool_results = []
            used_tools = []

            for tool_name, confidence, params in matched_tools:
                if confidence >= 0.3:
                    print(f"[AI Service] TOOL 执行工具: {tool_name} (置信度: {confidence:.2f})")
                    tool_result = await execute_tool(tool_name, params, {})
                    if tool_result.get("success"):
                        tool_results.append({"tool": tool_name, "confidence": confidence, "result": tool_result.get("result", tool_result)})
                        used_tools.append(tool_name)
                        print(f"[AI Service] OK 工具执行成功: {tool_name}")

            system_prompt = build_system_prompt(mode, skills_info)
            if tool_results:
                tool_context = "\n\n工具执行结果:\n"
                for tr in tool_results:
                    tool_context += f"- **{tr['tool']}**: {tr['result']}\n"
                system_prompt = f"{system_prompt}{tool_context}\n\n请根据上述工具执行结果，整合信息回答用户问题。如果工具执行失败，请直接回答用户问题。"
                print(f"[AI Service] 已将 {len(tool_results)} 个工具结果注入提示词")

            print(f"[AI Service] TOOL 调用 LLM 整合工具结果")
            ai_result = await call_ai_service(
                prompt=message,
                system_prompt=system_prompt,
                model_config=model_config,
                history=recent_history
            )
            print(f"[AI Service] OK LLM调用完成, 响应长度: {len(ai_result.get('content', ''))}")
            print(f"[AI Service] ═══ process_chat_message 结束 ═══")
            print(f"{'='*60}\n")
            return {
                "type": "text",
                "content": ai_result.get("content", "抱歉，我没有收到有效的回复。"),
                "intent": "hybrid_response",
                "tools": used_tools
            }

    print(f"\n[AI Service] ══ 模式: default - fallback ══")
    ai_result = await call_ai_service(
        prompt=message,
        system_prompt=build_system_prompt("ai"),
        model_config=model_config,
        history=recent_history
    )
    print(f"[AI Service] OK LLM调用完成")
    print(f"[AI Service] ═══ process_chat_message 结束 ═══")
    print(f"{'='*60}\n")
    return {
        "type": "text",
        "content": ai_result.get("content", "抱歉，我没有收到有效的回复。"),
        "intent": "default_response",
        "tools": []
    }