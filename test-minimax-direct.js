const axios = require('axios');

const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';
const baseURL = 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1';

console.log('=== MiniMax API Direct Test ===');
console.log('URL:', baseURL);
console.log('API Key:', apiKey ? '已配置' : '未配置');

const requestBody = {
    model: 'minimax-m2.5',
    messages: [
        { role: 'system', content: '请回答以下问题：' },
        { role: 'user', content: '你好' }
    ]
};

const headers = {
    'Content-Type': 'application/json',
    'Authorization': apiKey
};

console.log('Request Body:', JSON.stringify(requestBody));
console.log('Headers:', JSON.stringify(headers));

axios.post(baseURL, requestBody, { headers })
    .then(response => {
        console.log('=== 成功 ===');
        console.log('Response:', JSON.stringify(response.data));
    })
    .catch(error => {
        console.error('=== 失败 ===');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        }
    });