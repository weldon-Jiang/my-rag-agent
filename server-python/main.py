from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
import asyncio
import re

from config import PORT, HOST, KNOWLEDGE_DIR, TEMP_DIR, get_settings
from routers import chat, session, model, file
from routers.health import router as health_router
from skills import skills_router
from middleware.logging import log_requests, error_handler
from middleware.security import SecurityMiddleware, RateLimiter

print("[Server] 启动 Python FastAPI 服务...")

settings = get_settings()

PUBLIC_DIR = Path(__file__).parent.parent / "public"

app = FastAPI(
    title="MyRagAgent API",
    description="本地知识库智能体 Python 后端服务",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_limiter = RateLimiter(
    max_requests=settings.rate_limit_requests,
    window=settings.rate_limit_window
)
app.add_middleware(SecurityMiddleware, rate_limiter=rate_limiter)

app.middleware("http")(log_requests)
app.middleware("http")(error_handler)

app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(session.router, prefix="/api/chat/sessions", tags=["Session"])
app.include_router(model.router, prefix="/api/models", tags=["Model"])
app.include_router(file.router, prefix="/api/files", tags=["File"])
app.include_router(skills_router, prefix="/api/skills", tags=["Skills"])
app.include_router(health_router, tags=["Health"])


@app.get("/")
async def root():
    index_path = PUBLIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "MyRagAgent API", "version": "1.0.0", "framework": "FastAPI"}


@app.get("/api/port")
async def get_port():
    return {"port": PORT}


@app.get("/api/health")
async def api_health():
    return {"status": "ok"}


@app.get("/api/skills")
async def get_skills():
    return {
        "success": True,
        "skills": [
            {"name": "天气查询", "description": "查询天气信息", "category": "info", "tools": ["weather_query"]},
            {"name": "知识库检索", "description": "搜索知识库", "category": "knowledge", "tools": ["knowledge_search"]},
            {"name": "Web搜索", "description": "搜索互联网", "category": "search", "tools": ["web_search"]},
        ],
        "skillsByCategory": {
            "info": [{"name": "天气查询", "tools": ["weather_query"]}],
            "knowledge": [{"name": "知识库检索", "tools": ["knowledge_search"]}],
            "search": [{"name": "Web搜索", "tools": ["web_search"]}],
        },
        "toolsWithDescriptions": {
            "weather_query": "查询指定城市的天气信息",
            "knowledge_search": "搜索知识库中的相关内容",
            "web_search": "搜索互联网上的信息",
        },
        "supportedExtensions": [".txt", ".md", ".pdf", ".jpg", ".jpeg", ".png"]
    }


@app.post("/api/skills/process")
async def process_skill(request: Request):
    body = await request.json()
    return {"success": True, "result": "Skill processing not fully implemented in Python version"}


@app.post("/api/skills/process-multiple")
async def process_multiple_skills(request: Request):
    body = await request.json()
    return {"success": True, "result": "Batch processing not fully implemented in Python version"}


@app.get("/api/knowledge/index-status")
async def get_index_status():
    from services.vector_store import get_index_stats, init_vector_store
    init_vector_store()
    stats = get_index_stats()
    return stats


_reindex_status = {"running": False, "progress": "", "result": None}

@app.post("/api/knowledge/reindex")
async def reindex_knowledge(background_tasks: BackgroundTasks, group_id: str = None):
    if _reindex_status["running"]:
        return {"success": False, "error": "索引任务正在进行中"}

    def do_reindex():
        from services.vector_store import index_knowledge_base, init_vector_store
        _reindex_status["running"] = True
        _reindex_status["progress"] = "正在初始化..."
        init_vector_store()
        _reindex_status["progress"] = "正在索引文件..."
        result = asyncio.run(index_knowledge_base(group_id))
        _reindex_status["running"] = False
        _reindex_status["result"] = result
        _reindex_status["progress"] = "完成"

    background_tasks.add_task(do_reindex)
    return {"success": True, "message": "索引任务已在后台启动"}


@app.get("/api/knowledge/reindex-status")
async def get_reindex_status():
    return {
        "running": _reindex_status["running"],
        "progress": _reindex_status["progress"],
        "result": _reindex_status["result"]
    }


@app.get("/api/knowledge/groups")
async def get_groups():
    from services.knowledge_db import get_all_groups, get_group_file_count
    groups = get_all_groups()
    for g in groups:
        g['file_count'] = get_group_file_count(g['id'])
    return {"success": True, "groups": groups}


@app.post("/api/knowledge/groups")
async def create_group(request: Request):
    from services.knowledge_db import create_group
    body = await request.json()
    group = create_group(body.get('name', ''), body.get('description'))
    return {"success": True, "group": group}


@app.put("/api/knowledge/groups/{group_id}")
async def update_group(group_id: str, request: Request):
    from services.knowledge_db import update_group, get_group
    body = await request.json()
    update_group(group_id, body.get('name'), body.get('description'))
    group = get_group(group_id)
    return {"success": True, "group": group}


@app.delete("/api/knowledge/groups/{group_id}")
async def delete_group(group_id: str):
    from services.knowledge_db import delete_group
    delete_group(group_id)
    return {"success": True}


@app.get("/api/knowledge/groups/{group_id}/files")
async def get_group_files(group_id: str):
    from services.knowledge_db import get_files_by_group
    files = get_files_by_group(group_id)
    return files


SPA_PATHS = ['chat', 'knowledge', 'skill-tools', 'models', 'pages', 'router', 'utils', 'styles', 'components', 'images', 'icons', 'fonts', 'css', 'js']

@app.get("/{path:path}")
async def serve_spa_fallback(path: str):
    if path.startswith("api/"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    file_path = PUBLIC_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))

    index_path = PUBLIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return JSONResponse({"message": "Not found"}, status_code=404)


def cleanup_temp_files():
    """清理临时文件夹"""
    try:
        if not os.path.exists(TEMP_DIR):
            return

        now = os.path.getmtime(TEMP_DIR)
        max_age = 30 * 60

        for filename in os.listdir(TEMP_DIR):
            filepath = os.path.join(TEMP_DIR, filename)
            if os.path.isfile(filepath):
                file_age = now - os.path.getmtime(filepath)
                if file_age > max_age:
                    try:
                        os.remove(filepath)
                        print(f"[Server] 删除临时文件: {filename}")
                    except Exception as e:
                        print(f"[Server] 删除文件失败: {filename} - {e}")
    except Exception as e:
        print(f"[Server] 清理临时文件失败: {e}")


@app.on_event("startup")
async def startup_event():
    print(f"[Server] Python FastAPI 服务已启动")
    print(f"[Server] 端口: {PORT}")
    print(f"[Server] 知识库目录: {KNOWLEDGE_DIR}")
    cleanup_temp_files()


@app.on_event("shutdown")
async def shutdown_event():
    print("[Server] 关闭 Python FastAPI 服务...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
