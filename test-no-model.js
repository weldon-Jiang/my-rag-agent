const axios = require('axios');

const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';
const url = 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1/chat/completions';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': apiKey
};

const requestBody = {
  messages: [
    { role: 'system', content: '请回答以下问题：' },
    { role: 'user', content: '你好，请简单介绍一下自己' }
  ]
};

console.log('正在测试不传递model参数...');
console.log('URL:', url);
console.log('请求:', JSON.stringify(requestBody, null, 2));

axios.post(url, requestBody, { headers, timeout: 30000 })
  .then(response => {
    console.log('\n✅ 成功!');
    console.log('状态码:', response.status);
    console.log('响应:', JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.log('\n❌ 失败');
    console.log('错误:', error.message);
    if (error.response) {
      console.log('状态:', error.response.status);
      console.log('数据:', JSON.stringify(error.response.data, null, 2));
    }
  });
