/**
 * 模型管理页面模块
 * @description 处理模型的配置、切换和保存
 * @module pages/models
 */

// 页面初始化函数
function init() {
  console.log('[Models] 模型管理页面初始化');
  loadModels();
  setupEventListeners();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  const saveBtn = document.getElementById('saveModelBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveModel);
  }

  const testBtn = document.getElementById('testConnectionBtn');
  if (testBtn) {
    testBtn.addEventListener('click', handleTestConnection);
  }
}

/**
 * 加载模型列表
 */
async function loadModels() {
  try {
    const response = await fetch('/api/models');
    const models = await response.json();
    renderModels(models);
  } catch (error) {
    console.error('[Models] 加载模型失败:', error);
  }
}

/**
 * 渲染模型列表
 * @param {Array} models - 模型列表
 */
function renderModels(models) {
  const modelSelect = document.getElementById('modelSelect');
  if (!modelSelect) return;

  modelSelect.innerHTML = models.map(model => `
    <option value="${model.id}" ${model.isActive ? 'selected' : ''}>
      ${model.name} ${model.isActive ? '(当前)' : ''}
    </option>
  `).join('');
}

/**
 * 获取选中的模型
 */
function getSelectedModel() {
  const modelSelect = document.getElementById('modelSelect');
  if (!modelSelect) return null;
  return modelSelect.value;
}

/**
 * 处理保存模型配置
 */
async function handleSaveModel() {
  const selectedModel = getSelectedModel();
  if (!selectedModel) return;

  const apiKey = document.getElementById('apiKeyInput')?.value.trim();
  const baseUrl = document.getElementById('baseUrlInput')?.value.trim();

  try {
    const response = await fetch(`/api/models/${selectedModel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, baseURL: baseUrl })
    });

    if (response.ok) {
      alert('保存成功！');
      await loadModels();
    } else {
      alert('保存失败');
    }
  } catch (error) {
    console.error('[Models] 保存模型失败:', error);
    alert('保存失败: ' + error.message);
  }
}

/**
 * 处理测试连接
 */
async function handleTestConnection() {
  const selectedModel = getSelectedModel();
  const testResult = document.getElementById('testResult');
  if (!testResult) return;

  testResult.innerHTML = '<span class="loading">测试中...</span>';

  try {
    const response = await fetch(`/api/models/${selectedModel}/test`, {
      method: 'POST'
    });

    if (response.ok) {
      testResult.innerHTML = '<span class="success">✓ 连接成功</span>';
    } else {
      testResult.innerHTML = '<span class="error">✗ 连接失败</span>';
    }
  } catch (error) {
    console.error('[Models] 测试连接失败:', error);
    testResult.innerHTML = '<span class="error">✗ 连接失败: ' + error.message + '</span>';
  }
}

// 导出页面模块
window.modelsPage = {
  init,
  loadModels,
  getSelectedModel
};