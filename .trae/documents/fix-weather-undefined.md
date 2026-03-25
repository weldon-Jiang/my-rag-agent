# 修复天气工具返回结果中的 undefined

## 问题
`formatToolResults` 函数处理天气结果时，错误地访问了 `item.filename` 和 `item.content` 属性，而天气结果只有 `textContent` 属性，导致上下文中显示 "undefined"。

## 问题分析
天气结果结构：
```javascript
{
  success: true,
  skill: 'weather-skill',
  textContent: '深圳当前天气：\n...',
  data: weatherData
}
```

但 `formatToolResults` 期望的结构是：
```javascript
{
  filename: 'xxx',
  content: 'xxx',
  skill: 'xxx'
}
```

## 修复方案
修改 `formatToolResults` 函数，正确处理天气类型的结果。

### 修改步骤
在 `formatToolResults` 中添加对天气工具的特殊处理：

```javascript
if (item.textContent) {
  lines.push(`内容: ${item.textContent}`);
} else {
  lines.push(`文件: ${item.filename || 'unknown'}${skillTag}`);
  lines.push(`内容: ${item.content || 'no content'}`);
}
```

## 修改文件
- `d:\chinatravel\my-rag-agent\server\routes\chat.js`
