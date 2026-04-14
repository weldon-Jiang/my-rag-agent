function sanitizeArgs(args) {
  if (!args) return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(args)) {
    if (key === 'password' || key === 'token' || key === 'secret' || key === 'api_key') {
      sanitized[key] = '***';
    } else if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '...';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function logToolExecution(toolName, args, result, duration) {
  const status = result.success ? '成功' : '失败';
  console.log(`[工具] ${toolName} - ${status} (${duration}ms)`);
}

function logToolStart(toolName, args) {
  console.log(`[工具] 开始执行: ${toolName}`);
}

function logToolEnd(toolName, result) {
  console.log(`[工具] 执行完成: ${toolName}`);
}

function categorizeError(error, toolName) {
  let code = 'UNKNOWN';
  let recoverable = false;

  if (error.message.includes('ENOENT') || error.message.includes('not found')) {
    code = 'FILE_NOT_FOUND';
  } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
    code = 'PERMISSION_DENIED';
  } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
    code = 'TIMEOUT';
    recoverable = true;
  } else if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
    code = 'NETWORK_ERROR';
    recoverable = true;
  } else if (error.message.includes('validation') || error.message.includes('invalid')) {
    code = 'VALIDATION_ERROR';
  }

  return { code, recoverable };
}

module.exports = {
  sanitizeArgs,
  logToolExecution,
  logToolStart,
  logToolEnd,
  categorizeError
};
