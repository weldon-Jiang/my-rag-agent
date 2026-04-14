const path = require('path');
const fs = require('fs');

const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');

function ensureKnowledgeDir() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }
}

function getFiles() {
  ensureKnowledgeDir();
  try {
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    return files.map(filename => {
      const filePath = path.join(KNOWLEDGE_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        name: filename,
        path: filePath,
        size: stats.size,
        type: getFileType(filename),
        modifiedAt: stats.mtime.toISOString()
      };
    });
  } catch (error) {
    console.error('[FileService] 获取文件列表失败:', error);
    return [];
  }
}

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const typeMap = {
    '.txt': 'text',
    '.md': 'markdown',
    '.pdf': 'pdf',
    '.doc': 'word',
    '.docx': 'word',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image',
    '.mp4': 'video',
    '.avi': 'video',
    '.mov': 'video',
    '.mp3': 'audio',
    '.wav': 'audio'
  };
  return typeMap[ext] || 'unknown';
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('[FileService] 读取文件失败:', error);
    return null;
  }
}

function writeFile(filename, content) {
  ensureKnowledgeDir();
  try {
    const filePath = path.join(KNOWLEDGE_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  } catch (error) {
    console.error('[FileService] 写入文件失败:', error);
    return null;
  }
}

function deleteFile(filename) {
  try {
    const filePath = path.join(KNOWLEDGE_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[FileService] 删除文件失败:', error);
    return false;
  }
}

function uploadFile(sourcePath, targetName) {
  ensureKnowledgeDir();
  try {
    const targetPath = path.join(KNOWLEDGE_DIR, targetName);
    fs.copyFileSync(sourcePath, targetPath);
    return targetPath;
  } catch (error) {
    console.error('[FileService] 上传文件失败:', error);
    return null;
  }
}

module.exports = {
  ensureKnowledgeDir,
  getFiles,
  getFileType,
  readFile,
  writeFile,
  deleteFile,
  uploadFile,
  KNOWLEDGE_DIR
};