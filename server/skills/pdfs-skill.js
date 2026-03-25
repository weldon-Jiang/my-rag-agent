const BaseSkill = require('./base-skill');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');

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
    try {
      const PDFParse = pdf.PDFParse;
      const pdfBuffer = fs.readFileSync(filepath);
      const parser = new PDFParse({ data: pdfBuffer });

      const pdfData = await parser.getText();
      const fileSizeKB = (stats.size / 1024).toFixed(2);

      const textContent = pdfData?.text || '';
      const cleanedText = this.cleanText(textContent);

      let summary = '';
      if (cleanedText.length > 0) {
        const firstPart = cleanedText.substring(0, 200);
        summary = firstPart + (cleanedText.length > 200 ? '...' : '');
      } else {
        summary = `PDF文档: ${filename} | 大小: ${fileSizeKB} KB`;
      }

      return {
        filename,
        fileSize: stats.size,
        pageCount: pdfData?.total || null,
        content: summary,
        textContent: cleanedText,
        metadata: {
          type: 'pdf',
          format: 'application/pdf',
          size: stats.size,
          sizeFormatted: `${fileSizeKB} KB`,
          pages: pdfData?.total || null,
        },
      };
    } catch (error) {
      console.error('PDF解析失败:', error);
      const fileSizeKB = (stats.size / 1024).toFixed(2);

      return {
        filename,
        fileSize: stats.size,
        pageCount: null,
        content: `PDF文档: ${filename} | 大小: ${fileSizeKB} KB | 解析失败: ${error.message}`,
        textContent: '',
        metadata: {
          type: 'pdf',
          format: 'application/pdf',
          size: stats.size,
          sizeFormatted: `${fileSizeKB} KB`,
          error: error.message,
        },
      };
    }
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