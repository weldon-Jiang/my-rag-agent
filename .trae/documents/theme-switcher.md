# 系统主题跟随与切换功能

## 需求
1. 系统主题跟随电脑主题（浅色/深色）
2. 可手动切换：浅色主题、深色主题
3. 记住用户选择

## 实现方案

### Step 1: 定义 CSS 主题变量
在 style.css 中定义浅色和深色主题的颜色变量：
```css
:root {
  /* 浅色主题 */
  --bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --bg-card: white;
  --text-primary: #333;
  --text-secondary: #666;
  --border-color: #e0e0e0;
  --accent-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

[data-theme="dark"] {
  /* 深色主题 */
  --bg-primary: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  --bg-card: #1e1e2e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #333;
  --accent-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Step 2: 修改 body 和组件样式
将硬编码的颜色替换为 CSS 变量：
```css
body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.content-area {
  background: var(--bg-card);
  /* ... */
}
```

### Step 3: 添加主题切换 UI
在 header 或设置区域添加主题切换按钮：
```html
<div class="theme-switcher">
  <button class="theme-btn" data-theme="light">浅色</button>
  <button class="theme-btn" data-theme="dark">深色</button>
  <button class="theme-btn" data-theme="system">跟随系统</button>
</div>
```

### Step 4: 实现主题逻辑
在 app.js 中实现：
1. 读取保存的主题设置
2. 监听系统主题变化
3. 切换主题并保存到 localStorage

```javascript
function initTheme() {
  const saved = localStorage.getItem('theme') || 'system';
  applyTheme(saved);
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
```

### Step 5: 监听系统主题变化
```javascript
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('theme') === 'system') {
    applyTheme('system');
  }
});
```

## 改动文件
1. `public/style.css` - 添加主题变量和修改样式
2. `public/index.html` - 添加主题切换按钮
3. `public/app.js` - 添加主题切换逻辑
