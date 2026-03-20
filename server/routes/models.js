const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const MODELS_FILE = path.join(__dirname, '../../data/models.json');
const DATA_DIR = path.join(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultModels = [
  {
    id: 'minimax-m2.5',
    name: 'MiniMax-M2.5',
    provider: 'MiniMax',
    type: 'chat',
    protocol: 'minimax',
    url: 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1/chat/completions',
    apiKey: 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ=='
  },
  {
    id: 'siliconflow-deepseek-r1-0528-qwen3-8b',
    name: 'DeepSeek-R1-0528-Qwen3-8B',
    provider: '硅基流动',
    type: 'chat',
    protocol: 'openai',
    url: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-upmtmjiewttqjsgbfndwayryxfebntvmwrwcvdkybsqjioqf',
    modelId: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
  }
];

function loadModels() {
  try {
    if (fs.existsSync(MODELS_FILE)) {
      const data = fs.readFileSync(MODELS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载模型数据失败:', error);
  }
  saveModels(defaultModels);
  return defaultModels;
}

function saveModels(models) {
  try {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2), 'utf8');
  } catch (error) {
    console.error('保存模型数据失败:', error);
  }
}

let models = loadModels();

router.get('/', (req, res) => {
  res.json(models);
});

router.post('/', (req, res) => {
  const { id, name, provider, type, url, apiKey } = req.body;
  if (!id || !name || !provider) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  if (models.find(m => m.id === id)) {
    return res.status(400).json({ error: '模型ID已存在' });
  }
  
  const newModel = { 
    id, 
    name, 
    provider, 
    type: type || 'chat',
    url: url || '',
    apiKey: apiKey || ''
  };
  models.push(newModel);
  saveModels(models);
  res.json(newModel);
});

router.put('/:id', (req, res) => {
  const modelId = req.params.id;
  const { name, provider, type, url, apiKey } = req.body;
  
  const index = models.findIndex(m => m.id === modelId);
  if (index === -1) {
    return res.status(404).json({ error: '模型不存在' });
  }
  
  models[index] = {
    ...models[index],
    name: name || models[index].name,
    provider: provider || models[index].provider,
    type: type || models[index].type,
    url: url !== undefined ? url : models[index].url,
    apiKey: apiKey !== undefined ? apiKey : models[index].apiKey
  };
  
  saveModels(models);
  res.json(models[index]);
});

router.delete('/:id', (req, res) => {
  const modelId = req.params.id;
  const index = models.findIndex(m => m.id === modelId);
  
  if (index === -1) {
    return res.status(404).json({ error: '模型不存在' });
  }
  
  models.splice(index, 1);
  saveModels(models);
  res.json({ success: true });
});

module.exports = router;
