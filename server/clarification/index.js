const path = require('path');
const fs = require('fs');

const CLARIFICATION_TYPES = {
  MISSING_INFO: 'missing_info',
  AMBIGUOUS_REQUIREMENT: 'ambiguous_requirement',
  APPROACH_CHOICE: 'approach_choice',
  RISK_CONFIRMATION: 'risk_confirmation',
  SUGGESTION: 'suggestion'
};

const TYPE_ICONS = {
  missing_info: '❓',
  ambiguous_requirement: '🤔',
  approach_choice: '🔀',
  risk_confirmation: '⚠️',
  suggestion: '💡'
};

const TYPE_LABELS = {
  missing_info: '缺少信息',
  ambiguous_requirement: '需求不明确',
  approach_choice: '选择实现方式',
  risk_confirmation: '风险确认',
  suggestion: '建议'
};

const pendingClarifications = new Map();

function generateId() {
  return `clarification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatClarificationMessage(clarification) {
  const { question, clarification_type, context, options } = clarification;
  const icon = TYPE_ICONS[clarification_type] || '❓';
  const typeLabel = TYPE_LABELS[clarification_type] || '澄清';

  const messageParts = [];

  if (context) {
    messageParts.push(`${icon} ${context}`);
    messageParts.push(`\n${question}`);
  } else {
    messageParts.push(`${icon} ${question}`);
  }

  if (options && options.length > 0) {
    messageParts.push('');
    options.forEach((option, index) => {
      messageParts.push(`  ${index + 1}. ${option}`);
    });
  }

  return messageParts.join('\n');
}

function askClarification(args, context = {}) {
  const { question, clarification_type, context: clarificationContext, options } = args;

  if (!question) {
    return {
      success: false,
      error: 'question is required'
    };
  }

  if (!clarification_type || !Object.values(CLARIFICATION_TYPES).includes(clarification_type)) {
    return {
      success: false,
      error: `Invalid clarification_type. Must be one of: ${Object.values(CLARIFICATION_TYPES).join(', ')}`
    };
  }

  const sessionId = context.sessionId || 'default';
  const clarificationId = generateId();

  const clarification = {
    id: clarificationId,
    sessionId,
    question,
    clarification_type,
    context: clarificationContext,
    options: options || [],
    timestamp: Date.now(),
    status: 'pending'
  };

  pendingClarifications.set(clarificationId, clarification);

  console.log(`[渐进式披露] 创建请求: type=${clarification_type}, question=${question.substring(0, 50)}...`);

  const formattedMessage = formatClarificationMessage(clarification);

  return {
    success: true,
    clarification: true,
    clarification_id: clarificationId,
    message: formattedMessage,
    type: clarification_type,
    type_label: TYPE_LABELS[clarification_type],
    options: options || [],
    session_id: sessionId
  };
}

function getPendingClarification(clarificationId) {
  return pendingClarifications.get(clarificationId) || null;
}

function saveClarification(clarificationId, question, options, sessionId = 'default') {
  const clarification = {
    id: clarificationId,
    sessionId,
    question,
    clarification_type: 'missing_info',
    options: options || [],
    timestamp: Date.now(),
    status: 'pending'
  };
  pendingClarifications.set(clarificationId, clarification);
  console.log(`[渐进式披露] 保存追问: id=${clarificationId}, question=${question.substring(0, 30)}...`);
  return clarification;
}

function getSessionClarifications(sessionId) {
  const clarifications = [];
  for (const [id, clarification] of pendingClarifications.entries()) {
    if (clarification.sessionId === sessionId && clarification.status === 'pending') {
      clarifications.push(clarification);
    }
  }
  return clarifications;
}

function respondToClarification(clarificationId, response) {
  const clarification = pendingClarifications.get(clarificationId);

  if (!clarification) {
    return {
      success: false,
      error: 'Clarification not found'
    };
  }

  clarification.status = 'responded';
  clarification.response = response;
  clarification.responded_at = Date.now();

  pendingClarifications.set(clarificationId, clarification);

  console.log(`[渐进式披露] 收到响应: id=${clarificationId}, response=${response.substring(0, 50)}...`);

  return {
    success: true,
    clarification_id: clarificationId,
    response,
    question: clarification.question
  };
}

function clearClarification(clarificationId) {
  if (pendingClarifications.has(clarificationId)) {
    pendingClarifications.delete(clarificationId);
    console.log(`[渐进式披露] 清除: id=${clarificationId}`);
    return { success: true };
  }
  return { success: false, error: 'Clarification not found' };
}

function clearSessionClarifications(sessionId) {
  let cleared = 0;
  for (const [id, clarification] of pendingClarifications.entries()) {
    if (clarification.sessionId === sessionId) {
      pendingClarifications.delete(id);
      cleared++;
    }
  }
  console.log(`[渐进式披露] 清除会话 ${sessionId} 的 ${cleared} 个请求`);
  return { success: true, cleared };
}

function getAllPendingClarifications() {
  const clarifications = [];
  for (const [id, clarification] of pendingClarifications.entries()) {
    if (clarification.status === 'pending') {
      clarifications.push(clarification);
    }
  }
  return clarifications;
}

function autoExpireClarifications(maxAgeMs = 10 * 60 * 1000) {
  const now = Date.now();
  let expired = 0;

  for (const [id, clarification] of pendingClarifications.entries()) {
    if (clarification.status === 'pending' && (now - clarification.timestamp) > maxAgeMs) {
      clarification.status = 'expired';
      expired++;
    }
  }

  if (expired > 0) {
    console.log(`[渐进式披露] 过期 ${expired} 个请求`);
  }

  return { expired };
}

module.exports = {
  askClarification,
  getPendingClarification,
  saveClarification,
  getSessionClarifications,
  respondToClarification,
  clearClarification,
  clearSessionClarifications,
  getAllPendingClarifications,
  autoExpireClarifications,
  CLARIFICATION_TYPES,
  TYPE_ICONS,
  TYPE_LABELS
};
