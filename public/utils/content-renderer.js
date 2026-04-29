/**
 * 智能内容渲染引擎
 * @description 支持纯文本、Markdown、JSON的智能识别和渲染
 * @module utils/content-renderer
 */

/**
 * 内容类型枚举
 */
const ContentType = {
  TEXT: 'text',
  MARKDOWN: 'markdown',
  JSON: 'json',
  MIXED: 'mixed'
};

/**
 * 检测内容类型
 * @param {string} content - 待检测的内容
 * @returns {string} 内容类型
 */
function detectContentType(content) {
  if (!content || typeof content !== 'string') {
    return ContentType.TEXT;
  }

  const trimmed = content.trim();

  if (!trimmed) {
    return ContentType.TEXT;
  }

  if (isJson(trimmed)) {
    return ContentType.JSON;
  }

  if (isMarkdown(trimmed)) {
    return ContentType.MARKDOWN;
  }

  if (containsMarkdownPatterns(trimmed)) {
    return ContentType.MIXED;
  }

  return ContentType.TEXT;
}

/**
 * 判断是否为JSON
 * @param {string} str - 待检测的字符串
 * @returns {boolean}
 */
function isJson(str) {
  try {
    const trimmed = str.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      JSON.parse(trimmed);
      return true;
    }
  } catch (e) {}
  return false;
}

/**
 * 判断是否为Markdown
 * @param {string} str - 待检测的字符串
 * @returns {boolean}
 */
function isMarkdown(str) {
  const markdownPatterns = [
    /^#{1,6}\s+.+$/m,
    /\*\*[^*]+\*\*/,
    /__[^_]+__/,
    /\*[^*]+\*/,
    /_[^_]+_/,
    /```[\s\S]*?```/,
    /`[^`]+`/,
    /^\s*[-*+]\s+.+$/m,
    /^\s*\d+\.\s+.+$/m,
    /\[.+\]\(.+\)/,
    /!\[.+\]\(.+\)/,
    /^>\s+.+$/m,
    /^---$/m,
    /^\|.+|$/m
  ];

  let matchCount = 0;
  for (const pattern of markdownPatterns) {
    if (pattern.test(str)) {
      matchCount++;
      if (matchCount >= 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 检测是否包含Markdown模式
 * @param {string} str - 待检测的字符串
 * @returns {boolean}
 */
function containsMarkdownPatterns(str) {
  const patterns = [
    /```/,
    /`[^`]+`/,
    /\*\*[^*]+\*\*/,
    /__[^_]+__/,
    /\[.+\]\(.+\)/,
    /^#{1,6}\s/m,
    /^\s*[-*+]\s/m
  ];

  return patterns.some(pattern => pattern.test(str));
}

function getLanguageLabelForRenderer(lang) {
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

/**
 * 转义HTML特殊字符
 * @param {string} str - 待转义的字符串
 * @returns {string}
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

/**
 * 简单的Markdown到HTML转换器（不依赖外部库）
 * @param {string} text - Markdown文本
 * @returns {string} HTML
 */
function parseMarkdown(text) {
  if (!text) return '';

  let html = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    if (text.substring(i, i + 3) === '```') {
      const lineEnd = text.indexOf('\n', i);
      const nextBacktick = text.indexOf('```', i + 3);

      let lang = 'code';
      if (lineEnd !== -1 && (nextBacktick === -1 || lineEnd < nextBacktick)) {
        lang = text.substring(i + 3, lineEnd).trim() || 'code';
      }

      const closingTag = text.indexOf('```', i + 3);

      if (closingTag !== -1) {
        let codeContent = text.substring((lineEnd !== -1 ? lineEnd + 1 : i + 3), closingTag);
        codeContent = escapeHtml(codeContent.trim());
        const langLabel = getLanguageLabelForRenderer(lang);
        html += `<div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang">${langLabel}</span>
            <div class="code-block-actions">
              <button class="code-action-btn copy-btn" onclick="window.copyCode(this)">📋 复制</button>
            </div>
          </div>
          <pre class="code-block"><code>${codeContent}</code></pre>
        </div>`;
        i = closingTag + 3;
      } else {
        let codeContent = text.substring((lineEnd !== -1 ? lineEnd + 1 : i + 3));
        codeContent = escapeHtml(codeContent);
        const langLabel = getLanguageLabelForRenderer(lang);
        html += `<div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang">${langLabel}</span>
            <div class="code-block-actions">
              <button class="code-action-btn copy-btn" onclick="window.copyCode(this)">📋 复制</button>
            </div>
          </div>
          <pre class="code-block"><code>${codeContent}</code></pre>
        </div>`;
        i = len;
      }
    } else {
      const textEnd = text.indexOf('```', i);
      if (textEnd === -1) {
        html += escapeAndFormatTextForRenderer(text.substring(i));
        i = len;
      } else {
        html += escapeAndFormatTextForRenderer(text.substring(i, textEnd));
        i = textEnd;
      }
    }
  }

  return html;
}

function escapeAndFormatTextForRenderer(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

/**
 * 格式化JSON并生成可高亮的HTML
 * @param {string} jsonStr - JSON字符串
 * @returns {string} HTML
 */
function formatJson(jsonStr) {
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    const formatted = JSON.stringify(parsed, null, 2);

    let html = '<div class="json-container">';
    html += '<div class="json-toolbar">';
    html += '<button class="json-toggle-btn" onclick="window.contentRenderer.toggleJson(this)">折叠</button>';
    html += '<button class="json-copy-btn" onclick="window.contentRenderer.copyJson(this)">复制</button>';
    html += '</div>';
    html += '<pre class="json-content"><code>' + syntaxHighlightJson(formatted) + '</code></pre>';
    html += '</div>';

    return html;
  } catch (e) {
    return '<pre class="json-error">' + escapeHtml(jsonStr) + '</pre>';
  }
}

/**
 * JSON语法高亮
 * @param {string} json - 格式化的JSON
 * @returns {string} 高亮后的HTML
 */
function syntaxHighlightJson(json) {
  const escaped = escapeHtml(json);

  return escaped
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
          match = match.slice(0, -1) + '<span class="json-colon">:</span>';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    })
    .replace(/[{}\[\]]/g, (match) => {
      const cls = match === '{' || match === '}' ? 'json-brace' : 'json-bracket';
      return '<span class="' + cls + '">' + match + '</span>';
    });
}

/**
 * 渲染纯文本
 * @param {string} text - 纯文本
 * @returns {string} HTML
 */
function renderText(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  html = html.replace(/\n/g, '<br>');

  return '<div class="text-content">' + html + '</div>';
}

/**
 * 渲染JSON内容
 * @param {string} jsonStr - JSON字符串
 * @returns {string} HTML
 */
function renderJson(jsonStr) {
  return formatJson(jsonStr);
}

/**
 * 渲染Markdown内容
 * @param {string} markdown - Markdown文本
 * @returns {string} HTML
 */
function renderMarkdown(markdown) {
  if (!markdown) return '';

  return '<div class="markdown-content">' + parseMarkdown(markdown) + '</div>';
}

/**
 * 智能渲染混合内容
 * @param {string} content - 混合内容
 * @returns {string} HTML
 */
function renderMixedContent(content) {
  if (!content) return '';

  const parts = splitIntoRenderableParts(content);
  let html = '<div class="mixed-content">';

  for (const part of parts) {
    const type = detectContentType(part.content);
    switch (type) {
      case ContentType.JSON:
        html += renderJson(part.content);
        break;
      case ContentType.MARKDOWN:
        html += renderMarkdown(part.content);
        break;
      default:
        html += renderText(part.content);
    }
  }

  html += '</div>';
  return html;
}

/**
 * 将混合内容分割成可渲染的部分
 * @param {string} content - 混合内容
 * @returns {Array} 内容片段数组
 */
function splitIntoRenderableParts(content) {
  const parts = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.substring(lastIndex, match.index);
      if (textPart.trim()) {
        parts.push({ type: 'text', content: textPart });
      }
    }

    parts.push({
      type: 'code',
      content: match[2],
      lang: match[1] || 'text'
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.substring(lastIndex);
    if (remaining.trim()) {
      parts.push({ type: 'text', content: remaining });
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content: content });
  }

  return parts;
}

/**
 * 主渲染函数 - 智能选择渲染方式
 * @param {string} content - 待渲染的内容
 * @param {Object} options - 渲染选项
 * @returns {string} 渲染后的HTML
 */
function render(content, options = {}) {
  if (!content || typeof content !== 'string') {
    return renderText('无法渲染空内容');
  }

  const type = detectContentType(content);

  switch (type) {
    case ContentType.JSON:
      return renderJson(content);
    case ContentType.MARKDOWN:
      return renderMarkdown(content);
    case ContentType.MIXED:
      return renderMixedContent(content);
    default:
      return renderText(content);
  }
}

/**
 * 渲染消息内容（包含思考过程等）
 * @param {Object} messageData - 消息数据
 * @returns {string} 渲染后的HTML
 */
function renderMessage(messageData) {
  const { content, thinking, type = 'assistant' } = messageData;

  let html = '';

  if (thinking) {
    html += `<div class="message-thinking">
      <div class="think-label">思考过程：</div>
      <div class="think-content">${render(thinking)}</div>
    </div>`;
  }

  html += `<div class="message-main">${render(content)}</div>`;

  return html;
}

/**
 * JSON折叠/展开切换
 * @param {HTMLElement} button - 切换按钮
 */
function toggleJson(button) {
  const container = button.closest('.json-container');
  const pre = container.querySelector('.json-content');

  if (pre.classList.contains('collapsed')) {
    pre.classList.remove('collapsed');
    button.textContent = '折叠';
  } else {
    pre.classList.add('collapsed');
    button.textContent = '展开';
  }
}

/**
 * 复制JSON内容
 * @param {HTMLElement} button - 复制按钮
 */
function copyJson(button) {
  const container = button.closest('.json-container');
  const code = container.querySelector('code');
  const text = code.textContent;

  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = '已复制!';
    button.classList.add('copied');

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('复制失败:', err);
  });
}

/**
 * 渲染内容并返回DOM
 * @param {string} content - 内容
 * @param {HTMLElement} container - 容器元素
 */
function renderIntoContainer(content, container) {
  if (!container) return;

  const html = render(content);
  container.innerHTML = html;
}

/**
 * 获取内容的检测类型（用于调试）
 * @param {string} content - 内容
 * @returns {string} 内容类型
 */
function getContentType(content) {
  return detectContentType(content);
}

/**
 * 检测JSON结构类型（普通对象、数组、API响应等）
 * @param {string} jsonStr - JSON字符串
 * @returns {string} 结构类型
 */
function detectJsonStructure(jsonStr) {
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return 'empty-array';
      if (typeof parsed[0] === 'object') return 'object-array';
      return 'primitive-array';
    }

    if (typeof parsed === 'object' && parsed !== null) {
      const keys = Object.keys(parsed);
      if (keys.length === 0) return 'empty-object';

      if (parsed.success !== undefined || parsed.error !== undefined) {
        return 'api-response';
      }

      if (parsed.data !== undefined || parsed.result !== undefined) {
        return 'wrapped-response';
      }

      return 'plain-object';
    }

    return typeof parsed;
  } catch (e) {
    return 'invalid';
  }
}

/**
 * 为API响应生成特殊UI
 * @param {string} jsonStr - JSON字符串
 * @returns {string} HTML
 */
function renderApiResponse(jsonStr) {
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;

    if (parsed.success !== undefined) {
      const statusClass = parsed.success ? 'success' : 'error';
      const statusIcon = parsed.success ? '✓' : '✗';
      const statusText = parsed.success ? '成功' : '失败';

      let html = `<div class="api-response ${statusClass}">`;
      html += `<div class="api-status"><span class="status-icon">${statusIcon}</span>${statusText}</div>`;

      if (parsed.message) {
        html += `<div class="api-message">${escapeHtml(parsed.message)}</div>`;
      }

      if (parsed.data) {
        html += '<div class="api-data">';
        if (typeof parsed.data === 'object') {
          html += renderApiResponseData(parsed.data);
        } else {
          html += escapeHtml(String(parsed.data));
        }
        html += '</div>';
      }

      html += '</div>';
      return html;
    }

    return formatJson(jsonStr);
  } catch (e) {
    return formatJson(jsonStr);
  }
}

/**
 * 渲染API响应数据
 * @param {Object} data - 数据对象
 * @returns {string} HTML
 */
function renderApiResponseData(data) {
  if (Array.isArray(data)) {
    let html = '<ul class="api-list">';
    for (const item of data) {
      html += `<li>${typeof item === 'object' ? renderApiResponseData(item) : escapeHtml(String(item))}</li>`;
    }
    html += '</ul>';
    return html;
  }

  if (typeof data === 'object' && data !== null) {
    let html = '<div class="api-object">';
    for (const [key, value] of Object.entries(data)) {
      html += `<div class="api-field"><span class="field-key">${escapeHtml(key)}:</span>`;
      if (typeof value === 'object') {
        html += renderApiResponseData(value);
      } else {
        html += `<span class="field-value">${escapeHtml(String(value))}</span>`;
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  return escapeHtml(String(data));
}

/**
 * 智能渲染（增强版，针对API响应等特殊结构）
 * @param {string} content - 内容
 * @param {Object} options - 选项
 * @returns {string} HTML
 */
function smartRender(content, options = {}) {
  if (!content || typeof content !== 'string') {
    return renderText('无法渲染空内容');
  }

  if (content.includes('```')) {
    return renderMarkdown(content);
  }

  const type = detectContentType(content);

  if (type === ContentType.JSON) {
    const structure = detectJsonStructure(content);
    if (structure === 'api-response') {
      return renderApiResponse(content);
    }
    return renderJson(content);
  }

  if (type === ContentType.MIXED) {
    return renderMarkdown(content);
  }

  return render(content, options);
}

window.contentRenderer = {
  ContentType,
  detectContentType,
  isJson,
  isMarkdown,
  render,
  smartRender,
  renderText,
  renderJson,
  renderMarkdown,
  renderMixedContent,
  renderMessage,
  toggleJson,
  copyJson,
  renderIntoContainer,
  getContentType,
  detectJsonStructure,
  escapeHtml
};
