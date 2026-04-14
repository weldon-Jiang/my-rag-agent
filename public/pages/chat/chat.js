/**
 * 聊天页面模块
 * @description 处理聊天相关的所有逻辑，包括消息发送、接收、渲染等
 * @module pages/chat
 */

let isProcessing = false;

function init() {
  console.log('[Chat] 聊天页面初始化');
  setupEventListeners();
}

function setupEventListeners() {
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
}

async function handleSendMessage() {
  if (isProcessing) return;

  const chatInput = document.getElementById('chatInput');
  const message = chatInput?.value.trim();

  if (!message) return;

  isProcessing = true;
  chatInput.value = '';

  try {
    appendMessage('user', message);

    console.log('[Chat] 发送请求 - message:', message, 'mode:', window.currentMode);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        sessionId: window.currentSessionId,
        mode: window.currentMode || 'hybrid'
      })
    });

    const result = await response.json();
    console.log('[Chat] 收到响应:', JSON.stringify(result));

    if (result.type === 'clarification') {
      appendClarification(result);
    } else if (result.content) {
      appendMessage('assistant', result.content, result.resultSources);
    }
  } catch (error) {
    console.error('[Chat] 发送消息失败:', error);
    appendMessage('assistant', '抱歉，发生了错误。请稍后重试。');
  } finally {
    isProcessing = false;
  }
}

function appendMessage(role, content, resultSources = null) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  console.log('[Chat] appendMessage - resultSources:', resultSources);

  let sourceLabel = '';
  if (role === 'assistant' && resultSources && resultSources.length > 0) {
    const sourceIcons = {
      '知识库': '📚',
      '工具': '🔧',
      'AI': '🤖'
    };

    const sourceItems = resultSources.map(source => {
      const icon = sourceIcons[source] || '•';
      return `<span class="source-item">${icon} ${source}</span>`;
    }).join(' ');

    sourceLabel = `<div class="source-label">${sourceItems}</div>`;
  } else if (role === 'assistant') {
    sourceLabel = `<div class="source-label"><span class="source-item">• 无来源</span></div>`;
  }

  messageDiv.innerHTML = `<div class="message-content">${sourceLabel}${escapeHtml(content)}</div>`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendClarification(data) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';

  const originalQuery = data.originalQuery || data.original_query || '';
  const clarificationId = data.clarification_id || data.clarificationId || '';

  let optionsHtml = '';
  if (data.options && data.options.length > 0) {
    optionsHtml = '<div class="clarification-options">';
    data.options.forEach((option, index) => {
      optionsHtml += `<button class="clarification-option" data-value="${escapeHtml(option)}" data-original-query="${escapeHtml(originalQuery)}" data-clarification-id="${escapeHtml(clarificationId)}">${escapeHtml(option)}</button>`;
    });
    optionsHtml += '</div>';
  }

  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="clarification-question">${escapeHtml(data.question)}</div>
      ${optionsHtml}
    </div>
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  let clarificationData = null;
  document.querySelectorAll('.clarification-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!clarificationData) {
        clarificationData = {
          clarification_id: btn.dataset.clarificationId,
          originalQuery: btn.dataset.originalQuery,
          question: data.question,
          options: data.options
        };
      }
      const value = btn.dataset.value;
      console.log('[Chat] 点击追问选项:', value);
      console.log('[Chat] 追问数据:', JSON.stringify(clarificationData));
      handleClarificationResponse(clarificationData, value);
    });
  });
}

async function handleClarificationResponse(data, value) {
  try {
    appendMessage('user', value);

    const response = await fetch('/api/chat/clarification/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clarification_id: data.clarification_id || data.clarificationId,
        response: value,
        original_query: data.originalQuery || '',
        sessionId: window.currentSessionId,
        mode: window.currentMode || 'hybrid'
      })
    });

    const result = await response.json();
    console.log('[Chat] 追问响应结果:', JSON.stringify(result));

    if (result.type === 'text' && result.content) {
      appendMessage('assistant', result.content, result.resultSources);
    } else if (result.type === 'clarification') {
      appendClarification(result);
    } else if (!response.ok) {
      console.error('[Chat] 追问响应错误:', result.error);
      appendMessage('assistant', `错误: ${result.error || '处理失败'}`);
    } else {
      console.error('[Chat] 追问响应格式异常:', result);
    }
  } catch (error) {
    console.error('[Chat] 处理追问回应失败:', error);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.chatPage = {
  init,
  handleSendMessage,
  appendMessage
};
