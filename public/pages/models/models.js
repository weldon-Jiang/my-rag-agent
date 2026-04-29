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
    renderModelsList(models);
  } catch (error) {
    console.error('[Models] 加载模型失败:', error);
  }
}

/**
 * 渲染模型下拉选择框
 * @param {Array} models - 模型列表
 */
function renderModels(models) {
  const modelSelect = document.getElementById('modelSelect');
  if (!modelSelect) return;

  modelSelect.innerHTML = models.map(model => `
    <option value="${model.id}" ${model.isActive || model.published ? 'selected' : ''}>
      ${model.name} ${model.isActive || model.published ? '(当前)' : ''}
    </option>
  `).join('');
}

/**
 * 渲染模型列表（卡片形式）
 * @param {Array} models - 模型列表
 */
function renderModelsList(models) {
  const modelsList = document.getElementById('modelsList');
  if (!modelsList) return;

  modelsList.innerHTML = models.map(model => `
    <div class="model-card" data-id="${model.id}">
      <div class="model-card-header">
        <h4>${model.name}</h4>
        <span class="model-status ${model.published ? 'published' : 'unpublished'}">
          ${model.published ? '已发布' : '未发布'}
        </span>
      </div>
      <div class="model-card-body">
        <div class="model-info-item">
          <label>模型ID:</label>
          <span>${model.modelId || 'N/A'}</span>
        </div>
        <div class="model-info-item">
          <label>供应商:</label>
          <span>${model.provider || 'N/A'}</span>
        </div>
        <div class="model-info-item">
          <label>类型:</label>
          <span>${model.type || 'chat'}</span>
        </div>
        <div class="model-info-item">
          <label>协议:</label>
          <span>${model.protocol || 'openai'}</span>
        </div>
        <div class="model-info-item">
          <label>API:</label>
          <span class="api-url">${model.url || 'N/A'}</span>
        </div>
      </div>
      <div class="model-card-actions">
        <button class="edit-model-btn" data-id="${model.id}">编辑</button>
        <button class="delete-model-btn" data-id="${model.id}">删除</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.edit-model-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modelId = e.target.dataset.id;
      openEditModelModal(modelId, models);
    });
  });

  document.querySelectorAll('.delete-model-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modelId = e.target.dataset.id;
      handleDeleteModel(modelId);
    });
  });
}

/**
 * 打开编辑模型模态框
 */
function openEditModelModal(modelId, models) {
  const model = models.find(m => m.id === modelId);
  if (!model) return;

  const modal = document.getElementById('modelModal');
  const title = document.getElementById('modelModalTitle');
  const nameInput = document.getElementById('modalModelName');
  const idInput = document.getElementById('modalModelId');
  const typeSelect = document.getElementById('modalModelType');
  const protocolSelect = document.getElementById('modalModelProtocol');
  const urlInput = document.getElementById('modalModelUrl');
  const keyInput = document.getElementById('modalModelKey');
  const providerInput = document.getElementById('modalModelProvider');
  const publishedCheckbox = document.getElementById('modalModelPublished');

  title.textContent = '编辑模型';
  nameInput.value = model.name || '';
  idInput.value = model.id || '';
  idInput.readOnly = true;
  if (model.modelId) {
    idInput.value = model.modelId;
  }
  typeSelect.value = model.type || 'chat';
  protocolSelect.value = model.protocol || 'openai';
  urlInput.value = model.url || '';
  keyInput.value = model.apiKey || '';
  providerInput.value = model.provider || '';
  publishedCheckbox.checked = model.published || false;

  modal.style.display = 'block';
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
  const name = document.getElementById('modalModelName')?.value.trim();
  const modelId = document.getElementById('modalModelId')?.value.trim();
  const type = document.getElementById('modalModelType')?.value || 'chat';
  const protocol = document.getElementById('modalModelProtocol')?.value || 'openai';
  const url = document.getElementById('modalModelUrl')?.value.trim();
  const apiKey = document.getElementById('modalModelKey')?.value.trim();
  const provider = document.getElementById('modalModelProvider')?.value.trim();
  const published = document.getElementById('modalModelPublished')?.checked || false;

  if (!name || !modelId || !url) {
    alert('请填写必填字段：模型名称、模型ID、API URL');
    return;
  }

  const modelData = {
    id: modelId,
    name,
    modelId,
    type,
    protocol,
    url,
    apiKey,
    provider,
    published
  };

  try {
    const response = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelData)
    });

    if (response.ok) {
      alert('保存成功！');
      document.getElementById('modelModal').style.display = 'none';
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
 * 处理删除模型
 */
async function handleDeleteModel(modelId) {
  if (!confirm('确定要删除这个模型吗？')) return;

  try {
    const response = await fetch(`/api/models/${modelId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('删除成功！');
      await loadModels();
    } else {
      alert('删除失败');
    }
  } catch (error) {
    console.error('[Models] 删除模型失败:', error);
    alert('删除失败: ' + error.message);
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