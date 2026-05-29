#!/usr/bin/env python3
"""
远程技能市场服务器示例

这是一个简单的远程技能市场服务器，可以独立部署。
提供技能文件的下载服务，支持远程安装。

启动方式:
    python remote_marketplace_server.py

部署说明:
    1. 将 skills 目录下的技能推送到此服务器
    2. 配置远程市场 URL 为: http://your-server:port
    3. 客户端即可从远程安装技能
"""

import json
import zipfile
import io
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Remote Skill Marketplace")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MARKETPLACE_DIR = Path(__file__).parent / "marketplace_skills"


@dataclass
class SkillInfo:
    id: str
    name: str
    description: str
    version: str
    author: str
    category: str
    tier: int
    tags: list
    tools: list


def parse_skill_md(skill_path: Path) -> Optional[Dict[str, Any]]:
    """解析 SKILL.md 文件"""
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return None

    content = skill_md.read_text(encoding="utf-8")
    metadata = {}
    body = []

    in_frontmatter = False
    for line in content.split("\n"):
        if line.strip() == "---":
            if not in_frontmatter:
                in_frontmatter = True
                continue
            else:
                in_frontmatter = False
                continue

        if in_frontmatter:
            if ":" in line:
                key, value = line.split(":", 1)
                value = value.strip().strip("'\"")

                if key == "tags":
                    continue

                metadata[key] = value
        else:
            body.append(line)

    if "name" not in metadata:
        metadata["name"] = skill_path.name

    return {
        "metadata": metadata,
        "body": "\n".join(body)
    }


def get_all_skills() -> list:
    """获取所有技能列表"""
    skills = []

    if not MARKETPLACE_DIR.exists():
        return skills

    for skill_dir in MARKETPLACE_DIR.iterdir():
        if not skill_dir.is_dir():
            continue

        parsed = parse_skill_md(skill_dir)
        if not parsed:
            continue

        metadata = parsed["metadata"]
        skill_id = skill_dir.name

        skills.append({
            "id": skill_id,
            "name": metadata.get("name", skill_id),
            "description": metadata.get("description", ""),
            "version": metadata.get("version", "1.0.0"),
            "author": metadata.get("author", "unknown"),
            "category": metadata.get("category", "general"),
            "tier": int(metadata.get("tier", 1)),
            "tags": metadata.get("tags", "").strip("[]").replace("'", "").split(",") if metadata.get("tags") else [],
            "tools": metadata.get("tools", []),
            "installed": False
        })

    return skills


@app.get("/")
async def root():
    return {
        "name": "Remote Skill Marketplace",
        "version": "1.0.0",
        "description": "技能远程市场服务器"
    }


@app.get("/stats")
async def get_stats():
    """获取市场统计"""
    skills = get_all_skills()
    categories = {}
    for skill in skills:
        cat = skill.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "total": len(skills),
        "categories": categories
    }


@app.get("/skills")
async def list_skills():
    """获取所有技能列表"""
    skills = get_all_skills()
    return {
        "success": True,
        "skills": skills,
        "count": len(skills)
    }


@app.get("/skills/{skill_id}")
async def get_skill(skill_id: str):
    """获取单个技能的所有文件"""
    skill_dir = MARKETPLACE_DIR / skill_id

    if not skill_dir.exists():
        raise HTTPException(status_code=404, detail=f"Skill not found: {skill_id}")

    if not skill_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Not a skill directory: {skill_id}")

    files = {}
    for f in skill_dir.rglob("*"):
        if f.is_file():
            rel_path = f.relative_to(skill_dir)
            try:
                content = f.read_text(encoding="utf-8")
                files[str(rel_path)] = content
            except Exception:
                pass

    if not files:
        raise HTTPException(status_code=404, detail=f"No files found for skill: {skill_id}")

    return {
        "success": True,
        "skill_id": skill_id,
        "files": files
    }


@app.get("/skills/{skill_id}/download")
async def download_skill(skill_id: str):
    """下载技能为 ZIP 文件"""
    skill_dir = MARKETPLACE_DIR / skill_id

    if not skill_dir.exists() or not skill_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Skill not found: {skill_id}")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        for f in skill_dir.rglob("*"):
            if f.is_file():
                rel_path = f.relative_to(skill_dir)
                try:
                    content = f.read_text(encoding="utf-8")
                    zipf.writestr(str(rel_path), content)
                except Exception:
                    pass

    buffer.seek(0)

    from fastapi.responses import Response
    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={skill_id}.zip"}
    )


@app.get("/skills/{skill_id}/info")
async def get_skill_info(skill_id: str):
    """获取技能基本信息"""
    skill_dir = MARKETPLACE_DIR / skill_id

    if not skill_dir.exists():
        raise HTTPException(status_code=404, detail=f"Skill not found: {skill_id}")

    parsed = parse_skill_md(skill_dir)
    if not parsed:
        raise HTTPException(status_code=404, detail=f"Invalid skill: {skill_id}")

    metadata = parsed["metadata"]

    return {
        "success": True,
        "skill_id": skill_id,
        "name": metadata.get("name", skill_id),
        "description": metadata.get("description", ""),
        "version": metadata.get("version", "1.0.0"),
        "author": metadata.get("author", "unknown"),
        "category": metadata.get("category", "general"),
        "tier": int(metadata.get("tier", 1))
    }


@app.post("/skills")
async def publish_skill(skill_id: str, request: dict):
    """接收技能发布（可选）"""
    files = request.get("files", {})

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    skill_dir = MARKETPLACE_DIR / skill_id
    skill_dir.mkdir(parents=True, exist_ok=True)

    for filename, content in files.items():
        (skill_dir / filename).write_text(content, encoding="utf-8")

    return {
        "success": True,
        "message": f"Skill {skill_id} published successfully"
    }


if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Remote Skill Marketplace Server")
    print("=" * 60)
    print(f"Marketplace directory: {MARKETPLACE_DIR}")
    print()
    print("API Endpoints:")
    print("  GET  /                    - 服务器信息")
    print("  GET  /stats               - 市场统计")
    print("  GET  /skills              - 技能列表")
    print("  GET  /skills/{id}         - 获取技能文件")
    print("  GET  /skills/{id}/download - 下载技能 ZIP")
    print("  GET  /skills/{id}/info    - 技能信息")
    print("  POST /skills              - 发布技能")
    print()
    print("=" * 60)
    print()

    MARKETPLACE_DIR.mkdir(parents=True, exist_ok=True)

    uvicorn.run(app, host="0.0.0.0", port=8080)
