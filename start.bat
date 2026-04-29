@echo off
chcp 65001 >nul
echo ========================================
echo   本地知识库智能体 - Python FastAPI 后端
echo ========================================
echo.

set PORT=3030
set PYTHON_DIR=%~dp0
set PYTHON_SERVER_DIR=%PYTHON_DIR%server-python

echo 检查端口 %PORT% 是否被占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
    echo 发现端口 %PORT% 被进程 %%a 占用，正在终止...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo 等待3秒让端口释放...
timeout /t 3 /nobreak >nul

echo.
echo 启动 Python FastAPI 服务器...
echo.

cd /d %PYTHON_SERVER_DIR%
python -m uvicorn main:app --host 0.0.0.0 --port %PORT% --reload

pause
