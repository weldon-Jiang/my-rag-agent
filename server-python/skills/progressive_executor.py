"""
渐进式披露执行器 - 动态加载和执行技能
"""

from typing import Dict, Any, Optional, List
from .skill_manager import skill_manager
from .skill_matcher import skill_matcher
import json


class ProgressiveExecutor:
    """渐进式执行器"""
    
    def __init__(self):
        self.skill_manager = skill_manager
        self.skill_matcher = skill_matcher
    
    async def execute_tier1(self, skill_id: str) -> Dict[str, Any]:
        """Tier 1: 发现阶段 - 获取基本信息"""
        skill = self.skill_manager.get_skill(skill_id)
        if not skill:
            return {"success": False, "error": "技能不存在"}
        
        return {
            "tier": 1,
            "skill_id": skill.id,
            "name": skill.name,
            "description": skill.description,
            "tier_level": skill.tier,
            "category": skill.category,
            "action": "identified"
        }
    
    async def execute_tier2(self, skill_id: str) -> Dict[str, Any]:
        """Tier 2: 理解阶段 - 获取详细信息"""
        full_info = self.skill_manager.get_skill_full(skill_id, target_tier=2)
        if not full_info:
            return {"success": False, "error": "无法获取技能详细信息"}
        
        return {
            "tier": 2,
            "skill_id": skill_id,
            "full_info": full_info,
            "metadata": full_info.get("metadata", {}),
            "action": "ready_to_execute"
        }
    
    async def execute_tier3(self, skill_id: str, user_input: str, params: Dict = None) -> Dict[str, Any]:
        """Tier 3: 执行阶段 - 调用技能"""
        params = params or {}
        
        # 获取技能
        skill = self.skill_manager.get_skill(skill_id)
        if not skill:
            return {"success": False, "error": "技能不存在"}
        
        # 获取完整信息
        full_info = self.skill_manager.get_skill_full(skill_id, target_tier=3)
        if not full_info:
            return {"success": False, "error": "无法加载技能完整信息"}
        
        # 尝试执行技能
        try:
            # 检查是否有工具需要调用
            if skill.tools:
                from .tools_registry import tool_registry
                from routers.skills_router import execute_tool
                
                tool_results = []
                for tool_def in skill.tools:
                    tool_name = tool_def.get("name")
                    if tool_name:
                        tool_result = await execute_tool(tool_name, {"query": user_input}, {})
                        if tool_result.get("success"):
                            tool_results.append({"tool": tool_name, "result": tool_result.get("result", {})})
                
                return {
                    "tier": 3,
                    "skill_id": skill_id,
                    "skill_name": skill.name,
                    "action": "executed",
                    "tool_results": tool_results,
                    "success": True
                }
            else:
                # 没有工具的技能，返回技能信息作为结果
                return {
                    "tier": 3,
                    "skill_id": skill_id,
                    "skill_name": skill.name,
                    "action": "executed",
                    "result": {
                        "type": "skill_info",
                        "metadata": full_info.get("metadata", {}),
                        "content": full_info.get("content", "")[:500]
                    },
                    "success": True
                }
        except Exception as e:
            return {
                "tier": 3,
                "skill_id": skill_id,
                "action": "failed",
                "error": str(e),
                "success": False
            }
    
    async def progressive_execute(self, user_input: str, history: List[Dict] = None, intent: str = None) -> Dict[str, Any]:
        """渐进式执行：根据匹配度动态决定执行层级"""
        # Step 1: 渐进式匹配
        match_result = self.skill_matcher.progressive_match(user_input, history, intent)
        tier = match_result["tier"]
        matches = match_result["matches"]
        
        if not matches:
            return {
                "tier": 1,
                "action": "no_match",
                "message": "未匹配到相关技能",
                "matches": []
            }
        
        top_skill, top_confidence, params = matches[0]
        
        # Step 2: 根据 Tier 执行
        if tier == 3:
            # 高置信度：直接执行
            result = await self.execute_tier3(top_skill.id, user_input, params)
            result["confidence"] = top_confidence
            result["skill_name"] = top_skill.name
            return result
        
        elif tier == 2:
            # 中置信度：先获取详细信息
            tier2_result = await self.execute_tier2(top_skill.id)
            tier2_result["confidence"] = top_confidence
            
            # 判断是否需要执行（简单规则：有工具则执行）
            skill = self.skill_manager.get_skill(top_skill.id)
            if skill and skill.tools:
                tier3_result = await self.execute_tier3(top_skill.id, user_input, params)
                tier3_result["confidence"] = top_confidence
                tier3_result["previous_tier"] = 2
                return tier3_result
            
            return tier2_result
        
        else:
            # 低置信度：仅识别
            result = await self.execute_tier1(top_skill.id)
            result["confidence"] = top_confidence
            return result
    
    async def batch_execute(self, user_input: str, max_skills: int = 3) -> List[Dict[str, Any]]:
        """批量执行多个匹配的技能"""
        match_result = self.skill_matcher.progressive_match(user_input)
        results = []
        
        for skill, confidence, params in match_result["matches"][:max_skills]:
            if confidence >= 0.5:
                result = await self.execute_tier3(skill.id, user_input, params)
            elif confidence >= 0.3:
                result = await self.execute_tier2(skill.id)
            else:
                result = await self.execute_tier1(skill.id)
            
            result["confidence"] = confidence
            results.append(result)
        
        return results


progressive_executor = ProgressiveExecutor()
