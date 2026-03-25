# Checklist

- [x] Router 意图分析函数 analyzeIntent(query) 已实现
- [x] 意图类型定义完整（search_knowledge, recognize_image, extract_pdf, analyze_video, general）
- [x] 关键词判断逻辑正确
- [x] Skill Selector selectTools(intent) 函数已实现
- [x] intentToTools 映射表配置正确
- [x] Prompt Assembler buildSystemPrompt(tools) 函数已实现
- [x] 工具描述格式正确
- [x] Tool Executor executeTools(tools, query, context) 函数已实现
- [x] 工具执行结果收集正确
- [x] chat.js 主流程已修改
- [x] 渐进式披露流程正常工作
- [x] 意图分析测试通过
- [x] 工具筛选测试通过
- [x] 最终回答生成测试通过
