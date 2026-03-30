const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const filesRouter = require('./routes/files');
const chatRouter = require('./routes/chat');
const modelsRouter = require('./routes/models');
const skillsCenter = require('./skills');

app.use('/api/files', filesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/models', modelsRouter);

app.get('/api/skills', (req, res) => {
  res.json({
    success: true,
    skills: skillsCenter.getAllSkillsInfo(),
    skillsByCategory: skillsCenter.getSkillsByCategory(),
    toolsWithDescriptions: skillsCenter.getToolsWithDescriptions(),
    supportedExtensions: skillsCenter.getSupportedExtensions(),
  });
});

app.post('/api/skills/process', async (req, res) => {
  try {
    const { file, model, apiKey, baseURL } = req.body;

    if (!file || !file.filepath || !file.filename) {
      return res.status(400).json({
        success: false,
        error: '缺少文件信息',
      });
    }

    const context = {
      model: model || 'minimax-m2.5',
      apiKey: apiKey || process.env.API_KEY || '',
      baseURL: baseURL || process.env.API_BASE_URL || '',
    };

    const result = await skillsCenter.processFile(file, context);

    res.json(result);
  } catch (error) {
    console.error('技能处理错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/skills/process-multiple', async (req, res) => {
  try {
    const { files, model, apiKey, baseURL } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少文件列表',
      });
    }

    const context = {
      model: model || 'minimax-m2.5',
      apiKey: apiKey || process.env.API_KEY || '',
      baseURL: baseURL || process.env.API_BASE_URL || '',
    };

    const result = await skillsCenter.processFiles(files, context);

    res.json(result);
  } catch (error) {
    console.error('批量技能处理错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`技能系统已初始化，支持 ${skillsCenter.getAllSkillsInfo().length} 个技能`);
});