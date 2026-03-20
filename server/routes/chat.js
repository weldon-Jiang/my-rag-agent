const express = require('express');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const axios = require('axios');

const router = express.Router();
const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');
const MODELS_FILE = path.join(__dirname, '../../data/models.json');

function loadModels() {
  try {
    if (fs.existsSync(MODELS_FILE)) {
      const data = fs.readFileSync(MODELS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载模型数据失败:', error);
  }
  return [];
}

function searchKnowledgeBase(query) {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return [];
    }

    const results = [];
    const files = fs.readdirSync(KNOWLEDGE_DIR);

    for (const filename of files) {
      const filePath = path.join(KNOWLEDGE_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      const lowerQuery = query.toLowerCase();
      const lowerContent = content.toLowerCase();

      if (lowerContent.includes(lowerQuery)) {
        const sentences = content.split(/[.。！？!?]/);
        const relevantSentences = sentences.filter(sentence =>
          sentence.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);

        results.push({
          filename,
          content: relevantSentences.join('. ') + '.',
          fullContent: content
        });
      }
    }

    return results;
  } catch (error) {
    console.error('检索知识库时出错:', error);
    return [];
  }
}

function buildAPIURL(baseURL, protocol) {
  const url = baseURL.replace(/\/$/, '');

  if (protocol === 'minimax') {
    if (url.includes('/chat/completions') || url.includes('v1/chat')) {
      return url;
    }
    return url;
  }

  if (protocol === 'openai' || protocol === 'chat') {
    if (url.includes('/chat/completions') || url.includes('v1/chat')) {
      return url;
    }
    return `${url}/chat/completions`;
  }

  if (protocol === 'ollama') {
    return `${url}/api/generate`;
  }

  if (url.includes('/chat/completions') || url.includes('v1/chat')) {
    return url;
  }
  if (url.includes('/api/generate')) {
    return url;
  }

  return `${url}/chat/completions`;
}

function buildRequestBody(model, systemPrompt, query) {
  const modelName = model.modelId || model.id;
  const protocol = model.protocol || model.apiType || '';

  if (protocol === 'ollama' || (modelName && modelName.includes('ollama'))) {
    return {
      model: modelName,
      prompt: `${systemPrompt}${query}`,
      stream: false
    };
  }

  if (protocol === 'minimax') {
    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]
    };
  }

  return {
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ],
    temperature: model.temperature || 0.7
  };
}

function extractResponseContent(response) {
  if (response.data.choices && response.data.choices[0]) {
    return response.data.choices[0].message?.content ||
           response.data.choices[0].text ||
           response.data.choices[0].reasoning_content ||
           JSON.stringify(response.data);
  }
  if (response.data.output) {
    return response.data.output;
  }
  if (response.data.response) {
    return response.data.response;
  }
  return JSON.stringify(response.data);
}

async function callAI(query, context = '', modelId) {
  try {
    const models = loadModels();
    const model = models.find(m => m.id === modelId);

    if (!model) {
      throw new Error('未找到指定的模型');
    }

    const systemPrompt = context
      ? `请根据以下知识库信息回答问题。如果知识库信息不足以回答，请明确说明。\n\n知识库信息：\n${context}\n\n问题：`
      : '请回答以下问题：';

    const apiKey = model.apiKey;
    let baseURL = model.url;

    if (!baseURL) {
      throw new Error('模型URL未配置');
    }

    const protocol = model.protocol || model.apiType || '';
    const fullURL = buildAPIURL(baseURL, protocol);

    const requestBody = buildRequestBody(model, systemPrompt, query);

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      if (protocol === 'minimax') {
        headers['Authorization'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    try {
      const response = await axios.post(fullURL, requestBody, { headers });

      return extractResponseContent(response);
    } catch (apiError) {
      const statusCode = apiError.response?.status;
      const errorData = apiError.response?.data;
      const errorMessage = errorData?.error?.message || errorData?.message || apiError.message;

      console.error('API调用失败 - Status:', statusCode);
      console.error('API调用失败 - Error:', errorMessage);
      console.error('API调用失败 - Full Response:', JSON.stringify(errorData));

      if (statusCode === 401 || statusCode === 403) {
        throw new Error('API密钥无效或未授权，请检查密钥配置');
      } else if (statusCode === 404) {
        throw new Error(`API端点不存在: ${fullURL}，请检查模型URL配置`);
      } else if (statusCode === 429) {
        throw new Error('请求频率超限，请稍后再试');
      } else if (statusCode === 400) {
        throw new Error(`请求参数错误: ${errorMessage}，请检查模型配置`);
      } else {
        throw new Error(`API调用失败: ${errorMessage}`);
      }
    }
  } catch (error) {
    console.error('调用AI时出错:', error);
    throw error;
  }
}

router.post('/', async (req, res) => {
  try {
    const { query, mode, model } = req.body;

    if (!query || !mode || !model) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    let response = '';
    let source = '';
    const knowledgeResults = searchKnowledgeBase(query);

    if (mode === 'knowledge') {
      if (knowledgeResults.length === 0) {
        response = '抱歉，在本地知识库中没有找到相关信息。';
        source = '知识库';
      } else {
        const context = knowledgeResults.map(r => `【${r.filename}】\n${r.content}`).join('\n\n');
        response = await callAI(query, context, model);
        source = '知识库';
      }
    } else if (mode === 'ai') {
      response = await callAI(query, '', model);
      source = 'AI';
    } else if (mode === 'hybrid') {
      if (knowledgeResults.length > 0) {
        const context = knowledgeResults.map(r => `【${r.filename}】\n${r.content}`).join('\n\n');
        response = await callAI(query, context, model);
        source = '混合（知识库优先）';
      } else {
        response = await callAI(query, '', model);
        source = '混合（AI）';
      }
    }

    res.json({
      response,
      source,
      knowledgeResults: knowledgeResults.map(r => ({ filename: r.filename }))
    });
  } catch (error) {
    console.error('聊天错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
