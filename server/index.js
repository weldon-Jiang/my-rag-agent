const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const filesRouter = require('./routes/files');
const chatRouter = require('./routes/chat');
const modelsRouter = require('./routes/models');

app.use('/api/files', filesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/models', modelsRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
