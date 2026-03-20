const axios = require('axios');

async function testMiniMaxAPI() {
  console.log('测试 MiniMax-M2.5 模型对话...\n');

  const baseURL = 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1';
  const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';

  const requestBody = {
    messages: [
      { role: 'system', content: '你是一个有帮助的AI助手' },
      { role: 'user', content: '你好' }
    ]
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': apiKey
  };

  // 测试原始URL
  console.log('测试1: 原始URL');
  try {
    const response = await axios.post(baseURL, requestBody, { headers });
    console.log('✓ 成功');
    console.log('响应:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ 失败:', error.response?.status, error.response?.data?.detail || error.message);
  }

  // 测试添加/chat/completions
  console.log('\n测试2: 添加/chat/completions');
  try {
    const response = await axios.post(baseURL + '/chat/completions', requestBody, { headers });
    console.log('✓ 成功');
    console.log('响应:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ 失败:', error.response?.status, error.response?.data?.detail || error.message);
  }

  return false;
}

testMiniMaxAPI();
