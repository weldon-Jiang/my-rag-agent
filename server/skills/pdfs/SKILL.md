---
name: pdfs-skill
description: PDF解析 - 提取PDF文档内容和结构
trigger:
  - pdf
  - pdf文档
  - 文章
  - 合同
  - 报告
  - 说明书
triggers:
  - 提取PDF内容
  - 这个PDF写的什么
  - 帮我看看这个合同
---

# PDF 解析 Skill

## 使用场景
当用户上传 PDF 文件并需要提取内容时使用：
- "这个 PDF 写的什么"
- "帮我看看这个合同"
- "提取 PDF 内容"

## 工作流程
1. 读取 PDF 文件
2. 提取文本内容
3. 返回结构和文本

## 参数说明
- `filename`: PDF 文件名
- `filepath`: PDF 文件路径

## 支持格式
- .pdf

## 注意事项
- PDF 需要先上传到服务器
- 扫描版 PDF 需要 OCR 辅助
