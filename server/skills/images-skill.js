const BaseSkill = require('./base-skill');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Tesseract = require('tesseract.js');

class ImagesSkill extends BaseSkill {
  constructor(options = {}) {
    super({
      name: 'images-skill',
      description: '图片识别检索技能 - 利用本地OCR和AI模型提取图像内容、识别文字和理解场景',
      version: '1.1.0',
      supportedTypes: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
      ...options,
    });

    this.maxImageSize = options.maxImageSize || 10 * 1024 * 1024;
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
      if (stats.size > this.maxImageSize) {
        return {
          success: false,
          error: `图片大小超过限制 (${this.maxImageSize / 1024 / 1024}MB)`,
          skill: this.name,
        };
      }

      const ocrResult = await this.extractImageContent(filepath, filename, context);

      return {
        success: true,
        skill: this.name,
        filename,
        fileSize: stats.size,
        content: ocrResult.content,
        textContent: ocrResult.textContent,
        metadata: ocrResult.metadata,
        tags: ocrResult.tags || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`${this.name} 处理图片失败:`, error);
      return {
        success: false,
        error: error.message,
        skill: this.name,
      };
    }
  }

  async extractImageContent(filepath, filename, context) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mimeType = this.getMimeType(ext);

    const localOcrResult = await this.performLocalOCR(filepath, mimeType);

    if (context.model && context.apiKey && context.baseURL) {
      try {
        const aiResult = await this.extractImageContentAI(filepath, mimeType, filename, context);
        const combinedContent = this.combineOCRResults(localOcrResult, aiResult);
        return combinedContent;
      } catch (error) {
        console.info('AI模型不可用，使用本地OCR结果');
        return localOcrResult;
      }
    }

    return localOcrResult;
  }

  async performLocalOCR(filepath, mimeType) {
    try {
      console.log(`[${this.name}] 使用本地OCR识别图片...`);

      const result = await Tesseract.recognize(filepath, 'eng+chi_sim', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[${this.name}] OCR进度: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const text = result.data.text || '';
      const confidence = result.data.confidence || 0;

      const cleanedText = this.cleanText(text);

      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const description = lines.length > 0
        ? `图片文字内容：${lines.slice(0, 10).join(' | ')}${lines.length > 10 ? '...' : ''}`
        : '图片中未识别到文字';

      return {
        content: description,
        textContent: cleanedText,
        metadata: {
          type: 'image',
          format: mimeType,
          ocrEngine: 'tesseract',
          ocrConfidence: confidence,
          wordCount: lines.length,
        },
        tags: this.extractTags(cleanedText),
      };
    } catch (error) {
      console.error(`[${this.name}] 本地OCR失败:`, error);
      return {
        content: `图片文件: ${filename} (本地OCR失败: ${error.message})`,
        textContent: '',
        metadata: {
          type: 'image',
          format: mimeType,
          ocrEngine: 'tesseract',
          error: error.message,
        },
        tags: [],
      };
    }
  }

  async extractImageContentAI(filepath, mimeType, filename, context) {
    const { model, apiKey, baseURL } = context;

    const imageBuffer = fs.readFileSync(filepath);
    const base64Image = imageBuffer.toString('base64');

    const prompt = `请详细描述这张图片的内容，包括：
1. 图片的主要内容和主题
2. 图片中的文字（如果有）
3. 图片的场景和环境
4. 图片中的关键对象或人物
5. 图片的整体风格或情绪

请用中文详细描述。`;

    const requestBody = {
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.7,
    };

    try {
      const response = await axios.post(
        `${baseURL}/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          timeout: 60000,
        },
      );

      const content = response.data.choices?.[0]?.message?.content || '';

      return {
        content: content,
        textContent: content,
        metadata: {
          type: 'image',
          format: mimeType,
          ocrEngine: 'ai-multimodal',
          model: model,
        },
        tags: this.extractTags(content),
      };
    } catch (error) {
      console.info('AI图像理解不可用');
      throw error;
    }
  }

  combineOCRResults(localResult, aiResult) {
    const combinedText = [];
    if (localResult.textContent && localResult.textContent.length > 0) {
      combinedText.push(`【本地OCR识别】\n${localResult.textContent}`);
    }
    if (aiResult.textContent && aiResult.textContent.length > 0 && aiResult.textContent !== aiResult.content) {
      combinedText.push(`【AI图像理解】\n${aiResult.content}`);
    }

    return {
      content: combinedText.join('\n\n') || localResult.content,
      textContent: localResult.textContent || aiResult.textContent || '',
      metadata: {
        ...localResult.metadata,
        aiEnhanced: aiResult.metadata ? true : false,
        aiModel: aiResult.metadata?.model || null,
      },
      tags: [...(localResult.tags || []), ...(aiResult.tags || [])].filter((v, i, a) => a.indexOf(v) === i),
    };
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '')
      .trim();
  }

  extractTags(text) {
    if (!text || text.length < 2) return [];
    const keywords = [];
    const patterns = [
      /[^\s]{2,8}/g,
    ];
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        keywords.push(...matches.slice(0, 20));
      }
    });
    return [...new Set(keywords)].slice(0, 10);
  }

  getMimeType(ext) {
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}

module.exports = ImagesSkill;