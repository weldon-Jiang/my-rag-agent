"""
工具注册表 - 动态工具发现和执行

工具通过注册表声明自己的能力（关键词、模式），
系统根据用户输入自动匹配和执行工具，无需硬编码。

支持从 config/tools_config.json 配置文件加载工具定义，
新工具只需添加到配置文件即可自动被匹配，无需修改代码。
"""

import re
import json
import asyncio
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ToolCapability:
    """工具能力定义"""
    keywords: List[str] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    description: str = ""
    intent_keywords: Dict[str, str] = field(default_factory=dict)


@dataclass
class ToolDefinition:
    """工具定义"""
    name: str
    description: str
    capability: ToolCapability
    execute_func: Optional[Callable] = None
    parameter_extractor: Optional[Callable] = None


class ToolRegistry:
    """工具注册表管理器"""

    _instance = None
    _tools: Dict[str, ToolDefinition] = {}
    _skill_tools: Dict[str, Any] = {}
    _skill_tool_references: Dict[str, Dict[str, str]] = {}
    _tool_to_skills: Dict[str, List[str]] = {}
    _config_path = Path(__file__).resolve().parent.parent / "config" / "tools_config.json"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._load_tools_from_config()
        if not self._tools:
            self._initialize_default_tools()
        # 注册技能管理工具
        self._register_skill_management_tools()

    def _load_tools_from_config(self):
        """从配置文件加载工具定义"""
        if not self._config_path.exists():
            print(f"[ToolRegistry] 配置文件不存在: {self._config_path}")
            return

        try:
            with open(self._config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            tools_config = config.get("tools", [])
            for tool_config in tools_config:
                tool_def = ToolDefinition(
                    name=tool_config["name"],
                    description=tool_config.get("description", ""),
                    capability=ToolCapability(
                        keywords=tool_config.get("keywords", []),
                        patterns=tool_config.get("patterns", []),
                        description=tool_config.get("description", "")
                    ),
                    execute_func=None,
                    parameter_extractor=self._get_extractor(tool_config.get("parameter_extractor"))
                )
                self.register_tool(tool_def)
                print(f"[ToolRegistry] ✓ 从配置加载工具: {tool_config['name']} (keywords: {len(tool_config.get('keywords', []))})")

            print(f"[ToolRegistry] 从配置文件加载了 {len(tools_config)} 个工具")
        except Exception as e:
            print(f"[ToolRegistry] 加载配置文件失败: {e}")
            self._initialize_default_tools()

    def _get_extractor(self, extractor_name: str) -> Optional[Callable]:
        """根据名称获取参数提取器"""
        extractors = {
            "city": self._extract_city,
            "location": self._extract_location,
            "query": self._extract_query,
            "path": self._extract_path,
            "write_params": self._extract_write_params
        }
        return extractors.get(extractor_name)

    def register_tool(self, tool: ToolDefinition):
        """注册工具"""
        self._tools[tool.name] = tool
        print(f"[ToolRegistry] 注册工具: {tool.name}")

    def register_tool_with_func(self, name: str, description: str, execute_func):
        """注册工具（带执行函数）"""
        from dataclasses import dataclass
        @dataclass
        class SimpleCapability:
            keywords: list = field(default_factory=list)
            patterns: list = field(default_factory=list)
            description: str = ""

        self._tools[name] = ToolDefinition(
            name=name,
            description=description,
            capability=SimpleCapability(description=description),
            execute_func=execute_func,
            parameter_extractor=None
        )
        print(f"[ToolRegistry] 注册工具(含执行函数): {name}")

    def register_skill_tool(self, skill_tool):
        """注册技能工具"""
        self._skill_tools[skill_tool.name] = skill_tool
        self._tools[skill_tool.name] = ToolDefinition(
            name=skill_tool.name,
            description=skill_tool.description,
            capability=skill_tool.capability,
            execute_func=None,
            parameter_extractor=None
        )
        print(f"[ToolRegistry] 注册技能工具: {skill_tool.name} -> {skill_tool.tool_name}")

    def unregister_tool(self, tool_name: str):
        """注销工具"""
        if tool_name in self._tools:
            del self._tools[tool_name]

    def register_skill_tool_reference(self, skill_id: str, skill_name: str, tool_name: str):
        """注册技能对工具的引用"""
        if skill_id not in self._skill_tool_references:
            self._skill_tool_references[skill_id] = {}
        self._skill_tool_references[skill_id][tool_name] = tool_name

        if tool_name not in self._tool_to_skills:
            self._tool_to_skills[tool_name] = []
        if skill_id not in self._tool_to_skills[tool_name]:
            self._tool_to_skills[tool_name].append(skill_id)

        print(f"[ToolRegistry] 注册技能工具引用: {skill_name} -> {tool_name}")

    def unregister_skill_tools(self, skill_id: str):
        """注销技能的所有工具引用"""
        if skill_id in self._skill_tool_references:
            for tool_name in self._skill_tool_references[skill_id].values():
                if tool_name in self._tool_to_skills:
                    if skill_id in self._tool_to_skills[tool_name]:
                        self._tool_to_skills[tool_name].remove(skill_id)
            del self._skill_tool_references[skill_id]
            print(f"[ToolRegistry] 已注销技能的工具引用: {skill_id}")

    def tool_exists(self, tool_name: str) -> bool:
        """检查工具是否存在（已注册）"""
        return tool_name in self._tools

    def is_tool_executable(self, tool_name: str) -> bool:
        """检查工具是否有执行函数"""
        return tool_name in self._tools and self._tools[tool_name].execute_func is not None

    def get_missing_tools(self, skill_id: str) -> List[str]:
        """获取技能缺失的工具列表"""
        if skill_id not in self._skill_tool_references:
            return []
        missing = []
        for tool_name in self._skill_tool_references[skill_id].values():
            if not self.is_tool_executable(tool_name):
                missing.append(tool_name)
        return missing

    def get_all_tools_info(self) -> Dict[str, Any]:
        """获取所有工具信息"""
        return {
            "registered_tools": list(self._tools.keys()),
            "skill_tool_references": self._skill_tool_references,
            "tool_to_skills": self._tool_to_skills,
        }

    def match_tools(self, user_input: str) -> List[tuple]:
        """匹配用户输入，返回 [(tool_name, confidence, params), ...]"""
        user_input_lower = user_input.lower()
        matches = []

        for tool_name, tool in self._tools.items():
            confidence = 0
            params = {}

            for keyword in tool.capability.keywords:
                if keyword.lower() in user_input_lower:
                    confidence += 0.3

            for pattern in tool.capability.patterns:
                match = re.search(pattern, user_input)
                if match:
                    confidence += 0.4
                    if match.groups():
                        params['extracted'] = match.group(1)

            if tool.parameter_extractor:
                extracted_params = tool.parameter_extractor(user_input)
                if extracted_params:
                    params.update(extracted_params)

            if confidence > 0:
                matches.append((tool_name, confidence, params))

        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    async def execute_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """执行工具"""
        if tool_name not in self._tools:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

        tool = self._tools[tool_name]

        if tool.execute_func is None:
            return {"success": False, "error": f"Tool {tool_name} has no execute function"}

        try:
            result = tool.execute_func(**params)
            if asyncio.iscoroutine(result):
                result = await result
            return {"success": True, "result": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_all_tools(self) -> List[Dict[str, Any]]:
        """获取所有工具信息"""
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "capability": {
                    "keywords": tool.capability.keywords,
                    "description": tool.capability.description
                }
            }
            for tool in self._tools.values()
        ]

    def reload_config(self):
        """重新加载配置文件（热更新）"""
        print(f"[ToolRegistry] 开始重载配置文件...")
        self._tools.clear()
        self._initialized = False
        self.__init__()
        print(f"[ToolRegistry] 配置重载完成，当前工具数: {len(self._tools)}")

    def reload_skill_tools(self):
        """重新从技能加载工具引用"""
        print(f"[ToolRegistry] 开始重新加载技能工具引用...")
        self._skill_tool_references.clear()
        self._tool_to_skills.clear()
        from skill_manager import skill_manager
        for skill in skill_manager._skills_cache.values():
            if skill.tools:
                self._register_skill_tools(skill)
        print(f"[ToolRegistry] 技能工具引用重载完成，当前引用数: {len(self._skill_tool_references)}")

    def _register_skill_tools(self, skill):
        """内部方法：注册技能的工具"""
        for tool_def in skill.tools:
            tool_name = tool_def.get("name")
            if tool_name:
                self.register_skill_tool_reference(skill.id, skill.name, tool_name)

    @staticmethod
    def _extract_city(text: str) -> Dict[str, str]:
        """提取城市名"""
        patterns = [
            r"(.+?)天气",
            r"(.+?)的温度",
            r"在(.+?)天气",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match and match.group(1):
                city = match.group(1).strip()
                if city and len(city) >= 2:
                    return {"city": city}
        return {"city": "深圳"}

    @staticmethod
    def _extract_location(text: str) -> Dict[str, str]:
        """提取位置名"""
        patterns = [
            r"(.+?)在哪里",
            r"(.+?)的地址",
            r"在(.+?)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match and match.group(1):
                location = match.group(1).strip()
                if location:
                    return {"location": location}
        return {"location": text}

    @staticmethod
    def _extract_query(text: str) -> Dict[str, Any]:
        """提取搜索查询"""
        patterns = [
            r"搜索(.+)",
            r"查找(.+)",
            r"了解一下(.+)",
            r"(.+)是什么",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match and match.group(1):
                query = match.group(1).strip()
                if query:
                    return {"query": query, "max_results": 5}
        return {"query": text, "max_results": 5}

    @staticmethod
    def _extract_path(text: str) -> Dict[str, str]:
        """提取文件路径"""
        patterns = [
            r"读取(.+)",
            r"看(.+)文件",
            r"打开(.+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match and match.group(1):
                path = match.group(1).strip()
                if path:
                    return {"path": path}
        return {"path": text}

    @staticmethod
    def _extract_write_params(text: str) -> Dict[str, Any]:
        """提取写入参数"""
        return {"content": text}

    def _register_skill_management_tools(self):
        """注册技能管理工具"""
        from skills.marketplace import SkillMarketplace
        
        async def create_skill_tool(**params):
            """创建新技能并自动注册"""
            try:
                skill_id = params.get("skill_id")
                name = params.get("name", skill_id)
                description = params.get("description", "")
                version = params.get("version", "1.0.0")
                author = params.get("author", "unknown")
                tier = params.get("tier", 1)
                category = params.get("category", "general")
                tags = params.get("tags", [])
                instructions = params.get("instructions", "")
                examples = params.get("examples", [])
                guidelines = params.get("guidelines", [])
                
                # 调用 SkillMarketplace 创建技能
                result = SkillMarketplace.create_skill(
                    skill_id=skill_id,
                    name=name,
                    description=description,
                    version=version,
                    author=author,
                    tier=tier,
                    category=category,
                    tags=tags,
                    instructions=instructions,
                    examples=examples,
                    guidelines=guidelines
                )
                
                return {
                    "success": result,
                    "message": f"技能 {skill_id} 创建成功" if result else f"技能 {skill_id} 创建失败"
                }
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        # 注册 create_skill 工具
        self.register_tool_with_func(
            name="create_skill",
            description="创建新技能并自动注册。参数：skill_id, name, description, version, author, tier, category, tags, instructions, examples, guidelines",
            execute_func=create_skill_tool
        )


tool_registry = ToolRegistry()
