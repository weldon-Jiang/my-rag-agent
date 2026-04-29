TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "搜索本地知识库中的文档内容，支持文本、图片、PDF和视频文件的内容检索",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索查询内容"},
                    "file_types": {"type": "array", "items": {"type": "string"}, "description": "限定搜索的文件类型"},
                    "max_results": {"type": "integer", "description": "最大返回结果数，默认为 5"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recognize_image",
            "description": "使用 OCR 识别图片中的文字内容，支持中文和英文",
            "parameters": {
                "type": "object",
                "properties": {"filename": {"type": "string", "description": "图片文件名"}},
                "required": ["filename"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "extract_pdf_text",
            "description": "提取 PDF 文档的文本内容",
            "parameters": {
                "type": "object",
                "properties": {"filename": {"type": "string", "description": "PDF 文件名"}},
                "required": ["filename"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询指定城市的天气信息，包括温度、湿度、风速等",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "城市名称，如：北京、上海、广州"}},
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_location",
            "description": "查询省、市、区、县等行政区划信息，包括经纬度、海拔、时区等",
            "parameters": {
                "type": "object",
                "properties": {"location": {"type": "string", "description": "地名"}},
                "required": ["location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "通过搜索引擎在互联网上搜索信息，返回网页标题、链接和摘要",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词"},
                    "max_results": {"type": "integer", "description": "最大返回结果数"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "python",
            "description": "在沙盒环境中执行 Python 代码",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "完整的 Python 代码"},
                    "description": {"type": "string", "description": "简短说明"},
                },
                "required": ["code", "description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "bash",
            "description": "在沙盒环境中执行 Shell 命令",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "要执行的命令"},
                    "description": {"type": "string", "description": "简短说明"},
                },
                "required": ["command", "description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "读取文本文件的内容",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "文件路径"},
                    "description": {"type": "string", "description": "简短说明"},
                },
                "required": ["path", "description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "创建新文件或覆盖/追加内容到已有文件",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "文件路径"},
                    "content": {"type": "string", "description": "文件内容"},
                    "append": {"type": "boolean", "description": "追加模式"},
                    "description": {"type": "string", "description": "简短说明"},
                },
                "required": ["path", "content", "description"],
            },
        },
    },
]

CAPABILITY_TOOLS = {
    "web_search": ["web_search"],
    "weather_query": ["get_weather"],
    "location_query": ["get_location"],
    "file_read": ["read_file"],
    "file_write": ["write_file"],
    "code_execute": ["python"],
    "command_execute": ["bash"],
    "image_understand": ["recognize_image"],
    "document_understand": ["extract_pdf_text"],
}


def match_tools_by_capability(capabilities):
    if not capabilities:
        return []
    matched = set()
    for cap in capabilities:
        tools = CAPABILITY_TOOLS.get(cap, [])
        matched.update(tools)
    return list(matched)


def get_tool_definition(tool_name):
    for tool in TOOL_DEFINITIONS:
        if tool["function"]["name"] == tool_name:
            return tool
    return None


def get_all_tool_definitions():
    return TOOL_DEFINITIONS