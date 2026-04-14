# 意图识别测试脚本
# 用法: .\test-intent.ps1 -Queries <array>

param(
    [string[]]$Queries = @(),
    [string]$BaseURL = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

# 预设的意图测试用例
$defaultQueries = @{
    "rename_bot" = @(
        "叫我小助手",
        "以后你就叫小明",
        "你叫什么呢"
    )
    "rename_user" = @(
        "我叫张三",
        "我是你的主人",
        "以后叫我老板"
    )
    "set_relationship" = @(
        "我是你的朋友",
        "我是你的老师",
        "以后你就是我爸"
    )
    "ask_name" = @(
        "你叫什么名字",
        "你是谁",
        "你的名字是什么"
    )
    "weather" = @(
        "北京天气怎么样",
        "明天会下雨吗",
        "今天气温多少度"
    )
    "cat_image" = @(
        "给我一张猫咪图片",
        "猫的照片",
        "吸猫"
    )
    "dog_api" = @(
        "给我一张狗狗图片",
        "狗的照片",
        "汪星人"
    )
}

function Test-IntentViaChat {
    param([string]$UserQuery, [string]$ExpectedIntent)

    $url = "$BaseURL/api/chat"
    $body = @{
        query = $UserQuery
        mode = "chat"
    }

    Write-Host "Query: $UserQuery" -ForegroundColor Cyan
    if ($ExpectedIntent) {
        Write-Host "Expected: $ExpectedIntent" -ForegroundColor Gray
    }

    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json) -TimeoutSec 60
        $data = $response.Content | ConvertFrom-Json

        if ($data.success) {
            Write-Host "[OK] Response: $($data.response.Substring(0, [Math]::Min(100, $data.response.Length)))..." -ForegroundColor Green
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
Write-Host "意图识别测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$queriesToTest = @()

if ($Queries -and $Queries.Count -gt 0) {
    $queriesToTest = $Queries
} else {
    Write-Host "[INFO] 使用预设意图测试用例" -ForegroundColor Yellow
    Write-Host ""

    foreach ($intent in $defaultQueries.Keys) {
        Write-Host "[$intent]" -ForegroundColor Magenta
        foreach ($query in $defaultQueries[$intent]) {
            Test-IntentViaChat -UserQuery $query -ExpectedIntent $intent
        }
    }
}

if ($queriesToTest.Count -gt 0) {
    Write-Host "[自定义测试]" -ForegroundColor Magenta
    foreach ($q in $queriesToTest) {
        Test-IntentViaChat -UserQuery $q
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
