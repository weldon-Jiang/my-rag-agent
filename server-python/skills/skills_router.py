from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import json
from pathlib import Path

from .tools import TOOL_DEFINITIONS, CAPABILITY_TOOLS, match_tools_by_capability

router = APIRouter()

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge"


class ToolExecuteRequest(BaseModel):
    tool: str
    args: Dict[str, Any] = {}
    context: Optional[Dict[str, Any]] = None


async def execute_tool(tool_name: str, args: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
    print(f"[Skills Router] 执行工具: {tool_name}, 参数: {args}")

    try:
        if tool_name == "search_knowledge_base":
            return await search_knowledge_base(args.get("query", ""), args.get("max_results", 5))
        elif tool_name == "get_weather":
            return await get_weather(args.get("city", ""))
        elif tool_name == "get_location":
            return await get_location(args.get("location", ""))
        elif tool_name == "web_search":
            return await web_search(args.get("query", ""), args.get("max_results", 5))
        elif tool_name == "python":
            return {"success": False, "error": "Python执行已在Agent模式中实现"}
        elif tool_name == "read_file":
            return await read_file(args.get("path", ""))
        elif tool_name == "write_file":
            return await write_file(args.get("path", ""), args.get("content", ""), args.get("append", False))
        elif tool_name == "recognize_image":
            return {"success": False, "error": "图片识别功能开发中"}
        elif tool_name == "extract_pdf_text":
            return {"success": False, "error": "PDF解析功能开发中"}
        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}
    except Exception as e:
        print(f"[Skills Router] 工具执行失败: {tool_name} - {str(e)}")
        return {"success": False, "error": str(e)}


async def search_knowledge_base(query: str, max_results: int = 5, group_id: str = None) -> Dict[str, Any]:
    print(f"[Skills Router] 知识库搜索: {query}, group_id: {group_id}")

    try:
        from services.vector_store import semantic_search, init_vector_store, get_index_stats, index_knowledge_base

        init_vector_store()
        stats = get_index_stats()

        if stats.get("success") and stats.get("total_chunks", 0) > 0:
            print(f"[Skills Router] 使用语义搜索，当前索引: {stats['total_chunks']} 个文本块")
            semantic_results = await semantic_search(query, top_k=max_results, group_id=group_id)

            if semantic_results:
                results = []
                seen_files = set()
                for r in semantic_results:
                    metadata = r.get("metadata", {})
                    file_name = metadata.get("file", "unknown")
                    if file_name not in seen_files:
                        seen_files.add(file_name)
                        results.append({
                            "file": file_name,
                            "path": metadata.get("path", ""),
                            "type": "file",
                            "content": r.get("content", "")[:200],
                            "relevance_score": 1.0 - r.get("distance", 0),
                            "group_id": metadata.get("group_id")
                        })
                return {
                    "success": True,
                    "results": results,
                    "skill": "knowledge_base",
                    "query": query,
                    "search_type": "semantic",
                    "group_id": group_id
                }
            else:
                return {
                    "success": True,
                    "results": [],
                    "skill": "knowledge_base",
                    "query": query,
                    "search_type": "semantic",
                    "message": "未找到相关内容",
                    "group_id": group_id
                }

        from services.knowledge_db import get_files_by_group
        search_group = group_id if group_id else 'ALL'
        files = get_files_by_group(search_group)
        if not files:
            files = [{"filename": f.name, "file_path": str(f)} for f in KNOWLEDGE_DIR.glob("*") if f.is_file() and f.suffix in ['.txt', '.md']]

        print("[Skills Router] 回退到关键词搜索")
        results = []
        for f in files:
            file_path = Path(f['file_path'])
            if file_path.exists() and file_path.suffix in ['.txt', '.md']:
                try:
                    content = file_path.read_text(encoding='utf-8')
                    if query.lower() in content.lower():
                        results.append({
                            "file": file_path.name,
                            "path": str(file_path),
                            "type": "file",
                            "content": content[:200]
                        })
                        if len(results) >= max_results:
                            break
                except Exception as e:
                    print(f"[Skills Router] 读取文件失败: {file_path.name} - {e}")

        return {
            "success": True,
            "results": results,
            "skill": "knowledge_base",
            "query": query,
            "search_type": "keyword",
            "group_id": group_id
        }
    except Exception as e:
        print(f"[Skills Router] 知识库搜索失败: {str(e)}")
        return {"success": False, "error": str(e)}


async def get_weather(city: str) -> Dict[str, Any]:
    print(f"[Skills Router] 天气查询: {city}")
    return {
        "success": True,
        "weather": f"{city}的天气晴，温度25度",
        "city": city
    }


async def get_location(location: str) -> Dict[str, Any]:
    print(f"[Skills Router] 位置查询: {location}")
    return {
        "success": True,
        "location": location,
        "info": f"{location}位于地球上的某个位置"
    }


async def web_search(query: str, max_results: int = 5) -> Dict[str, Any]:
    print(f"[Skills Router] Web搜索: {query}")
    return {
        "success": True,
        "results": [f"搜索结果{i+1}: 关于{query}的信息" for i in range(min(max_results, 3))],
        "query": query
    }


async def read_file(path: str) -> Dict[str, Any]:
    print(f"[Skills Router] 读取文件: {path}")
    try:
        file_path = Path(path)
        if not file_path.exists():
            return {"success": False, "error": f"文件不存在: {path}"}
        content = file_path.read_text(encoding='utf-8')
        return {"success": True, "content": content[:1000], "path": path}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def write_file(path: str, content: str, append: bool = False) -> Dict[str, Any]:
    print(f"[Skills Router] 写入文件: {path}, append={append}")
    try:
        file_path = Path(path)
        mode = "a" if append else "w"
        file_path.write_text(content, encoding='utf-8')
        return {"success": True, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def execute_tool_endpoint(request: ToolExecuteRequest):
    result = await execute_tool(request.tool, request.args, request.context)
    return result


def get_skills() -> Dict[str, Any]:
    skills_list = [
        {"name": "知识库检索", "description": "搜索本地知识库中的文档内容", "category": "knowledge", "tools": ["search_knowledge_base"]},
        {"name": "Web搜索", "description": "通过搜索引擎在互联网上搜索信息", "category": "search", "tools": ["web_search"]},
        {"name": "天气查询", "description": "查询指定城市的天气信息", "category": "info", "tools": ["get_weather"]},
        {"name": "位置查询", "description": "查询省、市、区、县等行政区划信息", "category": "info", "tools": ["get_location"]},
        {"name": "图片识别", "description": "使用 OCR 识别图片中的文字内容", "category": "file", "tools": ["recognize_image"]},
        {"name": "PDF解析", "description": "提取 PDF 文档的文本内容", "category": "file", "tools": ["extract_pdf_text"]},
        {"name": "代码执行", "description": "在沙盒环境中执行 Python 代码", "category": "system", "tools": ["python"]},
        {"name": "命令执行", "description": "在沙盒环境中执行 Shell 命令", "category": "system", "tools": ["bash"]},
        {"name": "文件读取", "description": "读取文本文件的内容", "category": "file", "tools": ["read_file"]},
        {"name": "文件写入", "description": "创建新文件或追加内容到已有文件", "category": "file", "tools": ["write_file"]},
    ]

    skills_by_category = {
        "knowledge": [{"name": "知识库检索", "tools": ["search_knowledge_base"]}],
        "search": [{"name": "Web搜索", "tools": ["web_search"]}],
        "info": [
            {"name": "天气查询", "tools": ["get_weather"]},
            {"name": "位置查询", "tools": ["get_location"]}
        ],
        "file": [
            {"name": "图片识别", "tools": ["recognize_image"]},
            {"name": "PDF解析", "tools": ["extract_pdf_text"]},
            {"name": "文件读取", "tools": ["read_file"]},
            {"name": "文件写入", "tools": ["write_file"]}
        ],
        "system": [
            {"name": "代码执行", "tools": ["python"]},
            {"name": "命令执行", "tools": ["bash"]}
        ]
    }

    tools_with_descriptions = {}
    for tool in TOOL_DEFINITIONS:
        tool_name = tool["function"]["name"]
        tool_desc = tool["function"]["description"]
        tools_with_descriptions[tool_name] = tool_desc

    return {
        "success": True,
        "skills": skills_list,
        "skillsByCategory": skills_by_category,
        "toolsWithDescriptions": tools_with_descriptions,
        "supportedExtensions": [".txt", ".md", ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"]
    }


@router.get("/")
async def get_skills_endpoint():
    return get_skills()


@router.get("/tools")
async def get_tools():
    return {
        "success": True,
        "tools": TOOL_DEFINITIONS,
        "capabilities": CAPABILITY_TOOLS
    }


@router.get("/tools/{tool_name}")
async def get_tool(tool_name: str):
    for tool in TOOL_DEFINITIONS:
        if tool["function"]["name"] == tool_name:
            return {"success": True, "tool": tool}
    raise HTTPException(status_code=404, detail=f"Tool not found: {tool_name}")


@router.post("/execute")
async def execute_tool_api(request: ToolExecuteRequest):
    result = await execute_tool(request.tool, request.args, request.context)
    return result
