class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp
    };
  }
}

const ErrorCodes = {
  NETWORK_ERROR: { code: 'NETWORK_ERROR', statusCode: 0, message: '网络连接失败' },
  TIMEOUT: { code: 'TIMEOUT', statusCode: 0, message: '请求超时，请稍后重试' },
  API_ERROR: { code: 'API_ERROR', statusCode: 500, message: '服务器错误' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', statusCode: 401, message: '未授权，请检查设置' },
  FORBIDDEN: { code: 'FORBIDDEN', statusCode: 403, message: '禁止访问' },
  NOT_FOUND: { code: 'NOT_FOUND', statusCode: 404, message: '资源不存在' },
  RATE_LIMIT: { code: 'RATE_LIMIT', statusCode: 429, message: '请求过于频繁，请稍后重试' },
  SESSION_NOT_FOUND: { code: 'SESSION_NOT_FOUND', statusCode: 404, message: '会话不存在' },
  INVALID_REQUEST: { code: 'INVALID_REQUEST', statusCode: 400, message: '无效请求' },
  AI_SERVICE_ERROR: { code: 'AI_SERVICE_ERROR', statusCode: 503, message: 'AI 服务暂时不可用' },
  UNKNOWN: { code: 'UNKNOWN_ERROR', statusCode: 500, message: '未知错误' }
};

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.toastContainer = null;
    this._initToastContainer();
  }

  _initToastContainer() {
    if (typeof document !== 'undefined' && !this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);

      const style = document.createElement('style');
      style.textContent = `
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          min-width: 280px;
          max-width: 400px;
          animation: slideIn 0.3s ease;
        }
        .toast.fade-out {
          animation: fadeOut 0.3s ease forwards;
        }
        .toast-error { border-left: 4px solid #ef4444; }
        .toast-success { border-left: 4px solid #22c55e; }
        .toast-info { border-left: 4px solid #3b82f6; }
        .toast-warning { border-left: 4px solid #f59e0b; }
        .toast-icon { font-size: 18px; }
        .toast-message { flex: 1; font-size: 14px; color: #333; }
        .toast-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #999;
          padding: 0;
        }
        .toast-close:hover { color: #333; }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  _createToast(message, type = 'error', duration = 4000) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleApiError(response, fallbackMessage = '请求失败') {
    const errorInfo = this.getErrorInfo(response);
    const error = new AppError(
      errorInfo.message || fallbackMessage,
      errorInfo.code,
      errorInfo.statusCode
    );

    this.log(error);
    this._createToast(error.message, 'error');

    return error;
  }

  getErrorInfo(response) {
    if (!response) {
      return ErrorCodes.NETWORK_ERROR;
    }

    if (response instanceof Error) {
      if (response.name === 'AbortError' || response.message.includes('timeout')) {
        return { ...ErrorCodes.TIMEOUT };
      }
      return { ...ErrorCodes.NETWORK_ERROR, message: response.message };
    }

    const statusCode = response.status || 0;

    if (statusCode === 0) {
      return ErrorCodes.NETWORK_ERROR;
    }

    if (statusCode === 401) return ErrorCodes.UNAUTHORIZED;
    if (statusCode === 403) return ErrorCodes.FORBIDDEN;
    if (statusCode === 404) return ErrorCodes.NOT_FOUND;
    if (statusCode === 429) return ErrorCodes.RATE_LIMIT;
    if (statusCode >= 500) return ErrorCodes.API_ERROR;

    return { code: 'HTTP_ERROR', statusCode, message: response.message || '请求失败' };
  }

  log(error) {
    const errorEntry = {
      error: error.toJSON ? error.toJSON() : {
        message: error.message,
        code: error.code || 'UNKNOWN',
        statusCode: error.statusCode || 500
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now()
    };

    this.errors.unshift(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    console.error('[ErrorHandler]', errorEntry);
    return errorEntry;
  }

  getErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }

  showSuccess(message, duration = 2000) {
    this._createToast(message, 'success', duration);
  }

  showWarning(message, duration = 3000) {
    this._createToast(message, 'warning', duration);
  }

  showInfo(message, duration = 3000) {
    this._createToast(message, 'info', duration);
  }
}

const errorHandler = new ErrorHandler();

async function apiRequest(url, options = {}) {
  const defaultOptions = {
    timeout: 30000,
    retries: 2,
    retryDelay: 1000,
    ...options
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);

  try {
    let lastError;
    for (let i = 0; i <= defaultOptions.retries; i++) {
      try {
        const fetchOptions = { ...defaultOptions };
        delete fetchOptions.retries;
        delete fetchOptions.retryDelay;
        delete fetchOptions.timeout;

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = errorHandler.handleApiError(response);
          throw error;
        }

        return await response.json();
      } catch (e) {
        lastError = e;
        if (i < defaultOptions.retries && !(e instanceof AppError) && !(e.name === 'AbortError')) {
          await new Promise(r => setTimeout(r, defaultOptions.retryDelay * (i + 1)));
          continue;
        }
        throw e;
      }
    }
    throw lastError;
  } catch (e) {
    clearTimeout(timeoutId);
    if (!(e instanceof AppError)) {
      errorHandler.handleApiError(e);
    }
    throw e;
  }
}

window.AppError = AppError;
window.ErrorCodes = ErrorCodes;
window.ErrorHandler = ErrorHandler;
window.errorHandler = errorHandler;
window.apiRequest = apiRequest;