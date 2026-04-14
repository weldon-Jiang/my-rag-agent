const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const fileService = require('../services/file-service');

/**
 * 配置 multer 存储，使用原始文件名并处理中文编码
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../temp'));
  },
  filename: function (req, file, cb) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, originalName);
  }
});

const upload = multer({ storage });

/**
 * GET /api/files
 * 获取文件列表
 */
router.get('/', (req, res) => {
  try {
    const files = fileService.getFiles();
    res.json(files);
  } catch (error) {
    console.error('[FileController] 获取文件列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/:filename
 * 下载/读取文件
 */
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(fileService.KNOWLEDGE_DIR, decodedFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('[FileController] 读取文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/files/upload
 * 上传文件
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const targetName = req.body.name || originalName;
    const result = fileService.uploadFile(req.file.path, targetName);

    if (!result) {
      return res.status(500).json({ error: '上传失败' });
    }

    res.json({ success: true, path: result, filename: targetName });
  } catch (error) {
    console.error('[FileController] 上传文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/files
 * 创建新文件
 */
router.post('/', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: '文件名和内容不能为空' });
    }
    const filePath = fileService.writeFile(filename, content);
    if (!filePath) {
      return res.status(500).json({ error: '创建文件失败' });
    }
    res.json({ success: true, path: filePath });
  } catch (error) {
    console.error('[FileController] 创建文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/files/:filename
 * 更新文件
 */
router.put('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }
    const filePath = fileService.writeFile(decodedFilename, content);
    if (!filePath) {
      return res.status(500).json({ error: '更新文件失败' });
    }
    res.json({ success: true, path: filePath });
  } catch (error) {
    console.error('[FileController] 更新文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/files/:filename
 * 删除文件
 */
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const success = fileService.deleteFile(decodedFilename);
    if (!success) {
      return res.status(404).json({ error: '文件不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[FileController] 删除文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;