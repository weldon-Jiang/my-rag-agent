const axios = require('axios');

const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';
const baseURL = 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': apiKey
};

const testPaths = [
  '/chat/completions',
  '/completions',
  '',
  '/v1/chat/completions',
  '/predict'
];

const requestBody = {
  model: 'minimax-m2.5',
  messages: [
    { role: 'system', content: '请回答以下问题：' },
    { role: 'user', content: '你好' }
  ]
};

async function runTests() {
  for (const path of testPaths) {
    const url = baseURL + path;
    console.log('\n====================================');
    console.log('测试:', url);
    console.log('====================================');
    
    try {
      const response = await axios.post(url, requestBody, { headers, timeout: 15000 });
      console.log('✅ 成功!');
      console.log('状态码:', response.status);
      console.log('响应:', JSON.stringify(response.data, null, 2));
      return;
    } catch (error) {
      console.log('❌ 失败');
      console.log('错误:', error.message);
      if (error.response) {
        console.log('状态:', error.response.status);
        console.log('数据:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

runTests();
