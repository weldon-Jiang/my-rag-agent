from typing import List, Dict, Any, Optional
import time


class TaskStep:
    def __init__(self, step_id: int, description: str, status: str = "pending"):
        self.id = step_id
        self.description = description
        self.status = status
        self.result: Optional[str] = None
        self.error: Optional[str] = None
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None

    def start(self):
        self.status = "in_progress"
        self.start_time = time.time()

    def complete(self, result: str):
        self.status = "completed"
        self.result = result
        self.end_time = time.time()

    def fail(self, error: str):
        self.status = "failed"
        self.error = error
        self.end_time = time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "description": self.description,
            "status": self.status,
            "result": self.result,
            "error": self.error,
            "duration": (self.end_time - self.start_time) if self.start_time and self.end_time else None
        }


class Plan:
    def __init__(self, plan_id: str, goal: str, steps: List[str]):
        self.id = plan_id
        self.goal = goal
        self.steps: List[TaskStep] = [
            TaskStep(i + 1, desc) for i, desc in enumerate(steps)
        ]
        self.status = "active"
        self.created_at = time.time()
        self.updated_at = time.time()

    def get_progress(self) -> Dict[str, Any]:
        completed = sum(1 for s in self.steps if s.status == "completed")
        return {
            "total": len(self.steps),
            "completed": completed,
            "percentage": int((completed / len(self.steps)) * 100) if self.steps else 0
        }

    def is_complete(self) -> bool:
        return all(s.status == "completed" for s in self.steps)

    def has_failed(self) -> bool:
        return any(s.status == "failed" for s in self.steps)

    def get_next_step(self) -> Optional[TaskStep]:
        for step in self.steps:
            if step.status == "pending":
                return step
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "goal": self.goal,
            "status": self.status,
            "progress": self.get_progress(),
            "steps": [s.to_dict() for s in self.steps],
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class PlanningService:
    def __init__(self):
        self.plans: Dict[str, Plan] = {}
        self.max_plans = 100

    def create_plan(self, goal: str, steps: List[str]) -> Plan:
        if len(self.plans) >= self.max_plans:
            oldest_key = next(iter(self.plans))
            del self.plans[oldest_key]

        plan_id = f"plan_{int(time.time() * 1000)}"
        plan = Plan(plan_id, goal, steps)
        self.plans[plan_id] = plan

        print(f"[Planning] 创建计划 {plan_id}: {goal}")
        print(f"[Planning] 步骤数: {len(steps)}")

        return plan

    def get_plan(self, plan_id: str) -> Optional[Plan]:
        return self.plans.get(plan_id)

    def update_plan_status(self, plan_id: str, status: str) -> Optional[Plan]:
        plan = self.plans.get(plan_id)
        if plan:
            plan.status = status
            plan.updated_at = time.time()
        return plan

    def start_step(self, plan_id: str, step_id: int) -> Optional[TaskStep]:
        plan = self.plans.get(plan_id)
        if not plan:
            return None

        for step in plan.steps:
            if step.id == step_id:
                step.start()
                plan.updated_at = time.time()
                return step
        return None

    def complete_step(self, plan_id: str, step_id: int, result: str) -> Optional[TaskStep]:
        plan = self.plans.get(plan_id)
        if not plan:
            return None

        for step in plan.steps:
            if step.id == step_id:
                step.complete(result)
                plan.updated_at = time.time()

                if plan.is_complete():
                    plan.status = "completed"
                return step
        return None

    def fail_step(self, plan_id: str, step_id: int, error: str) -> Optional[TaskStep]:
        plan = self.plans.get(plan_id)
        if not plan:
            return None

        for step in plan.steps:
            if step.id == step_id:
                step.fail(error)
                plan.status = "failed"
                plan.updated_at = time.time()
                return step
        return None

    def adjust_plan(self, plan_id: str, new_steps: List[str]) -> Optional[Plan]:
        plan = self.plans.get(plan_id)
        if not plan:
            return None

        completed_steps = [s for s in plan.steps if s.status == "completed"]
        new_plan_steps = [
            s.description for s in completed_steps
        ] + new_steps[len(completed_steps):]

        plan.steps = [
            TaskStep(i + 1, desc, "completed" if i < len(completed_steps) else "pending")
            for i, desc in enumerate(new_plan_steps)
        ]
        plan.updated_at = time.time()

        return plan

    def get_active_plans(self) -> List[Dict[str, Any]]:
        return [
            p.to_dict() for p in self.plans.values()
            if p.status == "active"
        ]

    def get_plan_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        sorted_plans = sorted(
            self.plans.values(),
            key=lambda p: p.updated_at,
            reverse=True
        )
        return [p.to_dict() for p in sorted_plans[:limit]]

    def clear_completed_plans(self):
        to_delete = [
            pid for pid, plan in self.plans.items()
            if plan.status in ["completed", "failed"]
        ]
        for pid in to_delete:
            del self.plans[pid]

    def delete_plan(self, plan_id: str) -> bool:
        if plan_id in self.plans:
            del self.plans[plan_id]
            return True
        return False


planning_service = PlanningService()


async def decompose_task_with_llm(task: str, model_config: Dict) -> Optional[Dict[str, Any]]:
    from services.ai_service import call_ai_service

    decomposition_prompt = f"""你是一个任务规划专家，擅长将复杂任务分解为可执行的步骤。

任务：{task}

要求：
1. 将任务分解为 3-7 个具体的执行步骤
2. 每个步骤应该是一个独立的动作
3. 步骤之间应该有明确的依赖关系
4. 使用动词开头描述每个步骤

输出格式：
{{
  "goal": "任务的总体目标",
  "steps": ["步骤1", "步骤2", "步骤3", ...]
}}

请直接输出JSON，不要有其他内容。"""

    try:
        result = await call_ai_service(
            prompt=decomposition_prompt,
            system_prompt="你是一个任务规划专家。",
            model_config=model_config
        )

        if result.get("success"):
            import json
            content = result.get("content", "")

            try:
                json_start = content.find("{")
                json_end = content.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    parsed = json.loads(content[json_start:json_end])
                    return {
                        "goal": parsed.get("goal", task),
                        "steps": parsed.get("steps", [])
                    }
            except json.JSONDecodeError:
                pass

        return None

    except Exception as e:
        print(f"[Planning] 任务分解失败: {str(e)}")
        return None