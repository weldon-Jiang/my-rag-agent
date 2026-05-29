---
author: community
category: development
description: 审查代码质量，发现潜在问题，给出改进建议。当用户发送代码并要求审查时使用。
name: 代码审查
tags:
- 代码
- 审查
- 质量
tier: 2
version: 1.0.0
---

# 代码审查技能

## 审查维度
1. **代码规范** - 命名、格式、注释
2. **逻辑错误** - 潜在 bug、死代码
3. **性能问题** - 时间/空间复杂度
4. **安全性** - 注入、密码硬编码等

## 输出格式
```json
{
  "issues": [
    {
      "severity": "high|medium|low",
      "line": 10,
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "score": 8.5
}
```
