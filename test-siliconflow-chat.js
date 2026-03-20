const axios = require('axios');

async function testChatAPI() {
  console.log('=== SiliconFlow DeepSeek 对话测试 ===\n');

  const baseURL = 'http://localhost:3000';

  // 测试 SiliconFlow DeepSeek
  console.log('测试: 硅基流动 DeepSeek-R1');
  try {
    const response = await axios.post(`${baseURL}/api/chat`, {
      query: '你好，请介绍一下你自己',
      mode: 'ai',
      model: 'siliconflow-deepseek-r1-0528-qwen3-8b'
    });

    console.log('✓ 成功');
    console.log('AI回复:', response.data.response);
    console.log('来源:', response.data.source);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ 失败:', error.response?.data?.error || error.message);
    console.log('');
    return false;
  }
}

testChatAPI();
