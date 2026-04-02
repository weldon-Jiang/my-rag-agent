/**
 * 聊天服务
 * @description 处理聊天相关的业务逻辑，包括消息处理、意图识别、工具调用等
 * @module services/chat-service
 */

const path = require('path');
const fs = require('fs');

const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');

/**
 * 处理用户聊天消息
 * @param {Object} params - 参数对象
 * @param {string} params.message - 用户消息
 * @param {string} params.sessionId - 会话ID
 * @param {string} params.mode - 聊天模式
 * @param {Object} params.modelConfig - 模型配置
 * @returns {Promise<Object>} 处理结果
 */
async function processChatMessage({ message, sessionId, mode, modelConfig }) {
  try {
    // 1. 意图识别
    const intent = extractIntent(message);

    // 2. 工具选择
    const tools = selectTools(intent, message);

    // 3. 执行工具
    let toolResults = [];
    if (tools && tools.length > 0) {
      toolResults = await executeTools(tools, message, modelConfig);
    }

    // 4. 生成响应
    const response = await generateResponse(message, toolResults, modelConfig);

    return {
      success: true,
      response,
      intent,
      toolsUsed: tools
    };

  } catch (error) {
    console.error('[ChatService] 处理聊天消息失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 提取用户意图
 * @param {string} message - 用户消息
 * @returns {string} 意图名称
 */
function extractIntent(message) {
  const lowerMessage = message.toLowerCase();

  // 系统意图检测
  const systemIntents = {
    'ask_name': ['你叫什么', '你是谁', '你的名字'],
    'rename_bot': ['叫我', '改名', '叫'],
    'rename_user': ['我叫', '我是'],
    'set_relationship': ['我是你的', '我是你']
  };

  for (const [intent, keywords] of Object.entries(systemIntents)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return intent;
      }
    }
  }

  return 'general';
}

/**
 * 选择要使用的工具
 * @param {string} intent - 意图
 * @param {string} message - 用户消息
 * @returns {Array} 工具名称数组
 */
function selectTools(intent, message) {
  // 优先使用 matchTools 进行 trigger 匹配
  const { matchTools } = require('../tools/tools-manager');
  const triggeredTools = matchTools(message);

  if (triggeredTools && triggeredTools.length > 0) {
    return triggeredTools;
  }

  // 如果没有匹配到工具，返回默认工具
  return ['search_knowledge_base'];
}

/**
 * 执行工具列表
 * @param {Array} tools - 工具名称数组
 * @param {string} message - 用户消息
 * @param {Object} modelConfig - 模型配置
 * @returns {Promise<Array>} 工具执行结果
 */
async function executeTools(tools, message, modelConfig) {
  const { skillsCenter } = require('../skills');
  const results = [];

  const context = {
    model: modelConfig.modelId || modelConfig.id,
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.url
  };

  for (const toolName of tools) {
    try {
      const args = { description: message };
      const result = await skillsCenter.executeTool(toolName, args, context);
      results.push({
        tool: toolName,
        success: result.success,
        data: result
      });
    } catch (error) {
      console.error(`[ChatService] 工具执行失败: ${toolName}`, error);
      results.push({
        tool: toolName,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * 生成AI响应
 * @param {string} message - 用户消息
 * @param {Array} toolResults - 工具执行结果
 * @param {Object} modelConfig - 模型配置
 * @returns {Promise<string>} AI响应文本
 */
async function generateResponse(message, toolResults, modelConfig) {
  // 如果有工具执行结果，使用工具结果生成响应
  if (toolResults.length > 0) {
    const successfulResults = toolResults.filter(r => r.success);
    if (successfulResults.length > 0) {
      return formatToolResults(successfulResults);
    }
  }

  // 否则使用默认响应
  return '我收到了您的消息，正在学习处理中...';
}

/**
 * 格式化工具结果为文本
 * @param {Array} results - 成功的工具结果
 * @returns {string} 格式化后的文本
 */
function formatToolResults(results) {
  return results.map(result => {
    if (result.data && result.data.url) {
      return `[${result.tool}] ${result.data.url}`;
    }
    if (result.data && result.data.content) {
      return `[${result.tool}] ${result.data.content}`;
    }
    return `[${result.tool}] 操作完成`;
  }).join('\n');
}

// 导出服务
module.exports = {
  processChatMessage,
  extractIntent,
  selectTools,
  executeTools,
  generateResponse
};