const BaseSkill = require('../base-skill');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

class VideosSkill extends BaseSkill {
  constructor(options = {}) {
    super({
      name: 'videos-skill',
      description: '视频内容理解技能 - 利用多模态AI模型提取视频关键帧、分析场景和生成描述',
      version: '1.0.0',
      supportedTypes: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'],
      ...options,
    });

    this.maxVideoSize = options.maxVideoSize || 100 * 1024 * 1024;
    this.maxFrames = options.maxFrames || 10;
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
      if (stats.size > this.maxVideoSize) {
        return {
          success: false,
          error: `视频大小超过限制 (${this.maxVideoSize / 1024 / 1024}MB)`,
          skill: this.name,
        };
      }

      const videoInfo = await this.getVideoInfo(filepath, filename);
      const analysisResult = await this.analyzeVideo(videoInfo, context);

      return {
        success: true,
        skill: this.name,
        filename,
        fileSize: stats.size,
        duration: videoInfo.duration,
        format: videoInfo.format,
        content: analysisResult.content,
        scenes: analysisResult.scenes,
        keyFrames: analysisResult.keyFrames || [],
        metadata: videoInfo.metadata,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`${this.name} 处理视频失败:`, error);
      return {
        success: false,
        error: error.message,
        skill: this.name,
      };
    }
  }

  async getVideoInfo(filepath, filename) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');

    return {
      filename,
      format: ext,
      duration: null,
      metadata: {
        type: 'video',
        codec: ext,
      },
    };
  }

  async analyzeVideo(videoInfo, context) {
    const { model, apiKey, baseURL } = context;

    if (!model || !apiKey) {
      return {
        content: `视频文件: ${videoInfo.filename}`,
        scenes: [],
        keyFrames: [],
      };
    }

    const prompt = `请分析这个视频的内容，包括：
1. 视频的主题和类型
2. 视频的主要场景和环境
3. 视频中出现的关键对象或人物
4. 视频的整体节奏和风格
5. 视频的重要片段或高潮部分

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
              type: 'text',
              text: `[视频文件信息]
文件名: ${videoInfo.filename}
格式: ${videoInfo.format}
时长: ${videoInfo.duration || '未知'}

注：由于无法直接处理视频帧，请基于视频文件信息进行分析。如果需要更详细的分析，请提供视频的关键帧截图。`,
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
        content,
        scenes: this.extractScenes(content),
        keyFrames: [],
      };
    } catch (error) {
      console.error('调用AI模型失败:', error.message);
      return {
        content: `视频文件: ${videoInfo.filename} (AI分析失败: ${error.message})`,
        scenes: [],
        keyFrames: [],
      };
    }
  }

  extractScenes(content) {
    const scenes = [];
    const sentences = content.split(/[.。！？!?]/).filter((s) => s.trim());

    sentences.slice(0, 5).forEach((sentence, index) => {
      if (sentence.trim()) {
        scenes.push({
          index: index + 1,
          description: sentence.trim(),
        });
      }
    });

    return scenes;
  }
}

module.exports = VideosSkill;

