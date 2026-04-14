const axios = require('axios');

const SUPPORTED_PROTOCOLS = ['openai', 'anthropic', 'minimax'];

function buildAPIURL(baseURL, protocol = 'openai') {
  const url = baseURL.replace(/\/$/, '');

  if (protocol === 'anthropic') {
    return url.endsWith('/v1/messages') ? url : `${url}/v1/messages`;
  }

  if (url.includes('/v1/chat/completions')) {
    return url;
  }
  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  }
  if (url.endsWith('/v1/')) {
    return `${url}chat/completions`;
  }
  return `${url}/v1/chat/completions`;
}

function buildRequestBody(model, systemPrompt, userMessage, protocol = 'openai') {
  if (protocol === 'anthropic') {
    return {
      model: model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    };
  }

  return {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 4096
  };
}

function extractResponseContent(response) {
  if (!response || !response.data) {
    throw new Error('Invalid response');
  }

  const data = response.data;

  if (data.choices && data.choices[0]) {
    const message = data.choices[0].message;
    if (message.content) {
      return {
        content: message.content,
        role: message.role,
        usage: data.usage
      };
    }
    if (message.function_call) {
      return {
        function_call: message.function_call,
        role: message.role,
        usage: data.usage
      };
    }
  }

  if (data.content && data.content[0] && data.content[0].type === 'text') {
    return {
      content: data.content[0].text,
      role: 'assistant',
      usage: data.usage
    };
  }

  throw new Error('Cannot parse response content');
}

async function callAI(model, systemPrompt, userMessage, modelConfig) {
  const protocol = SUPPORTED_PROTOCOLS.includes(modelConfig.protocol) ? modelConfig.protocol : 'openai';
  const baseURL = modelConfig.url;
  const apiKey = modelConfig.apiKey;

  const fullURL = buildAPIURL(baseURL, protocol);
  const requestBody = buildRequestBody(model, systemPrompt, userMessage, protocol);

  console.log('[AI Service] 调用协议:', protocol, 'URL:', fullURL);

  try {
    const response = await axios.post(fullURL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 120000
    });

    const result = extractResponseContent(response);
    return result;
  } catch (error) {
    console.error('[AI Service] 调用失败:', error.message);
    if (error.response) {
      console.error('[AI Service] 响应状态:', error.response.status);
      console.error('[AI Service] 响应数据:', JSON.stringify(error.response.data));
    }
    throw error;
  }
}

module.exports = {
  buildAPIURL,
  buildRequestBody,
  extractResponseContent,
  callAI,
  SUPPORTED_PROTOCOLS
};
