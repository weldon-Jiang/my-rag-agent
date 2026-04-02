# API 接口测试脚本
# 用法: .\test-api.ps1 -Endpoint <string> [-Method <string>] [-Body <hashtable>]

param(
    [Parameter(Mandatory=$true)]
    [string]$Endpoint,

    [string]$Method = "GET",

    [hashtable]$Body = $null,

    [string]$BaseURL = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Invoke-APIRequest {
    param(
        [string]$Url,
        [string]$Method,
        [object]$Body
    )

    $params = @{
        Uri = $Url
        Method = $Method
        ContentType = "application/json"
        TimeoutSec = 30
    }

    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        Write-Host "[$Method] $Url" -ForegroundColor Cyan
        if ($Body) {
            Write-Host "Body: $($params.Body)" -ForegroundColor Gray
        }

        $response = Invoke-WebRequest @params
        $data = $response.Content | ConvertFrom-Json

        Write-Host "[OK] Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Yellow
        $data | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White

        return $data
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

$url = "$BaseURL$Endpoint"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API 测试: $Endpoint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$result = Invoke-APIRequest -Url $url -Method $Method -Body $Body

if ($result) {
    exit 0
} else {
    exit 1
}
