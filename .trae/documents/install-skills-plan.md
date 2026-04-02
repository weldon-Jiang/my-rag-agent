# 计划：安装缺失的技能

## 技能现状分析

| 技能名称 | 状态 | 说明 |
|---------|------|------|
| search_knowledge_base | ✅ 已存在 | 知识库搜索 |
| read_pdf | ❌ 不存在 | PDF文件读取 |
| run_python_script | ❌ 不存在 | Python脚本执行 |
| web_search | ❌ 不存在 | 网页搜索 |
| list_directory | ✅ 已存在 (ls) | 目录列表 |
| write_markdown | ❌ 不存在 | Markdown文件写入 |

## 需要实现的功能

### 1. read_pdf - PDF读取技能
- 文件: `server/skills/pdf-reader-skill.js`
- 功能: 读取PDF文件内容
- 复用现有的 `pdfs-skill.js` 逻辑

### 2. run_python_script - Python脚本执行
- 文件: `server/skills/python-skill.js`
- 功能: 执行Python脚本文件
- 复用现有的 sandbox python 工具

### 3. web_search - 网页搜索
- 文件: `server/skills/web-search-skill.js`
- 功能: 搜索互联网获取信息
- 使用现有天气/位置API类似的HTTP请求方式

### 4. write_markdown - Markdown写入
- 文件: `server/skills/markdown-skill.js`
- 功能: 创建/写入Markdown文件
- 复用现有的 write_file 工具

## 实现步骤

### 步骤1: 创建 pdf-reader-skill.js
- 继承 base-skill.js
- 实现 processFile 方法读取PDF
- 注册到 skills/index.js

### 步骤2: 创建 python-skill.js
- 继承 base-skill.js
- 实现 executeScript 方法运行Python脚本
- 注册到 skills/index.js

### 步骤3: 创建 web-search-skill.js
- 继承 base-skill.js
- 实现 search 方法调用搜索API
- 注册到 skills/index.js

### 步骤4: 创建 markdown-skill.js
- 继承 base-skill.js
- 实现 write 方法写入Markdown
- 注册到 skills/index.js

### 步骤5: 更新工具定义
- 在 skills/index.js 中添加工具定义到 tools 数组
- 添加对应的触发关键词

### 步骤6: 更新意图映射
- 在 chat.js 的 INTENT_KEYWORDS 中添加关键词
- 在 INTENT_TO_TOOLS 中映射工具

## 预期效果
用户可以说"读取PDF文件"、"执行Python脚本"、"搜索网页"、"写入Markdown"等，系统能正确识别并执行相应操作。
