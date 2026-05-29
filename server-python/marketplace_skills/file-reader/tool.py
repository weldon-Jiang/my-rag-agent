#!/usr/bin/env python3
"""
文件阅读工具
当用户需要读取文件内容时调用此工具
"""

import re
from pathlib import Path
from typing import Dict, Any


async def execute(params: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    执行文件读取

    Args:
        params: 包含 query 参数
        context: 上下文信息

    Returns:
        文件内容
    """
    query = params.get("query", "")
    file_path = extract_file_path(query)

    if not file_path:
        return {
            "success": False,
            "error": "无法从输入中提取文件路径"
        }

    content = read_file_content(file_path)

    if content:
        return {
            "success": True,
            "result": f"📄 文件：{file_path}\n\n{content}"
        }
    else:
        return {
            "success": False,
            "error": f"无法读取文件 {file_path}"
        }


def extract_file_path(text: str) -> str:
    """从文本中提取文件路径"""
    patterns = [
        r"读取(.+)",
        r"看(.+)文件",
        r"打开(.+)",
        r"查看(.+)文件",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()

    words = text.replace("文件", " ").split()
    for word in words:
        if "/" in word or "\\" in word or "." in word:
            return word

    return ""


def read_file_content(file_path: str) -> str:
    """读取文件内容"""
    try:
        path = Path(file_path)
        if not path.exists():
            knowledge_dir = Path(__file__).parent.parent.parent / "knowledge"
            path = knowledge_dir / file_path

        if path.exists():
            if path.suffix == ".txt" or path.suffix == ".md":
                return path.read_text(encoding="utf-8")
            else:
                return f"[{path.suffix} 文件内容已读取]"
        else:
            return None
    except Exception as e:
        return None
