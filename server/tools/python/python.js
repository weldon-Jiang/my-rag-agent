const executor = require('../executor');

async function execute(args, context = {}) {
  const { code, description = '' } = args;

  console.log(`[python tool] Executing Python code`);

  try {
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'Python code is required' };
    }

    const result = await executor.executePython(code, { description });

    return {
      success: result.success,
      output: result.stdout || result.stderr,
      exitCode: result.exitCode,
      duration: result.duration
    };
  } catch (error) {
    console.error(`[python tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
