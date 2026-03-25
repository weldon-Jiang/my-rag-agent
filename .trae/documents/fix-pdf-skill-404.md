# 修复 PDF Skill 404 错误计划

## 问题分析
`pdfs-skill` 处理 PDF 文件时调用 AI 模型返回 404 错误。

**原因**：
1. 当前实现尝试将 PDF 文件转为 base64 通过 `image_url` 类型发送
2. 大多数多模态 AI API（如 OpenAI）不支持 PDF 作为图片类型的输入
3. 多模态模型主要支持图片（jpg/png），而不是 PDF 文件

## 修复步骤

### 步骤 1: 分析现有实现
检查 `server/skills/pdf-skill.js` 中 `extractPdfContent` 方法的实现

### 步骤 2: 修改 PDF 处理策略
方案：移除直接发送 PDF base64 到 API 的方式，改为：
- 记录 PDF 文件元信息（文件名、大小）
- 在内容描述中使用文件信息代替实际内容
- 依赖知识库的文本检索功能获取 PDF 相关性

### 步骤 3: 更新 pdfs-skill.js
修改 `extractPdfContent` 方法：
- 不再发送 base64 PDF 数据到 AI API
- 返回结构化的元信息
- 添加友好错误处理

### 步骤 4: 测试验证
验证修改后的 pdfs-skill 正常工作，不再产生 404 错误