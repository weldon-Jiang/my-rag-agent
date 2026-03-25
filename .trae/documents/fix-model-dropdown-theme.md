# 修复模型下拉框主题跟随

## 问题
模型下拉框的颜色没有跟随主题切换，选中高亮也不够明显。

## 修复方案

### Step 1: 添加缺失的 CSS 变量
在 `:root` 和 `[data-theme="dark"]` 中添加：
```css
--model-option-hover: #f0f0f0;
--model-option-selected: #e6f7ff;
--model-group-title-color: #666;
--model-group-title-bg: #f9f9f9;
```

### Step 2: 修改下拉框样式
- `.model-group-title` - 标题颜色和背景
- `.model-option:hover` - 悬停背景
- `.model-option.selected` - 选中高亮

## 改动文件
- `public/style.css` - 添加下拉框主题变量和修改样式
