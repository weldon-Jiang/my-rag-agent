# 项目启动脚本 - Python FastAPI 后端
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  本地知识库智能体 - Python FastAPI 后端" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PORT = 3030
$PYTHON_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PYTHON_SERVER_DIR = Join-Path $PYTHON_DIR "server-python"

# 检查端口是否被占用
Write-Host "检查端口 $PORT 是否被占用..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess

if ($processes) {
    Write-Host "发现端口 $PORT 被以下进程占用:" -ForegroundColor Red
    foreach ($pid in $processes) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  - PID: $pid, 进程名: $($proc.ProcessName)" -ForegroundColor Red
            } else {
                Write-Host "  - PID: $pid (进程已不存在)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  - PID: $pid" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "正在终止占用端口的进程..." -ForegroundColor Yellow
    foreach ($pid in $processes) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] 已终止进程 PID: $pid" -ForegroundColor Green
        } catch {
            Write-Host "  [X] 终止进程 PID: $pid 失败" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "等待3秒让端口释放..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
} else {
    Write-Host "端口 $PORT 可用" -ForegroundColor Green
}

# 检查 Python 依赖
Write-Host ""
Write-Host "检查 Python 依赖..." -ForegroundColor Yellow
python -c "import fastapi, uvicorn, pydantic" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  缺少 Python 依赖，正在安装..." -ForegroundColor Yellow
    pip install -r "$PYTHON_SERVER_DIR\requirements.txt"
} else {
    Write-Host "  [OK] Python 依赖已安装" -ForegroundColor Green
}

Write-Host ""
Write-Host "启动 Python FastAPI 服务器..." -ForegroundColor Cyan
Write-Host ""

# 启动 Python 服务器
Set-Location $PYTHON_SERVER_DIR
python -m uvicorn main:app --host 0.0.0.0 --port $PORT --reload

# 当服务器停止时恢复原目录
Set-Location $PYTHON_DIR
Write-Host ""
Write-Host "服务器已停止" -ForegroundColor Yellow
