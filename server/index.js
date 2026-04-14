const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3030;
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

console.log('[Server] Starting...');
console.log('[Server] __dirname:', __dirname);
console.log('[Server] PORT:', PORT);
console.log('[Server] KNOWLEDGE_DIR:', KNOWLEDGE_DIR);
console.log('[Server] NODE_ENV:', process.env.NODE_ENV);

if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  console.log('[Server] Created knowledge directory');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const chatController = require('./controllers/chat-controller');
const sessionController = require('./controllers/session-controller');
const modelController = require('./controllers/model-controller');
const fileController = require('./controllers/file-controller');
const skillsCenter = require('./skills');

/**
 * 路由配置
 *
 * 前端调用约定:
 * - /api/chat/* - 聊天相关 (消息、追问)
 * - /api/chat/sessions/* - 会话管理
 * - /api/models/* - 模型管理
 * - /api/files/* - 文件管理
 */

// 聊天消息和追问 - /api/chat
app.use('/api/chat', chatController);

// 会话管理 - /api/chat/sessions (挂载到 chat 下)
app.use('/api/chat/sessions', sessionController);

// 模型管理 - /api/models
app.use('/api/models', modelController);

// 文件管理 - /api/files
app.use('/api/files', fileController);

/**
 * GET /api/skills
 * 获取所有技能列表及其分类信息
 * 返回: 技能列表、按类别分组的技能、技能工具描述、支持的文件扩展名
 */
app.get('/api/skills', (req, res) => {
  res.json({
    success: true,
    skills: skillsCenter.getAllSkills(),
    skillsByCategory: skillsCenter.getSkillsByCategory(),
    toolsWithDescriptions: skillsCenter.getToolsWithDescriptions(),
    supportedExtensions: skillsCenter.getSupportedExtensions(),
  });
});

/**
 * POST /api/skills/process
 * 处理单个文件的技能分析
 * 请求体: { file: { filepath, filename }, model, apiKey, baseURL }
 * 返回: 技能处理结果
 */
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

/**
 * POST /api/skills/process-multiple
 * 批量处理多个文件的技能分析
 * 请求体: { files: [{ filepath, filename }, ...], model, apiKey, baseURL }
 * 返回: 批量处理结果
 */
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

/**
 * GET /
 * 返回前端页面
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * GET /api/port
 * 获取服务器当前端口
 * 返回: { port: number }
 */
app.get('/api/port', (req, res) => {
  res.json({ port: PORT });
});

/**
 * 启动服务器
 * 监听指定端口，启动 Express 应用
 */
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`技能系统已初始化，支持 ${skillsCenter.getAllSkills().length} 个技能`);
});
