# 模型发布状态功能计划

## 需求分析
在模型管理中增加模型的"发布状态"字段，只有状态为"已发布"的模型才能在 AI 对话中选择使用。

## 修改内容

### 1. 后端 models.js 修改
- 模型数据结构增加 `published` 字段（布尔值，默认 true）
- `GET /` 接口返回所有模型（包括未发布的，供管理页面使用）
- 新增 `GET /published` 接口只返回已发布的模型（供对话选择使用）
- `POST /` 创建模型时添加 `published` 字段
- `PUT /:id` 更新模型时可修改 `published` 状态

### 2. 前端 app.js 修改
- 模型表单增加"发布状态"复选框
- 模型列表显示发布状态
- `renderModelSelect()` 只显示已发布模型
- `loadModels()` 调用 `/published` 接口获取可选模型
- 编辑模型时可修改发布状态

### 3. 数据迁移
- 现有模型 `published` 默认为 true（保持兼容）

## 实现步骤

### 步骤 1: 修改 server/routes/models.js
- 模型数据结构添加 `published: true`
- 新增 GET `/published` 路由
- 更新 POST 和 PUT 路由处理 `published` 字段

### 步骤 2: 修改 public/app.js
- 模型表单增加发布状态复选框
- 修改 `loadModels()` 获取已发布模型
- 修改 `renderModelSelect()` 只显示已发布模型
- 修改 `renderModelsList()` 显示所有模型及状态

### 步骤 3: 测试验证
- 验证未发布模型不能被选择
- 验证发布状态切换功能正常