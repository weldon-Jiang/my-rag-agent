from typing import Dict, List, Any, Optional
from datetime import datetime


class ShortTermMemory:
    def __init__(self, max_size: int = 50):
        self.messages: List[Dict[str, Any]] = []
        self.context: Dict[str, Any] = {}
        self.max_size = max_size

    def add_message(self, role: str, content: str, metadata: Dict = None):
        if metadata is None:
            metadata = {}

        self.messages.append({
            "role": role,
            "content": content,
            "metadata": metadata,
            "timestamp": datetime.now().timestamp()
        })

        if len(self.messages) > self.max_size:
            self.messages.pop(0)

    def get_messages(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self.messages[-limit:]

    def get_context(self, key: str) -> Any:
        return self.context.get(key)

    def set_context(self, key: str, value: Any):
        self.context[key] = value

    def clear_context(self):
        self.context = {}

    def get_conversation_summary(self) -> str:
        if not self.messages:
            return ""

        recent = self.messages[-10:]
        return "\n".join([f"{m['role']}: {m['content']}" for m in recent])

    def clear(self):
        self.messages = []
        self.context = {}

    def size(self) -> int:
        return len(self.messages)


class LongTermMemory:
    def __init__(self):
        self.user_profiles: Dict[str, Dict] = {}
        self.preferences: Dict[str, Dict[str, Dict]] = {}

    async def save_user_profile(self, user_id: str, profile: Dict):
        existing = self.user_profiles.get(user_id, {})
        self.user_profiles[user_id] = {
            **existing,
            **profile,
            "updated_at": datetime.now().timestamp()
        }
        print(f"[LongTermMemory] 保存用户画像: {user_id}")

    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        return self.user_profiles.get(user_id)

    async def save_preference(self, user_id: str, key: str, value: Any):
        if user_id not in self.preferences:
            self.preferences[user_id] = {}

        self.preferences[user_id][key] = {
            "value": value,
            "updated_at": datetime.now().timestamp()
        }
        print(f"[LongTermMemory] 保存偏好: {user_id}/{key}")

    def get_preference(self, user_id: str, key: str) -> Any:
        if user_id not in self.preferences:
            return None
        pref = self.preferences[user_id].get(key)
        return pref["value"] if pref else None

    def get_all_preferences(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self.preferences:
            return {}
        return {
            key: data["value"]
            for key, data in self.preferences[user_id].items()
        }

    async def save_knowledge(self, user_id: str, knowledge: Any):
        print(f"[LongTermMemory] 保存知识: {user_id}")

    async def search_knowledge(self, query: str, user_id: str, top_k: int = 5) -> List[Dict]:
        print(f"[LongTermMemory] 搜索知识: {query}, user: {user_id}")
        return []

    async def learn_from_conversation(self, user_id: str, conversation: List[Dict]):
        for msg in conversation:
            if msg.get("role") in ["user", "assistant"]:
                print(f"[LongTermMemory] 从对话中学习: {user_id}")

    def clear_user_data(self, user_id: str):
        if user_id in self.user_profiles:
            del self.user_profiles[user_id]
        if user_id in self.preferences:
            del self.preferences[user_id]
        print(f"[LongTermMemory] 清除用户数据: {user_id}")


class MemoryService:
    def __init__(self):
        self.short_term = ShortTermMemory()
        self.long_term = LongTermMemory()

    def add_user_message(self, content: str, metadata: Dict = None):
        self.short_term.add_message("user", content, metadata)

    def add_assistant_message(self, content: str, metadata: Dict = None):
        self.short_term.add_message("assistant", content, metadata)

    def get_conversation_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self.short_term.get_messages(limit)

    def get_context(self, key: str) -> Any:
        return self.short_term.get_context(key)

    def set_context(self, key: str, value: Any):
        self.short_term.set_context(key, value)

    async def save_user_profile(self, user_id: str, profile: Dict):
        await self.long_term.save_user_profile(user_id, profile)

    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        return self.long_term.get_user_profile(user_id)

    async def save_preference(self, user_id: str, key: str, value: Any):
        await self.long_term.save_preference(user_id, key, value)

    def get_preference(self, user_id: str, key: str) -> Any:
        return self.long_term.get_preference(user_id, key)

    def get_all_preferences(self, user_id: str) -> Dict[str, Any]:
        return self.long_term.get_all_preferences(user_id)

    async def search_user_knowledge(self, query: str, user_id: str, top_k: int = 5) -> List[Dict]:
        return await self.long_term.search_knowledge(query, user_id, top_k)

    async def learn_from_conversation(self, user_id: str):
        conversation = self.short_term.get_messages(50)
        await self.long_term.learn_from_conversation(user_id, conversation)

    def build_context_for_llm(self, user_id: str, system_context: str = "") -> str:
        short_term_context = self.short_term.get_conversation_summary()
        user_profile = self.get_user_profile(user_id)
        preferences = self.get_all_preferences(user_id)

        context = ""

        if system_context:
            context += f"[系统信息]\n{system_context}\n\n"

        if user_profile:
            context += "[用户画像]\n"
            context += f"姓名: {user_profile.get('name', '未知')}\n"
            context += f"关系: {user_profile.get('relationship', '朋友')}\n"
            if user_profile.get('interests'):
                context += f"兴趣: {', '.join(user_profile['interests'])}\n"
            context += "\n"

        if preferences:
            context += "[用户偏好]\n"
            for key, value in preferences.items():
                context += f"{key}: {value}\n"
            context += "\n"

        if short_term_context:
            context += f"[当前对话]\n{short_term_context}\n"

        return context

    def clear_session(self):
        self.short_term.clear()

    def clear_user_data(self, user_id: str):
        self.long_term.clear_user_data(user_id)


memory_service = MemoryService()