const axios = require('axios');

async function testMiniMaxChat() {
  console.log('测试 MiniMax-M2.5 模型对话...\n');

  const modelUrl = 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1';
  const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';

  try {
    const response = await axios.post(modelUrl, {
      messages: [
        { role: 'system', content: '你是一个有帮助的AI助手' },
        { role: 'user', content: '你好' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      }
    });

    console.log('✓ API调用成功');
    console.log('状态码:', response.status);
    console.log('响应:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ API调用失败');
    console.log('错误:', error.response?.data || error.message);
    return false;
  }
}

testMiniMaxChat();
