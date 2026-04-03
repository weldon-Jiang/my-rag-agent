/**
 * 应用主文件
 * @description 处理所有前端逻辑，包括会话管理、聊天、文件上传、模型配置等
 */

/**
 * 全局状态变量
 */
let currentModels = [];
let selectedModel = null;
let selectedMode = 'hybrid';
let attachments = [];
let editingModelId = null;
let selectedFiles = [];

/**
 * DOM加载完成后初始化应用
 */
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

/**
 * 初始化应用
 * @description 加载页面 HTML、组件，然后初始化各模块
 */
async function initializeApp() {
    try {
        await router.loadAllPagesHTML();
        await router.loadAllComponents();

        loadSessions();
        loadFiles();
        loadModels();
        setupEventListeners();
        setupNavigation();
        setupDropzone();
        setupChatInput();
        setupModelModal();
        initTheme();
        setupSessionEvents();
        setupBatchDeleteEvents();

        router.navigateTo('chat');
    } catch (error) {
        console.error('[App] 初始化失败:', error);
    }
}

/**
 * 设置会话相关事件监听器
 * @description 为新会话按钮等会话相关元素绑定事件
 */
function setupSessionEvents() {
    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', () => {
            createNewSession();
        });
    }
}

/**
 * 初始化主题设置
 * @description 从localStorage读取保存的主题设置并应用到页面
 */
function initTheme() {
    const saved = localStorage.getItem('theme') || 'system';
    applyTheme(saved);
    updateThemeButtons();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        const currentTheme = localStorage.getItem('theme') || 'system';
        if (currentTheme === 'system') {
            applyTheme('system');
        }
    });
}

/**
 * 应用主题到页面
 * @param {string} theme - 主题名称 ('light', 'dark', 'system')
 */
function applyTheme(theme) {
    console.log('[Theme] applyTheme called with:', theme);
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        console.log('[Theme] System prefers dark:', prefersDark);
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        console.log('[Theme] Setting theme to:', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
}

/**
 * 更新主题按钮的激活状态
 * @description 根据保存的主题设置高亮对应的按钮
 */
function updateThemeButtons() {
    const saved = localStorage.getItem('theme') || 'system';
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === saved) {
            btn.classList.add('active');
        }
    });
}

/**
 * LocalStorage键名常量
 */
const BOT_NAME_KEY = 'rag_agent_bot_name';
const DEFAULT_BOT_NAME = '智能助手';

/**
 * 获取机器人名称
 * @returns {string} 机器人名称
 */
function getBotName() {
    return localStorage.getItem(BOT_NAME_KEY) || DEFAULT_BOT_NAME;
}

/**
 * 设置机器人名称
 * @param {string} name - 机器人名称
 */
function setBotName(name) {
    localStorage.setItem(BOT_NAME_KEY, name);
}

const USER_NAME_KEY = 'rag_agent_user_name';

/**
 * 获取用户名
 * @returns {string|null} 用户名
 */
function getUserName() {
    return localStorage.getItem(USER_NAME_KEY) || null;
}

/**
 * 设置用户名
 * @param {string} name - 用户名
 */
function setUserName(name) {
    localStorage.setItem(USER_NAME_KEY, name);
}

const RELATIONSHIP_KEY = 'rag_agent_user_relationship';

/**
 * 获取用户关系
 * @returns {string|null} 用户关系描述
 */
function getRelationship() {
    return localStorage.getItem(RELATIONSHIP_KEY) || null;
}

/**
 * 设置用户关系
 * @param {string} relationship - 用户关系描述
 */
function setRelationship(relationship) {
    localStorage.setItem(RELATIONSHIP_KEY, relationship);
}

/**
 * 设置主题切换器的事件监听
 * @description 为所有主题按钮绑定点击事件,点击时切换并保存主题
 */
function setupThemeSwitcher() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            updateThemeButtons();
        });
    });
}

/**
 * 设置全局事件监听器
 * @description 绑定发送按钮、模式按钮、主题切换等事件
 */
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

/**
 * 更新模式按钮的激活状态
 * @description 根据当前选中的模式高亮对应的按钮
 */
function updateModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === selectedMode) {
            btn.classList.add('active');
        }
    });
}

/**
 * 设置导航菜单的事件监听
 * @description 为菜单项绑定点击事件,点击时导航到对应页面
 */
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

/**
 * 导航到指定页面
 * @param {string} page - 页面标识符
 * @description 隐藏所有页面,显示目标页面,支持页面ID映射
 */
function navigateTo(page) {
    console.log('[DEBUG] navigateTo called with page:', page);
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const pageIdMap = {
        'skill-tools': 'skillToolsPage',
        'knowledge': 'knowledgePage',
        'models': 'modelsPage',
        'chat': 'chatPage'
    };
    const actualPageId = pageIdMap[page] || `${page}Page`;
    console.log('[DEBUG] Looking for element with ID:', actualPageId);

    const pageElement = document.getElementById(actualPageId);
    console.log('[DEBUG] pageElement:', pageElement);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    if (page === 'chat') {
        loadSessionMessages(currentSessionId);
    } else if (page === 'knowledge') {
        loadFiles();
    } else if (page === 'models') {
        loadModels();
    } else if (page === 'skill-tools') {
        setupSkillToolsTabs();
        loadSkillTools();
    }
}

/**
 * 设置技能工具页签的事件监听
 * @description 为技能和工具的页签按钮绑定点击事件,切换显示对应内容
 */
function setupSkillToolsTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });
}

/**
 * 设置文件拖拽上传区域
 * @description 为拖拽区域绑定点击、拖拽进入、拖拽离开、放下等事件
 */
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

/**
 * 处理用户选择的文件
 * @param {FileList} files - 用户选择的文件列表
 * @description 将文件添加到已选文件数组,并更新UI显示
 */
function handleFilesSelected(files) {
    for (const file of files) {
        if (!selectedFiles.some(f => f.name === file.name)) {
            selectedFiles.push(file);
        }
    }
    renderSelectedFiles();
    updateUploadButton();
}

/**
 * 渲染已选择的文件列表
 * @description 在页面上显示已选文件的名称、大小和移除按钮
 */
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

/**
 * 移除指定索引的文件
 * @param {number} index - 文件在数组中的索引
 */
function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    renderSelectedFiles();
    updateUploadButton();
}

/**
 * 更新上传按钮的状态
 * @description 根据是否有选中文件来启用/禁用上传按钮
 */
function updateUploadButton() {
    const btn = document.getElementById('uploadBtn');
    if (btn) {
        btn.disabled = selectedFiles.length === 0;
    }
}

/**
 * 上传已选中的文件
 * @description 调用上传接口上传所有选中文件,然后清空选择
 */
function uploadSelectedFiles() {
    if (selectedFiles.length === 0) return;
    uploadFiles(selectedFiles);
    selectedFiles = [];
    renderSelectedFiles();
    updateUploadButton();
}

/**
 * 上传文件列表到服务器
 * @param {File[]} files - 要上传的文件数组
 * @description 逐个上传文件,显示上传进度和结果提示
 */
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

/**
 * 显示 Toast 消息提示
 * @param {string} message - 要显示的消息内容
 * @param {string} type - 消息类型 ('success' | 'error')
 * @description 在页面顶部显示临时消息提示,3秒后自动消失
 */
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

/**
 * 从服务器加载文件列表
 * @description 调用API获取文件列表并渲染到页面
 */
async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        const files = await response.json();
        renderFileList(files);
    } catch (error) {
        console.error('加载文件失败:', error);
    }
}

async function loadSkillTools() {
    const skillsContainer = document.getElementById('skillsList');
    const toolsContainer = document.getElementById('toolsList');
    console.log('[DEBUG] loadSkillTools called, skillsContainer:', skillsContainer, 'toolsContainer:', toolsContainer);
    if (!skillsContainer || !toolsContainer) {
        console.error('[DEBUG] containers not found!');
        return;
    }

    try {
        skillsContainer.innerHTML = '<div class="loading-placeholder">加载中...</div>';
        toolsContainer.innerHTML = '<div class="loading-placeholder">加载中...</div>';
        const response = await fetch('/api/skills');
        console.log('[DEBUG] /api/skills response status:', response.status);
        const data = await response.json();
        console.log('[DEBUG] /api/skills data received, skillsByCategory:', !!data.skillsByCategory, 'toolsWithDescriptions:', !!data.toolsWithDescriptions);

        let skillsHtml = '';
        if (data.skillsByCategory && Object.keys(data.skillsByCategory).length > 0) {
            console.log('[DEBUG] Rendering skills section');
            for (const [category, skills] of Object.entries(data.skillsByCategory)) {
                const categoryNames = {
                    'file_processing': '文件处理',
                    'info_query': '信息查询'
                };
                skillsHtml += `<div class="doc-category"><span class="category-label">${categoryNames[category] || category}</span></div>`;
                skillsHtml += '<div class="doc-items">';
                for (const skill of skills) {
                    const triggerText = Array.isArray(skill.trigger) ? skill.trigger.join(', ') : (skill.trigger || '自动触发');
                    const usageText = skill.usage || '';
                    skillsHtml += `<div class="tool-doc">
                        <h4>${skill.name || 'Unknown'}</h4>
                        <p>${skill.description || ''}</p>
                        <p class="trigger-hint">触发: ${triggerText}</p>
                        <p class="usage-hint">用法: ${usageText}</p>
                    </div>`;
                }
                skillsHtml += '</div>';
            }
        }
        skillsContainer.innerHTML = skillsHtml || '<div class="empty-message">暂无技能数据</div>';

        let toolsHtml = '';
        if (data.toolsWithDescriptions && data.toolsWithDescriptions.length > 0) {
            console.log('[DEBUG] Rendering tools section');
            for (const group of data.toolsWithDescriptions) {
                toolsHtml += `<div class="doc-category"><span class="category-label">${group.category || ''}</span></div>`;
                toolsHtml += '<div class="doc-items">';
                for (const tool of group.tools || []) {
                    const triggerText = tool.trigger || '';
                    const usageText = tool.usage || '';
                    toolsHtml += `<div class="tool-doc">
                        <h4>${tool.name || 'Unknown'}</h4>
                        <p>${tool.description || ''}</p>
                        <p class="trigger-hint">触发: ${triggerText}</p>
                        <p class="usage-hint">用法: ${usageText}</p>
                    </div>`;
                }
                toolsHtml += '</div>';
            }
        }
        toolsContainer.innerHTML = toolsHtml || '<div class="empty-message">暂无工具数据</div>';
    } catch (error) {
        console.error('[DEBUG] Error loading skill tools:', error);
        skillsContainer.innerHTML = '<div class="error-message">加载失败: ' + error.message + '</div>';
        toolsContainer.innerHTML = '<div class="error-message">加载失败: ' + error.message + '</div>';
    }
}

/**
 * 渲染文件列表到页面
 * @param {Object[]} files - 文件数组
 * @description 将文件数组渲染为可点击删除的列表项
 */
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
        fileItem.className = 'file-item' + (batchDeleteSelectedFiles.has(file.name) ? ' selected' : '');
        const sizeKB = (file.size / 1024).toFixed(2);
        fileItem.innerHTML = `
            <input type="checkbox" class="file-checkbox"
                   value="${file.name}"
                   ${batchDeleteSelectedFiles.has(file.name) ? 'checked' : ''}
                   onchange="toggleFileSelection('${file.name}', this.checked)">
            <span title="${file.name}">${file.name} (${sizeKB} KB)</span>
            <button onclick="deleteFile('${file.name}')">删除</button>
        `;
        fileList.appendChild(fileItem);
    });
}

/**
 * 选中文件集合(批量删除用)
 */
let batchDeleteSelectedFiles = new Set();

/**
 * 切换文件选中状态
 * @param {string} filename - 文件名
 * @param {boolean} checked - 是否选中
 */
function toggleFileSelection(filename, checked) {
    if (checked) {
        batchDeleteSelectedFiles.add(filename);
    } else {
        batchDeleteSelectedFiles.delete(filename);
    }
    updateBatchDeleteButton();
}

/**
 * 更新批量删除按钮状态
 */
function updateBatchDeleteButton() {
    const btn = document.getElementById('batchDeleteBtn');
    if (btn) {
        btn.disabled = batchDeleteSelectedFiles.size === 0;
    }
}

/**
 * 批量删除选中的文件
 */
async function batchDeleteFiles() {
    if (batchDeleteSelectedFiles.size === 0) return;
    if (!confirm(`确定要删除选中的 ${batchDeleteSelectedFiles.size} 个文件吗？`)) return;

    const filesToDelete = Array.from(batchDeleteSelectedFiles);
    for (const filename of filesToDelete) {
        await deleteFile(filename, true);
    }
    batchDeleteSelectedFiles.clear();
    updateBatchDeleteButton();
    loadFiles();
}

/**
 * 设置批量删除事件监听
 */
function setupBatchDeleteEvents() {
    document.getElementById('selectAllFiles')?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            if (e.target.checked) {
                batchDeleteSelectedFiles.add(cb.value);
            } else {
                batchDeleteSelectedFiles.delete(cb.value);
            }
        });
        updateBatchDeleteButton();
    });

    document.getElementById('batchDeleteBtn')?.addEventListener('click', batchDeleteFiles);
}

/**
 * 删除指定文件
 * @param {string} filename - 要删除的文件名
 * @param {boolean} silent - 是否静默删除（不弹确认框，不自动刷新）
 * @description 调用删除API删除文件,成功后刷新文件列表
 */
async function deleteFile(filename, silent = false) {
    if (!silent && !confirm(`确定要删除文件 ${filename} 吗？`)) {
        return;
    }

    try {
        const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            if (!silent) {
                loadFiles();
            }
        }
    } catch (error) {
        console.error('删除文件失败:', error);
    }
}

/**
 * 从服务器加载模型列表
 * @description 获取所有模型并设置当前选中的模型
 */
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

/**
 * 渲染模型选择下拉菜单
 * @param {Object[]} publishedModels - 已发布的模型数组
 * @description 生成按供应商分组的模型下拉选择菜单HTML
 */
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

// 点击其他地方关闭下拉菜单
document.addEventListener('click', (e) => {
    if (!e.target.closest('.models-dropdown')) {
        document.getElementById('modelDropdownMenu')?.classList.remove('open');
    }
});

/**
 * 切换模型下拉菜单的显示状态
 */
function toggleModelDropdown() {
    const menu = document.getElementById('modelDropdownMenu');
    const toggle = document.querySelector('.models-dropdown-toggle');
    menu?.classList.toggle('open');
    toggle?.classList.toggle('active');
}

/**
 * 选择指定模型
 * @param {string} modelId - 要选择的模型ID
 * @description 设置当前模型并更新UI显示
 */
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

/**
 * 获取当前选中模型的显示名称
 * @returns {string} 模型名称
 */
function getSelectedModelName() {
    const model = currentModels.find(m => m.id === selectedModel);
    return model ? model.name : '请选择模型';
}

/**
 * 渲染模型列表到页面
 * @description 将模型数组渲染为卡片列表,显示模型的详细信息和操作按钮
 */
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

/**
 * 设置模型弹窗的事件监听
 * @description 为关闭、保存等按钮绑定事件
 */
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

/**
 * 打开发送新增模型的弹窗
 */
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

/**
 * 打开发送编辑模型的弹窗
 * @param {Object} model - 要编辑的模型对象
 */
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

/**
 * 关闭模型弹窗
 */
function closeModelModal() {
    document.getElementById('modelModal').classList.remove('open');
    document.getElementById('modalModelId').readOnly = false;
    editingModelId = null;
}

/**
 * 清除弹窗中的所有错误提示
 */
function clearModalErrors() {
    document.querySelectorAll('.form-group .error-hint').forEach(el => el.remove());
    document.querySelectorAll('.form-group input').forEach(el => el.style.borderColor = '');
}

/**
 * 显示单个字段的错误提示
 * @param {string} fieldId - 字段元素ID
 * @param {string} message - 错误消息
 */
function showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    input.style.borderColor = '#dc3545';
    const error = document.createElement('div');
    error.className = 'error-hint';
    error.textContent = message;
    input.parentElement.appendChild(error);
}

/**
 * 验证模型表单
 * @returns {boolean} 表单是否有效
 */
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

/**
 * 从弹窗保存模型数据
 * @description 验证表单后调用API创建或更新模型
 */
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

/**
 * 编辑指定模型
 * @param {string} modelId - 模型ID
 */
function editModel(modelId) {
    const model = currentModels.find(m => m.id === modelId);
    if (!model) return;
    openEditModelModal(model);
}

/**
 * 删除指定模型
 * @param {string} modelId - 模型ID
 * @description 调用API删除模型,成功后刷新列表
 */
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

/**
 * 切换模型的发布状态
 * @param {string} modelId - 模型ID
 */
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

/**
 * 设置聊天输入框的事件监听
 * @description 绑定回车发送、粘贴图片、拖拽文件等事件
 */
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

/**
 * 添加附件到列表
 * @param {File} file - 要添加的文件
 */
function addAttachment(file) {
    attachments.push(file);
    renderAttachments();
}

/**
 * 从列表移除附件
 * @param {number} index - 附件索引
 */
function removeAttachment(index) {
    attachments.splice(index, 1);
    renderAttachments();
}

/**
 * 打开图片预览弹窗
 * @param {string} url - 图片URL
 */
function openImagePreview(url) {
    const existing = document.getElementById('imagePreviewModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'imagePreviewModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; cursor: pointer;';
    modal.innerHTML = `<img src="${url}" style="max-width: 90%; max-height: 90%; object-fit: contain;" />`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

/**
 * 渲染附件列表
 */
function renderAttachments() {
    const container = document.getElementById('attachments');
    if (!container) return;

    container.innerHTML = attachments.map((file, index) => {
        if (file.type && file.type.startsWith('image/')) {
            const previewUrl = URL.createObjectURL(file);
            return `
                <div class="attachment-item attachment-image">
                    <img src="${previewUrl}" alt="${file.name}" onclick="openImagePreview('${previewUrl}')" style="max-width: 100px; max-height: 100px; cursor: pointer;" />
                    <button onclick="removeAttachment(${index})">×</button>
                </div>
            `;
        }
        return `
            <div class="attachment-item">
                <span>${file.name}</span>
                <button onclick="removeAttachment(${index})">×</button>
            </div>
        `;
    }).join('');
}

/**
 * 发送聊天消息
 * @description 获取输入内容,调用聊天API,处理附件和响应
 */
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
    const attachmentPaths = [];
    
    if (attachments.length > 0) {
        for (const file of attachments) {
            if (file.path) {
                attachmentPaths.push(file.path);
            } else {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const uploadRes = await fetch('/api/files/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const uploadResult = await uploadRes.json();
                    if (uploadResult.success && uploadResult.path) {
                        attachmentPaths.push(uploadResult.path);
                    }
                } catch (err) {
                    console.error('上传附件失败:', err);
                }
            }
        }
        fullMessage += '\n\n[用户发送了图片]';
    }

    addMessage(fullMessage, 'user', '', [], attachments);
    addMessageToSession('user', fullMessage, { attachments: attachmentPaths });
    chatInput.value = '';
    attachments = [];
    renderAttachments();
    
    const loadingId = showLoading();
    
    const session = sessions.find(s => s.id === currentSessionId);
    const history = session ? session.messages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content
    })) : [];
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: message, 
                mode, 
                model, 
                history,
                botName: getBotName(),
                userName: getUserName(),
                relationship: getRelationship(),
                attachments: attachmentPaths
            })
        });
        
        const result = await response.json();
        
        removeLoading(loadingId);
        
        if (result.error) {
            addMessage(`错误: ${result.error}`, 'assistant');
            addMessageToSession('assistant', `错误: ${result.error}`);
        } else if (result.clarification) {
            addMessageToSession('assistant', result.response || '');
            handleClarification(result);
        } else {
            addMessage(result.response, 'assistant', result.source, result.knowledgeResults);
            addMessageToSession('assistant', result.response, { source: result.source, knowledgeResults: result.knowledgeResults });
            
            if (result.newBotName) {
                setBotName(result.newBotName);
                console.log('[Bot] 智能体名称已更新:', result.newBotName);
            }
            
            if (result.newUserName) {
                setUserName(result.newUserName);
                console.log('[User] 用户名称已更新:', result.newUserName);
            }
            
            if (result.newRelationship) {
                setRelationship(result.newRelationship);
                console.log('[User] 用户关系已更新:', result.newRelationship);
            }
        }
    } catch (error) {
        removeLoading(loadingId);
        console.error('请求失败:', error);
        addMessage(`发送失败: ${error.message}`, 'assistant');
        addMessageToSession('assistant', `发送失败: ${error.message}`);
    }
}

/**
 * 添加消息到聊天界面
 * @param {string} content - 消息内容
 * @param {string} role - 角色 ('user' | 'assistant')
 * @param {string} source - 来源
 * @param {Array} knowledgeResults - 知识库结果
 * @param {Array} attachments - 附件列表
 */
function addMessage(content, role, source = '', knowledgeResults = [], attachments = []) {
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

    let imageHtml = '';
    if (attachments && attachments.length > 0) {
        imageHtml = attachments.map(file => {
            if (file.type && file.type.startsWith('image/')) {
                const previewUrl = URL.createObjectURL(file);
                return `<img src="${previewUrl}" class="message-image" onclick="openImagePreview('${previewUrl}')" style="max-width: 200px; max-height: 200px; cursor: pointer; border-radius: 8px; margin-top: 8px;" />`;
            }
            return `<div class="attachment-name">[附件: ${escapeHtml(file.name)}]</div>`;
        }).join('');
    }

    let thinkContent = '';
    let answerContent = content;
    
    if (content.includes('<think>') && content.includes('</think>')) {
        const startIdx = content.indexOf('<think>');
        const endIdx = content.indexOf('</think>');
        const thinkStart = '<think>'.length;
        const thinkEnd = '</think>'.length;
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            thinkContent = content.substring(startIdx + thinkStart, endIdx).trim();
            const afterThink = endIdx + thinkEnd;
            answerContent = content.substring(afterThink).trim();
        }
    }
    
    let messageHtml = '';
    if (thinkContent) {
        messageHtml += `<div class="message-think"><div class="think-label">思考中...</div>${escapeHtml(thinkContent)}</div>`;
    }
    if (imageHtml) {
        messageHtml += imageHtml;
    }
    const processedContent = processImageUrls(answerContent);
    messageHtml += `<div class="message-content">${processedContent}</div>`;
    
    messageDiv.innerHTML = `
        ${messageHtml}
        ${sourceHtml}
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * 显示加载状态
 * @returns {string} loading-message元素的ID
 */
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

/**
 * 移除加载状态
 * @param {string} id - loading-message元素的ID
 */
function removeLoading(id) {
    const loadingElement = document.getElementById(id);
    if (loadingElement) {
        loadingElement.remove();
    }
}

/**
 * HTML特殊字符转义
 * @param {string} text - 原始文本
 * @returns {string} 转义后的HTML安全文本
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 处理消息内容中的图片URL
 * @param {string} content - 消息内容
 * @returns {string} 替换后的HTML
 */
function processImageUrls(content) {
    const imageUrlRegex = /<image_url>(.*?)<\/image_url>/g;
    return content.replace(imageUrlRegex, (match, url) => {
        const trimmedUrl = url.trim();
        return `<div class="image-result-container">
            <img src="${trimmedUrl}" alt="图片结果" class="result-image" onclick="toggleImageSize(this)" />
            <div class="image-hint">点击图片放大/缩小</div>
        </div>`;
    });
}

/**
 * 切换图片显示大小
 * @param {HTMLImageElement} img - 图片元素
 */
function toggleImageSize(img) {
    if (img.style.maxWidth === '800px' || img.style.maxWidth === '') {
        img.style.maxWidth = '100%';
        img.style.cursor = 'zoom-in';
    } else {
        img.style.maxWidth = '800px';
        img.style.cursor = 'zoom-out';
    }
}

/**
 * 待处理的澄清请求
 */
let pendingClarification = null;

/**
 * 会话列表和当前会话ID
 */
let sessions = [];
let currentSessionId = null;
const STORAGE_KEY = 'rag_agent_sessions';

/**
 * 从localStorage加载会话列表
 */
function loadSessions() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            sessions = JSON.parse(stored);
        }
        if (sessions.length === 0) {
            createNewSession();
        } else {
            currentSessionId = sessions[0].id;
            renderSessionList();
            loadSessionMessages(currentSessionId);
        }
    } catch (e) {
        console.error('加载会话失败:', e);
        sessions = [];
        createNewSession();
    }
}

/**
 * 保存会话列表到localStorage
 */
function saveSessions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
        console.error('保存会话失败:', e);
    }
}

/**
 * 创建新会话
 * @returns {Object} 新创建的会话对象
 */
function createNewSession() {
    const session = {
        id: 'session_' + Date.now(),
        title: '新会话',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
    };
    sessions.unshift(session);
    currentSessionId = session.id;
    saveSessions();
    renderSessionList();
    clearChatMessages();
    return session;
}

/**
 * 删除指定会话
 * @param {string} sessionId - 会话ID
 */
function deleteSession(sessionId) {
    sessions = sessions.filter(s => s.id !== sessionId);
    if (sessions.length === 0) {
        createNewSession();
    } else if (currentSessionId === sessionId) {
        currentSessionId = sessions[0].id;
        loadSessionMessages(currentSessionId);
    }
    saveSessions();
    renderSessionList();
}

/**
 * 切换到指定会话
 * @param {string} sessionId - 会话ID
 */
function switchSession(sessionId) {
    currentSessionId = sessionId;
    loadSessionMessages(sessionId);
    renderSessionList();
}

/**
 * 加载指定会话的消息
 * @param {string} sessionId - 会话ID
 */
function loadSessionMessages(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';

    session.messages.forEach(msg => {
        if (msg.role === 'user') {
            addMessage(msg.content, 'user');
        } else if (msg.role === 'assistant') {
            addMessage(msg.content, msg.source || 'assistant', msg.source, msg.knowledgeResults);
        }
    });
}

/**
 * 添加消息到当前会话
 * @param {string} role - 角色 ('user' | 'assistant')
 * @param {string} content - 消息内容
 * @param {Object} extra - 额外数据
 */
function addMessageToSession(role, content, extra = {}) {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    const message = {
        role,
        content,
        timestamp: Date.now(),
        ...extra
    };
    session.messages.push(message);
    session.updatedAt = Date.now();

    if (role === 'user') {
        let title = content.substring(0, 20);
        if (content.length > 20) title += '...';
        session.title = title;
    }

    saveSessions();
    renderSessionList();
}

/**
 * 格式化时间戳
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

    return date.toLocaleDateString('zh-CN');
}

/**
 * 渲染会话列表
 */
function renderSessionList() {
    const sessionList = document.getElementById('sessionList');
    if (!sessionList) return;

    sessionList.innerHTML = '';

    sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'session-item' + (session.id === currentSessionId ? ' active' : '');
        item.innerHTML = `
            <span class="session-item-title">${escapeHtml(session.title)}</span>
            <span class="session-item-time">${formatTime(session.updatedAt)}</span>
            <button class="delete-session-btn" data-id="${session.id}">🗑️</button>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-session-btn')) {
                switchSession(session.id);
            }
        });

        const deleteBtn = item.querySelector('.delete-session-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要删除这个会话吗？')) {
                deleteSession(session.id);
            }
        });

        sessionList.appendChild(item);
    });
}

/**
 * 清空聊天消息区域
 */
function clearChatMessages() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
}

/**
 * 处理澄清请求
 * @param {Object} data - 澄清请求数据
 */
function handleClarification(data) {
    console.log('[Frontend] Received clarification request:', data);

    pendingClarification = {
        id: data.clarification_id,
        message: data.message,
        type: data.type,
        type_label: data.type_label,
        options: data.options || [],
        session_id: data.session_id
    };

    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant clarification';

    let optionsHtml = '';
    if (pendingClarification.options && pendingClarification.options.length > 0) {
        optionsHtml = `
            <div class="clarification-options">
                ${pendingClarification.options.map((option, index) => `
                    <button class="clarification-option" data-option="${option}" data-index="${index}">
                        ${option}
                    </button>
                `).join('')}
            </div>
            <div class="clarification-input">
                <input type="text" id="clarificationInput" placeholder="或直接输入您的回答..." />
                <button id="clarificationSubmit">确定</button>
            </div>
        `;
    } else {
        optionsHtml = `
            <div class="clarification-input">
                <input type="text" id="clarificationInput" placeholder="请输入您的回答..." />
                <button id="clarificationSubmit">确定</button>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-content clarification-content">
            <div class="clarification-message">${escapeHtml(data.message)}</div>
            ${optionsHtml}
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    document.querySelectorAll('.clarification-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const option = btn.dataset.option;
            submitClarification(option);
        });
    });

    const submitBtn = document.getElementById('clarificationSubmit');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const input = document.getElementById('clarificationInput');
            if (input && input.value.trim()) {
                submitClarification(input.value.trim());
            }
        });
    }

    const input = document.getElementById('clarificationInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                submitClarification(input.value.trim());
            }
        });
    }
}

/**
 * 提交澄清响应
 * @param {string} response - 用户响应内容
 */
async function submitClarification(response) {
    if (!pendingClarification) {
        console.error('[Frontend] No pending clarification');
        return;
    }

    console.log('[Frontend] Submitting clarification response:', response);

    try {
        const responseObj = await fetch('/api/chat/clarification/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clarification_id: pendingClarification.id,
                response: response
            })
        });

        const result = await responseObj.json();
        console.log('[Frontend] Clarification response result:', result);

        const clarificationMsg = document.querySelector('.clarification');
        if (clarificationMsg) {
            clarificationMsg.remove();
        }

        addMessage(`已响应: ${response}`, 'user');

        const loadingId = showLoading();

        const chatResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: response,
                mode: selectedMode,
                model: selectedModel
            })
        });

        removeLoading(loadingId);

        const chatResult = await chatResponse.json();

        if (chatResult.error) {
            addMessage(`错误: ${chatResult.error}`, 'assistant');
        } else {
            if (chatResult.clarification) {
                handleClarification(chatResult);
            } else {
                addMessage(chatResult.response, 'assistant', chatResult.source, chatResult.knowledgeResults);
            }
        }

        pendingClarification = null;

    } catch (error) {
        console.error('[Frontend] Error submitting clarification:', error);
        addMessage(`提交响应失败: ${error.message}`, 'assistant');
    }
}
