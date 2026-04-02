/**
 * 聊天控制器
 * @description 处理聊天相关的HTTP请求，包括消息发送、会话管理等
 * @module controllers/chat-controller
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');
const MODELS_FILE = path.join(__dirname, '../../data/models.json');

/**
 * 加载模型配置
 * @returns {Array} 模型配置数组
 */
function loadModels() {
  try {
    const fs = require('fs');
    if (fs.existsSync(MODELS_FILE)) {
      const data = fs.readFileSync(MODELS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[ChatController] 加载模型失败:', error);
  }
  return [];
}

/**
 * 获取当前激活的模型
 * @returns {Object|null} 激活的模型配置
 */
function getCurrentModel() {
  const models = loadModels();
  return models.find(m => m.isActive) || models[0] || null;
}

/**
 * POST /api/chat - 发送聊天消息
 */
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, mode = 'hybrid' } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    // 获取模型配置
    const modelConfig = getCurrentModel();
    if (!modelConfig) {
      return res.status(400).json({ error: '没有可用的模型配置' });
    }

    // 这里需要调用chat路由中的消息处理逻辑
    // 为了保持兼容性，这里直接返回错误，让前端调用chat路由
    res.status(501).json({ error: '请使用 /api/chat/send 接口' });

  } catch (error) {
    console.error('[ChatController] 处理聊天请求失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/sessions - 获取会话列表
 */
router.get('/sessions', async (req, res) => {
  try {
    // 返回空数组，后续可以在会话管理中实现
    res.json([]);
  } catch (error) {
    console.error('[ChatController] 获取会话列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat/sessions - 创建新会话
 */
router.post('/sessions', async (req, res) => {
  try {
    res.json({ id: Date.now().toString(), title: '新对话', createdAt: new Date().toISOString() });
  } catch (error) {
    console.error('[ChatController] 创建会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/history/:sessionId - 获取会话历史
 */
router.get('/history/:sessionId', async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error('[ChatController] 获取会话历史失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;