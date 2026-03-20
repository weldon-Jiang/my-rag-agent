const axios = require('axios');

const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';
const url = 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1/chat/completions';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': apiKey
};

const testModels = [
  'minimax-m2.5',
  'MiniMax-M2.5',
  'mm2.5',
  'ctgii_mm25',
  'gpt-4',
  '',
  'test'
];

const requestBody = {
  messages: [
    { role: 'system', content: '请回答以下问题：' },
    { role: 'user', content: '你好，请简单介绍一下自己' }
  ]
};

async function testModelNames() {
  for (const model of testModels) {
    console.log('\n====================================');
    console.log('测试模型名:', model || '(空字符串)');
    console.log('====================================');
    
    const body = { ...requestBody };
    if (model) {
      body.model = model;
    }
    
    try {
      const response = await axios.post(url, body, { headers, timeout: 30000 });
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

testModelNames();
