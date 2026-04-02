const BaseSkill = require('../base-skill');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

class PdfsSkill extends BaseSkill {
  constructor(options = {}) {
    super({
      name: 'pdfs-skill',
      description: 'PDF多模态解析技能 - 提取PDF文档信息、结构和关键内容',
      version: '1.0.0',
      supportedTypes: ['.pdf'],
      ...options,
    });

    this.maxPdfSize = options.maxPdfSize || 50 * 1024 * 1024;
    this.workerPath = options.workerPath || path.join(__dirname, '..', 'pdf-worker.js');
  }

  async process(file, context = {}) {
    try {
      const { filepath, filename } = file;

      if (!fs.existsSync(filepath)) {
        return {
          success: false,
          error: '文件不存在',
          skill: this.name,
        };
      }

      const stats = fs.statSync(filepath);
      if (stats.size > this.maxPdfSize) {
        return {
          success: false,
          error: `PDF大小超过限制 (${this.maxPdfSize / 1024 / 1024}MB)`,
          skill: this.name,
        };
      }

      const pdfInfo = await this.extractPdfContent(filepath, filename, stats);

      return {
        success: true,
        skill: this.name,
        filename,
        fileSize: stats.size,
        pageCount: pdfInfo.pageCount,
        content: pdfInfo.content,
        textContent: pdfInfo.textContent,
        metadata: pdfInfo.metadata,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`${this.name} 处理PDF失败:`, error);
      return {
        success: false,
        error: error.message,
        skill: this.name,
      };
    }
  }

  async extractPdfContent(filepath, filename, stats) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.workerPath, filepath, filename], {
        shell: true,
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({
              filename: result.filename,
              fileSize: result.fileSize,
              pageCount: result.pageCount,
              content: result.content,
              textContent: result.textContent,
              metadata: result.metadata,
            });
          } catch (e) {
            reject(new Error('Failed to parse worker output'));
          }
        } else {
          const fileSizeKB = (stats.size / 1024).toFixed(2);
          resolve({
            filename,
            fileSize: stats.size,
            pageCount: null,
            content: `PDF文档: ${filename} | 大小: ${fileSizeKB} KB | 解析失败: ${stderr || 'Unknown error'}`,
            textContent: '',
            metadata: {
              type: 'pdf',
              format: 'application/pdf',
              size: stats.size,
              sizeFormatted: `${fileSizeKB} KB`,
            },
          });
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '')
      .trim();
  }
}

module.exports = PdfsSkill;

