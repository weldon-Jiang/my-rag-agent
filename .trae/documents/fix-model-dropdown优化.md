# 模型下拉框优化

## 问题
1. 切换模型时，选中的模型名称没有显示在输入框中
2. 下拉框下拉选项中 minimax-m2.5 有背景色

## 解决方案

### Step 1: 修复切换模型时显示模型名称
检查 `selectModel` 函数，确保选择后更新显示：
```javascript
function selectModel(modelId) {
    selectedModel = modelId;
    // 更新显示
    const modelName = getSelectedModelName();
    document.getElementById('selectedModelName').textContent = modelName;
    // 关闭下拉框
    const menu = document.getElementById('modelDropdownMenu');
    const toggle = document.querySelector('.models-dropdown-toggle');
    menu?.classList.remove('open');
    toggle?.classList.remove('active');
}
```

### Step 2: 修复下拉选项默认背景色
下拉列表中的选项不应该有特殊背景色（除了鼠标悬停和选中状态）：
```css
.model-option {
    background: transparent;
}
```

## 改动文件
- `public/app.js` - 修复 selectModel 函数
- `public/style.css` - 修复下拉选项默认背景色
