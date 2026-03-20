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

  console.log('\n测试本地聊天API...');
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      query: '法国大革命的背景是什么?',
      mode: 'knowledge',
      model: 'minimax-m2.5'
    }, { timeout: 60000 });

    console.log('\n✅ API调用成功!');
    console.log('响应:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\n❌ API调用失败!');
    console.error('错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    console.log('\n关闭服务器...');
    server.kill('SIGINT');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('测试失败:', err);
  if (server) server.kill();
  process.exit(1);
});
