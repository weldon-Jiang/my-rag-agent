const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_DIR = path.join(__dirname, 'test-multimedia');

function log(message, type = 'info') {
  const prefix = {
    info: '[INFO]',
    success: '[PASS]',
    error: '[FAIL]',
    warn: '[WARN]',
  };
  console.log(`${prefix[type] || '[INFO]'} ${message}`);
}

async function ensureTestDir() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    log(`创建测试目录: ${TEST_DIR}`);
  }
}

async function createTestFiles() {
  await ensureTestDir();

  const testFiles = [
    {
      name: 'test-image.txt',
      content: '这是一个图片描述测试文件，包含关于图片内容的描述信息。',
    },
    {
      name: 'test-video.txt',
      content: '这是一个视频内容描述测试文件，包含关于视频场景和内容的描述。',
    },
    {
      name: 'test-pdf.txt',
      content: '这是一个PDF文档描述测试文件，包含关于文档结构和内容的描述。',
    },
  ];

  for (const file of testFiles) {
    const filePath = path.join(TEST_DIR, file.name);
    fs.writeFileSync(filePath, file.content);
    log(`创建测试文件: ${file.name}`);
  }
}

async function cleanupTestFiles() {
  if (fs.existsSync(TEST_DIR)) {
    const files = fs.readdirSync(TEST_DIR);
    for (const file of files) {
      const filePath = path.join(TEST_DIR, file);
      fs.unlinkSync(filePath);
      log(`删除测试文件: ${file}`);
    }
  }
}

async function testSkillsRegistration() {
  log('测试 1: 技能系统注册');
  try {
    const response = await axios.get(`${BASE_URL}/api/skills`);
    const { success, skills, supportedExtensions } = response.data;

    if (success && skills.length === 3) {
      log(`成功注册 ${skills.length} 个技能`, 'success');
      skills.forEach(skill => {
        log(`  - ${skill.name}: ${skill.description}`, 'info');
      });
      return true;
    }
    log('技能注册数量不正确', 'error');
    return false;
  } catch (error) {
    log(`技能注册测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testSupportedExtensions() {
  log('测试 2: 支持的文件扩展名');
  try {
    const response = await axios.get(`${BASE_URL}/api/skills`);
    const { supportedExtensions } = response.data;

    const expectedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
      '.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv',
      '.pdf'
    ];

    let allSupported = true;
    for (const ext of expectedExtensions) {
      if (supportedExtensions.includes(ext)) {
        log(`  ✓ ${ext}`, 'success');
      } else {
        log(`  ✗ ${ext} (缺失)`, 'error');
        allSupported = false;
      }
    }

    return allSupported;
  } catch (error) {
    log(`扩展名测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testProcessEndpoint() {
  log('测试 3: 技能处理接口 (无效请求)');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/skills/process`,
      {},
      { validateStatus: () => true }
    );

    if (response.status === 400 && response.data.success === false) {
      log('无效请求正确返回 400', 'success');
      return true;
    }
    log(`响应状态: ${response.status}`, 'error');
    return false;
  } catch (error) {
    log(`处理接口测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testSkillProcessWithKnowledge() {
  log('测试 4: 知识库集成技能处理');
  try {
    await createTestFiles();

    const knowledgeDir = path.join(__dirname, 'knowledge');
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    const testContent = '测试图片内容和视频场景描述';
    const testFile = path.join(knowledgeDir, 'multimedia-test.txt');
    fs.writeFileSync(testFile, testContent);

    const response = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        query: '测试',
        mode: 'knowledge',
        model: 'minimax-m2.5',
      },
      { validateStatus: () => true }
    );

    if (response.status === 200) {
      log('知识库查询接口正常', 'success');
      if (response.data.knowledgeResults) {
        log(`找到 ${response.data.knowledgeResults.length} 个相关结果`, 'info');
      }
    }

    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    await cleanupTestFiles();

    return true;
  } catch (error) {
    log(`知识库集成测试失败: ${error.message}`, 'error');
    await cleanupTestFiles();
    return false;
  }
}

async function testSkillBaseClass() {
  log('测试 5: 技能基类功能');
  try {
    const BaseSkill = require('./server/skills/base-skill');

    class TestSkill extends BaseSkill {
      constructor() {
        super({
          name: 'test-skill',
          description: '测试技能',
          version: '1.0.0',
          supportedTypes: ['.test'],
        });
      }

      async process(file, context) {
        return { success: true, processed: true };
      }
    }

    const skill = new TestSkill();

    if (skill.name === 'test-skill' && skill.supports('.test')) {
      log('技能基类功能正常', 'success');
      return true;
    }

    log('技能基类功能异常', 'error');
    return false;
  } catch (error) {
    log(`技能基类测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function testSkillsCenterDirect() {
  log('测试 6: SkillsCenter 直接调用');
  try {
    const skillsCenter = require('./server/skills');

    const allSkills = skillsCenter.getAllSkillsInfo();
    log(`SkillsCenter 包含 ${allSkills.length} 个技能`, 'info');

    const imageSkill = skillsCenter.get('images-skill');
    if (imageSkill && imageSkill.name === 'images-skill') {
      log('成功获取 images-skill', 'success');
    }

    const pdfSkill = skillsCenter.get('pdfs-skill');
    if (pdfSkill && pdfSkill.name === 'pdfs-skill') {
      log('成功获取 pdfs-skill', 'success');
    }

    const videoSkill = skillsCenter.get('videos-skill');
    if (videoSkill && videoSkill.name === 'videos-skill') {
      log('成功获取 videos-skill', 'success');
    }

    return true;
  } catch (error) {
    log(`SkillsCenter 直接测试失败: ${error.message}`, 'error');
    return false;
  }
}

async function runAllTests() {
  log('='.repeat(50));
  log('多模态文档 Skills 测试脚本');
  log('='.repeat(50));
  log(`测试地址: ${BASE_URL}`);
  log('');

  let passed = 0;
  let total = 0;

  const tests = [
    testSkillsRegistration,
    testSupportedExtensions,
    testProcessEndpoint,
    testSkillProcessWithKnowledge,
    testSkillBaseClass,
    testSkillsCenterDirect,
  ];

  for (const test of tests) {
    total++;
    const result = await test();
    if (result) passed++;
    log('');
  }

  log('='.repeat(50));
  log(`测试结果: ${passed}/${total} 通过`);
  log('='.repeat(50));

  await cleanupTestFiles();

  return passed === total;
}

if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`测试执行失败: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = { runAllTests };