const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

let server;

async function main() {
  console.log('启动服务器...');
  
  server = spawn('node', ['server/index.js'], {
    cwd: __dirname,
    detached: false
  });

  server.stdout.on('data', (data) => {
    console.log(`[服务器] ${data}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[服务器错误] ${data}`);
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n\n====================================');
  console.log('测试1: 仅AI模式 - 测试MiniMax模型');
  console.log('====================================');
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      query: '你好，请简单介绍一下自己',
      mode: 'ai',
      model: 'minimax-m2.5'
    }, { timeout: 60000 });

    console.log('\n✅ API调用成功!');
    console.log('回复:', response.data.response);
    console.log('来源:', response.data.source);
  } catch (error) {
    console.error('\n❌ API调用失败!');
    console.error('错误:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n\n====================================');
  console.log('测试2: 知识库模式 - 测试法国大革命查询');
  console.log('====================================');
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      query: '法国大革命',
      mode: 'knowledge',
      model: 'minimax-m2.5'
    }, { timeout: 60000 });

    console.log('\n✅ API调用成功!');
    console.log('回复:', response.data.response);
    console.log('来源:', response.data.source);
    if (response.data.knowledgeResults && response.data.knowledgeResults.length > 0) {
      console.log('检索到的文件:', response.data.knowledgeResults.map(r => r.filename));
    }
  } catch (error) {
    console.error('\n❌ API调用失败!');
    console.error('错误:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n\n====================================');
  console.log('测试3: 混合模式');
  console.log('====================================');
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      query: '什么是法国大革命',
      mode: 'hybrid',
      model: 'minimax-m2.5'
    }, { timeout: 60000 });

    console.log('\n✅ API调用成功!');
    console.log('回复:', response.data.response);
    console.log('来源:', response.data.source);
  } catch (error) {
    console.error('\n❌ API调用失败!');
    console.error('错误:', error.message);
  }

  console.log('\n\n关闭服务器...');
  server.kill('SIGINT');
  process.exit(0);
}

main().catch(err => {
  console.error('测试失败:', err);
  if (server) server.kill();
  process.exit(1);
});
