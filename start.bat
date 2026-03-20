@echo off
chcp 65001 >nul
echo ========================================
echo   本地知识库智能体 - 启动脚本
echo ========================================
echo.

set PORT=3000

echo 检查端口 %PORT% 是否被占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
    echo 发现端口 %PORT% 被进程 %%a 占用，正在终止...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo 等待2秒让端口释放...
timeout /t 2 /nobreak >nul

echo.
echo 启动服务器...
echo.

npm start

pause
