# 修复刷新页面后历史对话不显示问题

## 问题分析

刷新页面时，`loadSessions()` 只加载了会话列表到内存，但没有：
1. 渲染会话列表 UI (`renderSessionList`)
2. 显示当前会话的消息 (`loadSessionMessages`)

## 修复方案

修改 `loadSessions()` 函数，加载完成后自动渲染会话列表和显示当前会话消息。

---

## 实施步骤

| 步骤 | 修改内容 |
|------|----------|
| 1 | 在 `loadSessions()` 末尾添加 `renderSessionList()` |
| 2 | 在 `loadSessions()` 末尾添加 `loadSessionMessages(currentSessionId)` |
| 3 | 确保 `createNewSession` 中不再重复调用（已在末尾调用） |
