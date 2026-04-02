/**
 * 日志中间件
 * @description 记录每个HTTP请求的详细信息，包括方法、路径、耗时等
 * @module middleware/logger
 */

/**
 * 请求日志中间件
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 * @param {Function} next - 下一个中间件函数
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const { method, url } = req;

  // 请求开始时的日志
  console.log(`[${new Date().toISOString()}] --> ${method} ${url}`);

  // 响应结束后记录耗时
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    const logLevel = statusCode >= 400 ? 'ERROR' : 'INFO';
    const logSymbol = statusCode >= 400 ? '✗' : '✓';

    console.log(
      `[${new Date().toISOString()}] <-- ${method} ${url} ${statusCode} ${duration}ms ${logSymbol}`
    );

    // 错误日志额外输出
    if (statusCode >= 400) {
      console.error(`[${logLevel}] 请求失败: ${method} ${url}`, {
        status: statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
  });

  next();
}

/**
 * 格式化请求日志
 * @param {Object} req - HTTP请求对象
 * @returns {string} 格式化的日志字符串
 */
function formatRequestLog(req) {
  return {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.get('Content-Type'),
      'user-agent': req.get('User-Agent')
    },
    query: req.query,
    ip: req.ip,
    time: new Date().toISOString()
  };
}

module.exports = {
  requestLogger,
  formatRequestLog
};