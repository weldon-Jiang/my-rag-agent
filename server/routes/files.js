const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, KNOWLEDGE_DIR);
  },
  filename: (req, file, cb) => {
    let filename = file.originalname;
    try {
      filename = Buffer.from(filename, 'latin1').toString('utf8');
    } catch (e) {
    }
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(KNOWLEDGE_DIR).map(filename => {
      const filePath = path.join(KNOWLEDGE_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        name: filename,
        size: stats.size,
        updated: stats.mtime
      };
    });
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    let filename = req.file.filename;
    try {
      if (!Buffer.isBuffer(filename)) {
        filename = Buffer.from(filename, 'latin1').toString('utf8');
      }
    } catch (e) {
    }
    res.json({ 
      success: true, 
      filename: filename,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:filename', (req, res) => {
  try {
    let filename = req.params.filename;
    try {
      filename = decodeURIComponent(filename);
    } catch (e) {
    }
    const filePath = path.join(KNOWLEDGE_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
