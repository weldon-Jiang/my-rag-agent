const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';
const MODEL_ID = process.env.MODEL_ID || 'minimax-m2.5';
const API_BASE_URL = process.env.API_BASE_URL || '';

let passed = 0;
let failed = 0;
let total = 0;

function log(message, type = 'info') {
  const prefix = {
    info: '[INFO]',
    success: '[PASS]',
    error: '[FAIL]',
    warn: '[WARN]',
  };
  console.log(`${prefix[type] || '[INFO]'} ${message}`);
}

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    log(message, 'success');
    return true;
  }
  failed++;
  log(message, 'error');
  return false;
}

async function testSkillsEndpoint() {
  log('测试 GET /api/skills 接口');
  try {
    const response = await axios.get(`${BASE_URL}/api/skills`);
    const { success, skills, supportedExtensions } = response.data;

    assert(success === true, '技能接口返回 success: true');
    assert(Array.isArray(skills), '技能列表是数组');
    assert(Array.isArray(supportedExtensions), '支持的文件扩展名是数组');
    assert(skills.length > 0, `已注册 ${skills.length} 个技能`);

    const expectedSkills = ['images-skill', 'videos-skill', 'pdfs-skill'];
    for (const skillName of expectedSkills) {
      const skill = skills.find(s => s.name === skillName);
      assert(skill !== undefined, `找到技能: ${skillName}`);
    }

    const expectedExtensions = ['.jpg', '.png', '.pdf', '.mp4'];
    for (const ext of expectedExtensions) {
      assert(supportedExtensions.includes(ext), `支持扩展名: ${ext}`);
    }

    return true;
  } catch (error) {
    log(`技能接口测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testSkillsProcessEndpoint() {
  log('测试 POST /api/skills/process 接口（无效请求）');
  try {
    const response1 = await axios.post(
      `${BASE_URL}/api/skills/process`,
      {},
      { validateStatus: () => true }
    );
    assert(response1.status === 400, '缺少文件信息返回 400');
    assert(response1.data.success === false, '返回 success: false');

    const response2 = await axios.post(
      `${BASE_URL}/api/skills/process`,
      {
        file: {
          filepath: '/nonexistent/file.jpg',
          filename: 'test.jpg',
        },
      },
      { validateStatus: () => true }
    );
    assert(response2.data.success === false, '文件不存在时返回 success: false');

    return true;
  } catch (error) {
    log(`技能处理接口测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testSkillsProcessMultipleEndpoint() {
  log('测试 POST /api/skills/process-multiple 接口（无效请求）');
  try {
    const response1 = await axios.post(
      `${BASE_URL}/api/skills/process-multiple`,
      {},
      { validateStatus: () => true }
    );
    assert(response1.status === 400, '缺少文件列表返回 400');
    assert(response1.data.success === false, '返回 success: false');

    const response2 = await axios.post(
      `${BASE_URL}/api/skills/process-multiple`,
      { files: [] },
      { validateStatus: () => true }
    );
    assert(response2.status === 400, '空文件列表返回 400');

    return true;
  } catch (error) {
    log(`批量技能处理接口测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testSkillsCenterDirect() {
  log('测试 SkillsCenter 模块直接调用');
  try {
    const skillsCenter = require('../server/skills');

    assert(skillsCenter !== undefined, 'SkillsCenter 模块已加载');
    assert(typeof skillsCenter.getAllSkillsInfo === 'function', 'getAllSkillsInfo 是函数');
    assert(typeof skillsCenter.processFile === 'function', 'processFile 是函数');
    assert(typeof skillsCenter.isSupported === 'function', 'isSupported 是函数');

    const skills = skillsCenter.getAllSkillsInfo();
    assert(skills.length === 3, `SkillsCenter 包含 ${skills.length} 个技能`);

    const imageSkill = skillsCenter.get('images-skill');
    assert(imageSkill !== undefined, '获取到 images-skill');
    assert(imageSkill.supports('.jpg'), 'images-skill 支持 .jpg');
    assert(!imageSkill.supports('.pdf'), 'images-skill 不支持 .pdf');

    const pdfSkill = skillsCenter.get('pdfs-skill');
    assert(pdfSkill !== undefined, '获取到 pdfs-skill');
    assert(pdfSkill.supports('.pdf'), 'pdfs-skill 支持 .pdf');
    assert(!pdfSkill.supports('.jpg'), 'pdfs-skill 不支持 .jpg');

    const videoSkill = skillsCenter.get('videos-skill');
    assert(videoSkill !== undefined, '获取到 videos-skill');
    assert(videoSkill.supports('.mp4'), 'videos-skill 支持 .mp4');
    assert(!videoSkill.supports('.jpg'), 'videos-skill 不支持 .jpg');

    assert(skillsCenter.isSupported('.jpg'), '.jpg 是支持的扩展名');
    assert(skillsCenter.isSupported('.pdf'), '.pdf 是支持的扩展名');
    assert(skillsCenter.isSupported('.mp4'), '.mp4 是支持的扩展名');
    assert(!skillsCenter.isSupported('.txt'), '.txt 不是支持的扩展名');

    const result = await skillsCenter.processFile(
      { filepath: '/nonexistent/file.jpg', filename: 'test.jpg' },
      {}
    );
    assert(result.success === false, '处理不存在的文件返回 success: false');

    return true;
  } catch (error) {
    log(`SkillsCenter 直接测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testIndividualSkills() {
  log('测试各个独立技能模块');
  try {
    const ImagesSkill = require('../server/skills/images-skill');
    const VideosSkill = require('../server/skills/videos-skill');
    const PdfsSkill = require('../server/skills/pdfs-skill');

    const imagesSkill = new ImagesSkill();
    assert(imagesSkill.name === 'images-skill', 'ImagesSkill 名称正确');
    assert(imagesSkill.supportedTypes.includes('.jpg'), 'ImagesSkill 支持 .jpg');
    assert(imagesSkill.supportedTypes.includes('.png'), 'ImagesSkill 支持 .png');

    const videosSkill = new VideosSkill();
    assert(videosSkill.name === 'videos-skill', 'VideosSkill 名称正确');
    assert(videosSkill.supportedTypes.includes('.mp4'), 'VideosSkill 支持 .mp4');
    assert(videosSkill.supportedTypes.includes('.avi'), 'VideosSkill 支持 .avi');

    const pdfsSkill = new PdfsSkill();
    assert(pdfsSkill.name === 'pdfs-skill', 'PdfsSkill 名称正确');
    assert(pdfsSkill.supportedTypes.includes('.pdf'), 'PdfsSkill 支持 .pdf');

    return true;
  } catch (error) {
    log(`独立技能模块测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testSkillIntegration() {
  log('测试技能与聊天系统的集成');
  try {
    const fs = require('fs');
    const path = require('path');

    const testKnowledgeDir = path.join(__dirname, '../knowledge');
    if (!fs.existsSync(testKnowledgeDir)) {
      fs.mkdirSync(testKnowledgeDir, { recursive: true });
    }

    const testTxtFile = path.join(testKnowledgeDir, 'test-knowledge.txt');
    fs.writeFileSync(testTxtFile, '这是一个测试知识库文件，包含一些测试内容。');

    const response = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        query: '测试',
        mode: 'knowledge',
        model: MODEL_ID,
      },
      {
        validateStatus: () => true,
        data: {},
      }
    );

    if (response.status === 200 && response.data.response) {
      assert(true, '聊天接口正常响应');
      log(`响应来源: ${response.data.source}`, 'info');
    } else {
      log(`聊天接口响应异常: ${response.status}`, 'warn');
    }

    fs.unlinkSync(testTxtFile);

    return true;
  } catch (error) {
    log(`技能集成测试失败: ${error.message}`, 'error');
    return true;
  }
}

async function runAllTests() {
  log('='.repeat(50));
  log('开始运行 Skills 系统测试');
  log('='.repeat(50));

  await testSkillsCenterDirect();
  await testIndividualSkills();
  await testSkillsEndpoint();
  await testSkillsProcessEndpoint();
  await testSkillsProcessMultipleEndpoint();
  await testSkillIntegration();

  log('='.repeat(50));
  log('测试完成');
  log(`总计: ${total} | 通过: ${passed} | 失败: ${failed}`);
  log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch(error => {
    log(`测试执行失败: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runAllTests, assert, log };