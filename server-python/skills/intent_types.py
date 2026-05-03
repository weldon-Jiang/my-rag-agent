"""
意图类型定义与扩展
"""

# 意图类型定义
INTENT_TYPES = {
    # 信息查询类
    "weather_query": {
        "name": "天气查询",
        "description": "查询天气相关信息",
        "keywords": ["天气", "气温", "温度", "预报", "下雨", "晴天", "刮风"],
        "categories": ["weather", "information"]
    },
    "web_search": {
        "name": "网页搜索",
        "description": "在互联网上搜索信息",
        "keywords": ["搜索", "查找", "了解", "查询", "资料", "信息"],
        "categories": ["information", "search"]
    },
    "knowledge_search": {
        "name": "知识库检索",
        "description": "检索本地知识库内容",
        "keywords": ["知识库", "文档", "资料", "查找", "搜索"],
        "categories": ["knowledge"]
    },
    "location_query": {
        "name": "位置查询",
        "description": "查询地理位置信息",
        "keywords": ["位置", "地点", "在哪里", "经纬度", "地址"],
        "categories": ["information", "location"]
    },
    
    # 文件操作类
    "file_read": {
        "name": "文件阅读",
        "description": "读取文件内容",
        "keywords": ["读取", "查看", "文件", "内容", "打开"],
        "categories": ["document", "file"]
    },
    "file_write": {
        "name": "文件写入",
        "description": "写入或修改文件",
        "keywords": ["写入", "保存", "修改", "创建", "文件"],
        "categories": ["document", "file"]
    },
    "file_convert": {
        "name": "文件转换",
        "description": "文件格式转换",
        "keywords": ["转换", "格式", "PDF", "Word", "Excel"],
        "categories": ["document"]
    },
    
    # 开发工具类
    "code_execute": {
        "name": "代码执行",
        "description": "执行代码",
        "keywords": ["代码", "执行", "运行", "Python", "编程"],
        "categories": ["development", "code"]
    },
    "code_review": {
        "name": "代码审查",
        "description": "审查代码质量",
        "keywords": ["审查", "代码", "检查", "bug", "优化"],
        "categories": ["development"]
    },
    "frontend_design": {
        "name": "前端设计",
        "description": "创建前端页面",
        "keywords": ["前端", "页面", "设计", "HTML", "CSS", "React"],
        "categories": ["development"]
    },
    
    # 数据分析类
    "data_analysis": {
        "name": "数据分析",
        "description": "数据分析和处理",
        "keywords": ["分析", "数据", "统计", "图表", "报表"],
        "categories": ["analysis", "data"]
    },
    "data_visualization": {
        "name": "数据可视化",
        "description": "数据可视化展示",
        "keywords": ["图表", "可视化", "展示", "图形", "报表"],
        "categories": ["analysis"]
    },
    
    # 创意设计类
    "image_create": {
        "name": "图像创建",
        "description": "创建图像或设计",
        "keywords": ["图像", "设计", "图片", "海报", "艺术"],
        "categories": ["multimodal", "design"]
    },
    "design_help": {
        "name": "设计辅助",
        "description": "设计相关辅助",
        "keywords": ["设计", "配色", "布局", "风格", "UI"],
        "categories": ["design"]
    },
    
    # 日常对话类
    "general_chat": {
        "name": "日常对话",
        "description": "日常聊天对话",
        "keywords": ["你好", "聊天", "对话", "问题", "帮助"],
        "categories": ["general"]
    },
    "question_answering": {
        "name": "问答",
        "description": "回答问题",
        "keywords": ["什么是", "为什么", "如何", "怎样", "多少"],
        "categories": ["general"]
    },
    
    # 文档处理类
    "document_write": {
        "name": "文档撰写",
        "description": "撰写文档",
        "keywords": ["写", "撰写", "文档", "报告", "文章"],
        "categories": ["document"]
    },
    "document_edit": {
        "name": "文档编辑",
        "description": "编辑文档",
        "keywords": ["编辑", "修改", "文档", "报告"],
        "categories": ["document"]
    },
    
    # 技能管理类
    "skill_create": {
        "name": "技能创建",
        "description": "创建新技能",
        "keywords": ["创建", "技能", "新建", "开发"],
        "categories": ["general"]
    },
    "skill_update": {
        "name": "技能更新",
        "description": "更新现有技能",
        "keywords": ["更新", "修改", "技能", "优化"],
        "categories": ["general"]
    }
}


def get_intent_by_keyword(keyword: str) -> str:
    """根据关键词获取意图类型"""
    keyword = keyword.lower()
    for intent, config in INTENT_TYPES.items():
        for kw in config["keywords"]:
            if kw in keyword:
                return intent
    return "general_chat"


def get_intent_config(intent: str) -> dict:
    """获取意图配置"""
    return INTENT_TYPES.get(intent, {})


def list_intents() -> list:
    """列出所有意图类型"""
    return list(INTENT_TYPES.keys())


def match_intent(user_input: str) -> tuple:
    """匹配用户输入的意图，返回(意图, 置信度)"""
    user_input_lower = user_input.lower()
    matches = []
    
    for intent, config in INTENT_TYPES.items():
        confidence = 0.0
        matched_keywords = []
        
        for kw in config["keywords"]:
            if kw in user_input_lower:
                confidence += 0.15
                matched_keywords.append(kw)
        
        if confidence > 0:
            matches.append((intent, confidence, matched_keywords))
    
    matches.sort(key=lambda x: x[1], reverse=True)
    
    if matches:
        return matches[0]
    
    return ("general_chat", 0.0, [])
