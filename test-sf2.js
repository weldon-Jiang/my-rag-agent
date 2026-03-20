const axios = require('axios');

async function test() {
  console.log('=== 测试 SiliconFlow API ===\n');

  const apiKey = 'sk-upmtmjiewttqjsgbfndwayryxfebntvmwrwcvdkybsqjioqf';
  const model = 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B';

  try {
    console.log('发送请求到 SiliconFlow...');
    const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant' },
        { role: 'user', content: 'Hello' }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✓ 成功! 状态:', response.status);
    console.log('响应:', JSON.stringify(response.data).substring(0, 500));
  } catch (error) {
    console.log('✗ 失败');
    console.log('状态码:', error.response?.status);
    console.log('错误:', error.response?.data);
    console.log('消息:', error.message);
  }
}

test();
