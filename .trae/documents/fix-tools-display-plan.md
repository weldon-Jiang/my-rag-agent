# 修复可用工具说明数据问题和增加技能展示计划

## 问题

1. 可用工具说明没有数据
2. 需要增加技能展示和使用说明

## 原因分析

后端 API 代码已更新，但服务可能需要重启才能加载新代码。

---

## 实施步骤

### 1. 确认后端 API 代码正确
- getSkillsByCategory() - 已添加
- getToolsWithDescriptions() - 已添加

### 2. 前端调用检查
- loadFiles() 调用 loadSkillsAndTools() - 已添加
- renderSkillsAndTools() - 已添加

### 3. 增加技能详细说明
- 技能使用方法
- 技能触发条件
