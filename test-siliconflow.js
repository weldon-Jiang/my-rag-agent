const axios = require('axios');

async function testSiliconFlow() {
  console.log('=== SiliconFlow DeepSeek-R1 测试 ===\n');

  const apiKey = 'sk-upmtmjiewttqjsgbfndwayryxfebntvmwrwcvdkybsqjioqf';
  const baseURL = 'https://api.siliconflow.cn/v1';
  const model = 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B';

  const requestBody = {
    model: model,
    messages: [
      { role: 'system', content: '你是一个有帮助的AI助手' },
      { role: 'user', content: '你好' }
    ],
    temperature: 0.7
  };

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  console.log('测试URL:', `${baseURL}/chat/completions`);
  console.log('模型:', model);
  console.log('请求体:', JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const response = await axios.post(`${baseURL}/chat/completions`, requestBody, { headers });
    console.log('✓ 成功! 状态:', response.status);
    console.log('响应:', JSON.stringify(response.data, null, 2).substring(0, 500));
    return true;
  } catch (error) {
    console.log('✗ 失败');
    console.log('状态码:', error.response?.status);
    console.log('错误:', error.response?.data || error.message);
    return false;
  }
}

testSiliconFlow();
