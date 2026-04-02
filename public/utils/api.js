/**
 * API 请求封装工具
 * @description 封装常用的 API 请求方法，统一处理请求和响应
 * @module utils/api
 */

const API_BASE = '';

/**
 * 发送 GET 请求
 * @param {string} url - 请求路径
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 响应数据
 */
async function get(url, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = queryString ? `${API_BASE}${url}?${queryString}` : `${API_BASE}${url}`;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 发送 POST 请求
 * @param {string} url - 请求路径
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 响应数据
 */
async function post(url, data = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 发送 DELETE 请求
 * @param {string} url - 请求路径
 * @returns {Promise<Object>} 响应数据
 */
async function del(url) {
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// API 模块定义
const api = {
  // 聊天相关
  chat: {
    send: (message, options = {}) => post('/api/chat', { message, ...options }),
    getHistory: (sessionId) => get(`/api/chat/history/${sessionId}`),
    listSessions: () => get('/api/chat/sessions'),
    deleteSession: (sessionId) => del(`/api/chat/session/${sessionId}`)
  },

  // 文件相关
  files: {
    list: () => get('/api/files'),
    upload: (formData) => fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      body: formData
    }).then(r => r.json()),
    delete: (filename) => del(`/api/files/${encodeURIComponent(filename)}`)
  },

  // 技能相关
  skills: {
    list: () => get('/api/skills'),
    getByCategory: () => get('/api/skills/by-category')
  },

  // 模型相关
  models: {
    list: () => get('/api/models'),
    get: (id) => get(`/api/models/${id}`),
    update: (id, config) => post(`/api/models/${id}`, config)
  },

  // 工具相关
  tools: {
    list: () => get('/api/tools')
  }
};

// 导出 API 模块
window.api = api;