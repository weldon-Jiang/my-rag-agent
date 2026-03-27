# DeerFlow Skills 和 Tools 集成计划

## 当前状态

### 已集成的模块

1. **sandbox 模块** (`server/sandbox/`)
   - `executor.js` - 命令执行器
   - `security.js` - 路径验证和安全
   - `tools.js` - 工具封装
   - `index.js` - 模块导出

2. **SkillsCenter** (`server/skills/index.js`)
   - 已注册工具：bash, python, ls, read_file, write_file, str_replace, ask_clarification
   - 提供 executeTool 方法执行工具

3. **chat.js 集成**
   - 已引入 skillsCenter
   - 可通过 skillsCenter.executeTool() 调用工具

---

## 计划

### 1. 确认现有工具是否可用

工具已经集成，但需要确认是否可以通过对话触发使用。

### 2. 测试工具调用

通过 API 测试工具是否正常工作。

---

## 实施步骤

| 步骤 | 内容 |
|------|------|
| 1 | 确认 skills/index.js 中工具定义 |
| 2 | 确认 chat.js 中工具调用逻辑 |
| 3 | 测试工具 API |
