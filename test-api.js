const http = require('http');

const data = JSON.stringify({
  query: '你好',
  mode: 'ai',
  model: 'siliconflow-deepseek-r1-0528-qwen3-8b'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('状态码:', res.statusCode);
    console.log('响应:', body);
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
});

req.write(data);
req.end();
