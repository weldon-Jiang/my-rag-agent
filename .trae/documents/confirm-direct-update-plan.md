# 计划：确认改名/关系设定逻辑

## 需求确认

检查并确保：
1. 用户改名直接更新保存，不调用大模型
2. 智能体改名直接更新保存，不调用大模型
3. 关系设定直接更新保存，不调用大模型
4. 改完后智能体做好答复

## 代码现状分析

查看当前 chat.js 中的处理逻辑：

```javascript
// 关系设定
if (isSetRelationshipIntent(query) && !isQuestion(query)) {
  const newRel = extractRelationship(query);
  if (newRel) {
    return res.json({
      response: `好的，明白了！...`,
      source: '系统',
      newRelationship: newRel
    });
  }
}

// 用户改名
if (isRenameUserIntent(query) && !isQuestion(query)) {
  const newName = extractUserName(query);
  if (newName) {
    return res.json({
      response: `好的，我以后就叫你"${newName}"了！...`,
      source: '系统',
      newUserName: newName
    });
  }
}

// 智能体改名
if (isRenameIntent(query)) {
  const newName = extractBotName(query);
  if (newName) {
    return res.json({
      response: `好的，以后你就叫"${newName}"了！...`,
      source: '系统',
      newBotName: newName
    });
  }
}
```

## 结论

经过检查，以上三个场景都已经是：
- ✅ 直接返回 JSON 响应
- ✅ 不调用大模型
- ✅ 返回时带有 `newRelationship` / `newUserName` / `newBotName` 参数
- ✅ 前端会自动更新 localStorage

无需额外修改，现有代码已经满足需求。
