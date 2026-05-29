/**
 * 技能工具管理页面模块
 * 支持技能市场、安装/卸载、渐进式披露
 */

const API_BASE = window.location.origin;
let currentTab = 'installed';
let marketplaceSkills = [];
let installedSkills = [];
let skillStats = {};
let remoteConnected = false;
let currentSourceFilter = 'all'; // all, local, remote

/**
 * 页面初始化
 */
async function init() {
    setupTabListeners();
    setupSourceFilterListeners();
    await loadData();
    
    // 尝试从缓存加载远程市场数据
    loadCachedMarketplace();
}

/**
 * 从缓存加载远程市场数据
 */
function loadCachedMarketplace() {
    try {
        const cacheStr = localStorage.getItem('marketplaceCache');
        const remoteUrl = localStorage.getItem('remoteMarketplaceUrl');
        
        if (cacheStr && remoteUrl) {
            const cache = JSON.parse(cacheStr);
            const now = Date.now();
            
            // 检查缓存是否过期（5分钟）
            if (now - cache.timestamp < 5 * 60 * 1000) {
                marketplaceSkills = cache.skills;
                remoteConnected = true;
                
                const statusEl = document.getElementById('remoteStatus');
                if (statusEl) {
                    statusEl.textContent = '已连接（缓存）';
                    statusEl.className = 'remote-status connected';
                }
                
                // 如果当前在市场页面，渲染缓存的数据
                if (currentTab === 'marketplace') {
                    renderMarketplaceSkills();
                }
            }
        }
    } catch (error) {
        console.error('[Skills] 加载缓存失败:', error);
    }
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
 * 设置来源筛选事件
 */
function setupSourceFilterListeners() {
    document.querySelectorAll('.source-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const source = btn.dataset.source;
            currentSourceFilter = source;
            document.querySelectorAll('.source-filter-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.source === source);
            });
            renderMarketplaceSkills();
        });
    });
}

/**
 * 切换Tab
 */
function switchTab(tabName) {
    currentTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}Tab`);
    });

    if (tabName === 'marketplace') {
        loadMarketplace();
    }
}

/**
 * 加载数据
 */
async function loadData() {
    await Promise.all([
        loadInstalledSkills(),
        loadMarketplaceStats()
    ]);
}

/**
 * 加载已安装技能
 */
async function loadInstalledSkills() {
    try {
        const response = await fetch(`${API_BASE}/api/skills/`);
        const data = await response.json();

        if (data.success) {
            installedSkills = data.skills || [];
            renderInstalledSkills();
        }
    } catch (error) {
        console.error('[Skills] 加载已安装技能失败:', error);
    }
}

/**
 * 加载市场统计
 */
async function loadMarketplaceStats() {
    try {
        const response = await fetch(`${API_BASE}/api/skills/stats`);
        const data = await response.json();

        if (data.success) {
            skillStats = data.stats;
            updateStatsDisplay();
        }
    } catch (error) {
        console.error('[Skills] 加载统计失败:', error);
    }
}

/**
 * 加载市场技能（带缓存）
 */
async function loadMarketplace(forceRemote = false) {
    try {
        console.log(`[Skills] 加载市场技能，forceRemote=${forceRemote}`);
        const response = await fetch(`${API_BASE}/api/skills/marketplace?remote=${forceRemote}`);
        const data = await response.json();

        if (data.success) {
            marketplaceSkills = data.skills || [];
            
            // 调试信息
            console.log(`[Skills] 加载到 ${marketplaceSkills.length} 个技能`);
            const localCount = marketplaceSkills.filter(s => s.source === 'local').length;
            const remoteCount = marketplaceSkills.filter(s => s.source !== 'local').length;
            console.log(`[Skills] 本地技能: ${localCount}, 远程技能: ${remoteCount}`);
            
            renderMarketplaceSkills();
            updateStatsDisplay();
            
            // 缓存远程市场数据（有效期5分钟）
            if (forceRemote && marketplaceSkills.length > 0) {
                const cache = {
                    skills: marketplaceSkills,
                    timestamp: Date.now(),
                    remoteUrl: localStorage.getItem('remoteMarketplaceUrl') || ''
                };
                localStorage.setItem('marketplaceCache', JSON.stringify(cache));
                console.log('[Skills] 已缓存远程市场数据');
            }
        }
    } catch (error) {
        console.error('[Skills] 加载市场技能失败:', error);
    }
}

/**
 * 搜索技能
 */
async function searchSkills() {
    const query = document.getElementById('skillSearchInput')?.value?.trim();
    if (!query) {
        loadMarketplace(remoteConnected);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/skills/marketplace/search?q=${encodeURIComponent(query)}&remote=${remoteConnected}`);
        const data = await response.json();

        if (data.success) {
            marketplaceSkills = data.skills || [];
            renderMarketplaceSkills();
        }
    } catch (error) {
        console.error('[Skills] 搜索技能失败:', error);
    }
}

/**
 * 处理搜索框回车
 */
function handleSearch(event) {
    if (event.key === 'Enter') {
        searchSkills();
    }
}

/**
 * 切换远程市场
 */
async function toggleRemoteMarketplace() {
    const statusEl = document.getElementById('remoteStatus');
    const url = prompt('请输入远程技能市场URL（如：https://api.example.com/skills 或 GitHub仓库地址）\n留空则使用本地市场：');

    if (url === null) return;

    if (url === '') {
        remoteConnected = false;
        statusEl.textContent = '本地市场';
        statusEl.className = 'remote-status local';
        localStorage.removeItem('remoteMarketplaceUrl');
        localStorage.removeItem('marketplaceCache');
        await fetch(`${API_BASE}/api/skills/remote/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: '' })
        });
        loadMarketplace();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/skills/remote/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (response.ok) {
            remoteConnected = true;
            statusEl.textContent = '已连接';
            statusEl.className = 'remote-status connected';
            localStorage.setItem('remoteMarketplaceUrl', url);
            checkRemoteConnection();
            loadMarketplace(true);
        }
    } catch (error) {
        console.error('[Skills] 配置远程市场失败:', error);
        statusEl.textContent = '连接失败';
        statusEl.className = 'remote-status error';
    }
}

/**
 * 检查远程连接状态
 */
async function checkRemoteConnection() {
    try {
        const response = await fetch(`${API_BASE}/api/skills/remote/status`);
        const data = await response.json();

        const statusEl = document.getElementById('remoteStatus');
        if (data.connected) {
            remoteConnected = true;
            statusEl.textContent = '已连接';
            statusEl.className = 'remote-status connected';
        } else {
            remoteConnected = false;
            statusEl.textContent = data.remote_url ? '离线' : '本地市场';
            statusEl.className = 'remote-status local';
        }
    } catch (error) {
        console.error('[Skills] 检查远程连接失败:', error);
    }
}

/**
 * 更新统计显示
 */
function updateStatsDisplay() {
    document.getElementById('statInstalled').textContent = skillStats.total_installed || 0;
    document.getElementById('statEnabled').textContent = skillStats.total_enabled || 0;
    document.getElementById('statMarketplace').textContent = skillStats.total_marketplace || 0;
}

/**
 * 获取分类排序顺序
 */
function getCategoryOrder() {
    return ['development', 'document', 'analysis', 'information', 'knowledge', 'multimodal', 'general', 'github', 'other'];
}

/**
 * 渲染已安装技能
 */
function renderInstalledSkills() {
    const skillsList = document.getElementById('installedSkillsList');
    if (!skillsList) return;

    if (installedSkills.length === 0) {
        skillsList.innerHTML = `
            <div class="empty-state">
                <p>暂无已安装技能</p>
                <p class="empty-hint">前往技能市场安装新技能</p>
            </div>
        `;
        return;
    }

    const categories = {};
    installedSkills.forEach(skill => {
        const cat = skill.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(skill);
    });

    let html = '';
    const categoryOrder = getCategoryOrder();
    
    for (const category of categoryOrder) {
        if (!categories[category]) continue;
        
        const skills = categories[category];
        // 按技能名称排序
        skills.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
        
        html += `
            <div class="skill-category">
                <h3 class="category-title">${getCategoryIcon(category)} ${getCategoryName(category)}</h3>
                <div class="skill-grid">
                    ${skills.map(skill => renderSkillCard(skill, true)).join('')}
                </div>
            </div>
        `;
    }

    skillsList.innerHTML = html;
}

/**
 * 渲染市场技能
 */
function renderMarketplaceSkills() {
    const skillsList = document.getElementById('marketplaceSkillsList');
    const hintEl = document.getElementById('marketplaceHint');
    if (!skillsList) return;

    // 应用来源筛选
    let filteredSkills = marketplaceSkills;
    if (currentSourceFilter === 'local') {
        filteredSkills = marketplaceSkills.filter(s => s.source === 'local');
    } else if (currentSourceFilter === 'remote') {
        filteredSkills = marketplaceSkills.filter(s => s.source !== 'local');
    }

    hintEl.style.display = filteredSkills.length > 0 ? 'block' : 'none';

    if (filteredSkills.length === 0) {
        skillsList.innerHTML = `
            <div class="empty-state">
                <p>暂无市场技能</p>
                <p class="empty-hint">试试搜索或切换来源筛选</p>
            </div>
        `;
        return;
    }

    const categories = {};
    filteredSkills.forEach(skill => {
        const cat = skill.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(skill);
    });

    let html = '';
    const categoryOrder = getCategoryOrder();
    
    for (const category of categoryOrder) {
        if (!categories[category]) continue;
        
        const skills = categories[category];
        // 按技能名称排序
        skills.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
        
        html += `
            <div class="skill-category">
                <h3 class="category-title">${getCategoryIcon(category)} ${getCategoryName(category)}</h3>
                <div class="skill-grid">
                    ${skills.map(skill => renderMarketplaceCard(skill)).join('')}
                </div>
            </div>
        `;
    }

    skillsList.innerHTML = html;
}

/**
 * 渲染技能卡片（已安装）
 */
function renderSkillCard(skill, isInstalled) {
    const enabled = skill.enabled !== false;
    return `
        <div class="skill-card ${enabled ? '' : 'disabled'}" data-skill-id="${skill.id}">
            <div class="skill-header">
                <h4 class="skill-name">${escapeHtml(skill.name)}</h4>
                <span class="skill-badge tier-${skill.tier || 1}">Tier ${skill.tier || 1}</span>
            </div>
            <p class="skill-desc" data-full="${escapeHtml(skill.description || '')}">${escapeHtml(skill.description || '')}</p>
            <div class="skill-meta">
                <span class="skill-author">${escapeHtml(skill.author || 'unknown')}</span>
                <span class="skill-version">v${skill.version || '1.0.0'}</span>
            </div>
            <div class="skill-actions">
                <label class="toggle-switch">
                    <input type="checkbox" ${enabled ? 'checked' : ''} onchange="window.toggleSkill('${skill.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">${enabled ? '启用' : '禁用'}</span>
                <button class="skill-btn uninstall-btn" onclick="window.uninstallSkill('${skill.id}')">卸载</button>
            </div>
        </div>
    `;
}

/**
 * 渲染市场技能卡片
 */
function renderMarketplaceCard(skill) {
    const isInstalled = skill.installed;
    const categoryIcon = getCategoryIcon(skill.category);
    let sourceLabel;
    let sourceClass;
    switch (skill.source) {
        case 'github':
            sourceLabel = '🐙 GitHub';
            sourceClass = 'source-github';
            break;
        case 'remote':
            sourceLabel = '🌐 远程';
            sourceClass = 'source-remote';
            break;
        default:
            sourceLabel = '📦 本地';
            sourceClass = 'source-local';
    }

    return `
        <div class="skill-card marketplace ${isInstalled ? 'installed' : ''}" data-skill-id="${skill.id}">
            <div class="skill-header">
                <h4 class="skill-name">${categoryIcon} ${escapeHtml(skill.name)}</h4>
                <div class="skill-header-right">
                    <span class="skill-source ${sourceClass}">${sourceLabel}</span>
                    <span class="skill-badge tier-${skill.tier || 1}">Tier ${skill.tier || 1}</span>
                </div>
            </div>
            <p class="skill-desc" data-full="${escapeHtml(skill.description || '')}">${escapeHtml(skill.description || '')}</p>
            <div class="skill-tags">
                ${(skill.tags || []).map(tag => `<span class="skill-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="skill-meta">
                <span class="skill-author">${escapeHtml(skill.author || 'unknown')}</span>
                <span class="skill-version">v${skill.version || '1.0.0'}</span>
            </div>
            <div class="skill-actions">
                ${isInstalled
                    ? '<span class="installed-label">✅ 已安装</span>'
                    : `<button class="skill-btn install-btn" onclick="window.installSkill('${skill.id}')">安装</button>`
                }
            </div>
        </div>
    `;
}

/**
 * 切换技能启用状态
 */
async function toggleSkill(skillId, enabled) {
    try {
        const response = await fetch(`${API_BASE}/api/skills/enable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill_id: skillId, enabled })
        });

        const data = await response.json();
        if (data.success) {
            const skill = installedSkills.find(s => s.id === skillId);
            if (skill) skill.enabled = enabled;
            loadMarketplaceStats();
        } else {
            alert('操作失败: ' + (data.message || '未知错误'));
            loadInstalledSkills();
        }
    } catch (error) {
        console.error('[Skills] 切换技能失败:', error);
        alert('操作失败: ' + error.message);
        loadInstalledSkills();
    }
}

/**
 * 安装技能
 */
async function installSkill(skillId) {
    if (!confirm('确定要安装这个技能吗？')) return;

    // 找到对应的技能卡片并更新按钮状态为"安装中"
    const skillCard = document.querySelector(`.skill-card[data-skill-id="${skillId}"]`);
    const installBtn = skillCard?.querySelector('.install-btn');
    if (installBtn) {
        installBtn.textContent = '安装中...';
        installBtn.disabled = true;
        installBtn.classList.add('installing');
    }

    try {
        const response = await fetch(`${API_BASE}/api/skills/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill_id: skillId, source: remoteConnected ? 'remote' : 'local' })
        });

        const data = await response.json();
        if (data.success) {
            alert('技能安装成功！');
            await Promise.all([loadInstalledSkills(), loadMarketplace(), loadMarketplaceStats()]);
        } else {
            alert('安装失败: ' + (data.message || '未知错误'));
            // 恢复按钮状态
            if (installBtn) {
                installBtn.textContent = '安装';
                installBtn.disabled = false;
                installBtn.classList.remove('installing');
            }
        }
    } catch (error) {
        console.error('[Skills] 安装技能失败:', error);
        alert('安装失败: ' + error.message);
        // 恢复按钮状态
        if (installBtn) {
            installBtn.textContent = '安装';
            installBtn.disabled = false;
            installBtn.classList.remove('installing');
        }
    }
}

/**
 * 卸载技能
 */
async function uninstallSkill(skillId) {
    if (!confirm('确定要卸载这个技能吗？')) return;

    try {
        const response = await fetch(`${API_BASE}/api/skills/${skillId}/uninstall`, {
            method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
            alert('技能已卸载');
            await Promise.all([loadInstalledSkills(), loadMarketplace(), loadMarketplaceStats()]);
        } else {
            alert('卸载失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('[Skills] 卸载技能失败:', error);
        alert('卸载失败: ' + error.message);
    }
}

/**
 * 获取分类图标
 */
function getCategoryIcon(category) {
    const icons = {
        'information': '🔍',
        'knowledge': '📚',
        'development': '💻',
        'document': '📄',
        'multimodal': '🖼️',
        'analysis': '📊',
        'general': '⚙️',
        'github': '🐙',
        'other': '📦'
    };
    return icons[category] || icons['other'];
}

/**
 * 获取分类名称
 */
function getCategoryName(category) {
    const names = {
        'information': '信息查询',
        'knowledge': '知识库',
        'development': '开发工具',
        'document': '文档处理',
        'multimodal': '多模态',
        'analysis': '数据分析',
        'general': '通用',
        'github': 'GitHub',
        'other': '其他'
    };
    return names[category] || category;
}

/**
 * HTML转义
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

/**
 * 导出页面模块
 */
const skillToolsPage = {
    init
};

// 导出到 window（供 onclick 调用）
window.skillToolsPage = skillToolsPage;
window.loadMarketplace = loadMarketplace;
window.searchSkills = searchSkills;
window.toggleRemoteMarketplace = toggleRemoteMarketplace;
window.handleSearch = handleSearch;
window.checkRemoteConnection = checkRemoteConnection;
window.installSkill = installSkill;
window.uninstallSkill = uninstallSkill;
window.toggleSkill = toggleSkill;