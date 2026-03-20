const axios = require('axios');

async function testMiniMaxFix() {
  console.log('=== MiniMax API 调试 ===\n');

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

  // 测试不同URL格式
  const urls = [
    baseURL,
    baseURL + '/chat/completions',
    baseURL.replace(/\/$/, '')
  ];

  for (const url of urls) {
    console.log(`测试URL: ${url}`);
    try {
      const response = await axios.post(url, requestBody, { headers });
      console.log('✓ 成功! 状态:', response.status);
      console.log('响应:', JSON.stringify(response.data).substring(0, 200));
      console.log('');
      return true;
    } catch (error) {
      console.log('✗ 失败:', error.response?.status, error.response?.data?.detail || error.message);
      console.log('');
    }
  }

  return false;
}

testMiniMaxFix();
