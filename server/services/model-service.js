const path = require('path');
const fs = require('fs');

const MODELS_FILE = path.join(__dirname, '../../data/models.json');
const MODEL_KEYS_ORDER = ['id', 'name', 'provider', 'type', 'protocol', 'url', 'modelId', 'apiKey', 'published'];

let modelCache = null;

function loadModels() {
  try {
    if (fs.existsSync(MODELS_FILE)) {
      const data = fs.readFileSync(MODELS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[ModelService] 加载模型失败:', error);
  }
  return [];
}

function saveModels(models) {
  try {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2), 'utf-8');
    modelCache = null;
    return true;
  } catch (error) {
    console.error('[ModelService] 保存模型失败:', error);
    return false;
  }
}

function getModels() {
  if (!modelCache) {
    modelCache = loadModels();
  }
  return modelCache;
}

function getModel(modelId) {
  const models = getModels();
  return models.find(m => m.id === modelId) || null;
}

function getCurrentModel() {
  const models = getModels();
  return models.find(m => m.isActive || m.published) || models[0] || null;
}

function addModel(model) {
  const models = getModels();
  const orderedModel = {};
  for (const key of MODEL_KEYS_ORDER) {
    if (key in model) {
      orderedModel[key] = model[key];
    }
  }
  for (const key of Object.keys(model)) {
    if (!MODEL_KEYS_ORDER.includes(key)) {
      orderedModel[key] = model[key];
    }
  }
  models.push(orderedModel);
  return saveModels(models);
}

function updateModel(modelId, updates) {
  const models = getModels();
  const index = models.findIndex(m => m.id === modelId);
  if (index === -1) {
    return null;
  }
  const existingModel = models[index];
  const mergedModel = {};
  for (const key of MODEL_KEYS_ORDER) {
    if (key in updates) {
      mergedModel[key] = updates[key];
    } else if (key in existingModel) {
      mergedModel[key] = existingModel[key];
    }
  }
  for (const key of Object.keys(updates)) {
    if (!MODEL_KEYS_ORDER.includes(key)) {
      mergedModel[key] = updates[key];
    }
  }
  models[index] = mergedModel;
  saveModels(models);
  return models[index];
}

function deleteModel(modelId) {
  const models = getModels();
  const index = models.findIndex(m => m.id === modelId);
  if (index === -1) {
    return false;
  }
  models.splice(index, 1);
  return saveModels(models);
}

function setActiveModel(modelId) {
  const models = getModels();
  models.forEach(m => {
    m.isActive = m.id === modelId;
  });
  return saveModels(models);
}

function testModelConnection(modelConfig) {
  const axios = require('axios');
  const url = modelConfig.url.replace(/\/$/, '');

  return axios.get(`${url}/v1/models`, {
    headers: {
      'Authorization': `Bearer ${modelConfig.apiKey}`
    },
    timeout: 10000
  }).then(() => true).catch(() => false);
}

module.exports = {
  loadModels,
  saveModels,
  getModels,
  getModel,
  getCurrentModel,
  addModel,
  updateModel,
  deleteModel,
  setActiveModel,
  testModelConnection
};