# 技能和工具统一规划计划

## 目标

对技能和工具进行统一分类规划，完善调用说明。

---

## 一、当前状态

### 技能 (Skills)
| 技能名称 | 功能 | 文件类型 |
|----------|------|----------|
| images-skill | 图片识别/OCR | .jpg, .png, .gif 等 |
| videos-skill | 视频内容理解 | .mp4, .avi 等 |
| pdfs-skill | PDF解析 | .pdf |
| weather-skill | 天气查询 | 天气相关 |
| location-skill | 地理位置查询 | 行政区划 |

### 工具 (Tools)
| 工具名称 | 功能 |
|----------|------|
| bash | 执行 Shell 命令 |
| python | 执行 Python 代码 |
| ls | 列出目录 |
| read_file | 读取文件 |
| write_file | 写入文件 |
| str_replace | 替换字符串 |
| ask_clarification | 请求用户澄清 |

---

## 二、统一分类

### 技能分类
1. **文件处理技能** - 处理特定类型的文件
   - images-skill (图片)
   - videos-skill (视频)
   - pdfs-skill (PDF)

2. **信息查询技能** - 查询特定信息
   - weather-skill (天气)
   - location-skill (地理位置)

### 工具分类
1. **代码执行工具** - 执行代码
   - bash, python

2. **文件操作工具** - 文件读写
   - ls, read_file, write_file, str_replace

3. **辅助工具** - 其他功能
   - ask_clarification

---

## 三、调用条件说明

### 技能调用条件
- **images-skill**: 用户上传/提到图片文件，或提到"图片"、"OCR"、"识别文字"等
- **videos-skill**: 用户上传/提到视频文件，或提到"视频"、"录像"等
- **pdfs-skill**: 用户上传/提到 PDF 文件，或提到"PDF"、"文档"等
- **weather-skill**: 用户询问天气相关问题
- **location-skill**: 用户询问省市区等地理位置

### 工具调用条件
- **bash/python**: 用户明确要求"执行"、"运行"、"代码"等
- **ls/read_file/write_file/str_replace**: 用户需要查看或修改文件

---

## 四、实施步骤

### 1. 修改 skills/index.js
- 为每个技能添加工具调用条件说明
- 按类别分组

### 2. 修改 tools 定义
- 添加工具调用条件说明
- 完善参数描述

### 3. 更新前端页面
- 技能和工具分开显示
- 添加调用条件说明
