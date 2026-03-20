const axios = require('axios');

const apiKey = 'NzRjZmNmYTIwNjg5Yjk2MDBlNDA4ODRmYmYxOGZjODU3MjgwMDM0YQ==';
const url = 'http://1811081066449577.cn-beijing.pai-eas.aliyuncs.com/api/predict/ctgii_mm25/v1/chat/completions';

const models = ['minimax-m2.5', 'ctgii_mm25', 'minimax'];

const requestBody = {
    messages: [
        { role: 'system', content: '请回答以下问题：' },
        { role: 'user', content: '你好' }
    ]
};

const headers = {
    'Content-Type': 'application/json',
    'Authorization': apiKey
};

async function testModel(modelName) {
    console.log(`\n=== 测试模型: ${modelName} ===`);
    try {
        const body = { ...requestBody, model: modelName };
        const response = await axios.post(url, body, { headers });
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
    for (const model of models) {
        const success = await testModel(model);
        if (success) break;
    }
}

runTests();