"""
技能管理 API 路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from skills.skill_manager import skill_manager, Skill, MARKETPLACE_DIR, SKILLS_DIR
from skills.marketplace import SkillMarketplace
from routers.model import load_settings

router = APIRouter(prefix="/api/skills", tags=["skills"])


class SkillInstallRequest(BaseModel):
    skill_id: str
    source: Optional[str] = "marketplace"


class SkillEnableRequest(BaseModel):
    skill_id: str
    enabled: bool


class SkillQuery(BaseModel):
    query: str
    tier: Optional[int] = None
    category: Optional[str] = None


class SkillCreateRequest(BaseModel):
    """创建技能请求"""
    skill_id: str
    name: str
    description: str
    version: Optional[str] = "1.0.0"
    author: Optional[str] = "unknown"
    tier: Optional[int] = 1
    category: Optional[str] = "general"
    tags: Optional[List[str]] = []
    instructions: str = ""
    examples: Optional[List[str]] = []
    guidelines: Optional[List[str]] = []


@router.get("/")
async def list_skills():
    """获取所有已安装技能"""
    skills = skill_manager.list_skills(installed_only=True)
    return {
        "success": True,
        "skills": [s.to_dict() for s in skills]
    }


@router.get("/marketplace")
async def get_marketplace(remote: bool = False):
    """获取技能市场列表"""
    marketplace_skills = SkillMarketplace.get_marketplace_skills(force_remote=remote)
    return {
        "success": True,
        "skills": marketplace_skills
    }


@router.get("/marketplace/search")
async def search_marketplace(q: str = "", remote: bool = False):
    """搜索市场技能"""
    if not q:
        return {"success": True, "skills": []}
    skills = SkillMarketplace.search_marketplace(q, force_remote=remote)
    return {
        "success": True,
        "skills": skills,
        "count": len(skills)
    }


@router.get("/remote/status")
async def get_remote_status():
    """获取远程市场状态"""
    result = SkillMarketplace.check_remote_updates()
    settings = load_settings()
    remote_url = settings.get("remote_marketplace_url", "")
    return {
        "success": True,
        "remote_url": remote_url,
        "connected": result is not None,
        "stats": result
    }


@router.post("/remote/config")
async def set_remote_marketplace(body: dict):
    """设置远程市场URL"""
    url = body.get("url", "")
    success = SkillMarketplace.set_remote_marketplace(url)
    if success:
        return {"success": True, "message": "远程市场已设置"}
    return {"success": False, "error": "设置失败"}


@router.get("/ai/discover")
async def get_skills_for_ai():
    """获取所有已启用技能的信息（用于 AI 发现和选择）"""
    skills = skill_manager.get_enabled_skills_tier1()
    return {
        "success": True,
        "skills": skills,
        "count": len(skills)
    }


@router.get("/categories")
async def get_categories():
    """获取所有技能分类"""
    skills = skill_manager.list_skills(installed_only=True)
    categories = set(s.category for s in skills)
    return {
        "success": True,
        "categories": list(categories)
    }


@router.get("/stats")
async def get_stats():
    """获取技能统计信息"""
    all_skills = skill_manager.list_skills(installed_only=True)
    enabled_skills = [s for s in all_skills if s.enabled]
    marketplace_skills = SkillMarketplace.get_marketplace_skills()
    installed_ids = [s["id"] for s in marketplace_skills if s.get("installed")]

    return {
        "success": True,
        "stats": {
            "total_installed": len(all_skills),
            "total_enabled": len(enabled_skills),
            "total_marketplace": len(marketplace_skills),
            "total_installed_from_marketplace": len(installed_ids)
        }
    }


@router.post("/install")
async def install_skill(request: SkillInstallRequest):
    """安装技能"""
    skill_id = request.skill_id

    if request.source == "remote":
        success = SkillMarketplace.install_from_marketplace(skill_id, request.source)
        if not success:
            raise HTTPException(status_code=400, detail="安装失败，技能可能已安装或不存在")
    elif request.source in ("marketplace", "local"):
        success = SkillMarketplace.install_from_marketplace(skill_id, request.source)
        if not success:
            raise HTTPException(status_code=400, detail="安装失败，技能可能已安装或不存在")
    else:
        raise HTTPException(status_code=400, detail="不支持的安装来源")

    return {
        "success": True,
        "message": f"技能 {skill_id} 已安装"
    }


# 异步安装状态跟踪
install_status = {}


@router.post("/install/async")
async def install_skill_async(request: SkillInstallRequest):
    """异步安装技能"""
    skill_id = request.skill_id
    source = request.source

    if skill_id in install_status and install_status[skill_id]["status"] == "installing":
        return {
            "success": True,
            "message": "技能正在安装中",
            "skill_id": skill_id,
            "status": "installing"
        }

    install_status[skill_id] = {
        "status": "installing",
        "progress": 0,
        "message": "开始安装..."
    }

    async def do_install():
        try:
            install_status[skill_id]["progress"] = 25
            install_status[skill_id]["message"] = "正在下载技能..."

            if source == "remote":
                success = SkillMarketplace.install_from_marketplace(skill_id, source)
            elif source in ("marketplace", "local"):
                success = SkillMarketplace.install_from_marketplace(skill_id, source)
            else:
                install_status[skill_id]["status"] = "failed"
                install_status[skill_id]["message"] = "不支持的安装来源"
                return

            install_status[skill_id]["progress"] = 75
            install_status[skill_id]["message"] = "正在注册技能..."

            if success:
                install_status[skill_id]["status"] = "completed"
                install_status[skill_id]["progress"] = 100
                install_status[skill_id]["message"] = "安装成功"
            else:
                install_status[skill_id]["status"] = "failed"
                install_status[skill_id]["message"] = "安装失败，技能可能已安装或不存在"
        except Exception as e:
            install_status[skill_id]["status"] = "failed"
            install_status[skill_id]["message"] = f"安装失败: {str(e)}"

    import asyncio
    asyncio.create_task(do_install())

    return {
        "success": True,
        "message": "安装任务已创建",
        "skill_id": skill_id,
        "status": "installing"
    }


@router.get("/install/status/{skill_id}")
async def get_install_status(skill_id: str):
    """获取技能安装状态"""
    if skill_id not in install_status:
        return {
            "success": False,
            "message": "未找到安装任务"
        }

    status = install_status[skill_id]
    return {
        "success": True,
        "skill_id": skill_id,
        "status": status["status"],
        "progress": status["progress"],
        "message": status["message"]
    }


@router.post("/enable")
async def enable_skill(request: SkillEnableRequest):
    """启用/禁用技能"""
    if request.enabled:
        success = skill_manager.enable_skill(request.skill_id)
    else:
        success = skill_manager.disable_skill(request.skill_id)

    if not success:
        raise HTTPException(status_code=404, detail="技能不存在")

    return {
        "success": True,
        "message": f"技能 {request.skill_id} 已{'启用' if request.enabled else '禁用'}"
    }


@router.get("/{skill_id}")
async def get_skill(skill_id: str):
    """获取单个技能信息"""
    skill = skill_manager.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="技能不存在")

    return {
        "success": True,
        "skill": skill.to_dict()
    }


@router.get("/{skill_id}/tier1")
async def get_skill_tier1(skill_id: str):
    """获取技能 Tier 1 信息（发现阶段）"""
    tier1_info = skill_manager.get_skill_tier1(skill_id)
    if not tier1_info:
        raise HTTPException(status_code=404, detail="技能不存在")

    return {
        "success": True,
        "skill": tier1_info
    }


@router.get("/{skill_id}/full")
async def get_skill_full(skill_id: str, tier: Optional[int] = None):
    """获取技能完整信息（渐进式披露）"""
    full_info = skill_manager.get_skill_full(skill_id, tier)
    if not full_info:
        raise HTTPException(status_code=404, detail="技能不存在")

    return {
        "success": True,
        "skill": full_info
    }


@router.post("/{skill_id}/uninstall")
async def uninstall_skill(skill_id: str):
    """卸载技能"""
    success = skill_manager.uninstall_skill(skill_id)
    if not success:
        raise HTTPException(status_code=404, detail="技能不存在")

    SkillMarketplace.uninstall_from_marketplace(skill_id)

    return {
        "success": True,
        "message": f"技能 {skill_id} 已卸载"
    }


@router.post("/create")
async def create_skill(request: SkillCreateRequest):
    """创建新技能并自动注册"""
    import yaml
    from pathlib import Path

    skill_id = request.skill_id
    
    # 验证技能ID格式
    if not skill_id or not skill_id.replace("-", "").replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="技能ID只能包含字母、数字、连字符和下划线")

    # 检查技能是否已存在
    if skill_manager.get_skill(skill_id):
        raise HTTPException(status_code=400, detail=f"技能 {skill_id} 已存在")

    # 创建技能目录
    skill_dir = SKILLS_DIR / skill_id
    if skill_dir.exists():
        raise HTTPException(status_code=400, detail=f"技能目录 {skill_id} 已存在")
    skill_dir.mkdir(parents=True, exist_ok=True)

    # 构建 frontmatter
    frontmatter = {
        "name": request.name,
        "description": request.description,
        "version": request.version,
        "author": request.author,
        "tier": request.tier,
        "category": request.category,
        "tags": request.tags
    }

    # 构建 SKILL.md 内容
    md_content = "---\n"
    md_content += yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
    md_content += "---\n\n"
    md_content += f"# {request.name}\n\n"
    
    if request.instructions:
        md_content += f"{request.instructions}\n\n"
    
    if request.examples:
        md_content += "## Examples\n"
        for i, example in enumerate(request.examples, 1):
            md_content += f"- {example}\n"
        md_content += "\n"
    
    if request.guidelines:
        md_content += "## Guidelines\n"
        for guideline in request.guidelines:
            md_content += f"- {guideline}\n"

    # 写入 SKILL.md
    (skill_dir / "SKILL.md").write_text(md_content, encoding="utf-8")

    # 注册技能
    success = skill_manager.install_skill(skill_dir)
    if not success:
        # 清理创建的目录
        import shutil
        shutil.rmtree(skill_dir)
        raise HTTPException(status_code=500, detail="技能注册失败")

    # 刷新技能列表
    skill_manager.refresh_skills()

    return {
        "success": True,
        "message": f"技能 {skill_id} 创建成功并已注册",
        "skill_id": skill_id,
        "path": str(skill_dir)
    }
