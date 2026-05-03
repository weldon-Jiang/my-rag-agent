#!/usr/bin/env python3
"""
地理位置查询工具
当用户查询地理位置信息时调用此工具
"""

import re
from typing import Dict, Any


async def execute(params: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    执行地理位置查询

    Args:
        params: 包含 query 参数
        context: 上下文信息

    Returns:
        位置查询结果
    """
    query = params.get("query", "")

    location = extract_location(query)
    if not location:
        return {
            "success": False,
            "error": "无法从输入中提取地名"
        }

    location_data = get_location_info(location)

    if location_data:
        return {
            "success": True,
            "result": format_location_response(location, location_data)
        }
    else:
        return {
            "success": False,
            "error": f"无法获取 {location} 的位置信息"
        }


def extract_location(text: str) -> str:
    """从文本中提取地名"""
    patterns = [
        r"(.+?)在哪里",
        r"(.+?)的位置",
        r"(.+?)的经纬度",
        r"(.+?)属于哪个省",
        r"在(.+?)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()

    words = text.replace("位置", " ").replace("地理", " ").split()
    for word in words:
        if len(word) >= 2:
            return word

    return ""


def get_location_info(location: str) -> Dict[str, Any]:
    """获取位置信息（模拟）"""
    return {
        "province": "北京市",
        "city": "北京市",
        "district": "朝阳区",
        "latitude": 39.9042,
        "longitude": 116.4074,
        "timezone": "Asia/Shanghai",
        "elevation": 50
    }


def format_location_response(location: str, data: Dict[str, Any]) -> str:
    """格式化位置响应"""
    return f"""
📍 {location} 位置信息：

🏛️ 行政区划：
   省份：{data['province']}
   城市：{data['city']}
   区县：{data['district']}

🌐 地理坐标：
   经度：{data['longitude']}
   纬度：{data['latitude']}
   海拔：{data['elevation']}米

🕐 时区：{data['timezone']}
"""
