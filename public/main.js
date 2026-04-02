/**
 * 前端主入口文件
 * @description 初始化应用、设置导航事件、加载首屏内容
 * @module main
 */

// 导入路由管理器
import './router/router.js';

/**
 * 初始化应用
 */
function initApp() {
  console.log('[Main] 初始化应用...');

  // 设置导航事件
  setupNavigation();

  // 设置全局错误处理
  setupErrorHandling();

  // 加载默认页面
  window.router.navigateTo('chat');

  console.log('[Main] 应用初始化完成');
}

/**
 * 设置顶部导航点击事件
 */
function setupNavigation() {
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const page = e.currentTarget.dataset.page;
      if (page) {
        window.router.navigateTo(page);
      }
    });
  });
}

/**
 * 设置全局错误处理
 */
function setupErrorHandling() {
  window.addEventListener('error', (e) => {
    console.error('[Global Error]', e.error);
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Unhandled Promise Rejection]', e.reason);
  });
}

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 导出初始化函数
window.initApp = initApp;