const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    console.log('请求:', req.url);

    if (req.url === '/') {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        fs.readFile(htmlPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading HTML');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/api/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const models = [
            { id: 'minimax-m2.5', name: 'MiniMax-M2.5', provider: 'MiniMax' },
            { id: 'test1', name: 'Test Model 1', provider: 'Test' }
        ];
        res.end(JSON.stringify(models));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(3001, () => {
    console.log('测试服务器运行在 http://localhost:3001');
});
