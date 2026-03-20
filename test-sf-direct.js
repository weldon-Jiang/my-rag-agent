const axios = require('axios');

async function testSiliconFlowDirect() {
  console.log('=== 直接测试 SiliconFlow API ===\n');

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

  console.log('请求:', JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const response = await axios.post(`${baseURL}/chat/completions`, requestBody, { headers });
    console.log('✓ 成功! 状态:', response.status);
    console.log('响应:', JSON.stringify(response.data).substring(0, 500));
    return true;
  } catch (error) {
    console.log('✗ 失败');
    console.log('状态码:', error.response?.status);
    console.log('错误数据:', JSON.stringify(error.response?.data, null, 2));
    console.log('错误消息:', error.message);
    return false;
  }
}

testSiliconFlowDirect();
