# 测试脚本目录

此目录包含用于测试系统各功能的脚本模板。

## 脚本列表

### 1. test-api.ps1 - API 接口测试

测试 API 接口的请求和响应。

**用法：**
```powershell
# 测试单个接口
.\test-api.ps1 -Endpoint "/api/skills" -Method "GET"

# 测试 POST 接口
.\test-api.ps1 -Endpoint "/api/chat" -Method "POST" -Body '{"query":"你好"}'
```

### 2. test-tool.ps1 - 工具执行测试

通过聊天接口测试指定工具是否能正确执行。

**用法：**
```powershell
# 测试单个工具
.\test-tool.ps1 -Query "给我一张猫咪图片"

# 测试多个查询
.\test-tool.ps1 -Queries @("北京天气", "给我一张狗狗照片", "生成一个二维码 https://test.com")
```

### 3. test-skill.ps1 - 技能功能测试

测试指定技能是否正常工作。

**用法：**
```powershell
# 测试图片识别技能
.\test-skill.ps1 -SkillName "images-skill" -FilePath "C:\test\image.png"
```

### 4. test-intent.ps1 - 意图识别测试

测试系统是否能正确识别用户意图。

**用法：**
```powershell
# 测试意图识别
.\test-intent.ps1 -Queries @("我叫张三", "你叫什么名字", "北京天气怎么样", "给我一只猫")
```
