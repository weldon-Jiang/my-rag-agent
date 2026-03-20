const axios = require('axios');

const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';
const url = 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1/chat/completions';

const tests = [
    { name: '无model参数', body: { messages: [{ role: 'system', content: '请回答以下问题：' }, { role: 'user', content: '你好' }] } },
    { name: 'model为空字符串', body: { model: '', messages: [{ role: 'system', content: '请回答以下问题：' }, { role: 'user', content: '你好' }] } },
    { name: 'model为下划线', body: { model: '_', messages: [{ role: 'system', content: '请回答以下问题：' }, { role: 'user', content: '你好' }] } },
];

const headers = {
    'Content-Type': 'application/json',
    'Authorization': apiKey
};

async function runTest(test) {
    console.log(`\n=== ${test.name} ===`);
    try {
        const response = await axios.post(url, test.body, { headers });
        console.log('成功! Response:', JSON.stringify(response.data));
        return true;
    } catch (error) {
        console.error('失败:', error.message);
        if (error.response?.data) {
            console.error('Data:', JSON.stringify(error.response.data));
        }
        return false;
    }
}

async function runTests() {
    for (const test of tests) {
        const success = await runTest(test);
        if (success) break;
    }
}

runTests();