---
name: images-skill
description: 图片识别/OCR - 提取图片中的文字和内容
trigger:
  - 图片
  - 照片
  - 截图
  - ocr
  - 识别文字
  - 图片内容
  - 照片里
  - image
triggers:
  - 这张图片写的什么
  - 帮我识别这张图
  - 图片里有什么
---

# 图片识别 Skill

## 使用场景
当用户上传图片并需要识别内容时使用：
- "这张图片写的什么"
- "帮我识别这张图"
- "图片里有什么"

## 工作流程
1. 使用 OCR 识别图片文字
2. 返回识别的文本内容

## 参数说明
- `filename`: 图片文件名
- `filepath`: 图片文件路径

## 支持格式
- .jpg, .jpeg, .png, .gif, .bmp, .webp, .svg

## 注意事项
- 图片需要先上传到服务器
- OCR 识别可能有误差
