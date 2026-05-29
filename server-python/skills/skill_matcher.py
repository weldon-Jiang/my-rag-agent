"""
技能匹配器 - 支持语义相似度匹配和上下文感知
"""

import re
import time
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from .skill_manager import skill_manager, Skill
from .skill_monitor import match_logger, performance_monitor

try:
    from sentence_transformers import SentenceTransformer, util
    _has_transformers = True
    _semantic_model = None
except ImportError:
    _has_transformers = False
    _semantic_model = None


def _get_semantic_model():
    """延迟加载语义模型"""
    global _semantic_model
    if not _semantic_model and _has_transformers:
        _semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _semantic_model


class SkillMatcher:
    """增强的技能匹配器"""
    
    def __init__(self):
        self.skill_manager = skill_manager
    
    def match_by_keywords(self, user_input: str) -> List[Tuple[Skill, float, Dict]]:
        """基于关键词的传统匹配"""
        user_input_lower = user_input.lower()
        matches = []
        
        for skill in self.skill_manager._skills_cache.values():
            if not skill.enabled or not skill.installed:
                continue
            
            confidence = 0.0
            params = {}
            
            for keyword in skill.keywords:
                if keyword.lower() in user_input_lower:
                    confidence += 0.3
            
            for pattern in skill.patterns:
                match = re.search(pattern, user_input, re.IGNORECASE)
                if match:
                    confidence += 0.4
                    if match.groups():
                        params['extracted'] = match.group(1)
            
            if confidence > 0:
                matches.append((skill, min(confidence, 1.0), params))
        
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches
    
    def match_by_semantic(self, user_input: str) -> List[Tuple[Skill, float, Dict]]:
        """基于语义相似度的匹配"""
        model = _get_semantic_model()
        if not model:
            return self.match_by_keywords(user_input)
        
        try:
            input_embedding = model.encode(user_input, convert_to_tensor=True)
            matches = []
            
            for skill in self.skill_manager._skills_cache.values():
                if not skill.enabled or not skill.installed:
                    continue
                
                skill_text = f"{skill.name} {skill.description} {' '.join(skill.keywords)}"
                skill_embedding = model.encode(skill_text, convert_to_tensor=True)
                
                similarity = util.cos_sim(input_embedding, skill_embedding).item()
                
                if similarity > 0.2:
                    matches.append((skill, similarity, {}))
            
            matches.sort(key=lambda x: x[1], reverse=True)
            return matches
        except Exception as e:
            print(f"[SkillMatcher] 语义匹配失败: {e}")
            return self.match_by_keywords(user_input)
    
    def match_with_history(self, user_input: str, history: List[Dict[str, str]]) -> List[Tuple[Skill, float, Dict]]:
        """结合对话历史的匹配"""
        context_text = user_input
        for msg in history[-5:]:
            context_text += f" {msg.get('content', '')}"
        
        return self.match_by_semantic(context_text)
    
    def match_by_intent(self, user_input: str, intent: str) -> List[Tuple[Skill, float, Dict]]:
        """基于意图的匹配"""
        intent_category_map = {
            "weather_query": ["weather", "information"],
            "web_search": ["information", "search"],
            "knowledge_search": ["knowledge"],
            "code_execute": ["development", "code"],
            "file_operation": ["document", "file"],
            "location_query": ["information", "location"]
        }
        
        categories = intent_category_map.get(intent, [])
        if not categories:
            return self.match_by_semantic(user_input)
        
        user_input_lower = user_input.lower()
        matches = []
        
        for skill in self.skill_manager._skills_cache.values():
            if not skill.enabled or not skill.installed:
                continue
            
            if skill.category.lower() in categories:
                confidence = 0.5
                params = {}
                
                for keyword in skill.keywords:
                    if keyword.lower() in user_input_lower:
                        confidence += 0.2
                
                matches.append((skill, min(confidence, 1.0), params))
        
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches
    
    def progressive_match(self, user_input: str, history: List[Dict] = None, intent: str = None) -> Dict[str, Any]:
        """渐进式匹配：从粗略到精细"""
        start_time = time.time()
        history = history or []
        
        # Phase 1: 快速关键词匹配（筛选候选）
        keyword_matches = self.match_by_keywords(user_input)
        if not keyword_matches:
            performance_monitor.record_match_time(time.time() - start_time)
            return {"tier": 1, "matches": [], "confidence": 0.0}
        
        # Phase 2: 语义精修（提高准确性）
        semantic_matches = self.match_by_semantic(user_input)
        
        # Phase 3: 上下文增强（结合历史）
        context_matches = self.match_with_history(user_input, history)
        
        # 融合结果
        merged = {}
        for matches in [keyword_matches, semantic_matches, context_matches]:
            for skill, confidence, params in matches:
                if skill.id not in merged:
                    merged[skill.id] = {"skill": skill, "confidence": 0.0, "params": {}}
                merged[skill.id]["confidence"] += confidence
                merged[skill.id]["params"].update(params)
        
        # 归一化置信度
        max_confidence = max([m["confidence"] for m in merged.values()], default=1.0)
        result = []
        for item in merged.values():
            item["confidence"] = item["confidence"] / 3
            result.append((item["skill"], item["confidence"], item["params"]))
        
        result.sort(key=lambda x: x[1], reverse=True)
        
        tier = 1
        if result and result[0][1] >= 0.7:
            tier = 3
        elif result and result[0][1] >= 0.4:
            tier = 2
        
        # 记录性能
        performance_monitor.record_match_time(time.time() - start_time)
        
        # 记录日志
        if result:
            top_skill = result[0][0]
            match_logger.log_match(
                user_input=user_input,
                skill_id=top_skill.id,
                confidence=result[0][1],
                tier=tier,
                success=True,
                intent=intent or ""
            )
        
        return {
            "tier": tier,
            "matches": result[:5],
            "top_confidence": result[0][1] if result else 0.0
        }


skill_matcher = SkillMatcher()
