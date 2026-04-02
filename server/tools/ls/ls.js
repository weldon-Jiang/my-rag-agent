const executor = require('../executor');

async function execute(args, context = {}) {
  const { path: dirPath, description = '' } = args;

  console.log(`[ls tool] Listing directory: ${dirPath}`);

  try {
    const result = executor.listDirectory(dirPath);
    return result;
  } catch (error) {
    console.error(`[ls tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
