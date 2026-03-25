# 修复模型下拉框样式问题

## 问题
1. 默认模型的背景色显示不正确
2. 选择模型时的高亮不够明显
3. 深色主题下模型下拉框的字体颜色不正确

## 修复方案

### Step 1: 去掉默认模型的背景色
修改 `.models-dropdown-toggle` 样式，去掉默认背景色：
```css
.models-dropdown-toggle {
    background: transparent;
    /* 或使用 var(--bg-card) */
}
```

### Step 2: 选中模型时添加背景色高亮
确保选中项有明显的背景色：
```css
.models-dropdown-toggle.active {
    background: var(--accent-color);
    color: white;
}
```

### Step 3: 修复深色主题下拉框字体颜色
确保下拉框文字颜色跟随主题：
```css
.models-dropdown-toggle {
    color: var(--text-primary);
}
```

## 改动文件
- `public/style.css` - 修改模型下拉框相关样式
