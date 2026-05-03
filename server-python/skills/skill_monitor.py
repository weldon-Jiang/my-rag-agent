"""
技能匹配日志和监控
"""

import time
import json
from typing import Dict, List, Any
from datetime import datetime
from pathlib import Path

LOG_DIR = Path(__file__).parent.parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


class MatchLog:
    """匹配日志记录"""
    
    def __init__(self):
        self.logs = []
        self.metrics = {
            "total_matches": 0,
            "success_matches": 0,
            "failed_matches": 0,
            "avg_confidence": 0.0,
            "tier1_count": 0,
            "tier2_count": 0,
            "tier3_count": 0,
            "skill_usage": {},
            "intent_distribution": {}
        }
    
    def log_match(self, user_input: str, skill_id: str, confidence: float, tier: int, success: bool, intent: str = ""):
        """记录匹配日志"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_input": user_input[:200],
            "skill_id": skill_id,
            "confidence": confidence,
            "tier": tier,
            "success": success,
            "intent": intent,
            "processing_time": time.time()
        }
        
        self.logs.append(log_entry)
        
        # 更新指标
        self.metrics["total_matches"] += 1
        if success:
            self.metrics["success_matches"] += 1
        else:
            self.metrics["failed_matches"] += 1
        
        # 更新平均置信度
        if self.metrics["total_matches"] > 0:
            self.metrics["avg_confidence"] = (
                (self.metrics["avg_confidence"] * (self.metrics["total_matches"] - 1) + confidence)
                / self.metrics["total_matches"]
            )
        
        # 更新层级计数
        if tier == 1:
            self.metrics["tier1_count"] += 1
        elif tier == 2:
            self.metrics["tier2_count"] += 1
        elif tier == 3:
            self.metrics["tier3_count"] += 1
        
        # 更新技能使用计数
        self.metrics["skill_usage"][skill_id] = self.metrics["skill_usage"].get(skill_id, 0) + 1
        
        # 更新意图分布
        if intent:
            self.metrics["intent_distribution"][intent] = self.metrics["intent_distribution"].get(intent, 0) + 1
        
        # 定期保存日志
        if len(self.logs) >= 100:
            self.save_logs()
    
    def save_logs(self):
        """保存日志到文件"""
        if not self.logs:
            return
        
        log_file = LOG_DIR / f"skill_matches_{datetime.now().strftime('%Y%m%d')}.json"
        
        # 读取现有日志
        existing_logs = []
        if log_file.exists():
            try:
                existing_logs = json.loads(log_file.read_text(encoding="utf-8"))
            except:
                existing_logs = []
        
        # 添加新日志
        existing_logs.extend(self.logs)
        
        # 保存
        log_file.write_text(json.dumps(existing_logs, ensure_ascii=False, indent=2), encoding="utf-8")
        
        # 清空内存中的日志
        self.logs = []
    
    def get_metrics(self) -> Dict[str, Any]:
        """获取监控指标"""
        return {
            **self.metrics,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_recent_logs(self, limit: int = 20) -> List[Dict]:
        """获取最近的日志"""
        return self.logs[-limit:]
    
    def reset_metrics(self):
        """重置指标"""
        self.metrics = {
            "total_matches": 0,
            "success_matches": 0,
            "failed_matches": 0,
            "avg_confidence": 0.0,
            "tier1_count": 0,
            "tier2_count": 0,
            "tier3_count": 0,
            "skill_usage": {},
            "intent_distribution": {}
        }


class PerformanceMonitor:
    """性能监控"""
    
    def __init__(self):
        self.match_times = []
        self.execute_times = []
    
    def record_match_time(self, duration: float):
        """记录匹配耗时"""
        self.match_times.append(duration)
        if len(self.match_times) > 1000:
            self.match_times = self.match_times[-1000:]
    
    def record_execute_time(self, duration: float):
        """记录执行耗时"""
        self.execute_times.append(duration)
        if len(self.execute_times) > 1000:
            self.execute_times = self.execute_times[-1000:]
    
    def get_performance_stats(self) -> Dict[str, float]:
        """获取性能统计"""
        if not self.match_times:
            match_stats = {"avg": 0, "min": 0, "max": 0}
        else:
            match_stats = {
                "avg": sum(self.match_times) / len(self.match_times),
                "min": min(self.match_times),
                "max": max(self.match_times)
            }
        
        if not self.execute_times:
            execute_stats = {"avg": 0, "min": 0, "max": 0}
        else:
            execute_stats = {
                "avg": sum(self.execute_times) / len(self.execute_times),
                "min": min(self.execute_times),
                "max": max(self.execute_times)
            }
        
        return {
            "matching": match_stats,
            "execution": execute_stats,
            "timestamp": datetime.now().isoformat()
        }


# 全局实例
match_logger = MatchLog()
performance_monitor = PerformanceMonitor()
