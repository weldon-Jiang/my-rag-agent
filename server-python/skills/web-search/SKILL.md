---
author: system
category: information
description: 通过搜索引擎在互联网上搜索信息，返回网页标题、链接和摘要。当用户问'搜索'、'查找'、'了解一下'时使用。
name: 网页搜索
tags:
- 搜索
- 查询
- 互联网
- 搜索一下
- 查一下
tools:
  - name: web_search
    description: 执行网页搜索
tier: 1
version: 1.0.0
---

# 网页搜索技能

## 使用场景
当用户需要查找互联网上的信息时使用此技能。

## 使用步骤
1. 解析用户的搜索 query
2. 调用搜索 API 获取结果
3. 返回格式化的搜索结果

## 注意事项
- 搜索关键词要简洁准确
- 返回结果要包含标题、链接和摘要
