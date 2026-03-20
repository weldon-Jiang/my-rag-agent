const axios = require('axios');

const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';

const urls = [
    'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1/chat/completions',
    'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25',
    'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1'
];

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

async function testURL(url) {
    console.log(`\n=== 测试: ${url} ===`);
    try {
        const response = await axios.post(url, requestBody, { headers });
        console.log('成功! Response:', JSON.stringify(response.data));
        return true;
    } catch (error) {
        console.error('失败:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        }
        return false;
    }
}

async function runTests() {
    for (const url of urls) {
        const success = await testURL(url);
        if (success) break;
    }
}

runTests();