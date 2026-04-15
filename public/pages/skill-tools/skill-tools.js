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
 * @param {Array} skillsByCategory - 按分类的技能数组
 */
function renderSkills(skillsByCategory) {
  const skillsList = document.getElementById('skillsList');
  if (!skillsList) return;

  if (!skillsByCategory || !Array.isArray(skillsByCategory) || skillsByCategory.length === 0) {
    skillsList.innerHTML = '<div class="empty-message">暂无技能数据</div>';
    return;
  }

  let html = '';

  for (const category of skillsByCategory) {
    if (!category || typeof category !== 'object') continue;
    const name = category.name || '未分类';
    const icon = category.icon || '📋';
    html += `<div class="doc-category"><span class="category-label">${icon} ${escapeHtml(name)}</span></div>`;
    html += '<div class="doc-items">';

    let skills = category.skills;
    if (!Array.isArray(skills)) {
      if (typeof skills === 'object' && skills !== null) {
        skills = Object.values(skills);
      } else {
        skills = [];
      }
    }
    for (const skill of skills) {
      if (!skill || typeof skill !== 'object') continue;
      const triggerText = Array.isArray(skill.trigger) ? skill.trigger.join(', ') : (skill.trigger || '自动触发');
      const usageText = skill.usage || '';
      const toolsText = Array.isArray(skill.tools) ? skill.tools.join(', ') : '';

      html += `
        <div class="tool-doc">
          <h4>${escapeHtml(skill.name || 'Unknown')}</h4>
          <p>${escapeHtml(skill.description || '')}</p>
          <p><span class="usage-hint">触发: </span>${escapeHtml(triggerText)}</p>
          <p><span class="usage-hint">用法: </span>${escapeHtml(usageText)}</p>
          ${toolsText ? `<p><span class="usage-hint">工具: </span>${escapeHtml(toolsText)}</p>` : ''}
        </div>
      `;
    }

    html += '</div>';
  }

  skillsList.innerHTML = html;
}

/**
 * 渲染工具列表
 * @param {Array} toolsWithDescriptions - 工具描述列表
 */
function renderTools(toolsWithDescriptions) {
  const toolsList = document.getElementById('toolsList');
  if (!toolsList) return;

  console.log('[SkillTools] toolsWithDescriptions:', toolsWithDescriptions);

  if (!toolsWithDescriptions || !Array.isArray(toolsWithDescriptions) || toolsWithDescriptions.length === 0) {
    toolsList.innerHTML = '<div class="empty-message">暂无工具数据</div>';
    return;
  }

  let html = '';

  for (const group of toolsWithDescriptions) {
    if (!group || typeof group !== 'object') continue;
    html += `<div class="doc-category"><span class="category-label">${escapeHtml(group.category || '未分类')}</span></div>`;
    html += '<div class="doc-items">';

    let tools = group.tools;
    if (!Array.isArray(tools)) {
      if (typeof tools === 'object' && tools !== null) {
        tools = Object.values(tools);
      } else {
        tools = [];
      }
    }
    for (const tool of tools) {
      if (!tool || typeof tool !== 'object') continue;
      const triggerText = Array.isArray(tool.trigger) ? tool.trigger.join(', ') : (tool.trigger || '');
      const usageText = tool.usage || '';

      html += `
        <div class="tool-doc">
          <h4>${escapeHtml(tool.name || 'Unknown')}</h4>
          <p>${escapeHtml(tool.description || '')}</p>
          <p><span class="usage-hint">触发: </span>${escapeHtml(triggerText)}</p>
          <p><span class="usage-hint">用法: </span>${escapeHtml(usageText)}</p>
        </div>
      `;
    }

    html += '</div>';
  }

  toolsList.innerHTML = html;
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