const axios = require('axios');

async function testOpenAI() {
  console.log('测试 OpenAI GPT-3.5 Turbo API 调用...\n');

  const apiKey = '';
  const baseURL = 'https://api.openai.com/v1';
  const modelName = 'gpt-3.5-turbo';

  if (!apiKey) {
    console.log('❌ API密钥为空');
    console.log('请在模型管理中配置OpenAI API密钥');
    console.log('或者使用其他免费的模型（如MiniMax-M2.5）\n');
    return false;
  }

  try {
    const response = await axios.post(`${baseURL}/chat/completions`, {
      model: modelName,
      messages: [
        { role: 'system', content: '你是一个有帮助的AI助手' },
        { role: 'user', content: '你好' }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✓ API调用成功');
    console.log('响应:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.log('❌ API调用失败');
    console.log('错误:', error.response?.data || error.message);
    return false;
  }
}

testOpenAI();
