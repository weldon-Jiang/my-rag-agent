# 修复模型下拉框选中状态样式

## 问题
1. 默认选中模型(minimax-m2.5)的背景色没有显示
2. 选择其他模型时，背景色没有切换到已选中的模型
3. 单选按钮文字：未选中时黑色，选择后白色

## 修复方案

### Step 1: 修复选中状态的样式
修改 `.model-option.selected` 使用 CSS 变量：
```css
.model-option.selected {
    background: var(--model-option-selected);
    color: white;
}
```

### Step 2: 确保默认模型有选中状态
需要确保在渲染时，默认模型(minimax-m2.5)有 `selected` 类

### Step 3: 添加 radio 按钮文字颜色
```css
.model-option.selected input[type="radio"] {
    accent-color: white;
}
```

## 改动文件
- `public/style.css` - 修改选中状态样式
