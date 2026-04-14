const express = require('express');
const router = express.Router();
const sessionService = require('../services/session-service');

router.get('/', (req, res) => {
  try {
    const sessions = sessionService.getAllSessions();
    res.json(sessions);
  } catch (error) {
    console.error('[SessionController] 获取会话列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { title } = req.body;
    const session = sessionService.createSession(title || '新对话');
    res.json({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages || [],
      tokenUsage: session.tokenUsage || { prompt: 0, completion: 0, total: 0 }
    });
  } catch (error) {
    console.error('[SessionController] 创建会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const messages = sessionService.getSessionMessages(id);
    res.json({ messages });
  } catch (error) {
    console.error('[SessionController] 获取会话历史失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, messages } = req.body;
    const session = sessionService.updateSession(id, { title, messages });
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[SessionController] 更新会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = sessionService.deleteSession(id);
    if (!success) {
      return res.status(404).json({ error: '会话不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[SessionController] 删除会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;