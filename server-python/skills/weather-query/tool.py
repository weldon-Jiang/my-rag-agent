#!/usr/bin/env python3
"""
天气查询工具
当用户询问天气时调用此工具
"""

import re
import httpx
from typing import Dict, Any


async def execute(params: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    执行天气查询

    Args:
        params: 包含 query 参数
        context: 上下文信息

    Returns:
        查询结果
    """
    query = params.get("query", "")

    city = extract_city(query)
    if not city:
        return {
            "success": False,
            "error": "无法从输入中提取城市名称"
        }

    weather_data = await fetch_weather(city)

    if weather_data:
        return {
            "success": True,
            "result": format_weather_response(city, weather_data)
        }
    else:
        return {
            "success": False,
            "error": "无法获取 " + city + " 的天气信息"
        }


def extract_city(text: str) -> str:
    """从文本中提取城市名称"""
    patterns = [
        r"在(.+?)天气",
        r"(.+?)的天气",
        r"(.+?)天气怎么样",
        r"去(.+?)要带伞吗",
        r"(.+?)今天天气",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()

    words = text.replace("天气", " ").replace("查询", " ").split()
    for word in words:
        if len(word) >= 2:
            return word

    return ""


async def fetch_weather(city: str) -> Dict[str, Any]:
    """获取天气数据（模拟）"""
    return {
        "temp": 25,
        "humidity": 60,
        "wind": 12,
        "aqi": 45,
        "condition": "多云转晴"
    }


def format_weather_response(city: str, data: Dict[str, Any]) -> str:
    """格式化天气响应"""
    return """
""" + city + """天气预报：
温度：""" + str(data['temp']) + """°C
湿度：""" + str(data['humidity']) + """%
风速：""" + str(data['wind']) + """ km/h
空气质量：AQI """ + str(data['aqi']) + """
天气状况：""" + data['condition'] + """
"""