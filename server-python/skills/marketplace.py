
"""
技能市场 - 支持本地市场、远程市场和技能发布
"""

import json
import yaml
import httpx
import re
import tempfile
import zipfile
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional

# 延迟导入避免循环依赖
_Skill = None
_parse_skill_md = None
_MARKETPLACE_DIR = None
_SKILLS_DIR = None

def _get_skill_manager():
    global _Skill, _parse_skill_md, _MARKETPLACE_DIR, _SKILLS_DIR
    if _Skill is None:
        from .skill_manager import Skill, parse_skill_md, MARKETPLACE_DIR, SKILLS_DIR
        _Skill = Skill
        _parse_skill_md = parse_skill_md
        _MARKETPLACE_DIR = MARKETPLACE_DIR
        _SKILLS_DIR = SKILLS_DIR
    return _Skill, _parse_skill_md, _MARKETPLACE_DIR, _SKILLS_DIR


def _get_settings():
    """延迟导入避免循环依赖"""
    from routers.model import load_settings, save_settings
    return load_settings, save_settings


class SkillMarketplace:
    """技能市场管理器"""

    REMOTE_MARKETPLACE_URL = "https://api.example.com/skills"  # 可配置的远程市场

    @staticmethod
    def get_marketplace_skills(force_remote: bool = False) -> List[Dict[str, Any]]:
        """获取市场技能列表（优先本地，支持远程）"""
        load_settings, _ = _get_settings()
        settings = load_settings()
        remote_url = settings.get("remote_marketplace_url")

        local_skills = SkillMarketplace._get_local_marketplace_skills()

        if force_remote and remote_url:
            remote_skills = SkillMarketplace._fetch_remote_skills(remote_url)
            if remote_skills:
                return SkillMarketplace._merge_skills(local_skills, remote_skills)

        return local_skills

    @staticmethod
    def _get_local_marketplace_skills() -> List[Dict[str, Any]]:
        """获取本地市场技能"""
        _, parse_skill_md, MARKETPLACE_DIR, _ = _get_skill_manager()
        
        if not MARKETPLACE_DIR.exists():
            MARKETPLACE_DIR.mkdir(parents=True, exist_ok=True)
            SkillMarketplace._create_default_marketplace()

        skills = []

        for skill_path in MARKETPLACE_DIR.iterdir():
            if not skill_path.is_dir():
                continue

            parsed = parse_skill_md(skill_path)
            if not parsed:
                continue

            metadata = parsed.get("metadata", {})

            skills.append({
                "id": skill_path.name,
                "name": metadata.get("name", skill_path.name),
                "description": metadata.get("description", ""),
                "version": metadata.get("version", "1.0.0"),
                "author": metadata.get("author", "unknown"),
                "tier": metadata.get("tier", 1),
                "category": metadata.get("category", "general"),
                "tags": metadata.get("tags", []),
                "installed": SkillMarketplace._is_skill_installed(skill_path.name),
                "source": "local"
            })

        return skills

    @staticmethod
    def _fetch_remote_skills(url: str) -> Optional[List[Dict[str, Any]]]:
        """从远程市场获取技能"""
        if SkillMarketplace._is_github_url(url):
            return SkillMarketplace._fetch_from_github(url)
        try:
            response = httpx.get(f"{url}/skills", timeout=15.0)
            if response.status_code == 200:
                data = response.json()
                skills = data.get("skills", [])
                for skill in skills:
                    skill["source"] = "remote"
                return skills
        except Exception as e:
            print(f"[SkillMarketplace] 获取远程技能失败: {e}")
        return None

    @staticmethod
    def _is_github_url(url: str) -> bool:
        """检测是否为 GitHub URL"""
        return "github.com" in url.lower()

    @staticmethod
    def _parse_github_url(url: str) -> Optional[Dict[str, str]]:
        """解析 GitHub URL，返回 repo 和 path 信息"""
        # 更健壮的正则表达式
        patterns = [
            r"github\.com[/:]([^/]+)/([^/.]+)(?:\.git)?/tree/([^/]+)/(.+)",
            r"github\.com[/:]([^/]+)/([^/.]+)(?:\.git)?/tree/([^/]+)",
            r"github\.com[/:]([^/]+)/([^/.]+)(?:\.git)?",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    result = {
                        "owner": groups[0],
                        "repo": groups[1],
                        "path": ""
                    }
                    if len(groups) == 4:
                        result["path"] = groups[3]
                    elif len(groups) == 3:
                        result["path"] = ""
                    return result
        return None

    @staticmethod
    def _fetch_from_github(url: str) -> Optional[List[Dict[str, Any]]]:
        """从 GitHub 获取技能列表"""
        parsed = SkillMarketplace._parse_github_url(url)
        if not parsed:
            print(f"[SkillMarketplace] 无法解析 GitHub URL: {url}")
            return None

        owner = parsed["owner"]
        repo = parsed["repo"]
        base_path = parsed.get("path", "")

        print(f"[SkillMarketplace] 从 GitHub 获取: {owner}/{repo} 路径: {base_path}")

        # 1. 先尝试获取指定路径的内容
        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{base_path}"
        try:
            response = httpx.get(api_url, timeout=15.0)
            items = []
            is_single_skill = False

            if response.status_code == 200:
                items = response.json()
                # 检查是否是单个技能目录（包含 SKILL.md）
                if isinstance(items, list):
                    has_skill_md = any(
                        item.get("type") == "file" and item.get("name") == "SKILL.md"
                        for item in items
                    )
                    if has_skill_md and base_path:
                        is_single_skill = True
            elif response.status_code == 404 and base_path:
                # 路径不存在，尝试回退到根目录
                print(f"[SkillMarketplace] 路径不存在: {base_path}，回退到根目录")
                api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/"
                response = httpx.get(api_url, timeout=15.0)
                if response.status_code == 200:
                    items = response.json()
                else:
                    return None
            else:
                print(f"[SkillMarketplace] GitHub API 返回错误: {response.status_code}")
                return None

            skills = []

            if is_single_skill:
                # 单个技能目录
                skill_id = Path(base_path).name
                # 尝试获取 SKILL.md 内容来获取真实的分类
                category, metadata = SkillMarketplace._fetch_skill_metadata(owner, repo, base_path)
                skills.append({
                    "id": skill_id,
                    "name": metadata.get("name", skill_id.replace("-", " ").replace("_", " ").title()),
                    "description": metadata.get("description", f"From {owner}/{repo}"),
                    "version": metadata.get("version", "1.0.0"),
                    "author": metadata.get("author", owner),
                    "tier": metadata.get("tier", 1),
                    "category": category,
                    "tags": metadata.get("tags", ["github"]),
                    "installed": SkillMarketplace._is_skill_installed(skill_id),
                    "source": "github",
                    "github_url": f"https://github.com/{owner}/{repo}/tree/main/{base_path}",
                    "github_owner": owner,
                    "github_repo": repo,
                    "github_path": base_path
                })
            else:
                # 检查是否有 skills/ 子目录（常见的技能存放位置）
                skills_subdir = None
                if not base_path:
                    for item in items:
                        if item["type"] == "dir" and item["name"].lower() == "skills":
                            skills_subdir = item
                            break
                
                if skills_subdir:
                    # 如果有 skills/ 子目录，进入该目录查找技能
                    skills_api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/skills"
                    skills_response = httpx.get(skills_api_url, timeout=15.0)
                    if skills_response.status_code == 200:
                        items = skills_response.json()
                        base_path = "skills"
                
                # 列出目录下的子目录
                for item in items:
                    if item["type"] == "dir":
                        skill_id = item["name"]
                        full_path = f"{base_path}/{skill_id}".strip("/") if base_path else skill_id
                        # 尝试获取 SKILL.md 内容来获取真实的分类
                        category, metadata = SkillMarketplace._fetch_skill_metadata(owner, repo, full_path)
                        # 添加技能（默认分类为 general 也可以接受）
                        skills.append({
                                "id": skill_id,
                                "name": metadata.get("name", skill_id.replace("-", " ").replace("_", " ").title()),
                                "description": metadata.get("description", f"From {owner}/{repo}"),
                                "version": metadata.get("version", "1.0.0"),
                                "author": metadata.get("author", owner),
                                "tier": metadata.get("tier", 1),
                                "category": category,
                                "tags": metadata.get("tags", ["github"]),
                                "installed": SkillMarketplace._is_skill_installed(skill_id),
                                "source": "github",
                                "github_url": item.get("html_url"),
                                "github_owner": owner,
                                "github_repo": repo,
                                "github_path": full_path
                            })

            print(f"[SkillMarketplace] 从 GitHub 获取到 {len(skills)} 个技能")
            return skills
        except Exception as e:
            print(f"[SkillMarketplace] GitHub 获取失败: {e}")
        return None

    @staticmethod
    def _fetch_skill_metadata(owner: str, repo: str, path: str) -> tuple:
        """从 GitHub 获取技能的 SKILL.md 元数据"""
        try:
            # 使用 GitHub API 获取文件内容（避免 raw.githubusercontent.com 访问问题）
            api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}/SKILL.md"
            response = httpx.get(api_url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                # GitHub API 返回的内容是 base64 编码的
                import base64
                content = base64.b64decode(data.get("content", "")).decode("utf-8")
                # 解析 SKILL.md 的 frontmatter
                metadata = {}
                if content.startswith("---"):
                    end_idx = content.find("\n---\n", 4)
                    if end_idx != -1:
                        frontmatter = content[4:end_idx]
                        try:
                            metadata = yaml.safe_load(frontmatter)
                        except:
                            pass
                category = metadata.get("category", "general")
                # 验证分类是否有效，否则使用默认值
                valid_categories = ["general", "development", "design", "data", "business", "productivity", "github"]
                if category not in valid_categories:
                    category = "general"
                return category, metadata
        except Exception as e:
            print(f"[SkillMarketplace] 获取技能元数据失败: {e}")
        return "general", {}

    @staticmethod
    def _install_from_github(skill_id: str, github_info: Dict[str, Any]) -> bool:
        """从 GitHub 安装技能 - 支持 ZIP 下载和逐个文件下载"""
        # 优先使用保存的 github 信息
        if "github_owner" in github_info and "github_repo" in github_info and "github_path" in github_info:
            owner = github_info["github_owner"]
            repo = github_info["github_repo"]
            skill_path = github_info["github_path"]
        else:
            owner = github_info.get("owner")
            repo = github_info.get("repo")
            skill_path = github_info.get("path", skill_id)

        # 首先清理可能存在的旧目录
        _, _, _, SKILLS_DIR = _get_skill_manager()
        dest = SKILLS_DIR / skill_id
        if dest.exists():
            try:
                shutil.rmtree(dest)
            except Exception as e:
                print(f"[SkillMarketplace] 清理旧目录失败: {e}")

        print(f"[SkillMarketplace] 正在下载技能 {skill_id} 从 {owner}/{repo}/{skill_path}")

        # 方案1: 尝试下载整个仓库的 ZIP（更稳定）
        zip_success = SkillMarketplace._try_download_zip(skill_id, owner, repo, skill_path)
        if zip_success:
            return True

        # 方案2: 回退到逐个文件下载
        print(f"[SkillMarketplace] ZIP 下载不可用，尝试逐个文件下载...")

        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{skill_path}"
        try:
            # 带重试的请求
            for attempt in range(3):
                try:
                    response = httpx.get(api_url, timeout=60.0)
                    if response.status_code == 200:
                        break
                    elif attempt < 2:
                        print(f"[SkillMarketplace] 重试下载 ({attempt+1}/3)...")
                        continue
                    else:
                        print(f"[SkillMarketplace] GitHub API 请求失败: {response.status_code}")
                        return False
                except Exception as e:
                    if attempt < 2:
                        print(f"[SkillMarketplace] 下载出错，重试 ({attempt+1}/3)...")
                    else:
                        print(f"[SkillMarketplace] 下载失败: {e}")
                        return False

            contents = response.json()
            dest.mkdir(parents=True, exist_ok=True)

            file_count = 0
            for item in contents:
                try:
                    if item["type"] == "file":
                        # 下载单个文件，带重试
                        for file_attempt in range(3):
                            try:
                                file_response = httpx.get(item["download_url"], timeout=60.0)
                                if file_response.status_code == 200:
                                    (dest / item["name"]).write_bytes(file_response.content)
                                    file_count += 1
                                    break
                            except Exception as e:
                                if file_attempt < 2:
                                    continue
                                print(f"[SkillMarketplace] 警告: 下载文件失败 {item['name']}")
                    elif item["type"] == "dir":
                        SkillMarketplace._download_directory(
                            dest / item["name"],
                            item["url"],
                            owner,
                            repo,
                            item["path"]
                        )
                        file_count += 1
                except Exception as e:
                    print(f"[SkillMarketplace] 处理项目出错: {item.get('name', 'unknown')} - {e}")
                    continue

            # 检查是否成功安装（需要 SKILL.md）
            if not (dest / "SKILL.md").exists():
                print(f"[SkillMarketplace] 警告: 没有找到 SKILL.md 文件，安装不完全")
                try:
                    shutil.rmtree(dest)
                except:
                    pass
                return False

            print(f"[SkillMarketplace] OK 成功安装技能: {skill_id} ({file_count} 个文件)")
            return True
        except Exception as e:
            print(f"[SkillMarketplace] GitHub 安装失败: {e}")
            # 清理部分下载的文件
            if dest.exists():
                try:
                    shutil.rmtree(dest)
                except:
                    pass
            return False

    @staticmethod
    def _try_download_zip(skill_id: str, owner: str, repo: str, skill_path: str) -> bool:
        """尝试下载 GitHub ZIP 文件 - 这是更稳定的下载方式"""
        try:
            # 先获取默认分支名
            repo_api = f"https://api.github.com/repos/{owner}/{repo}"
            response = httpx.get(repo_api, timeout=30.0)
            default_branch = "main"
            if response.status_code == 200:
                default_branch = response.json().get("default_branch", "main")

            # 构造 ZIP URL
            zip_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/{default_branch}.zip"
            print(f"[SkillMarketplace] 尝试下载 ZIP: {zip_url}")

            # 下载 ZIP
            temp_root = Path(tempfile.mkdtemp())
            zip_path = temp_root / f"{repo}.zip"

            # 带重试下载 ZIP
            for attempt in range(3):
                try:
                    with httpx.stream("GET", zip_url, timeout=300.0, follow_redirects=True) as r:
                        if r.status_code == 200:
                            with open(zip_path, "wb") as f:
                                for chunk in r.iter_bytes():
                                    f.write(chunk)
                            print(f"[SkillMarketplace] ZIP 下载完成: {zip_path.stat().st_size / 1024:.1f} KB")
                            break
                except Exception as e:
                    if attempt < 2:
                        print(f"[SkillMarketplace] ZIP 下载重试 ({attempt+1}/3)...")
                    else:
                        print(f"[SkillMarketplace] ZIP 下载失败")
                        if zip_path.exists():
                            zip_path.unlink(missing_ok=True)
                        shutil.rmtree(temp_root)
                        return False

            if not zip_path.exists():
                shutil.rmtree(temp_root)
                return False

            # 解压并提取目标目录
            temp_extract = temp_root / "extracted"
            temp_extract.mkdir(parents=True, exist_ok=True)

            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(temp_extract)

            # 找到解压后的根目录
            extract_root = next(temp_extract.iterdir())

            # 找到目标技能目录
            source_dir = extract_root
            if skill_path:
                source_dir = extract_root / skill_path

            if not source_dir.exists() or not source_dir.is_dir():
                print(f"[SkillMarketplace] ZIP 中未找到目录: {skill_path}")
                shutil.rmtree(temp_root)
                return False

            # 复制到最终位置
            _, _, _, SKILLS_DIR = _get_skill_manager()
            dest = SKILLS_DIR / skill_id
            if dest.exists():
                shutil.rmtree(dest)

            shutil.copytree(source_dir, dest)

            # 检查是否成功安装（需要 SKILL.md）
            if not (dest / "SKILL.md").exists():
                print(f"[SkillMarketplace] 警告: ZIP 中没有找到 SKILL.md 文件")
                try:
                    shutil.rmtree(dest)
                except:
                    pass
                shutil.rmtree(temp_root)
                return False

            # 统计文件数量
            file_count = sum(1 for _ in dest.rglob("*") if _.is_file())
            print(f"[SkillMarketplace] OK ZIP 解压安装成功: {skill_id} ({file_count} 个文件)")

            # 清理临时文件
            shutil.rmtree(temp_root)

            return True
        except Exception as e:
            print(f"[SkillMarketplace] ZIP 安装方式失败: {e}")
            try:
                pass
            except:
                pass
            return False

    @staticmethod
    def _download_directory(dest: Path, api_url: str, owner: str, repo: str, path: str) -> None:
        """递归下载 GitHub 目录"""
        dest.mkdir(parents=True, exist_ok=True)
        try:
            # 带重试获取目录内容
            for attempt in range(3):
                try:
                    response = httpx.get(api_url, timeout=60.0)
                    if response.status_code == 200:
                        contents = response.json()
                        for item in contents:
                            try:
                                if item["type"] == "file":
                                    # 下载单个文件，带重试
                                    for file_attempt in range(3):
                                        try:
                                            file_response = httpx.get(item["download_url"], timeout=60.0)
                                            if file_response.status_code == 200:
                                                (dest / item["name"]).write_bytes(file_response.content)
                                                break
                                        except Exception as e:
                                            if file_attempt < 2:
                                                continue
                                            print(f"[SkillMarketplace] 警告: 下载子目录文件失败 {item.get('name', 'unknown')}")
                                elif item["type"] == "dir":
                                    SkillMarketplace._download_directory(
                                        dest / item["name"],
                                        item["url"],
                                        owner,
                                        repo,
                                        item["path"]
                                    )
                            except Exception as e:
                                print(f"[SkillMarketplace] 处理子目录项目出错: {item.get('name', 'unknown')} - {e}")
                        break  # 成功，跳出重试循环
                except Exception as e:
                    if attempt < 2:
                        continue
                    print(f"[SkillMarketplace] 下载子目录失败: {path}")
        except Exception as e:
            print(f"[SkillMarketplace] 下载目录出错: {e}")

    @staticmethod
    def _merge_skills(local: List[Dict], remote: List[Dict]) -> List[Dict[str, Any]]:
        """合并本地和远程技能"""
        merged = {}
        for skill in local:
            skill["installed"] = SkillMarketplace._is_skill_installed(skill["id"])
            merged[skill["id"]] = skill
        for skill in remote:
            sid = skill["id"]
            if sid not in merged:
                skill["installed"] = SkillMarketplace._is_skill_installed(sid)
                merged[sid] = skill
        return list(merged.values())

    @staticmethod
    def _is_skill_installed(skill_id: str) -> bool:
        """检查技能是否真正安装（需要 SKILL.md 文件）"""
        _, _, _, SKILLS_DIR = _get_skill_manager()
        skill_dir = SKILLS_DIR / skill_id
        if not skill_dir.exists():
            return False
        if not (skill_dir / "SKILL.md").exists():
            return False
        return True

    @staticmethod
    def create_skill(
        skill_id: str,
        name: str,
        description: str,
        version: str = "1.0.0",
        author: str = "unknown",
        tier: int = 1,
        category: str = "general",
        tags: list = None,
        instructions: str = "",
        examples: list = None,
        guidelines: list = None
    ) -> bool:
        """创建新技能并自动注册"""
        import yaml
        
        if tags is None:
            tags = []
        if examples is None:
            examples = []
        if guidelines is None:
            guidelines = []
        
        # 验证技能ID格式
        if not skill_id or not skill_id.replace("-", "").replace("_", "").isalnum():
            print(f"[SkillMarketplace] 无效的技能ID: {skill_id}")
            return False

        # 检查技能是否已存在
        if SkillMarketplace._is_skill_installed(skill_id):
            print(f"[SkillMarketplace] 技能已存在: {skill_id}")
            return False

        # 创建技能目录
        _, _, _, SKILLS_DIR = _get_skill_manager()
        skill_dir = SKILLS_DIR / skill_id
        if skill_dir.exists():
            print(f"[SkillMarketplace] 技能目录已存在: {skill_id}")
            return False
        skill_dir.mkdir(parents=True, exist_ok=True)

        # 构建 frontmatter
        frontmatter = {
            "name": name,
            "description": description,
            "version": version,
            "author": author,
            "tier": tier,
            "category": category,
            "tags": tags
        }

        # 构建 SKILL.md 内容
        md_content = "---\n"
        md_content += yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
        md_content += "---\n\n"
        md_content += f"# {name}\n\n"
        
        if instructions:
            md_content += f"{instructions}\n\n"
        
        if examples:
            md_content += "## Examples\n"
            for i, example in enumerate(examples, 1):
                md_content += f"- {example}\n"
            md_content += "\n"
        
        if guidelines:
            md_content += "## Guidelines\n"
            for guideline in guidelines:
                md_content += f"- {guideline}\n"

        # 写入 SKILL.md
        (skill_dir / "SKILL.md").write_text(md_content, encoding="utf-8")

        # 注册技能
        from .skill_manager import skill_manager
        success = skill_manager.install_skill(skill_dir)
        if not success:
            # 清理创建的目录
            import shutil
            shutil.rmtree(skill_dir)
            print(f"[SkillMarketplace] 技能注册失败: {skill_id}")
            return False

        # 刷新技能列表
        skill_manager.refresh_skills()
        print(f"[SkillMarketplace] OK 技能创建成功: {skill_id}")
        return True

    @staticmethod
    def install_from_marketplace(skill_id: str, source: str = "local") -> bool:
        """从市场安装技能"""
        if source == "remote":
            load_settings, _ = _get_settings()
            settings = load_settings()
            remote_url = settings.get("remote_marketplace_url")
            if remote_url:
                # 对于远程来源，先尝试获取技能列表来查找该技能的详细信息
                skills = SkillMarketplace.get_marketplace_skills(force_remote=True)
                target_skill = next((s for s in skills if s["id"] == skill_id), None)

                if target_skill and target_skill.get("source") == "github" and "github_owner" in target_skill:
                    # 对于 GitHub 技能，直接使用保存的信息安装
                    result = SkillMarketplace._install_from_github(skill_id, target_skill)
                    if result:
                        # 安装成功后调用 skill_manager 进行正式注册
                        from .skill_manager import skill_manager
                        _, _, _, SKILLS_DIR = _get_skill_manager()
                        skill_path = SKILLS_DIR / skill_id
                        if skill_path.exists():
                            skill_manager.install_skill(skill_path)
                        # 刷新技能列表，确保在已安装页签显示
                        skill_manager.refresh_skills()
                    return result
                else:
                    # 其他远程来源
                    result = SkillMarketplace._install_from_remote(skill_id, remote_url)
                    if result:
                        from .skill_manager import skill_manager
                        _, _, _, SKILLS_DIR = _get_skill_manager()
                        skill_path = SKILLS_DIR / skill_id
                        if skill_path.exists():
                            skill_manager.install_skill(skill_path)
                        # 刷新技能列表
                        skill_manager.refresh_skills()
                    return result

        _, _, MARKETPLACE_DIR, SKILLS_DIR = _get_skill_manager()
        source_path = MARKETPLACE_DIR / skill_id
        if not source_path.exists():
            return False

        dest = SKILLS_DIR / skill_id
        if dest.exists():
            return False

        shutil.copytree(source_path, dest)
        # 本地来源安装后也需要注册
        from .skill_manager import skill_manager
        skill_manager.install_skill(dest)
        # 刷新技能列表
        skill_manager.refresh_skills()
        return True

    @staticmethod
    def _install_from_remote(skill_id: str, remote_url: str) -> bool:
        """从远程安装技能"""
        if SkillMarketplace._is_github_url(remote_url):
            github_info = SkillMarketplace._parse_github_url(remote_url)
            if github_info:
                github_info["path"] = f"{github_info.get('path', '')}/{skill_id}".strip("/")
                return SkillMarketplace._install_from_github(skill_id, github_info)
            return False

        try:
            response = httpx.get(f"{remote_url}/skills/{skill_id}", timeout=60.0)
            if response.status_code != 200:
                return False

            skill_data = response.json()
            _, _, _, SKILLS_DIR = _get_skill_manager()
            dest = SKILLS_DIR / skill_id
            dest.mkdir(parents=True, exist_ok=True)

            if "files" in skill_data:
                for filename, content in skill_data["files"].items():
                    (dest / filename).write_text(content, encoding="utf-8")
                return True
            elif "skill_md" in skill_data:
                (dest / "SKILL.md").write_text(skill_data["skill_md"], encoding="utf-8")
                return True

        except Exception as e:
            print(f"[SkillMarketplace] 远程安装失败: {e}")
        return False

    @staticmethod
    def uninstall_from_marketplace(skill_id: str) -> bool:
        """从已安装中移除市场技能（不删除市场源）"""
        _, _, _, SKILLS_DIR = _get_skill_manager()
        installed = SKILLS_DIR / skill_id
        if not installed.exists():
            return False

        shutil.rmtree(installed)
        return True

    @staticmethod
    def publish_to_marketplace(skill_id: str, remote: bool = False) -> bool:
        """发布技能到市场"""
        _, _, MARKETPLACE_DIR, SKILLS_DIR = _get_skill_manager()
        source = SKILLS_DIR / skill_id
        if not source.exists():
            return False

        if not remote:
            dest = MARKETPLACE_DIR / skill_id
            if dest.exists():
                return False
            shutil.copytree(source, dest)
            return True
        else:
            load_settings, _ = _get_settings()
            settings = load_settings()
            remote_url = settings.get("remote_marketplace_url")
            if not remote_url:
                return False

            return SkillMarketplace._publish_to_remote(skill_id, remote_url)

    @staticmethod
    def _publish_to_remote(skill_id: str, remote_url: str) -> bool:
        """发布技能到远程市场"""
        try:
            _, _, _, SKILLS_DIR = _get_skill_manager()
            source = SKILLS_DIR / skill_id
            files = {}
            for f in source.rglob("*"):
                if f.is_file():
                    rel_path = f.relative_to(source)
                    files[str(rel_path)] = f.read_text(encoding="utf-8")

            skill_md_content = files.get("SKILL.md", "")

            response = httpx.post(
                f"{remote_url}/skills",
                json={
                    "id": skill_id,
                    "files": files,
                    "skill_md": skill_md_content
                },
                timeout=60.0
            )
            return response.status_code in (200, 201)
        except Exception as e:
            print(f"[SkillMarketplace] 远程发布失败: {e}")
        return False

    @staticmethod
    def search_marketplace(query: str, force_remote: bool = False) -> List[Dict[str, Any]]:
        """搜索市场技能"""
        skills = SkillMarketplace.get_marketplace_skills(force_remote)
        query_lower = query.lower()

        results = []
        for skill in skills:
            if (query_lower in skill.get("name", "").lower() or
                query_lower in skill.get("description", "").lower() or
                any(query_lower in tag.lower() for tag in skill.get("tags", []))):
                results.append(skill)

        return results

    @staticmethod
    def check_remote_updates() -> Optional[Dict[str, Any]]:
        """检查远程市场更新"""
        load_settings, _ = _get_settings()
        settings = load_settings()
        remote_url = settings.get("remote_marketplace_url")
        if not remote_url:
            return None

        if SkillMarketplace._is_github_url(remote_url):
            parsed = SkillMarketplace._parse_github_url(remote_url)
            if parsed:
                try:
                    api_url = f"https://api.github.com/repos/{parsed['owner']}/{parsed['repo']}/contents/{parsed.get('path', '')}"
                    response = httpx.get(api_url, timeout=5.0)
                    if response.status_code == 200:
                        return {
                            "total": len([item for item in response.json() if item.get("type") == "dir"]),
                            "source": "github"
                        }
                except Exception:
                    pass
            return None

        try:
            response = httpx.get(f"{remote_url}/stats", timeout=5.0)
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
        return None

    @staticmethod
    def set_remote_marketplace(url: str) -> bool:
        """设置远程市场URL"""
        load_settings, save_settings = _get_settings()
        settings = load_settings()
        settings["remote_marketplace_url"] = url
        return save_settings(settings)

    @staticmethod
    def _create_default_marketplace():
        """创建默认市场技能"""

        default_skills = [
            {
                "id": "web-search",
                "name": "网页搜索",
                "description": "通过搜索引擎在互联网上搜索信息，返回网页标题、链接和摘要。当用户问'搜索'、'查找'、'了解一下'时使用。",
                "version": "1.0.0",
                "author": "system",
                "tier": 1,
                "category": "information",
                "tags": ["搜索", "查询", "互联网"],
                "content": """# 网页搜索技能

## 使用场景
当用户需要查找互联网上的信息时使用此技能。

## 使用步骤
1. 解析用户的搜索 query
2. 调用搜索 API 获取结果
3. 返回格式化的搜索结果

## 注意事项
- 搜索关键词要简洁准确
- 返回结果要包含标题、链接和摘要
"""
            },
            {
                "id": "weather-query",
                "name": "天气查询",
                "description": "查询任意城市的天气预报，包括温度、湿度、风速、空气质量等。当用户问'天气怎么样'、'要不要带伞'、'热不热'时使用。",
                "version": "1.0.0",
                "author": "system",
                "tier": 1,
                "category": "information",
                "tags": ["天气", "温度", "预报"],
                "content": """# 天气查询技能

## 使用场景
当用户询问天气相关问题时使用此技能。

## 使用步骤
1. 解析用户输入，获取城市名称
2. 调用天气 API 获取数据
3. 格式化结果返回给用户

## 返回格式
- 温度：摄氏度
- 湿度：百分比
- 风速：km/h
- 空气质量：AQI 指数
"""
            },
            {
                "id": "location-query",
                "name": "地理位置查询",
                "description": "查询省、市、区、县等行政区划信息，包括经纬度、海拔、时区等。当用户问'某地在哪里'、'经纬度'、'属于哪个省'时使用。",
                "version": "1.0.0",
                "author": "system",
                "tier": 1,
                "category": "information",
                "tags": ["位置", "地理", "行政区划"],
                "content": """# 地理位置查询技能

## 使用场景
当用户需要查询地理位置信息时使用。

## 使用步骤
1. 解析用户输入，获取地名
2. 调用地理 API 获取信息
3. 返回格式化结果
"""
            },
            {
                "id": "file-reader",
                "name": "文件阅读",
                "description": "读取本地知识库中的文档内容，支持 TXT、Markdown、PDF、图片等文件。当用户需要查看文档内容时使用。",
                "version": "1.0.0",
                "author": "system",
                "tier": 1,
                "category": "knowledge",
                "tags": ["文件", "阅读", "文档"],
                "content": """# 文件阅读技能

## 支持格式
- 文本：.txt, .md
- PDF：.pdf
- 图片：.jpg, .png, .gif, .webp

## 使用步骤
1. 确定要读取的文件
2. 调用对应的读取工具
3. 返回文件内容
"""
            },
            {
                "id": "code-reviewer",
                "name": "代码审查",
                "description": "审查代码质量，发现潜在问题，给出改进建议。当用户发送代码并要求审查时使用。",
                "version": "1.0.0",
                "author": "community",
                "tier": 2,
                "category": "development",
                "tags": ["代码", "审查", "质量"],
                "content": """# 代码审查技能

## 审查维度
1. **代码规范** - 命名、格式、注释
2. **逻辑错误** - 潜在 bug、死代码
3. **性能问题** - 时间/空间复杂度
4. **安全性** - 注入、密码硬编码等

## 输出格式
```json
{
  "issues": [
    {
      "severity": "high|medium|low",
      "line": 10,
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "score": 8.5
}
```
"""
            },
            {
                "id": "image-understand",
                "name": "图片理解",
                "description": "使用 OCR 识别图片中的文字内容，支持中文和英文。当用户上传图片并询问内容时使用。",
                "version": "1.0.0",
                "author": "system",
                "tier": 1,
                "category": "multimodal",
                "tags": ["图片", "OCR", "识别"],
                "content": """# 图片理解技能

## 功能
- OCR 文字识别
- 图片内容描述
- 表格式数据提取

## 支持格式
- JPG, PNG, GIF, WebP, BMP
"""
            },
            {
                "id": "pdf-extract",
                "name": "PDF 提取",
                "description": "提取 PDF 文档的文本内容，支持多页文档。当用户上传 PDF 并需要提取文字时使用。",
                "version": "1.0.0",
                "author": "system",
                "tier": 1,
                "category": "document",
                "tags": ["PDF", "提取", "文档"],
                "content": """# PDF 提取技能

## 功能
- 提取 PDF 全文
- 按页分段
- 支持扫描版 PDF（需 OCR）

## 使用限制
- 单文件最大 50MB
- 最多 500 页
"""
            },
            {
                "id": "data-analyst",
                "name": "数据分析",
                "description": "对数据进行统计分析，生成可视化建议。当用户需要分析数据、生成图表时使用。",
                "version": "1.0.0",
                "author": "community",
                "tier": 2,
                "category": "analysis",
                "tags": ["数据", "分析", "统计"],
                "content": """# 数据分析技能

## 分析类型
1. 描述性统计 - 均值、方差、分位数
2. 相关性分析 - 变量间关系
3. 趋势分析 - 时间序列预测
4. 异常检测 - 离群点识别

## 输出
- 文字结论
- 图表建议
- 改进建议
"""
            }
        ]

        _, _, MARKETPLACE_DIR, _ = _get_skill_manager()
        for skill_data in default_skills:
            skill_id = skill_data.pop("id")
            content = skill_data.pop("content")

            skill_dir = MARKETPLACE_DIR / skill_id
            skill_dir.mkdir(parents=True, exist_ok=True)

            skill_md = skill_dir / "SKILL.md"
            yaml_frontmatter = yaml.dump(skill_data, allow_unicode=True, default_flow_style=False)
            full_content = f"---\n{yaml_frontmatter}---\n\n{content}"

            skill_md.write_text(full_content, encoding="utf-8")

        print(f"[SkillMarketplace] 已创建 {len(default_skills)} 个默认市场技能")
