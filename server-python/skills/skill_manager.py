"""
技能管理器 - 支持 SKILL.md 格式和渐进式披露
"""

import json
import yaml
import hashlib
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from dataclasses import dataclass, field
from datetime import datetime

if TYPE_CHECKING:
    from .tools_registry import ToolCapability, ToolDefinition

SKILLS_DIR = Path(__file__).parent
MARKETPLACE_DIR = Path(__file__).parent / "marketplace"
REGISTRY_FILE = Path(__file__).parent.parent.parent / "data" / "skills_registry.json"


@dataclass
class Skill:
    """技能对象"""
    id: str
    name: str
    description: str
    version: str = "1.0.0"
    author: str = "unknown"
    tier: int = 1
    category: str = "general"
    installed: bool = False
    enabled: bool = True
    path: Optional[str] = None
    manifest: Optional[Dict[str, Any]] = None
    loaded_tier: int = 0
    keywords: List[str] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    tools: List[Dict[str, str]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "author": self.author,
            "tier": self.tier,
            "category": self.category,
            "installed": self.installed,
            "enabled": self.enabled,
            "path": self.path,
            "keywords": self.keywords,
            "patterns": self.patterns,
            "tools": self.tools,
        }


@dataclass
class SkillMetadata:
    """技能元数据（Tier 1 - 基础信息）"""
    name: str
    description: str
    tier: int = 1
    version: str = "1.0.0"
    author: str = "unknown"
    category: str = "general"
    tags: List[str] = field(default_factory=list)
    references: List[str] = field(default_factory=list)


def parse_skill_md(skill_path: Path) -> Optional[Dict[str, Any]]:
    """解析 SKILL.md 文件"""
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return None

    content = skill_md.read_text(encoding="utf-8")

    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                yaml_content = parts[1].strip()
                metadata = yaml.safe_load(yaml_content)
                markdown_content = parts[2].strip()
                return {
                    "metadata": metadata,
                    "content": markdown_content
                }
            except Exception as e:
                print(f"[SkillManager] 解析 SKILL.md 失败: {e}")
                return None

    return {"metadata": {}, "content": content}


def load_skill_registry() -> Dict[str, Any]:
    """加载技能注册表"""
    if REGISTRY_FILE.exists():
        try:
            with open(REGISTRY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[SkillManager] 加载注册表失败: {e}")

    return {"installed_skills": [], "enabled_skills": []}


def save_skill_registry(registry: Dict[str, Any]) -> bool:
    """保存技能注册表"""
    try:
        REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(REGISTRY_FILE, 'w', encoding='utf-8') as f:
            json.dump(registry, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[SkillManager] 保存注册表失败: {e}")
        return False


class SkillManager:
    """技能管理器"""

    def __init__(self):
        self.registry = load_skill_registry()
        self._skills_cache: Dict[str, Skill] = {}
        self._discover_skills()

    def _discover_skills(self):
        """发现已安装的技能"""
        print(f"[SkillManager] 开始发现技能")
        if not SKILLS_DIR.exists():
            SKILLS_DIR.mkdir(parents=True, exist_ok=True)

        # 清理缓存，准备重新发现
        self._skills_cache.clear()

        discovered_count = 0
        for skill_path in SKILLS_DIR.iterdir():
            if not skill_path.is_dir():
                continue

            skill_md = skill_path / "SKILL.md"
            if not skill_md.exists():
                continue

            parsed = parse_skill_md(skill_path)
            if not parsed:
                continue

            metadata = parsed.get("metadata", {})
            skill_id = skill_path.name
            keywords = self._extract_keywords(metadata)
            patterns = self._extract_patterns(metadata)
            tools = metadata.get("tools", [])

            skill = Skill(
                id=skill_id,
                name=metadata.get("name", skill_id),
                description=metadata.get("description", ""),
                version=metadata.get("version", "1.0.0"),
                author=metadata.get("author", "unknown"),
                tier=metadata.get("tier", 1),
                category=metadata.get("category", "general"),
                installed=True,
                enabled=skill_id in self.registry.get("enabled_skills", []),
                path=str(skill_path),
                manifest=parsed,
                keywords=keywords,
                patterns=patterns,
                tools=tools
            )
            self._skills_cache[skill_id] = skill
            if tools:
                self._register_skill_tools(skill)
            discovered_count += 1
            print(f"[SkillManager] 发现技能: {skill_id} (tier: {skill.tier}, enabled: {skill.enabled}, keywords: {len(keywords)}, tools: {len(tools)})")

        print(f"[SkillManager] 技能发现完成: 共 {discovered_count} 个已安装技能")

    def refresh_skills(self):
        """重新发现并刷新技能列表"""
        print(f"[SkillManager] 刷新技能列表")
        self._discover_skills()
        return len(self._skills_cache)

    def list_skills(self, tier: int = None, category: str = None, installed_only: bool = False) -> List[Skill]:
        """列出技能"""
        skills = list(self._skills_cache.values())

        if installed_only:
            skills = [s for s in skills if s.installed]

        if tier is not None:
            skills = [s for s in skills if s.tier == tier]

        if category:
            skills = [s for s in skills if s.category == category]

        return skills

    def get_skill(self, skill_id: str) -> Optional[Skill]:
        """获取技能"""
        return self._skills_cache.get(skill_id)

    def get_skill_tier1(self, skill_id: str) -> Optional[Dict[str, Any]]:
        """获取技能 Tier 1 信息（发现阶段）"""
        skill = self._skills_cache.get(skill_id)
        if not skill:
            return None

        return {
            "id": skill.id,
            "name": skill.name,
            "description": skill.description,
            "tier": skill.tier,
            "category": skill.category
        }

    def get_skill_full(self, skill_id: str, target_tier: int = None) -> Optional[Dict[str, Any]]:
        """获取技能完整信息（渐进式披露）"""
        skill = self._skills_cache.get(skill_id)
        if not skill:
            return None

        target_tier = target_tier or skill.tier

        if skill.loaded_tier >= target_tier:
            return skill.manifest

        manifest = skill.manifest
        if not manifest:
            parsed = parse_skill_md(Path(skill.path))
            if parsed:
                manifest = parsed
                skill.manifest = manifest
                skill.loaded_tier = target_tier

        return manifest

    def install_skill(self, skill_path: Path) -> bool:
        """安装技能"""
        skill_id = skill_path.name

        if skill_id in self._skills_cache:
            print(f"[SkillManager] 技能 {skill_id} 已安装")
            return False

        parsed = parse_skill_md(skill_path)
        if not parsed:
            print(f"[SkillManager] 无效的技能: {skill_id}")
            return False

        metadata = parsed.get("metadata", {})

        keywords = self._extract_keywords(metadata)
        patterns = self._extract_patterns(metadata)
        tools = metadata.get("tools", [])

        skill = Skill(
            id=skill_id,
            name=metadata.get("name", skill_id),
            description=metadata.get("description", ""),
            version=metadata.get("version", "1.0.0"),
            author=metadata.get("author", "unknown"),
            tier=metadata.get("tier", 1),
            category=metadata.get("category", "general"),
            installed=True,
            enabled=True,
            path=str(skill_path),
            manifest=parsed,
            keywords=keywords,
            patterns=patterns,
            tools=tools
        )

        self._skills_cache[skill_id] = skill

        self._load_skill_tool(skill)
        self._register_skill_tools(skill)

        if skill_id not in self.registry.get("installed_skills", []):
            self.registry.setdefault("installed_skills", []).append(skill_id)

        if skill_id not in self.registry.get("enabled_skills", []):
            self.registry.setdefault("enabled_skills", []).append(skill_id)

        save_skill_registry(self.registry)
        print(f"[SkillManager] ✓ 技能已安装: {skill.name} (keywords: {len(keywords)}, patterns: {len(patterns)}, tools: {len(tools)})")
        return True

    def _load_skill_tool(self, skill: Skill):
        """加载技能的 tool.py 并自动注册"""
        if not skill.path:
            return

        skill_path = Path(skill.path)
        tool_file = skill_path / "tool.py"

        if not tool_file.exists():
            print(f"[SkillManager] 技能 {skill.id} 没有 tool.py")
            return

        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location(f"skill_tool_{skill.id}", tool_file)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                if hasattr(module, 'execute'):
                    self._register_tool_execute_func(skill.id, module.execute)
                    print(f"[SkillManager] ✓ 技能 {skill.id} 的 tool.py 已加载并注册")
                else:
                    print(f"[SkillManager] ⚠️ 技能 {skill.id} 的 tool.py 没有 execute 函数")
        except Exception as e:
            print(f"[SkillManager] ⚠️ 加载技能 {skill.id} 的 tool.py 失败: {e}")

    def _register_tool_execute_func(self, skill_id: str, execute_func):
        """注册工具执行函数"""
        from .tools_registry import tool_registry

        for skill in self._skills_cache.values():
            if skill.id == skill_id:
                for tool_def in skill.tools:
                    tool_name = tool_def.get("name")
                    if tool_name:
                        if tool_name in tool_registry._tools:
                            tool_registry._tools[tool_name].execute_func = execute_func
                            print(f"[SkillManager] ✓ 工具 {tool_name} 已注册执行函数 (来自技能 {skill_id})")
                        else:
                            tool_registry.register_tool_with_func(tool_name, skill.description, execute_func)
                            print(f"[SkillManager] ✓ 工具 {tool_name} 已创建并注册执行函数 (来自技能 {skill_id})")

    def _extract_keywords(self, metadata: Dict) -> List[str]:
        """从技能元数据提取关键词"""
        keywords = set()

        tags = metadata.get("tags", [])
        for tag in tags:
            keywords.add(tag)

        description = metadata.get("description", "")
        if description:
            quoted_phrases = re.findall(r"'([^']+)'", description)
            keywords.update(quoted_phrases)

            words = description.replace(",", " ").replace("。", " ").replace("、", " ").split()
            for word in words:
                if len(word) >= 2 and len(word) <= 6:
                    keywords.add(word)

        category = metadata.get("category", "")
        if category:
            keywords.add(category)

        name = metadata.get("name", "")
        if name:
            for word in name.replace("-", " ").split():
                if len(word) >= 2:
                    keywords.add(word)

        keywords.discard("")
        return list(keywords)[:20]

    def _extract_patterns(self, metadata: Dict) -> List[str]:
        """从技能元数据提取匹配模式"""
        patterns = []

        description = metadata.get("description", "")
        if description:
            quoted_phrases = re.findall(r"'([^']+)'", description)
            for phrase in quoted_phrases:
                if len(phrase) >= 2:
                    patterns.append(f".*({re.escape(phrase)}).*")

            question_patterns = re.findall(r"当用户[问询]?'([^']+)'", description)
            for q in question_patterns:
                if len(q) >= 2:
                    patterns.append(f".*({re.escape(q)}).*")

        return patterns[:10]

    def _register_skill_tools(self, skill: Skill):
        """将技能需要的工具注册到工具注册表"""
        from .tools_registry import tool_registry

        for tool_def in skill.tools:
            tool_name = tool_def.get("name")
            if tool_name:
                tool_registry.register_skill_tool_reference(skill.id, skill.name, tool_name)
                print(f"[SkillManager] ✓ 技能 {skill.name} 注册工具: {tool_name}")

    def get_skill_tools(self, skill_id: str) -> List[str]:
        """获取技能需要的工具列表"""
        skill = self._skills_cache.get(skill_id)
        if not skill:
            return []
        return [t.get("name") for t in skill.tools if t.get("name")]

    def match_skills(self, user_input: str) -> List[tuple]:
        """匹配用户输入与已安装技能，返回 [(skill, confidence, params), ...]"""
        user_input_lower = user_input.lower()
        matches = []

        for skill in self._skills_cache.values():
            if not skill.enabled or not skill.installed:
                continue

            confidence = 0
            params = {}

            for keyword in skill.keywords:
                if keyword.lower() in user_input_lower:
                    confidence += 0.3

            for pattern in skill.patterns:
                match = re.search(pattern, user_input)
                if match:
                    confidence += 0.4
                    if match.groups():
                        params['extracted'] = match.group(1)

            if confidence > 0:
                matches.append((skill, confidence, params))

        matches.sort(key=lambda x: x[1], reverse=True)
        print(f"[SkillManager] 匹配到的技能: {[(s.id, c) for s, c, p in matches]}")
        return matches

    def get_skill_tool_name(self, skill_category: str) -> str:
        """根据技能分类获取对应的工具名称"""
        category_tool_map = {
            "information": "web_search",
            "search": "web_search",
            "weather": "get_weather",
            "location": "get_location",
            "file": "read_file",
            "code": "python",
            "system": "bash",
            "knowledge": "search_knowledge_base",
        }
        return category_tool_map.get(skill_category, "general_query")

    def uninstall_skill(self, skill_id: str) -> bool:
        """卸载技能"""
        if skill_id not in self._skills_cache:
            return False

        skill = self._skills_cache[skill_id]

        from .tools_registry import tool_registry
        tool_registry.unregister_skill_tools(skill_id)

        if skill.path:
            import shutil
            try:
                shutil.rmtree(skill.path)
            except Exception as e:
                print(f"[SkillManager] 删除技能目录失败: {e}")

        self._skills_cache.pop(skill_id)

        if "installed_skills" in self.registry:
            self.registry["installed_skills"] = [s for s in self.registry["installed_skills"] if s != skill_id]
        if "enabled_skills" in self.registry:
            self.registry["enabled_skills"] = [s for s in self.registry["enabled_skills"] if s != skill_id]

        save_skill_registry(self.registry)
        print(f"[SkillManager] ✓ 技能已卸载: {skill_id}")
        return True

    def enable_skill(self, skill_id: str) -> bool:
        """启用技能"""
        if skill_id not in self._skills_cache:
            return False

        self._skills_cache[skill_id].enabled = True

        if "enabled_skills" not in self.registry:
            self.registry["enabled_skills"] = []

        if skill_id not in self.registry["enabled_skills"]:
            self.registry["enabled_skills"].append(skill_id)

        save_skill_registry(self.registry)
        return True

    def disable_skill(self, skill_id: str) -> bool:
        """禁用技能"""
        if skill_id not in self._skills_cache:
            return False

        self._skills_cache[skill_id].enabled = False

        if "enabled_skills" in self.registry:
            self.registry["enabled_skills"] = [s for s in self.registry["enabled_skills"] if s != skill_id]

        save_skill_registry(self.registry)
        return True

    def get_enabled_skills_tier1(self) -> List[Dict[str, Any]]:
        """获取所有已启用技能的 Tier 1 信息（用于 AI 发现）"""
        result = []
        for skill in self._skills_cache.values():
            if skill.enabled and skill.installed:
                result.append(self.get_skill_tier1(skill.id))
        print(f"[SkillManager] 获取已启用技能 Tier1: {len(result)} 个")
        for s in result:
            print(f"[SkillManager]   - {s['id']}: {s['name']} ({s['category']})")
        return result

    def get_all_for_ai(self) -> List[Dict[str, Any]]:
        """获取所有已启用技能的信息（用于 AI 工具选择）"""
        print(f"[SkillManager] get_all_for_ai 调用")
        result = self.get_enabled_skills_tier1()
        print(f"[SkillManager] 返回给AI的技能数量: {len(result)}")
        return result


skill_manager = SkillManager()
