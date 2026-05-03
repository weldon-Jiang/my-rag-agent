"""
技能优先级配置与组合执行
"""

from typing import Dict, List, Any, Tuple
from .skill_manager import skill_manager, Skill

# 默认技能优先级配置
SKILL_PRIORITIES = {
    # 优先级: 1-10, 数字越大优先级越高
    "weather-query": 9,
    "location-query": 9,
    "web-search": 8,
    "file-reader": 8,
    "data-analyst": 7,
    "code-reviewer": 7,
    "frontend-design": 7,
    "pdf-extract": 6,
    "docx": 6,
    "image-understand": 5,
    "skill-creator": 5,
    "canvas-design": 4,
    "general": 1
}


class SkillPriorityManager:
    """技能优先级管理器"""
    
    def __init__(self):
        self.priorities = SKILL_PRIORITIES.copy()
    
    def get_priority(self, skill_id: str) -> int:
        """获取技能优先级"""
        return self.priorities.get(skill_id, 1)
    
    def set_priority(self, skill_id: str, priority: int):
        """设置技能优先级"""
        if 1 <= priority <= 10:
            self.priorities[skill_id] = priority
            return True
        return False
    
    def load_priorities(self, config: Dict[str, int]):
        """从配置加载优先级"""
        for skill_id, priority in config.items():
            self.set_priority(skill_id, priority)
    
    def save_priorities(self) -> Dict[str, int]:
        """保存优先级配置"""
        return self.priorities.copy()
    
    def sort_by_priority(self, skills: List[Tuple[Skill, float, Dict]]) -> List[Tuple[Skill, float, Dict]]:
        """按优先级排序技能"""
        sorted_skills = sorted(
            skills,
            key=lambda x: (-self.get_priority(x[0].id), -x[1])
        )
        return sorted_skills


class SkillCombinationExecutor:
    """技能组合执行器"""
    
    def __init__(self):
        self.priority_manager = SkillPriorityManager()
    
    async def execute_combination(self, user_input: str, max_skills: int = 3) -> Dict[str, Any]:
        """执行技能组合"""
        from .skill_matcher import skill_matcher
        
        # 获取匹配的技能
        match_result = skill_matcher.progressive_match(user_input)
        matches = match_result["matches"]
        
        # 按优先级排序
        prioritized = self.priority_manager.sort_by_priority(matches)
        
        # 选择前N个技能执行
        results = []
        used_skills = []
        
        for skill, confidence, params in prioritized[:max_skills]:
            if confidence >= 0.4:  # 只执行置信度足够高的技能
                result = await self._execute_skill(skill.id, user_input, params)
                if result.get("success"):
                    results.append(result)
                    used_skills.append(skill.id)
        
        # 整合结果
        return {
            "success": len(results) > 0,
            "results": results,
            "skills_used": used_skills,
            "count": len(results)
        }
    
    async def _execute_skill(self, skill_id: str, user_input: str, params: Dict) -> Dict[str, Any]:
        """执行单个技能"""
        from .progressive_executor import progressive_executor
        return await progressive_executor.execute_tier3(skill_id, user_input, params)
    
    def find_complementary_skills(self, skill_id: str) -> List[str]:
        """查找互补技能"""
        skill = skill_manager.get_skill(skill_id)
        if not skill:
            return []
        
        complementary = []
        skill_category = skill.category
        
        # 根据分类查找互补技能
        category_complements = {
            "development": ["code-reviewer", "data-analyst"],
            "document": ["pdf-extract", "docx", "file-reader"],
            "information": ["web-search", "location-query", "weather-query"],
            "analysis": ["data-analyst", "frontend-design"],
            "design": ["frontend-design", "canvas-design"]
        }
        
        if skill_category in category_complements:
            for comp_id in category_complements[skill_category]:
                if comp_id != skill_id and skill_manager.get_skill(comp_id):
                    complementary.append(comp_id)
        
        return complementary
    
    async def execute_with_complements(self, primary_skill_id: str, user_input: str) -> Dict[str, Any]:
        """执行主技能及其互补技能"""
        results = []
        
        # 执行主技能
        primary_result = await self._execute_skill(primary_skill_id, user_input, {})
        results.append({"type": "primary", "result": primary_result})
        
        # 执行互补技能
        complements = self.find_complementary_skills(primary_skill_id)
        for comp_id in complements[:2]:  # 最多执行2个互补技能
            comp_result = await self._execute_skill(comp_id, user_input, {})
            if comp_result.get("success"):
                results.append({"type": "complement", "skill_id": comp_id, "result": comp_result})
        
        return {
            "success": True,
            "results": results,
            "primary_skill": primary_skill_id,
            "complements": complements
        }


skill_priority_manager = SkillPriorityManager()
skill_combination_executor = SkillCombinationExecutor()
