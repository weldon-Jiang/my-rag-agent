/**
 * 聊天控制器 (Chat Controller)
 * @description 处理聊天相关的 HTTP 请求，包括消息发送、追问响应等
 * @module controllers/chat-controller
 */

const express = require('express');
const router = express.Router();

const chatService = require('../services/chat-service');   // 聊天服务
const modelService = require('../services/model-service'); // 模型服务
const { getPendingClarification } = require('../clarification'); // 追问服务

/**
 * POST /api/chat
 * 发送聊天消息，处理用户输入的核心接口
 *
 * 请求体:
 *   - message: string 用户消息
 *   - sessionId: string 会话ID (可选)
 *   - mode: string 模式 (可选，默认 'hybrid')
 *   - model: string 模型ID (可选)
 *   - clarification_id: string 追问ID (可选，表示这是追问响应)
 *   - original_query: string 原始问题 (可选，追问时传递)
 *
 * 响应:
 *   - type: 'text' | 'clarification'
 *   - content: string AI 回复内容
 *   - intent: string 识别的意图
 *   - tools: array 使用的工具列表
 *   - question/options: (追问时) 追问内容和选项
 */
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, mode = 'hybrid', model: modelId, clarification_id, original_query } = req.body;
    console.log('[ChatController] 接收到的请求体 - modelId:', modelId, 'mode:', mode, 'clarification_id:', clarification_id);

    // 参数验证：消息内容不能为空
    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    // 获取模型配置：优先使用前端指定的模型，否则使用当前激活的模型
    let modelConfig = null;
    if (modelId) {
      modelConfig = modelService.getModel(modelId);
      console.log('[ChatController] getModel 结果:', modelConfig ? modelConfig.id + ', protocol:' + modelConfig.protocol : 'null');
    }
    if (!modelConfig) {
      modelConfig = modelService.getCurrentModel();
      console.log('[ChatController] getCurrentModel 结果:', modelConfig ? modelConfig.id + ', protocol:' + modelConfig.protocol : 'null');
    }
    if (!modelConfig) {
      return res.status(400).json({ error: '没有可用的模型配置' });
    }

    let processedMessage = message;
    let accumulatedQuery = original_query || null;

    // 如果有 clarification_id，说明是追问响应，需要组合查询
    if (clarification_id) {
      console.log('[ChatController] 检测到追问响应，调用 processClarificationResponse');
      const clarificationResult = await chatService.processClarificationResponse(
        clarification_id,
        message,
        original_query,
        sessionId,
        mode
      );

      // 如果返回追问，继续返回追问结果
      if (clarificationResult.type === 'clarification') {
        return res.json(clarificationResult);
      }

      // 如果是重试，使用组合后的消息
      if (clarificationResult.type === 'retry' && clarificationResult.message) {
        processedMessage = clarificationResult.message;
        accumulatedQuery = clarificationResult.message;  // 累积查询用于下一轮
        console.log('[ChatController] 组合后查询:', processedMessage);
        console.log('[ChatController] 累积查询:', accumulatedQuery);
      }
    }

    // 调用聊天服务处理消息，传递累积的查询以便工具能访问完整上下文
    // 追问响应时不要保存用户消息到会话（前端已经保存了用户的实际选择）
    const skipUserMessageSave = !!clarification_id;
    const result = await chatService.processChatMessage(processedMessage, sessionId, modelConfig, mode, accumulatedQuery, skipUserMessageSave);
    res.json(result);

  } catch (error) {
    console.error('[ChatController] 处理聊天请求失败:', error.message || error.code);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat/clarification/respond
 * 处理用户对追问的回应
 *
 * 请求体:
 *   - clarification_id: string 追问ID
 *   - response: string 用户的选择/输入
 *   - mode: string (可选) 模式
 *   - sessionId: string (可选) 会话ID
 *
 * 响应:
 *   - type: 'text' | 'retry'
 *   - content: 文本回复 (type=text时)
 *   - (retry时) 重新调用 processChatMessage
 */
router.post('/clarification/respond', async (req, res) => {
  try {
    console.log('[ChatController] 追问响应请求体:', JSON.stringify(req.body));
    const { clarification_id, response: userResponse, original_query, mode = 'hybrid', sessionId } = req.body;

    // 参数验证
    if (!clarification_id || userResponse === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 处理追问回应
    const clarificationResult = await chatService.processClarificationResponse(
      clarification_id,
      userResponse,
      original_query,
      sessionId,
      mode
    );

    // 如果需要重试（用户提供了有效响应），重新处理消息
    if (clarificationResult.type === 'retry') {
      console.log('[ChatController] 追问重试:', { message: clarificationResult.message, sessionId: clarificationResult.sessionId, mode: clarificationResult.mode });
      const modelConfig = modelService.getCurrentModel();
      if (!modelConfig) {
        return res.status(400).json({ error: '没有可用的模型配置' });
      }

      const result = await chatService.processChatMessage(
        clarificationResult.message,
        clarificationResult.sessionId,
        modelConfig,
        clarificationResult.mode || 'hybrid'
      );
      console.log('[ChatController] 重试结果:', { type: result.type, contentLength: result.content?.length });
      return res.json(result);
    }

    res.json(clarificationResult);

  } catch (error) {
    console.error('[ChatController] 处理追问回应失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/clarification/:clarification_id
 * 获取追问的详细信息
 *
 * 路由参数:
 *   - clarification_id: string 追问ID
 *
 * 响应:
 *   - clarification 对象，包含 question, options 等
 */
router.get('/clarification/:clarification_id', (req, res) => {
  try {
    const { clarification_id } = req.params;

    // 获取追问信息
    const clarification = getPendingClarification(clarification_id);

    if (!clarification) {
      return res.status(404).json({ error: '追问不存在或已过期' });
    }

    res.json(clarification);
  } catch (error) {
    console.error('[ChatController] 获取追问失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;