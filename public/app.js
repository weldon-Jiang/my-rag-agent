/**
 * 应用主文件
 * @description 处理所有前端逻辑，包括会话管理、聊天、文件上传、模型配置等
 */

let API_BASE = null;

async function getApiBase() {
  if (API_BASE) return API_BASE;

  if (window.electronAPI && window.electronAPI.serverPort) {
    API_BASE = `http://localhost:${window.electronAPI.serverPort}`;
    return API_BASE;
  }

  try {
    const response = await fetch('/api/port');
    if (response.ok) {
      const data = await response.json();
      API_BASE = `http://localhost:${data.port}`;
      return API_BASE;
    }
  } catch (e) {
    console.log('[API] Failed to get port from server');
  }

  if (window.electronAPI && window.electronAPI.getServerPort) {
    const port = window.electronAPI.getServerPort();
    if (port) {
      API_BASE = `http://localhost:${port}`;
      return API_BASE;
    }
  }

  if (window.location.port) {
    API_BASE = `http://localhost:${window.location.port}`;
  } else {
    API_BASE = 'http://localhost:3000';
  }
  return API_BASE;
}

async function getApiBaseSync() {
  if (API_BASE) return API_BASE;
  if (window.electronAPI?.serverPort) return `http://localhost:${window.electronAPI.serverPort}`;
  return 'http://localhost:' + (window.location.port || '3000');
}

/**
 * 全局状态变量
 */
let currentModels = [];
let selectedModel = null;
let selectedMode = 'hybrid';
let attachments = [];
let editingModelId = null;
let selectedFiles = [];

function modelSupportsMultimodal(modelId) {
    const model = currentModels.find(m => m.id === modelId);
    return model && model.supports_multimodal === true;
}

function updateUploadButtonState() {
    const uploadDropzone = document.getElementById('uploadDropzone');
    const fileInput = document.getElementById('fileInput');
    if (!uploadDropzone) return;

    const supportsMultimodal = modelSupportsMultimodal(selectedModel);

    if (supportsMultimodal) {
        uploadDropzone.title = '上传图片或文件';
        uploadDropzone.classList.add('multimodal-supported');
        uploadDropzone.classList.remove('text-only');
        if (fileInput) {
            fileInput.accept = '*/*';
        }
    } else {
        uploadDropzone.title = '文档模式（图片将自动OCR分析）';
        uploadDropzone.classList.add('text-only');
        uploadDropzone.classList.remove('multimodal-supported');
        if (fileInput) {
            fileInput.accept = '.pdf,.doc,.docx,.txt,.md';
        }
    }
}

async function detectModelMultimodalSupport() {
    const url = document.getElementById('modalModelUrl').value.trim();
    const apiKey = document.getElementById('modalModelKey').value.trim();
    const modelId = document.getElementById('modalModelId').value.trim();
    const protocol = document.getElementById('modalModelProtocol').value || 'openai';

    const resultSpan = document.getElementById('detectMultimodalResult');
    const btn = document.getElementById('detectMultimodalBtn');

    if (!url || !apiKey || !modelId) {
        resultSpan.textContent = '请填写完整信息';
        resultSpan.className = 'detect-result error';
        return;
    }

    btn.disabled = true;
    resultSpan.textContent = '检测中...';
    resultSpan.className = 'detect-result';

    try {
        const response = await fetch(`${API_BASE}/api/models/detect-multimodal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, apiKey, modelId, protocol })
        });

        const result = await response.json();

        if (result.success) {
            resultSpan.textContent = result.supported ? '✅ 支持图片' : '❌ 不支持';
            resultSpan.className = 'detect-result success';
            document.getElementById('modalModelMultimodal').checked = result.supported;
        } else {
            resultSpan.textContent = '❌ ' + (result.message || '检测失败');
            resultSpan.className = 'detect-result error';
        }
    } catch (error) {
        resultSpan.textContent = '❌ 检测失败';
        resultSpan.className = 'detect-result error';
        console.error('检测失败:', error);
    } finally {
        btn.disabled = false;
    }
}

function setupModelModalEvents() {
    const detectBtn = document.getElementById('detectMultimodalBtn');
    if (detectBtn) {
        detectBtn.addEventListener('click', detectModelMultimodalSupport);
    }
}

/**
 * 路由管理
 */
const AppRouter = {
  pages: ['chat', 'knowledge', 'skill-tools', 'models'],

  getPageFromPath(path) {
    const pathname = path || window.location.pathname;
    const basePath = window.electronAPI?.basePath || '';
    let cleanPath = pathname;
    if (basePath && cleanPath.startsWith(basePath)) {
      cleanPath = cleanPath.substring(basePath.length);
    }
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    const parts = cleanPath.split('/').filter(Boolean);
    return parts[0] || 'chat';
  },

  getSessionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('session');
  },

  getPath(page, sessionId = null) {
    const basePath = window.electronAPI?.basePath || '';
    let path = basePath + '/' + page;
    if (page === 'chat' && sessionId) {
      path += '?session=' + sessionId;
    }
    return path;
  },

  navigate(page, sessionId = null, replace = false) {
    const path = this.getPath(page, sessionId);
    if (replace) {
      history.replaceState({ page, sessionId }, '', path);
    } else {
      history.pushState({ page, sessionId }, '', path);
    }
    handlePageNavigation(page, sessionId);
  },

  handleInitialRoute() {
    const page = this.getPageFromPath();
    const sessionId = this.getSessionIdFromUrl();
    handlePageNavigation(page, sessionId, true);
    updateNavigationState(page);
  }
};

window.AppRouter = AppRouter;

/**
 * 处理页面导航
 */
function handlePageNavigation(page, sessionId = null, isInitial = false) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const pageIdMap = {
    'skill-tools': 'skillToolsPage',
    'knowledge': 'knowledgePage',
    'models': 'modelsPage',
    'chat': 'chatPage'
  };
  const pageTitleMap = {
    'skill-tools': '技能工具',
    'knowledge': '知识库',
    'models': '模型管理',
    'chat': 'AI对话'
  };
  const actualPageId = pageIdMap[page] || `${page}Page`;

  const pageElement = document.getElementById(actualPageId);
  if (pageElement) {
    pageElement.classList.add('active');
  }

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle && pageTitleMap[page]) {
    pageTitle.textContent = pageTitleMap[page];
  }

  updateNavigationState(page);

  const modelSelectWrapper = document.getElementById('modelSelectWrapper');
  if (modelSelectWrapper) {
    modelSelectWrapper.style.display = (page === 'chat') ? 'block' : 'none';
  }

  if (page === 'chat') {
    if (window.chatPage && typeof window.chatPage.init === 'function') {
      window.chatPage.init();
    } else {
      console.log('[App] chatPage 模块未就绪，尝试加载模块');
      if (typeof router !== 'undefined' && router.loadPageModule) {
        router.loadPageModule('chat').then(module => {
          console.log('[App] chat 模块已加载:', module);
          window.chatPage = module;
          if (module && module.init) {
            module.init();
          }
        }).catch(err => {
          console.error('[App] chat 模块加载失败:', err);
        });
      }
    }
    if (sessionId) {
      loadSessionMessages(sessionId);
    } else if (window.currentSessionId) {
      AppRouter.navigate('chat', window.currentSessionId, true);
    }
  } else if (page === 'knowledge') {
    console.log('[App] knowledge 导航, window.knowledgePage:', window.knowledgePage);
    if (window.knowledgePage && typeof window.knowledgePage.init === 'function') {
      console.log('[App] 调用 knowledgePage.init()');
      window.knowledgePage.init();
    } else {
      console.log('[App] knowledgePage 模块未就绪，尝试加载模块');
      if (typeof router !== 'undefined' && router.loadPageModule) {
        router.loadPageModule('knowledge').then(module => {
          console.log('[App] 模块已加载:', module);
          window.knowledgePage = module;
          if (module && module.init) {
            module.init();
          }
        }).catch(err => {
          console.error('[App] 模块加载失败:', err);
          loadFiles();
        });
      } else {
        console.log('[App] router 未定义，使用 loadFiles()');
        loadFiles();
      }
    }
  } else if (page === 'models') {
    loadModels();
  } else if (page === 'skill-tools') {
    setupSkillToolsTabs();
    loadSkillTools();
  }
}

/**
 * 更新导航状态
 */
function updateNavigationState(activePage) {
  document.querySelectorAll('.menu-item, .nav-item').forEach(item => {
    const itemPage = item.dataset.page;
    if (itemPage === activePage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

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
    if (window._appInitialized) {
        console.log('[App] 应用已初始化');
        return;
    }
    window._appInitialized = true;

    console.log('[App] 开始初始化...');
    try {
        await getApiBase();
        console.log('[App] API_BASE:', API_BASE);

        console.log('[App] 加载页面HTML...');
        await router.loadAllPagesHTML();
        console.log('[App] 页面HTML加载完成');

        console.log('[App] 加载组件...');
        await router.loadAllComponents();
        console.log('[App] 组件加载完成');

        await loadSessions();
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

        window.addEventListener('popstate', (e) => {
            const page = AppRouter.getPageFromPath();
            const sessionId = AppRouter.getSessionIdFromUrl();
            handlePageNavigation(page, sessionId);
            updateNavigationState(page);
        });

        const page = AppRouter.getPageFromPath();
        const sessionId = AppRouter.getSessionIdFromUrl();
        handlePageNavigation(page, sessionId);
        updateNavigationState(page);
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

    document.getElementById('openAddModelModalBtn')?.addEventListener('click', openAddModelModal);
    document.getElementById('uploadBtn')?.addEventListener('click', () => {
        if (selectedFiles.length > 0) {
            uploadSelectedFiles();
        }
    });

    document.querySelectorAll('.mode-radio input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            selectedMode = radio.value;
            window.currentMode = selectedMode;
            updateModeRadio();
        });
    });
}

window.currentMode = selectedMode;

/**
 * 更新模式单选按钮的激活状态
 * @description 根据当前选中的模式高亮对应的标签
 */
function updateModeRadio() {
    document.querySelectorAll('.mode-radio').forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        label.classList.remove('active');
        if (radio && radio.value === selectedMode) {
            label.classList.add('active');
            radio.checked = true;
        }
    });
}

/**
 * 设置导航菜单的事件监听
 * @description 为菜单项绑定点击事件,点击时导航到对应页面
 */
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item, .nav-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            AppRouter.navigate(page);
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
    const pageTitleMap = {
        'skill-tools': '技能工具',
        'knowledge': '知识库',
        'models': '模型管理',
        'chat': 'AI对话'
    };
    const actualPageId = pageIdMap[page] || `${page}Page`;
    console.log('[DEBUG] Looking for element with ID:', actualPageId);

    const pageElement = document.getElementById(actualPageId);
    console.log('[DEBUG] pageElement:', pageElement);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && pageTitleMap[page]) {
        pageTitle.textContent = pageTitleMap[page];
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
        if (!modelSupportsMultimodal(selectedModel)) {
            showToast('当前模型不支持上传图片，请选择支持图片理解的模型', 'error');
            return;
        }
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

            const response = await fetch(`${API_BASE}/api/files/upload`, {
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
        const response = await fetch(`${API_BASE}/api/files/knowledge/`);
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
        const response = await fetch(`${API_BASE}/api/skills/`);
        console.log('[DEBUG] /api/skills response status:', response.status);
        const data = await response.json();
        console.log('[DEBUG] /api/skills data received, skillsByCategory:', !!data.skillsByCategory, 'toolsWithDescriptions:', !!data.toolsWithDescriptions);

        let skillsHtml = '';
        if (data.skillsByCategory && typeof data.skillsByCategory === 'object') {
            console.log('[DEBUG] Rendering skills section');
            const categoryNames = {
                '系统技能': '⚙️ 系统技能',
                '文件处理': '📦 文件处理',
                '信息查询': '🔍 信息查询',
                '用户交互': '💬 用户交互',
                '系统操作': '🖥️ 系统操作',
                'info': '🔍 信息查询',
                'knowledge': '📚 知识库',
                'search': '🌐 Web搜索',
                'file': '📄 文件处理',
                'system': '🖥️ 系统操作'
            };
            for (const [categoryKey, categorySkills] of Object.entries(data.skillsByCategory)) {
                if (!Array.isArray(categorySkills)) continue;
                const categoryName = categoryNames[categoryKey] || categoryKey;
                skillsHtml += `<div class="doc-category"><span class="category-label">${categoryName}</span></div>`;
                skillsHtml += '<div class="doc-items">';
                for (const skill of categorySkills) {
                    skillsHtml += `<div class="tool-doc">
                        <h4>${skill.name || 'Unknown'}</h4>
                        <p>${skill.description || ''}</p>
                        <p><span class="usage-hint">工具: </span>${Array.isArray(skill.tools) ? skill.tools.join(', ') : skill.tools || ''}</p>
                    </div>`;
                }
                skillsHtml += '</div>';
            }
        }
        skillsContainer.innerHTML = skillsHtml || '<div class="empty-message">暂无技能数据</div>';

        let toolsHtml = '';
        if (data.toolsWithDescriptions && typeof data.toolsWithDescriptions === 'object') {
            console.log('[DEBUG] Rendering tools section');
            toolsHtml += '<div class="doc-category"><span class="category-label">🛠️ 可用工具</span></div>';
            toolsHtml += '<div class="doc-items">';
            for (const [toolName, toolDesc] of Object.entries(data.toolsWithDescriptions)) {
                toolsHtml += `<div class="tool-doc">
                    <h4>${toolName}</h4>
                    <p>${toolDesc}</p>
                </div>`;
            }
            toolsHtml += '</div>';
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
        const filename = file.filename || file.name || file.file_id;
        fileItem.className = 'file-item' + (batchDeleteSelectedFiles.has(filename) ? ' selected' : '');
        const sizeKB = (file.size / 1024).toFixed(2);
        fileItem.innerHTML = `
            <input type="checkbox" class="file-checkbox"
                   value="${filename}"
                   ${batchDeleteSelectedFiles.has(filename) ? 'checked' : ''}
                   onchange="toggleFileSelection('${filename}', this.checked)">
            <span title="${filename}">${filename} (${sizeKB} KB)</span>
            <button onclick="deleteFile('${filename}')">删除</button>
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
        const response = await fetch(`${API_BASE}/api/files/${encodeURIComponent(filename)}/`, {
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
        const response = await fetch(`${API_BASE}/api/models/`);
        const allModels = await response.json();
        currentModels = allModels;

        const publishedResponse = await fetch(`${API_BASE}/api/models/published`);
        const publishedModels = await publishedResponse.json();
        const publishedIds = publishedModels.map(m => m.id);

        const currentModelResponse = await fetch(`${API_BASE}/api/models/current`);
        const currentModel = await currentModelResponse.json();

        const urlParams = new URLSearchParams(window.location.search);
        const modelFromUrl = urlParams.get('model');
        const currentPath = window.location.pathname;
        const isChatPage = currentPath === '/chat';

        if (modelFromUrl && publishedIds.includes(modelFromUrl)) {
            selectedModel = modelFromUrl;
        } else if (!selectedModel || !publishedIds.includes(selectedModel)) {
            selectedModel = currentModel?.id || (publishedModels.length > 0 ? publishedModels[0].id : null);
            if (selectedModel && isChatPage) {
                urlParams.set('model', selectedModel);
                const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
                window.history.replaceState({}, '', newUrl);
            }
        }

        if (!isChatPage && urlParams.has('model')) {
            urlParams.delete('model');
            const cleanPath = currentPath || '/';
            const newUrl = urlParams.toString() ? `${cleanPath}?${urlParams.toString()}` : cleanPath;
            window.history.replaceState({}, '', newUrl);
        }

        renderModelsList();
        renderModelSelect(currentModels);
        updateUploadButtonState();
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
    if (menu) {
        menu.querySelectorAll('.model-option').forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio && radio.value === modelId) {
                option.classList.add('selected');
                radio.checked = true;
            } else {
                option.classList.remove('selected');
                if (radio) radio.checked = false;
            }
        });
    }
    menu?.classList.remove('open');
    toggle?.classList.remove('active');
    updateUploadButtonState();

    const params = new URLSearchParams(window.location.search);
    params.set('model', modelId);
    let newUrl = window.location.pathname;
    const paramsStr = params.toString();
    if (paramsStr) {
        newUrl += '?' + paramsStr;
    }
    window.history.replaceState({}, '', newUrl);
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
        const multimodalText = model.supports_multimodal ? '✅ 支持图片' : '❌ 不支持图片';
        const multimodalClass = model.supports_multimodal ? 'multimodal-yes' : 'multimodal-no';
        const isDefault = model.id === selectedModel;
        const defaultBadge = isDefault ? '<span class="default-badge">默认</span>' : '';
        const setDefaultBtn = isDefault ? '' : '<button class="set-default-btn" onclick="setDefaultModel(\'' + model.id + '\')">设为默认</button>';

        card.innerHTML = `
            <div class="model-card-header">
                <div class="model-card-name">${model.name} ${defaultBadge}</div>
                <div class="model-card-actions">
                    ${setDefaultBtn}
                    <button class="toggle-btn" onclick="toggleModelPublished('${model.id}')">${toggleBtnText}</button>
                    <button class="edit-btn" onclick="editModel('${model.id}')">编辑</button>
                    <button class="delete-btn" onclick="deleteModel('${model.id}')">删除</button>
                </div>
            </div>
            <div class="model-card-details">
                <div><strong>模型ID:</strong> ${model.modelId || model.id}</div>
                <div><strong>供应商:</strong> ${model.provider}</div>
                <div><strong>类型:</strong> ${model.type || 'chat'}</div>
                <div><strong>协议:</strong> ${model.protocol || 'openai'}</div>
                <div><strong>图片:</strong> <span class="${multimodalClass}">${multimodalText}</span></div>
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

    setupModelModalEvents();
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
    document.getElementById('modalModelType').value = 'chat';
    document.getElementById('modalModelProtocol').value = 'openai';
    document.getElementById('modalModelMultimodal').checked = false;
    document.getElementById('modalModelId').readOnly = false;
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
    document.getElementById('modalModelId').value = model.modelId || model.id || '';
    document.getElementById('modalModelId').readOnly = true;
    document.getElementById('modalModelType').value = model.type || 'chat';
    document.getElementById('modalModelProtocol').value = model.protocol || 'openai';
    document.getElementById('modalModelMultimodal').checked = model.supports_multimodal || false;
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

    const modelIdInput = document.getElementById('modalModelId').value.trim();
    const modelData = {
        name: document.getElementById('modalModelName').value.trim(),
        modelId: modelIdInput,
        url: document.getElementById('modalModelUrl').value.trim(),
        apiKey: document.getElementById('modalModelKey').value.trim(),
        provider: document.getElementById('modalModelProvider').value.trim(),
        type: document.getElementById('modalModelType').value || 'chat',
        protocol: document.getElementById('modalModelProtocol').value || 'openai',
        supports_multimodal: document.getElementById('modalModelMultimodal').checked,
        published: document.getElementById('modalModelPublished').checked
    };

    try {
        let response;
        if (editingModelId) {
            response = await fetch(`${API_BASE}/api/models/${editingModelId}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(modelData)
            });
        } else {
            modelData.id = modelIdInput;
            response = await fetch(`${API_BASE}/api/models/`, {
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
        const response = await fetch(`${API_BASE}/api/models/${modelId}/`, {
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
        const response = await fetch(`${API_BASE}/api/models/${modelId}/`, {
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
 * 设置默认模型
 * @param {string} modelId - 模型ID
 */
async function setDefaultModel(modelId) {
    try {
        const response = await fetch(`${API_BASE}/api/models/set-default`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_id: modelId })
        });

        if (response.ok) {
            const result = await response.json();
            selectedModel = modelId;
            loadModels();
            renderModelSelect(currentModels);
            alert(result.message || '默认模型已设置');
        }
    } catch (error) {
        console.error('设置默认模型失败:', error);
    }
}

/**
 * 设置聊天输入框的事件监听
 * @description 绑定回车发送、粘贴图片、拖拽文件等事件
 */
function setupChatInput() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    const chatPage = document.getElementById('chatPage');
    const isChatPageActive = chatPage && chatPage.classList.contains('active');

    chatInput.addEventListener('paste', (e) => {
        if (!isChatPageActive) return;
        const items = e.clipboardData?.items;
        if (items) {
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    if (!modelSupportsMultimodal(selectedModel)) {
                        showToast('当前模型不支持图片，请选择支持图片理解的模型', 'error');
                        return;
                    }
                    const file = item.getAsFile();
                    addAttachment(file);
                }
            }
        }
    });

    chatInput.addEventListener('dragover', (e) => {
        if (!isChatPageActive) return;
        e.preventDefault();
    });

    chatInput.addEventListener('drop', (e) => {
        if (!isChatPageActive) return;
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && !modelSupportsMultimodal(selectedModel)) {
            showToast('当前模型不支持图片上传，请选择支持图片理解的模型', 'error');
            return;
        }
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
                    const uploadRes = await fetch(`${API_BASE}/api/files/chat-upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const uploadResult = await uploadRes.json();
                    if (uploadResult.success && uploadResult.path) {
                        attachmentPaths.push({
                            filepath: uploadResult.path,
                            filename: uploadResult.filename
                        });
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
    const history = (session && session.messages) ? session.messages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content
    })) : [];
    
    try {
        const response = await fetch(`${API_BASE}/api/chat/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                session_id: currentSessionId,
                mode,
                model,
                attachments: attachmentPaths
            })
        });
        
        const result = await response.json();
        
        removeLoading(loadingId);
        
        if (result.error) {
            addMessage(`错误: ${result.error}`, 'assistant');
            addMessageToSession('assistant', `错误: ${result.error}`);
        } else if (result.type === 'clarification') {
            handleClarification(result);
        } else {
            addMessage(result.content, 'assistant', result.source, result.toolResults || []);
            addMessageToSession('assistant', result.content, {
                source: result.source,
                knowledgeResults: result.knowledgeResults
            });

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
 * @param {Array} toolResults - 工具结果数组
 * @param {Array} attachments - 附件列表
 */
function addMessage(content, role, source = '', toolResults = [], attachments = []) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const sourceLabels = {
        'llm': '🤖 AI',
        'LLM': '🤖 AI',
        'AI': '🤖 AI助手',
        '知识库': '📚 知识库',
        '混合': '🔗 混合模式',
        'AI + Tools': '🔧 AI + 工具',
        '工具': '🔧 工具调用'
    };
    let sourceHtml = '';
    if (source && sourceLabels[source]) {
        sourceHtml = `<div class="message-source">${sourceLabels[source]}</div>`;
    } else if (source) {
        sourceHtml = `<div class="message-source">${source}</div>`;
    }

    const knowledgeResults = toolResults?.filter(r => r.tool === 'search_knowledge_base' && r.content);
    if (knowledgeResults && knowledgeResults.length > 0) {
        const fileNames = knowledgeResults.map(r => r.filename || r.tool).filter(Boolean);
        if (fileNames.length > 0) {
            sourceHtml += `<div class="message-source">引用文件: ${fileNames.join(', ')}</div>`;
        }
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
            console.log('[Frontend] AI思考内容:', thinkContent);
        }
    }

    answerContent = answerContent
        .replace(/\[TOOL_CALL\][\s\S]*?\[\/TOOL_CALL\]/gi, '')
        .replace(/\[tool_call\][\s\S]*?\[\/tool_call\]/gi, '')
        .replace(/\{tool\s*=>[\s\S]*?\}/gi, '')
        .replace(/<妄想>[\s\S]*?<\/妄想>/gi, '')
        .trim();
    
    let messageHtml = '';
    if (thinkContent) {
        messageHtml += `<div class="message-think"><div class="think-label">思考中...</div>${escapeHtml(thinkContent)}</div>`;
    }
    if (imageHtml) {
        messageHtml += imageHtml;
    }
    const processedContent = (typeof window.renderMarkdownWithCode === 'function')
        ? window.renderMarkdownWithCode(answerContent)
        : contentRenderer.smartRender(answerContent);
    if (typeof window.renderMarkdownWithCode !== 'function') {
        console.warn('[ChatPage] renderMarkdownWithCode not available, using fallback');
    }
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
    let result = content;

    const imgTagRegex = /<image_url>\s*(\S+(?:\.jpe?g|\.png|\.gif|\.webp|\.svg)\S*)\s*<\/image_url>/gi;
    result = result.replace(imgTagRegex, (match, url) => {
        if (!url) return match;
        const trimmedUrl = url.trim();
        if (!trimmedUrl.startsWith('http')) return match;
        return `<div class="image-result-container">
            <img src="${trimmedUrl}" alt="图片结果" class="result-image" onclick="toggleImageSize(this)" />
            <div class="image-hint">点击图片放大/缩小</div>
        </div>`;
    });

    const markdownImgRegex = /!\[([^\]]*)\]\((\S+(?:\.jpe?g|\.png|\.gif|\.webp|\.svg)\S*)\)/g;
    result = result.replace(markdownImgRegex, (match, alt, url) => {
        if (!url) return match;
        const trimmedUrl = url.trim();
        if (!trimmedUrl.startsWith('http')) return match;
        return `<div class="image-result-container">
            <img src="${trimmedUrl}" alt="${alt || '图片结果'}" class="result-image" onclick="toggleImageSize(this)" />
            <div class="image-hint">点击图片放大/缩小</div>
        </div>`;
    });

    const backtickUrlRegex = /`(\S+(?:\.jpe?g|\.png|\.gif|\.webp|\.svg)\S*)`/gi;
    result = result.replace(backtickUrlRegex, (match, url) => {
        if (!url) return match;
        const trimmedUrl = url.trim();
        if (!trimmedUrl.startsWith('http') && !trimmedUrl.includes('images.dog.ceo') && !trimmedUrl.includes('picsum.photos')) return match;
        return `<div class="image-result-container">
            <img src="${trimmedUrl}" alt="图片结果" class="result-image" onclick="toggleImageSize(this)" />
            <div class="image-hint">点击图片放大/缩小</div>
        </div>`;
    });

    const plainUrlRegex = /(https?:\/\/[^\s<>"')\]]+(?:\.jpe?g|\.png|\.gif|\.webp|\.svg)(?:\?[^\s<>"')\]]*)?)/gi;
    result = result.replace(plainUrlRegex, (match, url) => {
        if (!url) return match;
        return `<div class="image-result-container">
            <img src="${url}" alt="图片结果" class="result-image" onclick="toggleImageSize(this)" />
            <div class="image-hint">点击图片放大/缩小</div>
        </div>`;
    });

    return result;
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
 * 从服务器加载会话列表
 */
async function loadSessions() {
    try {
        const response = await fetch(`${API_BASE}/api/chat/sessions/`);
        if (response.ok) {
            sessions = await response.json();
        }
        if (sessions.length === 0) {
            await createNewSession();
        } else {
            for (const session of sessions) {
                const msgResponse = await fetch(`${API_BASE}/api/chat/sessions/${session.id}/messages`);
                if (msgResponse.ok) {
                    const data = await msgResponse.json();
                    session.messages = data.messages || [];
                    if (!session.title && !session.name) {
                        const firstUserMsg = session.messages.find(m => m.role === 'user');
                        if (firstUserMsg) {
                            session.title = firstUserMsg.content.substring(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
                        }
                    }
                } else {
                    session.messages = [];
                }
            }
            currentSessionId = sessions[0].id;
            window.currentSessionId = currentSessionId;
            renderSessionList();
            loadSessionMessages(currentSessionId);
        }
    } catch (e) {
        console.error('加载会话失败:', e);
        sessions = [];
        await createNewSession();
    }
}

/**
 * 保存会话列表到服务器
 */
async function saveSessions() {
    try {
    } catch (e) {
        console.error('保存会话失败:', e);
    }
}

/**
 * 创建新会话
 * @returns {Object} 新创建的会话对象
 */
async function createNewSession() {
    try {
        const response = await fetch(`${API_BASE}/api/chat/sessions/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: '新会话' })
        });
        if (response.ok) {
            const session = await response.json();
            session.title = '新会话';
            session.name = '新会话';
            sessions.unshift(session);
            currentSessionId = session.id;
            window.currentSessionId = session.id;
            renderSessionList();
            clearChatMessages();
            AppRouter.navigate('chat', session.id, true);
            return session;
        } else {
            console.error('创建会话失败:', response.status);
            alert('创建会话失败，请刷新页面重试');
            return null;
        }
    } catch (e) {
        console.error('创建会话失败:', e);
        alert('创建会话失败，请检查服务器是否运行');
        return null;
    }
}

/**
 * 删除指定会话
 * @param {string} sessionId - 会话ID
 */
async function deleteSession(sessionId) {
    try {
        await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/`, {
            method: 'DELETE'
        });
    } catch (e) {
        console.error('删除会话失败:', e);
    }
    sessions = sessions.filter(s => s.id !== sessionId);
    if (sessions.length === 0) {
        await createNewSession();
    } else if (currentSessionId === sessionId) {
        currentSessionId = sessions[0].id;
        window.currentSessionId = currentSessionId;
        AppRouter.navigate('chat', currentSessionId, true);
    }
    renderSessionList();
}

/**
 * 切换到指定会话
 * @param {string} sessionId - 会话ID
 */
function switchSession(sessionId) {
    currentSessionId = sessionId;
    window.currentSessionId = sessionId;
    loadSessionMessages(sessionId);
    renderSessionList();
    AppRouter.navigate('chat', sessionId, true);
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

    if (!session.messages || !Array.isArray(session.messages)) {
        session.messages = [];
        return;
    }

    session.messages.forEach(msg => {
        if (msg.role === 'user') {
            if (msg.isClarificationResponse) {
                const clarificationHtml = `
                    <div class="message user">
                        <div class="message-content">
                            <div class="clarification-response">${escapeHtml(msg.content)}</div>
                        </div>
                    </div>
                    ${msg.finalResponse ? `
                    <div class="message assistant">
                        <div class="message-content">
                            ${escapeHtml(msg.finalResponse)}
                        </div>
                    </div>
                    ` : ''}
                `;
                chatMessages.insertAdjacentHTML('beforeend', clarificationHtml);
            } else {
                addMessage(msg.content, 'user');
            }
        } else if (msg.role === 'assistant') {
            if (msg.isClarification) {
                const sourceLabels = {
                    'AI': '🤖 AI助手',
                    '知识库': '📚 知识库',
                    '混合': '🔗 混合模式',
                    'AI + Tools': '🔧 AI + 工具',
                    '工具': '🔧 工具调用'
                };
                const sourceLabel = sourceLabels[msg.source] || '';
                let optionsHtml = '';
                if (msg.clarificationOptions && msg.clarificationOptions.length > 0) {
                    optionsHtml = `
                        <div class="clarification-toggle" onclick="this.classList.toggle('expanded'); this.querySelector('.toggle-arrow').textContent = this.classList.contains('expanded') ? '▼' : '▶'; this.nextElementSibling.style.display = this.classList.contains('expanded') ? 'block' : 'none';">
                            <span class="toggle-arrow">▶</span>
                            <span class="toggle-text">查看选项</span>
                        </div>
                        <div class="clarification-options" style="display: none;">
                            ${msg.clarificationOptions.map((option, index) => {
                                const optionValue = typeof option === 'string' ? option : (option.value || option);
                                const optionLabel = typeof option === 'string' ? option : (option.label || option.value || option);
                                return `<div class="option-item">${String.fromCharCode(65 + index)}. ${escapeHtml(optionLabel)}</div>`;
                            }).join('')}
                        </div>
                    `;
                }
                const clarificationHtml = `
                    <div class="message assistant">
                        <div class="message-content">
                            ${sourceLabel ? `<div class="message-source">${sourceLabel}</div>` : ''}
                            <div class="clarification-question">${escapeHtml(msg.content)}</div>
                            ${optionsHtml}
                        </div>
                    </div>
                `;
                chatMessages.insertAdjacentHTML('beforeend', clarificationHtml);
            } else {
                addMessage(msg.content, msg.source || 'assistant', msg.source, msg.knowledgeResults);
            }
        }
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * 添加消息到当前会话
 * @param {string} role - 角色 ('user' | 'assistant')
 * @param {string} content - 消息内容
 * @param {Object} extra - 额外数据
 */
async function addMessageToSession(role, content, extra = {}) {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    if (!session.messages) {
        session.messages = [];
    }

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
        session.name = title;

        try {
            await fetch(`${API_BASE}/api/chat/sessions/${session.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: title })
            });
        } catch (e) {
            console.error('更新会话名称失败:', e);
        }
    }

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
        const title = session.title || session.name || '新会话';
        const updatedAt = session.updatedAt || session.updated_at;
        item.innerHTML = `
            <span class="session-item-title">${escapeHtml(title)}</span>
            <span class="session-item-time">${formatTime(updatedAt)}</span>
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
    console.log('[Frontend] handleClarification 被调用!');
    console.log('[Frontend] data type:', typeof data);
    console.log('[Frontend] data:', data);

    try {
        const clarificationData = data.clarification || data;
        console.log('[Frontend] clarificationData:', clarificationData);

        if (!clarificationData.question && !clarificationData.message) {
            console.error('[Frontend] clarificationData 没有 question 或 message 字段!');
            console.log('[Frontend] clarificationData keys:', Object.keys(clarificationData));
        }

        pendingClarification = {
            id: clarificationData.id || clarificationData.clarification_id,
            message: clarificationData.question || clarificationData.message || '',
            type: clarificationData.type || 'ask_clarification',
            type_label: clarificationData.type_label || '',
            options: clarificationData.options || [],
            session_id: clarificationData.session_id,
            originalQuery: clarificationData.originalQuery || '',
            responses: clarificationData.responses || []
        };

        console.log('[Frontend] pendingClarification 设置完成:', JSON.stringify(pendingClarification));
        console.log('[Frontend] message 内容:', pendingClarification.message);

        addMessageToSession('assistant', pendingClarification.message, {
            isClarification: true,
            clarificationType: pendingClarification.type,
            clarificationOptions: pendingClarification.options,
            clarificationId: pendingClarification.id,
            originalQuery: pendingClarification.originalQuery
        });

        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.error('[Frontend] chatMessages 元素不存在!');
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant clarification';

        let optionsHtml = '';
        if (pendingClarification.options && pendingClarification.options.length > 0) {
            optionsHtml = `
                <div class="clarification-question">${escapeHtml(pendingClarification.message)}</div>
                <div class="clarification-toggle expanded" onclick="this.classList.toggle('expanded'); this.querySelector('.toggle-arrow').textContent = this.classList.contains('expanded') ? '▼' : '▶'; this.nextElementSibling.style.display = this.classList.contains('expanded') ? 'block' : 'none';">
                    <span class="toggle-arrow">▼</span>
                    <span class="toggle-text">选择选项</span>
                </div>
                <div class="clarification-options" style="display: block;">
                    ${pendingClarification.options.map((option, index) => {
                        const optionValue = typeof option === 'string' ? option : (option.value || option);
                        const optionLabel = typeof option === 'string' ? option : (option.label || option.value || option);
                        return `
                            <div class="option-item" data-option="${escapeHtml(optionValue)}">${String.fromCharCode(65 + index)}. ${escapeHtml(optionLabel)}</div>
                        `;
                    }).join('')}
                </div>
                <div class="clarification-input">
                    <input type="text" class="clarification-response-input" placeholder="或输入您的回答..." />
                    <button class="clarification-submit-btn">发送</button>
                </div>
            `;
        } else {
            optionsHtml = `
                <div class="clarification-question">${escapeHtml(pendingClarification.message)}</div>
                <div class="clarification-input single">
                    <input type="text" class="clarification-response-input" placeholder="请输入您的回答..." />
                    <button class="clarification-submit-btn">发送</button>
                </div>
            `;
        }

        messageDiv.innerHTML = `<div class="message-content clarification-content">${optionsHtml}</div>`;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        console.log('[Frontend] 追问消息已添加到页面');

        const optionItems = messageDiv.querySelectorAll('.option-item');
        const responseInput = messageDiv.querySelector('.clarification-response-input');
        const submitBtn = messageDiv.querySelector('.clarification-submit-btn');

        optionItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                optionItems.forEach(opt => opt.classList.remove('selected'));
                item.classList.add('selected');
            });
        });

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                const selectedItem = messageDiv.querySelector('.option-item.selected');
                let response = '';

                if (selectedItem) {
                    response = selectedItem.dataset.option;
                }

                if (!response && responseInput) {
                    response = responseInput.value.trim();
                }

                if (!response) {
                    if (responseInput) {
                        responseInput.style.border = '1px solid #ef4444';
                    }
                    return;
                }

                submitClarification(response);
            });
        }

        if (responseInput) {
            responseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitBtn?.click();
                }
            });
        }

        if (responseInput) {
            responseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitBtn?.click();
                }
            });
        }

        console.log('[Frontend] handleClarification 完成');
    } catch (e) {
        console.error('[Frontend] handleClarification 执行出错:', e);
        console.error('[Frontend] Error stack:', e.stack);
    }
}

/**
 * 提交澄清响应
 * @param {string} response - 用户响应内容
 */
async function submitClarification(response) {
    console.log('[Frontend] submitClarification 被调用!');
    console.log('[Frontend] pendingClarification:', pendingClarification);
    console.log('[Frontend] pendingClarification.id:', pendingClarification?.id);
    console.log('[Frontend] _clarificationSubmitting:', window._clarificationSubmitting);

    if (!pendingClarification || window._clarificationSubmitting) {
        console.warn('[Frontend] No pending clarification or already submitting');
        return;
    }

    window._clarificationSubmitting = true;
    console.log('[Frontend] Submitting clarification response:', response);

    const clarificationId = pendingClarification.id;
    const originalQuery = pendingClarification.originalQuery;
    const clarificationQuestion = pendingClarification.message;

    try {
        addMessage(response, 'user');
        addMessageToSession('user', response, {
            isClarificationResponse: true,
            clarificationId: clarificationId,
            originalQuery: originalQuery,
            clarificationQuestion: clarificationQuestion
        });

        const loadingId = showLoading();

        const responseObj = await fetch(`${API_BASE}/api/chat/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: response,
                clarification_id: clarificationId,
                original_query: originalQuery,
                mode: selectedMode,
                model: selectedModel,
                sessionId: currentSessionId
            })
        });

        removeLoading(loadingId);

        const result = await responseObj.json();
        console.log('[Frontend] Clarification response result:', JSON.stringify(result));
        console.log('[Frontend] Clarification result type:', result.type);
        console.log('[Frontend] Clarification result keys:', Object.keys(result));

        if (result.type === 'clarification') {
            console.log('[Frontend] 处理第二轮追问...');
            pendingClarification = {
                id: result.clarification_id,
                message: result.question,
                type: result.type,
                type_label: result.type_label || '',
                options: result.options || [],
                session_id: currentSessionId,
                originalQuery: result.originalQuery || '',
                responses: []
            };
            handleClarification(result);
        } else if (result.content) {
            console.log('[Frontend] 收到普通回复...');
            addMessage(result.content, 'assistant', result.source, result.toolResults || []);
            pendingClarification = null;
        } else if (result.error) {
            console.log('[Frontend] 收到错误...');
            addMessage(`错误: ${result.error}`, 'assistant');
            pendingClarification = null;
        } else {
            console.log('[Frontend] 未处理的响应类型!');
        }

        window._clarificationSubmitting = false;

    } catch (error) {
        console.error('[Frontend] Error submitting clarification:', error);
        removeLoading();
        addMessage(`提交响应失败: ${error.message}`, 'assistant');
        window._clarificationSubmitting = false;
        pendingClarification = null;
    }
}
