const executor = require('../executor');

async function execute(args, context = {}) {
  const { path: dirPath, description = '' } = args;

  console.log(`[工具] ls: ${dirPath}`);

  try {
    const result = executor.listDirectory(dirPath);
    return result;
  } catch (error) {
    console.error(`[工具] ls 错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
