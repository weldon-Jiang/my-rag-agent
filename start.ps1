# 项目启动脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  本地知识库智能体 - 启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PORT = 3000

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
            Write-Host "  ✓ 已终止进程 PID: $pid" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ 终止进程 PID: $pid 失败" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "等待2秒让端口释放..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
} else {
    Write-Host "端口 $PORT 可用" -ForegroundColor Green
}

Write-Host ""
Write-Host "启动服务器..." -ForegroundColor Cyan
Write-Host ""

# 启动服务器
npm start
