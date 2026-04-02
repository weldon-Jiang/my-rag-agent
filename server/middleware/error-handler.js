/**
 * 错误处理中间件
 * @description 统一处理所有未捕获的错误，返回格式化的错误响应
 * @module middleware/error-handler
 */

/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 * @param {Function} next - 下一个中间件函数
 */
function errorHandler(err, req, res, next) {
  console.error('[ErrorHandler] 全局错误:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // 判断错误类型
  const statusCode = err.statusCode || err.status || 500;
  const errorMessage = err.message || '服务器内部错误';

  // 生产环境不返回详细错误信息
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: {
      message: isProduction && statusCode === 500 ? '服务器内部错误' : errorMessage,
      code: err.code || 'INTERNAL_ERROR',
      ...(isProduction ? {} : { stack: err.stack })
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * 404 处理中间件
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `接口不存在: ${req.method} ${req.url}`,
      code: 'NOT_FOUND'
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * 异步错误包装器
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 创建自定义错误
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @returns {Error} 自定义错误对象
 */
function createError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError
};