/**
 * 聊天页面模块
 * @description 处理聊天相关的所有逻辑，包括消息发送、接收、渲染等
 * @module pages/chat
 */

let currentSessionId = null;
let currentModelId = null;
let isProcessing = false;

// 页面初始化函数
function init() {
  console.log('[Chat] 聊天页面初始化');
  loadSessions();
  setupEventListeners();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  const sendBtn = document.getElementById('sendBtn');
  const userInput = document.getElementById('userInput');

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }

  if (userInput) {
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
}

/**
 * 加载会话列表
 */
async function loadSessions() {
  try {
    const response = await fetch('/api/chat/sessions');
    const sessions = await response.json();

    const sessionList = document.getElementById('sessionList');
    if (sessionList) {
      renderSessions(sessions);
    }

    // 选择第一个会话或创建新会话
    if (sessions.length > 0) {
      selectSession(sessions[0].id);
    } else {
      createNewSession();
    }
  } catch (error) {
    console.error('[Chat] 加载会话失败:', error);
  }
}

/**
 * 渲染会话列表
 * @param {Array} sessions - 会话列表
 */
function renderSessions(sessions) {
  const sessionList = document.getElementById('sessionList');
  if (!sessionList) return;

  sessionList.innerHTML = sessions.map(session => `
    <div class="session-item ${session.id === currentSessionId ? 'active' : ''}"
         onclick="window.chatPage.selectSession('${session.id}')">
      <span class="session-title">${session.title || '新对话'}</span>
      <span class="session-time">${formatTime(session.updatedAt)}</span>
    </div>
  `).join('');
}

/**
 * 选择会话
 * @param {string} sessionId - 会话ID
 */
async function selectSession(sessionId) {
  currentSessionId = sessionId;
  await loadSessionMessages(sessionId);
  renderSessions([]);
  await loadSessions();
}

/**
 * 加载会话消息
 * @param {string} sessionId - 会话ID
 */
async function loadSessionMessages(sessionId) {
  try {
    const response = await fetch(`/api/chat/history/${sessionId}`);
    const messages = await response.json();
    renderMessages(messages);
  } catch (error) {
    console.error('[Chat] 加载消息失败:', error);
  }
}

/**
 * 渲染消息列表
 * @param {Array} messages - 消息列表
 */
function renderMessages(messages) {
  const messagesContainer = document.getElementById('messagesContainer');
  if (!messagesContainer) return;

  messagesContainer.innerHTML = messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="message-content">${escapeHtml(msg.content)}</div>
    </div>
  `).join('');

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * 处理发送消息
 */
async function handleSendMessage() {
  if (isProcessing) return;

  const userInput = document.getElementById('userInput');
  const message = userInput?.value.trim();

  if (!message) return;

  isProcessing = true;
  userInput.value = '';

  try {
    // 显示用户消息
    appendMessage('user', message);

    // 发送请求
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sessionId: currentSessionId,
        mode: 'hybrid'
      })
    });

    const result = await response.json();

    // 显示AI响应
    if (result.response) {
      appendMessage('assistant', result.response);
    }

  } catch (error) {
    console.error('[Chat] 发送消息失败:', error);
    appendMessage('assistant', '抱歉，发生了错误。请稍后重试。');
  } finally {
    isProcessing = false;
  }
}

/**
 * 追加消息到界面
 * @param {string} role - 角色 (user/assistant)
 * @param {string} content - 内容
 */
function appendMessage(role, content) {
  const messagesContainer = document.getElementById('messagesContainer');
  if (!messagesContainer) return;

  const messageHtml = `
    <div class="message ${role}">
      <div class="message-content">${escapeHtml(content)}</div>
    </div>
  `;

  messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * 创建新会话
 */
async function createNewSession() {
  try {
    const response = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const session = await response.json();
    currentSessionId = session.id;
    await loadSessions();
    clearMessages();
  } catch (error) {
    console.error('[Chat] 创建会话失败:', error);
  }
}

/**
 * 清空消息显示
 */
function clearMessages() {
  const messagesContainer = document.getElementById('messagesContainer');
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
}

/**
 * 格式化时间
 * @param {string} timestamp - 时间戳
 * @returns {string} 格式化后的时间
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
}

/**
 * HTML转义
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 导出页面模块
window.chatPage = {
  init,
  selectSession,
  loadSessionMessages,
  renderMessages,
  handleSendMessage,
  createNewSession,
  clearMessages
};