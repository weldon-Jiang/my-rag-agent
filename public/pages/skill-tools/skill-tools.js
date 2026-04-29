/**
 * 技能工具管理页面模块
 * @description 展示系统中所有技能和工具的说明、触发条件和使用方法
 * @module pages/skill-tools
 */

// Tab切换状态
let currentTab = 'skills';

/**
 * 页面初始化函数
 */
function init() {
  setupTabListeners();
  loadData();
}

/**
 * 设置Tab切换事件
 */
function setupTabListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
}

/**
 * 切换Tab
 * @param {string} tabName - Tab名称
 */
function switchTab(tabName) {
  currentTab = tabName;

  // 更新按钮状态
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // 更新内容显示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}Tab`);
  });
}

/**
 * 加载技能和工具数据
 */
async function loadData() {
  try {
    const response = await fetch('/api/skills');
    const data = await response.json();
    renderSkills(data.skillsByCategory);
    renderTools(data.toolsWithDescriptions);
  } catch (error) {
    console.error('[SkillTools] 加载数据失败:', error);
  }
}

/**
 * 渲染技能列表
 * @param {Object} skillsByCategory - 按分类的技能对象
 */
function renderSkills(skillsByCategory) {
  const skillsList = document.getElementById('skillsList');
  if (!skillsList) return;

  if (!skillsByCategory || typeof skillsByCategory !== 'object') {
    skillsList.innerHTML = '<div class="empty-message">暂无技能数据</div>';
    return;
  }

  const categoryNames = {
    '系统技能': '⚙️ 系统技能',
    '文件处理': '📦 文件处理',
    '信息查询': '🔍 信息查询',
    '用户交互': '💬 用户交互',
    '系统操作': '🖥️ 系统操作',
    'info': '🔍 信息查询',
    'knowledge': '📚 知识库',
    'search': '🌐 Web搜索'
  };

  let html = '';

  for (const [categoryKey, categorySkills] of Object.entries(skillsByCategory)) {
    if (!Array.isArray(categorySkills)) continue;
    const categoryName = categoryNames[categoryKey] || categoryKey;
    html += `<div class="doc-category"><span class="category-label">${escapeHtml(categoryName)}</span></div>`;
    html += '<div class="doc-items">';

    for (const skill of categorySkills) {
      if (!skill || typeof skill !== 'object') continue;
      const toolsText = Array.isArray(skill.tools) ? skill.tools.join(', ') : (skill.tools || '');

      html += `
        <div class="tool-doc">
          <h4>${escapeHtml(skill.name || 'Unknown')}</h4>
          <p>${escapeHtml(skill.description || '')}</p>
          ${toolsText ? `<p><span class="usage-hint">工具: </span>${escapeHtml(toolsText)}</p>` : ''}
        </div>
      `;
    }

    html += '</div>';
  }

  skillsList.innerHTML = html || '<div class="empty-message">暂无技能数据</div>';
}

/**
 * 渲染工具列表
 * @param {Object} toolsWithDescriptions - 工具描述对象
 */
function renderTools(toolsWithDescriptions) {
  const toolsList = document.getElementById('toolsList');
  if (!toolsList) return;

  console.log('[SkillTools] toolsWithDescriptions:', toolsWithDescriptions);

  if (!toolsWithDescriptions || typeof toolsWithDescriptions !== 'object') {
    toolsList.innerHTML = '<div class="empty-message">暂无工具数据</div>';
    return;
  }

  let html = '';
  html += '<div class="doc-category"><span class="category-label">🛠️ 可用工具</span></div>';
  html += '<div class="doc-items">';

  for (const [toolName, toolDesc] of Object.entries(toolsWithDescriptions)) {
    html += `
      <div class="tool-doc">
        <h4>${escapeHtml(toolName)}</h4>
        <p>${escapeHtml(toolDesc)}</p>
      </div>
    `;
  }

  html += '</div>';

  toolsList.innerHTML = html || '<div class="empty-message">暂无工具数据</div>';
}

/**
 * HTML转义
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
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

// 导出页面模块
window.skillToolsPage = {
  init,
  switchTab,
  loadData,
  renderSkills,
  renderTools
};
