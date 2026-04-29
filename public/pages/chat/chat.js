/**
 * 聊天页面模块
 * @description 处理聊天相关的所有逻辑，包括消息发送、接收、渲染等
 * @module pages/chat
 */

let isProcessing = false;
let isFollowing = true;
window.currentGroupId = '';

function init() {
  window.currentMode = document.querySelector('input[name="mode"]:checked')?.value || 'hybrid';
  setupEventListeners();
  setupModeListeners();
  loadKnowledgeGroups();
  setupScrollListener();

  const groupSelectWrapper = document.getElementById('groupSelectWrapper');
  if (groupSelectWrapper && window.currentMode === 'knowledge') {
    groupSelectWrapper.style.display = 'flex';
  }
}

function setupScrollListener() {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  chatMessages.addEventListener('scroll', () => {
    const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
    isFollowing = distanceFromBottom < 100;
  });
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

function setupModeListeners() {
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  const groupSelectWrapper = document.getElementById('groupSelectWrapper');

  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      window.currentMode = e.target.value;

      if (window.currentMode === 'knowledge') {
        if (groupSelectWrapper) {
          groupSelectWrapper.style.display = 'flex';
        }
      } else {
        if (groupSelectWrapper) {
          groupSelectWrapper.style.display = 'none';
        }
      }
    });
  });

  const knowledgeGroupSelect = document.getElementById('knowledgeGroupSelect');
  if (knowledgeGroupSelect) {
    knowledgeGroupSelect.addEventListener('change', (e) => {
      window.currentGroupId = e.target.value;
    });
  }
}

async function loadKnowledgeGroups() {
  try {
    const response = await fetch('/api/knowledge/groups');
    const data = await response.json();
    const groups = data.groups || [];

    const select = document.getElementById('knowledgeGroupSelect');
    if (select) {
      select.innerHTML = '<option value="">全部知识库</option>' +
        groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
    }
  } catch (error) {
    console.error('[Chat] 加载知识库分组失败:', error);
  }
}

async function handleSendMessage() {
  if (isProcessing) {
    return;
  }

  const chatInput = document.getElementById('chatInput');
  const message = chatInput?.value.trim();

  if (!message) {
    return;
  }

  isProcessing = true;
  isFollowing = true;
  chatInput.value = '';

  const mode = window.currentMode || 'hybrid';
  const groupId = (mode === 'knowledge') ? window.currentGroupId : null;

  appendMessage('user', message);

  if (typeof addMessageToSession === 'function') {
    addMessageToSession('user', message);
  }

  const assistantDiv = createAssistantMessage(mode);
  let fullResponseContent = '';

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        session_id: window.currentSessionId || null,
        mode: mode,
        group_id: groupId || null
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (lastContent) {
          fullResponseContent += lastContent;
          appendContent(assistantDiv, lastContent, true);
          lastContent = '';
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'thinking') {
              updateThinking(assistantDiv, parsed.content);
            } else if (parsed.type === 'content') {
              lastContent = parsed.content;
              fullResponseContent += parsed.content;
              appendContent(assistantDiv, parsed.content, false);
            } else if (parsed.type === 'done') {
              finishMessage(assistantDiv);
            }
          } catch (e) {
            console.error('解析SSE数据失败:', e);
          }
        }
      }
    }

    if (typeof addMessageToSession === 'function' && fullResponseContent) {
      addMessageToSession('assistant', fullResponseContent);
    }
  } catch (error) {
    console.error('[Chat] 发送消息失败:', error);
    updateThinking(assistantDiv, '抱歉，发生了错误。请稍后重试。');
  } finally {
    isProcessing = false;
  }
}

function createAssistantMessage(mode) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return null;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';

  const modeIcons = {
    'knowledge': '📚',
    'agent': '🤖',
    'hybrid': '🔧'
  };
  const modeIcon = modeIcons[mode] || '•';

  messageDiv.innerHTML = `
    <div class="mode-label">${modeIcon} ${mode.toUpperCase()} 模式</div>
    <div class="message-content">
      <div class="thinking-indicator" style="display: none;">
        <span class="thinking-text"></span>
      </div>
      <div class="content-wrapper"></div>
    </div>
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return messageDiv;
}

function updateThinking(messageDiv, content) {
  if (!messageDiv) return;

  const thinkingIndicator = messageDiv.querySelector('.thinking-indicator');
  const thinkingText = messageDiv.querySelector('.thinking-text');

  if (thinkingIndicator && thinkingText) {
    thinkingIndicator.style.display = 'block';
    thinkingText.textContent = content;
  }

  scrollChatToBottom();
}

let pendingContent = '';
let currentCodeBlock = null;

function scrollChatToBottom() {
  if (!isFollowing) return;
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function appendContent(messageDiv, content, isFinal = false) {
  if (!messageDiv) return;

  const thinkingIndicator = messageDiv.querySelector('.thinking-indicator');
  const contentWrapper = messageDiv.querySelector('.content-wrapper');

  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'none';
  }

  if (contentWrapper) {
    pendingContent += content;
    contentWrapper.innerHTML = renderStreamingMarkdown(pendingContent, isFinal);
    contentWrapper.dataset.content = pendingContent;
  }

  scrollChatToBottom();
}

function finishMessage(messageDiv) {
  if (!messageDiv) return;

  const thinkingIndicator = messageDiv.querySelector('.thinking-indicator');
  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'none';
  }

  currentCodeBlock = null;
  scrollChatToBottom();
}

function renderStreamingMarkdown(content, isFinal = false) {
  // 暂时禁用外部渲染器，直接使用流式渲染
  // if (typeof render === 'function' && typeof detectContentType === 'function') {
  //   return render(content);
  // }

  let html = '<div class="markdown-content">';
  let i = 0;
  const len = content.length;

  while (i < len) {
    if (content.substring(i, i + 3) === '```') {
      const lineEnd = content.indexOf('\n', i);
      const nextBacktick = content.indexOf('```', i + 3);

      let lang = 'code';
      if (lineEnd !== -1 && (nextBacktick === -1 || lineEnd < nextBacktick)) {
        lang = content.substring(i + 3, lineEnd).trim() || 'code';
      }

      const closingTag = content.indexOf('```', i + 3);

      if (closingTag !== -1) {
        const codeContent = content.substring((lineEnd !== -1 ? lineEnd + 1 : i + 3), closingTag);
        const escapedCode = escapeHtml(codeContent.trim());
        const langLabel = getLanguageLabel(lang);
        html += `
          <div class="code-block-wrapper">
            <div class="code-block-header">
              <span class="code-lang">${langLabel}</span>
              <div class="code-block-actions">
                <button class="code-action-btn copy-btn" onclick="window.copyCode(this)">📋 复制</button>
              </div>
            </div>
            <pre class="code-block"><code>${escapedCode}</code></pre>
          </div>`;
        i = closingTag + 3;
      } else {
        const codeContent = content.substring((lineEnd !== -1 ? lineEnd + 1 : i + 3));
        const escapedCode = escapeHtml(codeContent);
        const langLabel = getLanguageLabel(lang);
        const isStreaming = !isFinal;
        html += `
          <div class="code-block-wrapper${isStreaming ? ' streaming' : ''}">
            <div class="code-block-header">
              <span class="code-lang">${langLabel}</span>
              <div class="code-block-actions">
                <button class="code-action-btn copy-btn" onclick="window.copyCode(this)">📋 复制</button>
              </div>
            </div>
            <pre class="code-block"><code>${escapedCode}</code></pre>
          </div>`;
        i = len;
      }
    } else {
      const textEnd = content.indexOf('```', i);
      if (textEnd === -1) {
        html += escapeAndFormatText(content.substring(i));
        i = len;
      } else {
        html += escapeAndFormatText(content.substring(i, textEnd));
        i = textEnd;
      }
    }
  }

  html += '</div>';
  return html;
}

function escapeAndFormatText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');
}

function renderMarkdownWithCode(content) {
  return renderStreamingMarkdown(content, true);
}

function getLanguageLabel(lang) {
  const labels = {
    'js': 'JavaScript', 'javascript': 'JavaScript',
    'ts': 'TypeScript', 'typescript': 'TypeScript',
    'py': 'Python', 'python': 'Python',
    'java': 'Java', 'json': 'JSON', 'yaml': 'YAML', 'yml': 'YAML',
    'sql': 'SQL', 'html': 'HTML', 'css': 'CSS',
    'sh': 'Shell', 'bash': 'Bash', 'shell': 'Shell',
    'md': 'Markdown', 'markdown': 'Markdown',
    'xml': 'XML', 'go': 'Go', 'rust': 'Rust', 'c': 'C',
    'cpp': 'C++', 'c++': 'C++', 'php': 'PHP', 'rb': 'Ruby',
    'code': '代码', '': '代码'
  };
  return labels[lang.toLowerCase()] || lang || '代码';
}

window.copyCode = function(btn) {
  const wrapper = btn.closest('.code-block-wrapper');
  const code = wrapper.querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✅ 已复制';
    setTimeout(() => { btn.textContent = '📋 复制'; }, 2000);
  });
};

function appendMessage(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const modeIcons = {
    'knowledge': '📚',
    'agent': '🤖',
    'hybrid': '🔧'
  };

  const currentMode = window.currentMode || 'hybrid';
  const modeIcon = modeIcons[currentMode] || '•';

  let modeLabel = '';
  if (role === 'assistant') {
    modeLabel = `<div class="mode-label">${modeIcon} ${currentMode.toUpperCase()} 模式</div>`;
  }

  messageDiv.innerHTML = `<div class="message-content">${modeLabel}${renderMarkdownWithCode(content)}</div>`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
  appendMessage,
  loadKnowledgeGroups
};

window.renderMarkdownWithCode = renderMarkdownWithCode;
window.renderStreamingMarkdown = renderStreamingMarkdown;
window.escapeAndFormatText = escapeAndFormatText;

console.log('[ChatPage] Module loaded, renderMarkdownWithCode:', typeof window.renderMarkdownWithCode);

export default window.chatPage;
