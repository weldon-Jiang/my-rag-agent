/**
 * 路由管理器
 * @description 处理页面间的导航和模块动态加载，支持基于页面的模块化加载
 * @module router
 */

const routes = {
  'chat': '/pages/chat/chat.js',
  'knowledge': '/pages/knowledge/knowledge.js',
  'skill-tools': '/pages/skill-tools/skill-tools.js',
  'models': '/pages/models/models.js'
};

/**
 * 页面缓存，避免重复加载
 */
const pageCache = {};

/**
 * 导航到指定页面
 * @param {string} page - 页面名称
 * @param {boolean} forceReload - 是否强制重新加载模块
 */
async function navigateTo(page, forceReload = false) {
  const pageElement = getPageElement(page);
  if (!pageElement) {
    console.error(`[Router] 页面元素不存在: ${page}Page`);
    return;
  }

  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // 显示目标页面
  pageElement.classList.add('active');

  // 更新导航状态
  updateNavigation(page);

  // 加载页面模块
  if (routes[page]) {
    await loadPageModule(page, forceReload);
  }

  // 调用页面初始化函数
  const initFn = pageCache[page]?.init;
  if (initFn && typeof initFn === 'function') {
    try {
      initFn();
    } catch (e) {
      console.error(`[Router] 页面初始化失败: ${page}`, e);
    }
  }
}

/**
 * 获取页面元素
 * @param {string} page - 页面名称
 * @returns {HTMLElement|null}
 */
function getPageElement(page) {
  const pageIdMap = {
    'skill-tools': 'skillToolsPage',
    'knowledge': 'knowledgePage',
    'models': 'modelsPage',
    'chat': 'chatPage'
  };
  const pageId = pageIdMap[page] || `${page}Page`;
  return document.getElementById(pageId);
}

/**
 * 更新导航状态
 * @param {string} activePage - 当前激活的页面
 */
function updateNavigation(activePage) {
  document.querySelectorAll('.menu-item').forEach(item => {
    const itemPage = item.dataset.page;
    if (itemPage === activePage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * 动态加载页面模块
 * @param {string} page - 页面名称
 * @param {boolean} forceReload - 是否强制重新加载
 */
async function loadPageModule(page, forceReload = false) {
  // 如果缓存存在且不强制重新加载，直接返回
  if (pageCache[page] && !forceReload) {
    return pageCache[page];
  }

  const modulePath = routes[page];
  if (!modulePath) {
    console.warn(`[Router] 页面路由不存在: ${page}`);
    return null;
  }

  try {
    // 动态导入模块
    const module = await import(modulePath + '?t=' + Date.now());
    pageCache[page] = module;
    console.log(`[Router] 页面模块加载成功: ${page}`);
    return module;
  } catch (error) {
    console.error(`[Router] 页面模块加载失败: ${page}`, error);
    return null;
  }
}

/**
 * 注册页面模块
 * @param {string} page - 页面名称
 * @param {Object} module - 模块对象，包含 init 等函数
 */
function registerPage(page, module) {
  pageCache[page] = module;
}

/**
 * 获取已注册的页面模块
 * @param {string} page - 页面名称
 * @returns {Object|null}
 */
function getPage(page) {
  return pageCache[page] || null;
}

/**
 * 清除页面缓存
 * @param {string} page - 可选，指定清除特定页面，不传则清除所有
 */
function clearCache(page) {
  if (page) {
    delete pageCache[page];
  } else {
    Object.keys(pageCache).forEach(key => delete pageCache[key]);
  }
}

// 导出路由管理器
window.router = {
  navigateTo,
  loadPageModule,
  registerPage,
  getPage,
  clearCache,
  routes
};