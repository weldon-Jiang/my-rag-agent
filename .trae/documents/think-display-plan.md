# AI 回答 Think 部分展示优化计划

## 目标

将 AI 回答中的 think/思考部分单独提取展示：
1. 先展示思考过程（字体小、灰色）
2. 再展示正式答案

## 示例

```
思考中...
[这里是思考内容，字体小，灰色]

[这里是正式回答，正常字体]
```

---

## 实施步骤

### 1. 修改 addMessage 函数 (app.js)

- 检测 `<think>...</think>` 或 `<think>...</think>` 标签
- 将内容分离为 think 部分和答案部分
- think 部分使用特殊样式

### 2. 添加 CSS 样式 (style.css)

- `.message-think` - think 部分容器样式
- 小字体、灰色颜色

---

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| app.js | addMessage 函数中解析 think 标签 |
| style.css | 添加 .message-think 样式 |
