# 工具执行测试脚本
# 用法: .\test-tool.ps1 -Query <string> [-Queries <array>]

param(
    [string]$Query = "",
    [string[]]$Queries = @(),
    [string]$BaseURL = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

function Test-ToolViaChat {
    param([string]$UserQuery)

    $url = "$BaseURL/api/chat"
    $body = @{
        query = $UserQuery
        mode = "chat"
    }

    Write-Host "Query: $UserQuery" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray

    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json) -TimeoutSec 60
        $data = $response.Content | ConvertFrom-Json

        if ($data.success) {
            Write-Host "[OK] Success" -ForegroundColor Green
            Write-Host "Response: $($data.response.Substring(0, [Math]::Min(200, $data.response.Length)))..." -ForegroundColor White
            if ($data.response.Length -gt 200) {
                Write-Host ""
            }
        } else {
            Write-Host "[FAIL] Error: $($data.error)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "工具执行测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$queriesToTest = @()

if ($Query) {
    $queriesToTest += $Query
}

if ($Queries -and $Queries.Count -gt 0) {
    $queriesToTest += $Queries
}

if ($queriesToTest.Count -eq 0) {
    # 默认测试查询
    $queriesToTest = @(
        "给我一张猫咪图片"
        "北京天气怎么样"
        "给我一句名言"
        "生成一个随机用户"
    )
    Write-Host "[INFO] 使用默认测试查询" -ForegroundColor Yellow
    Write-Host ""
}

foreach ($q in $queriesToTest) {
    Test-ToolViaChat -UserQuery $q
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
