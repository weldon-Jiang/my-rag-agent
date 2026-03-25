let currentModels = [];
let selectedModel = null;
let selectedMode = 'hybrid';
let attachments = [];
let editingModelId = null;
let selectedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
    loadFiles();
    loadModels();
    setupEventListeners();
    setupNavigation();
    setupDropzone();
    setupChatInput();
    setupModelModal();
    initTheme();
});

function initTheme() {
    const saved = localStorage.getItem('theme') || 'system';
    applyTheme(saved);
    updateThemeButtons();

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const currentTheme = localStorage.getItem('theme') || 'system';
        if (currentTheme === 'system') {
            applyTheme('system');
        }
    });
}

function applyTheme(theme) {
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
}

function updateThemeButtons() {
    const saved = localStorage.getItem('theme') || 'system';
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === saved) {
            btn.classList.add('active');
        }
    });
}

function setupThemeSwitcher() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            updateThemeButtons();
        });
    });
}

function setupEventListeners() {
    setupThemeSwitcher();

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('openAddModelModalBtn')?.addEventListener('click', openAddModelModal);
    document.getElementById('uploadBtn')?.addEventListener('click', () => {
        if (selectedFiles.length > 0) {
            uploadSelectedFiles();
        }
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedMode = btn.dataset.mode;
            updateModeButtons();
        });
    });
}

function updateModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === selectedMode) {
            btn.classList.add('active');
        }
    });
}

function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
            
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}Page`).classList.add('active');
    
    if (page === 'knowledge') {
        loadFiles();
    } else if (page === 'models') {
        loadModels();
    }
}

function setupDropzone() {
    const dropzone = document.getElementById('uploadDropzone');
    if (!dropzone) return;
    
    dropzone.addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFilesSelected(files);
    });
    
    document.getElementById('fileInput')?.addEventListener('change', (e) => {
        handleFilesSelected(e.target.files);
        e.target.value = '';
    });
}

function handleFilesSelected(files) {
    for (const file of files) {
        if (!selectedFiles.some(f => f.name === file.name)) {
            selectedFiles.push(file);
        }
    }
    renderSelectedFiles();
    updateUploadButton();
}

function renderSelectedFiles() {
    const container = document.getElementById('selectedFiles');
    if (!container) return;
    
    if (selectedFiles.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="selected-file-item">
            <span title="${file.name}">${file.name} (${(file.size / 1024).toFixed(2)} KB)</span>
            <span class="remove-btn" onclick="removeSelectedFile(${index})">&times;</span>
        </div>
    `).join('');
}

function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    renderSelectedFiles();
    updateUploadButton();
}

function updateUploadButton() {
    const btn = document.getElementById('uploadBtn');
    if (btn) {
        btn.disabled = selectedFiles.length === 0;
    }
}

function uploadSelectedFiles() {
    if (selectedFiles.length === 0) return;
    uploadFiles(selectedFiles);
    selectedFiles = [];
    renderSelectedFiles();
    updateUploadButton();
}

async function uploadFiles(files) {
    const progressContainer = document.getElementById('uploadProgress');
    progressContainer.innerHTML = '';
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        if (file.size > 100 * 1024 * 1024) {
            failCount++;
            continue;
        }
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (result.success) {
                successCount++;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            failCount++;
            console.error('上传失败:', file.name, error);
        }
    }
    
    setTimeout(() => {
        progressContainer.innerHTML = '';
        loadFiles();
    }, 500);
    
    if (successCount > 0 && failCount === 0) {
        showToast(`成功上传 ${successCount} 个文件`, 'success');
    } else if (successCount > 0 && failCount > 0) {
        showToast(`成功 ${successCount} 个，失败 ${failCount} 个`, 'error');
    } else if (failCount > 0) {
        showToast(`上传失败 ${failCount} 个文件`, 'error');
    }
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        const files = await response.json();
        renderFileList(files);
    } catch (error) {
        console.error('加载文件失败:', error);
    }
}

function renderFileList(files) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    if (files.length === 0) {
        fileList.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">暂无文件</p>';
        return;
    }
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        const sizeKB = (file.size / 1024).toFixed(2);
        fileItem.innerHTML = `
            <span title="${file.name}">${file.name} (${sizeKB} KB)</span>
            <button onclick="deleteFile('${file.name}')">删除</button>
        `;
        fileList.appendChild(fileItem);
    });
}

async function deleteFile(filename) {
    if (!confirm(`确定要删除文件 ${filename} 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            loadFiles();
        }
    } catch (error) {
        console.error('删除文件失败:', error);
    }
}

async function loadModels() {
    try {
        const response = await fetch('/api/models');
        const allModels = await response.json();
        currentModels = allModels;

        const publishedResponse = await fetch('/api/models/published');
        const publishedModels = await publishedResponse.json();
        const publishedIds = publishedModels.map(m => m.id);

        if (!selectedModel || !publishedIds.includes(selectedModel)) {
            const minimaxModel = publishedModels.find(m => m.id === 'minimax-m2.5');
            if (minimaxModel) {
                selectedModel = minimaxModel.id;
            } else if (publishedModels.length > 0) {
                selectedModel = publishedModels[0].id;
            }
        }

        renderModelsList();
        renderModelSelect(publishedModels);
    } catch (error) {
        console.error('加载模型失败:', error);
    }
}

function renderModelSelect(publishedModels) {
    const wrapper = document.getElementById('modelSelectWrapper');
    if (!wrapper) return;

    const groupedModels = {};
    const defaultProviders = ['OpenAI', 'Ollama'];

    publishedModels.forEach(model => {
        if (!groupedModels[model.provider]) {
            groupedModels[model.provider] = [];
        }
        groupedModels[model.provider].push(model);
    });

    const customProviders = Object.keys(groupedModels).filter(p => !defaultProviders.includes(p));
    const allProviders = [...customProviders, ...defaultProviders];

    let html = `
        <div class="models-dropdown">
            <div class="models-dropdown-toggle" onclick="toggleModelDropdown()">
                <span id="selectedModelName">${getSelectedModelName()}</span>
                <span>▼</span>
            </div>
            <div class="models-dropdown-menu" id="modelDropdownMenu">
    `;

    allProviders.forEach(provider => {
        if (!groupedModels[provider]) return;

        html += `
            <div class="model-group">
                <div class="model-group-title">${provider}</div>
                ${groupedModels[provider].map(model => `
                    <div class="model-option ${model.id === selectedModel ? 'selected' : ''}"
                         onclick="selectModel('${model.id}')">
                        <input type="radio" name="model" value="${model.id}"
                               ${model.id === selectedModel ? 'checked' : ''}>
                        <span>${model.name}</span>
                    </div>
                `).join('')}
            </div>
        `;
    });

    html += '</div></div>';
    wrapper.innerHTML = html;
}

// 只添加一次点击事件监听器
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.models-dropdown')) {
            document.getElementById('modelDropdownMenu')?.classList.remove('open');
        }
    });
});

function toggleModelDropdown() {
    const menu = document.getElementById('modelDropdownMenu');
    const toggle = document.querySelector('.models-dropdown-toggle');
    menu?.classList.toggle('open');
    toggle?.classList.toggle('active');
}

function selectModel(modelId) {
    selectedModel = modelId;
    const modelName = getSelectedModelName();
    const nameSpan = document.getElementById('selectedModelName');
    if (nameSpan) {
        nameSpan.textContent = modelName;
    }
    const menu = document.getElementById('modelDropdownMenu');
    const toggle = document.querySelector('.models-dropdown-toggle');
    menu?.classList.remove('open');
    toggle?.classList.remove('active');
}

function getSelectedModelName() {
    const model = currentModels.find(m => m.id === selectedModel);
    return model ? model.name : '请选择模型';
}

function renderModelsList() {
    const list = document.getElementById('modelsList');
    if (!list) return;

    list.innerHTML = '';

    currentModels.forEach(model => {
        const card = document.createElement('div');
        card.className = 'model-card';
        const isPublished = model.published !== false;
        const publishedText = isPublished ? '已发布' : '未发布';
        const publishedClass = isPublished ? 'published' : 'unpublished';
        const toggleBtnText = isPublished ? '下架' : '发布';
        card.innerHTML = `
            <div class="model-card-header">
                <div class="model-card-name">${model.name}</div>
                <div class="model-card-actions">
                    <button class="toggle-btn" onclick="toggleModelPublished('${model.id}')">${toggleBtnText}</button>
                    <button class="edit-btn" onclick="editModel('${model.id}')">编辑</button>
                    <button class="delete-btn" onclick="deleteModel('${model.id}')">删除</button>
                </div>
            </div>
            <div class="model-card-details">
                <div><strong>ID:</strong> ${model.id}</div>
                <div><strong>供应商:</strong> ${model.provider}</div>
                <div><strong>类型:</strong> ${model.type || 'chat'}</div>
                <div><strong>状态:</strong> <span class="publish-status ${publishedClass}">${publishedText}</span></div>
                ${model.url ? `<div><strong>URL:</strong> ${model.url}</div>` : ''}
                ${model.apiKey ? `<div><strong>密钥:</strong> ${'*'.repeat(model.apiKey.length)}</div>` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

function setupModelModal() {
    const modal = document.getElementById('modelModal');
    const closeBtn = modal?.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancelModelBtn');
    const saveBtn = document.getElementById('saveModelBtn');
    
    closeBtn?.addEventListener('click', closeModelModal);
    cancelBtn?.addEventListener('click', closeModelModal);
    saveBtn?.addEventListener('click', saveModelFromModal);
    
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModelModal();
        }
    });
}

function openAddModelModal() {
    editingModelId = null;
    document.getElementById('modelModalTitle').textContent = '新增模型';
    document.getElementById('modalModelName').value = '';
    document.getElementById('modalModelId').value = '';
    document.getElementById('modalModelUrl').value = '';
    document.getElementById('modalModelKey').value = '';
    document.getElementById('modalModelProvider').value = '';
    document.getElementById('modalModelPublished').checked = true;
    clearModalErrors();
    document.getElementById('modelModal').classList.add('open');
}

function openEditModelModal(model) {
    editingModelId = model.id;
    document.getElementById('modelModalTitle').textContent = '编辑模型';
    document.getElementById('modalModelName').value = model.name || '';
    document.getElementById('modalModelId').value = model.id || '';
    document.getElementById('modalModelId').readOnly = true;
    document.getElementById('modalModelUrl').value = model.url || '';
    document.getElementById('modalModelKey').value = model.apiKey || '';
    document.getElementById('modalModelProvider').value = model.provider || '';
    document.getElementById('modalModelPublished').checked = model.published !== false;
    clearModalErrors();
    document.getElementById('modelModal').classList.add('open');
}

function closeModelModal() {
    document.getElementById('modelModal').classList.remove('open');
    document.getElementById('modalModelId').readOnly = false;
    editingModelId = null;
}

function clearModalErrors() {
    document.querySelectorAll('.form-group .error-hint').forEach(el => el.remove());
    document.querySelectorAll('.form-group input').forEach(el => el.style.borderColor = '');
}

function showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    input.style.borderColor = '#dc3545';
    const error = document.createElement('div');
    error.className = 'error-hint';
    error.textContent = message;
    input.parentElement.appendChild(error);
}

function validateModelForm() {
    clearModalErrors();
    let isValid = true;
    
    const name = document.getElementById('modalModelName').value.trim();
    const id = document.getElementById('modalModelId').value.trim();
    const url = document.getElementById('modalModelUrl').value.trim();
    const apiKey = document.getElementById('modalModelKey').value.trim();
    const provider = document.getElementById('modalModelProvider').value.trim();
    
    if (!name) {
        showFieldError('modalModelName', '请输入模型名称');
        isValid = false;
    }
    
    if (!id) {
        showFieldError('modalModelId', '请输入模型ID');
        isValid = false;
    } else if (!editingModelId) {
        const exists = currentModels.some(m => m.id === id);
        if (exists) {
            showFieldError('modalModelId', '该模型ID已存在');
            isValid = false;
        }
    }
    
    if (!url) {
        showFieldError('modalModelUrl', '请输入API URL');
        isValid = false;
    }
    
    if (!apiKey) {
        showFieldError('modalModelKey', '请输入API密钥');
        isValid = false;
    }
    
    if (!provider) {
        showFieldError('modalModelProvider', '请输入供应商');
        isValid = false;
    }
    
    return isValid;
}

async function saveModelFromModal() {
    if (!validateModelForm()) return;

    const modelData = {
        name: document.getElementById('modalModelName').value.trim(),
        id: document.getElementById('modalModelId').value.trim(),
        url: document.getElementById('modalModelUrl').value.trim(),
        apiKey: document.getElementById('modalModelKey').value.trim(),
        provider: document.getElementById('modalModelProvider').value.trim(),
        type: 'chat',
        published: document.getElementById('modalModelPublished').checked
    };

    try {
        let response;
        if (editingModelId) {
            response = await fetch(`/api/models/${editingModelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(modelData)
            });
        } else {
            response = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(modelData)
            });
        }

        if (response.ok) {
            closeModelModal();
            loadModels();
        } else {
            const error = await response.json();
            alert('保存失败: ' + error.error);
        }
    } catch (error) {
        console.error('保存模型失败:', error);
        alert('保存模型失败');
    }
}

function editModel(modelId) {
    const model = currentModels.find(m => m.id === modelId);
    if (!model) return;
    openEditModelModal(model);
}

async function deleteModel(modelId) {
    if (!confirm('确定要删除此模型吗？')) return;

    try {
        const response = await fetch(`/api/models/${modelId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            if (selectedModel === modelId) {
                selectedModel = currentModels.find(m => m.id !== modelId)?.id;
            }
            loadModels();
        }
    } catch (error) {
        console.error('删除模型失败:', error);
    }
}

async function toggleModelPublished(modelId) {
    const model = currentModels.find(m => m.id === modelId);
    if (!model) return;

    const newPublished = model.published === false;

    try {
        const response = await fetch(`/api/models/${modelId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: newPublished })
        });

        if (response.ok) {
            loadModels();
        }
    } catch (error) {
        console.error('切换模型状态失败:', error);
    }
}

function setupChatInput() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    chatInput.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (items) {
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    addAttachment(file);
                }
            }
        }
    });
    
    chatInput.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    chatInput.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        for (const file of files) {
            addAttachment(file);
        }
    });
}

function addAttachment(file) {
    attachments.push(file);
    renderAttachments();
}

function removeAttachment(index) {
    attachments.splice(index, 1);
    renderAttachments();
}

function renderAttachments() {
    const container = document.getElementById('attachments');
    if (!container) return;
    
    container.innerHTML = attachments.map((file, index) => `
        <div class="attachment-item">
            <span>${file.name}</span>
            <button onclick="removeAttachment(${index})">×</button>
        </div>
    `).join('');
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message && attachments.length === 0) {
        return;
    }
    
    const mode = selectedMode;
    const model = selectedModel;
    
    if (!model) {
        alert('请先选择一个模型');
        return;
    }
    
    let fullMessage = message;
    if (attachments.length > 0) {
        fullMessage += '\n\n[附件: ' + attachments.map(f => f.name).join(', ') + ']';
    }
    
    addMessage(fullMessage, 'user');
    chatInput.value = '';
    attachments = [];
    renderAttachments();
    
    const loadingId = showLoading();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: message, mode, model })
        });
        
        const result = await response.json();
        
        removeLoading(loadingId);
        
        if (result.error) {
            addMessage(`错误: ${result.error}`, 'assistant');
        } else {
            addMessage(result.response, 'assistant', result.source, result.knowledgeResults);
        }
    } catch (error) {
        removeLoading(loadingId);
        console.error('请求失败:', error);
        addMessage(`发送失败: ${error.message}`, 'assistant');
    }
}

function addMessage(content, role, source = '', knowledgeResults = []) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    let sourceHtml = '';
    if (source) {
        sourceHtml = `<div class="message-source">来源: ${source}</div>`;
    }
    
    if (knowledgeResults && knowledgeResults.length > 0) {
        sourceHtml += `<div class="message-source">引用文件: ${knowledgeResults.map(r => r.filename).join(', ')}</div>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(content)}</div>
        ${sourceHtml}
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showLoading() {
    const chatMessages = document.getElementById('chatMessages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    loadingDiv.id = 'loading-message';
    loadingDiv.innerHTML = '<div class="message-content"><span class="loading"></span></div>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return 'loading-message';
}

function removeLoading(id) {
    const loadingElement = document.getElementById(id);
    if (loadingElement) {
        loadingElement.remove();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
