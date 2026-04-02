# API 接口验证脚本
# 用法: .\validate-api.ps1 [-Endpoint <string>]

param(
    [string]$Endpoint = "",
    [string]$BaseURL = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

function Test-APIEndpoint {
    param([string]$Path, [string]$Method = "GET", [object]$Body = $null)

    $url = "$BaseURL$Path"
    $result = @{
        Path = $Path
        Method = $Method
        Success = $false
        StatusCode = 0
        Error = ""
    }

    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Body ($Body | ConvertTo-Json) -TimeoutSec 10 -ErrorAction Stop
        }
        $result.StatusCode = $response.StatusCode
        $result.Success = $response.StatusCode -ge 200 -and $response.StatusCode -lt 300

        if ($result.Success) {
            Write-Host "[OK] $Method $Path - Status: $($result.StatusCode)" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] $Method $Path - Status: $($result.StatusCode)" -ForegroundColor Red
        }
    } catch {
        $result.Error = $_.Exception.Message
        Write-Host "[ERROR] $Method $Path - $($result.Error)" -ForegroundColor Red
    }

    return $result
}

# API 端点定义
$endpoints = @(
    @{ Path = "/api/skills"; Method = "GET" },
    @{ Path = "/api/models"; Method = "GET" },
    @{ Path = "/api/files"; Method = "GET" }
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API 接口验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Endpoint) {
    $endpoints = $endpoints | Where-Object { $_.Path -eq $Endpoint }
    if (-not $endpoints) {
        Write-Host "[ERROR] 指定的端点 $Endpoint 不在验证列表中" -ForegroundColor Red
        exit 1
    }
}

$results = @()
foreach ($ep in $endpoints) {
    $results += Test-APIEndpoint -Path $ep.Path -Method $ep.Method
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "验证结果汇总" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$successCount = ($results | Where-Object { $_.Success }).Count
$failCount = ($results | Where-Object { -not $_.Success }).Count

Write-Host "成功: $successCount" -ForegroundColor Green
Write-Host "失败: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

exit $(if ($failCount -gt 0) { 1 } else { 0 })
