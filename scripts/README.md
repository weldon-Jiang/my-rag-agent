# 验证脚本目录

此目录包含用于验证系统各功能的脚本模板。

## 脚本列表

### 1. validate-api.ps1 - API 接口验证

验证系统 API 接口是否正常工作。

**用法：**
```powershell
# 验证所有 API
.\validate-api.ps1

# 验证单个接口
.\validate-api.ps1 -Endpoint "/api/skills"
```

### 2. validate-skills-tools.ps1 - 技能工具同步验证

验证新增 skill/tool 后是否能在技能工具管理页面正确显示。

**用法：**
```powershell
# 验证技能和工具同步
.\validate-skills-tools.ps1
```

### 3. validate-tool-execution.ps1 - 工具执行验证

验证指定工具是否能正常执行。

**用法：**
```powershell
# 验证单个工具
.\validate-tool-execution.ps1 -ToolName "cat_image"

# 验证多个工具
.\validate-tool-execution.ps1 -ToolNames @("cat_image", "weather", "dog_api")
```

### 4. validate-comments.ps1 - 代码注释完整性验证

检查代码中是否仍有未添加 JSDoc 注释的函数。

**用法：**
```powershell
# 验证所有目标文件
.\validate-comments.ps1

# 验证指定文件
.\validate-comments.ps1 -Files @("public/app.js", "server/routes/chat.js")
```

### 5. run-all-validations.ps1 - 运行所有验证

一次性运行所有验证脚本。

**用法：**
```powershell
.\run-all-validations.ps1
```
