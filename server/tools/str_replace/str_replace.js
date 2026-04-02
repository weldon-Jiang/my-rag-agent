const executor = require('../executor');
const security = require('../security');

async function execute(args, context = {}) {
  const { path: filePath, old_str: oldStr, new_str: newStr, replace_all: replaceAll = false, description = '' } = args;

  console.log(`[str_replace tool] Replacing in: ${filePath}`);

  try {
    let convertedPath = security.convertWindowsPath(filePath);
    if (convertedPath !== filePath) {
      console.log(`[str_replace tool] Converted Windows path: ${filePath} -> ${convertedPath}`);
    }
    security.validatePath(convertedPath);
    const result = executor.strReplace(convertedPath, oldStr, newStr, { replaceAll });
    if (result.success && result.message) {
      result.message = `文件修改成功：${filePath}`;
    }
    return result;
  } catch (error) {
    console.error(`[str_replace tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
