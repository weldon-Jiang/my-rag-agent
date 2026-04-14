const express = require('express');
const router = express.Router();
const modelService = require('../services/model-service');

/**
 * GET /api/models
 * 获取所有模型列表
 */
router.get('/', (req, res) => {
  try {
    const models = modelService.getModels();
    res.json(models);
  } catch (error) {
    console.error('[ModelController] 获取模型列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/models/published
 * 获取已发布的模型（当前激活的模型）
 */
router.get('/published', (req, res) => {
  try {
    const model = modelService.getCurrentModel();
    if (!model) {
      return res.status(404).json({ error: '没有已发布的模型' });
    }
    res.json([model]);
  } catch (error) {
    console.error('[ModelController] 获取已发布模型失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/models
 * 添加新模型
 */
router.post('/', (req, res) => {
  try {
    const model = req.body;
    modelService.addModel(model);
    res.json({ success: true, model });
  } catch (error) {
    console.error('[ModelController] 添加模型失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/models/:id
 * 获取指定模型
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const model = modelService.getModel(id);
    if (!model) {
      return res.status(404).json({ error: '模型不存在' });
    }
    res.json(model);
  } catch (error) {
    console.error('[ModelController] 获取模型失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/models/:id
 * 更新模型
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const model = modelService.updateModel(id, updates);
    if (!model) {
      return res.status(404).json({ error: '模型不存在' });
    }
    res.json({ success: true, model });
  } catch (error) {
    console.error('[ModelController] 更新模型失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/models/:id
 * 删除模型
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = modelService.deleteModel(id);
    if (!success) {
      return res.status(404).json({ error: '模型不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[ModelController] 删除模型失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/models/active/:id
 * 设置激活模型
 */
router.post('/active/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = modelService.setActiveModel(id);
    if (!success) {
      return res.status(404).json({ error: '模型不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[ModelController] 设置激活模型失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/models/test
 * 测试模型连接
 */
router.post('/test', async (req, res) => {
  try {
    const modelConfig = req.body;
    const success = await modelService.testModelConnection(modelConfig);
    res.json({ success });
  } catch (error) {
    console.error('[ModelController] 测试模型连接失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;