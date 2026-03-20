const axios = require('axios');

async function testChatAPI() {
  console.log('=== 完整对话功能测试 ===\n');

  const baseURL = 'http://localhost:3000';

  // 测试1: 仅AI模式（MiniMax-M2.5）
  console.log('测试1: 仅AI模式（MiniMax-M2.5）');
  try {
    const response = await axios.post(`${baseURL}/api/chat`, {
      query: '你好，请介绍一下你自己',
      mode: 'ai',
      model: 'minimax-m2.5'
    });

    console.log('✓ 成功');
    console.log('AI回复:', response.data.response);
    console.log('');
  } catch (error) {
    console.log('❌ 失败:', error.response?.data?.error || error.message);
    console.log('');
  }

  // 测试2: 不存在的模型
  console.log('测试2: 不存在的模型');
  try {
    const response = await axios.post(`${baseURL}/api/chat`, {
      query: '你好',
      mode: 'ai',
      model: 'non-existent-model'
    });
    console.log('✓ 成功');
    console.log('');
  } catch (error) {
    console.log('✓ 正确报错:', error.response?.data?.error || error.message);
    console.log('');
  }

  // 测试3: 仅知识库模式
  console.log('测试3: 仅知识库模式（无知识库）');
  try {
    const response = await axios.post(`${baseURL}/api/chat`, {
      query: '你好',
      mode: 'knowledge',
      model: 'minimax-m2.5'
    });

    console.log('✓ 成功');
    console.log('回复:', response.data.response);
    console.log('');
  } catch (error) {
    console.log('❌ 失败:', error.response?.data?.error || error.message);
    console.log('');
  }

  console.log('=== 测试完成 ===');
}

testChatAPI();
