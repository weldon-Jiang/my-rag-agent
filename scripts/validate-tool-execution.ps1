# 工具执行验证脚本
# 用法: .\validate-tool-execution.ps1 -ToolName <string> [-ToolNames <array>]

param(
    [string]$ToolName = "",
    [string[]]$ToolNames = @(),
    [string]$BaseURL = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

function Test-ToolExecution {
    param([string]$Name, [string]$Query)

    $url = "$BaseURL/api/chat"
    $body = @{
        query = $Query
        mode = "chat"
    }

    $result = @{
        Tool = $Name
        Success = $false
        Response = ""
        Error = ""
    }

    try {
        Write-Host "    测试: $Name" -ForegroundColor Cyan
        $response = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json) -TimeoutSec 30 -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json

        if ($data.success) {
            $result.Success = $true
            $result.Response = $data.response.Substring(0, [Math]::Min(100, $data.response.Length))
            Write-Host "    [OK] 执行成功" -ForegroundColor Green
        } else {
            $result.Error = $data.error
            Write-Host "    [FAIL] 执行失败: $($data.error)" -ForegroundColor Red
        }
    } catch {
        $result.Error = $_.Exception.Message
        Write-Host "    [ERROR] 请求失败: $($result.Error)" -ForegroundColor Red
    }

    return $result
}

function Get-ToolTestQuery {
    param([string]$Name)

    # 根据工具名称返回测试查询
    $queries = @{
        "cat_image" = "给我一张猫咪图片"
        "dog_api" = "给我一张狗狗图片"
        "anime_image" = "给我一张动漫图片"
        "wallpaper" = "给我一张壁纸"
        "random_user" = "生成一个随机用户"
        "quotes" = "给我一句名言"
        "cat_facts" = "告诉我一个猫的知识"
        "qrcode" = "生成一个二维码 https://example.com"
        "weather" = "北京天气怎么样"
        "random_image" = "给我一张随机图片"
    }

    return $queries[$Name]
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "工具执行验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$toolsToTest = @()

if ($ToolName) {
    $toolsToTest += $ToolName
}

if ($ToolNames -and $ToolNames.Count -gt 0) {
    $toolsToTest += $ToolNames
}

if ($toolsToTest.Count -eq 0) {
    Write-Host "[ERROR] 请指定要验证的工具名称 (-ToolName 或 -ToolNames)" -ForegroundColor Red
    Write-Host ""
    Write-Host "可用工具示例:" -ForegroundColor Yellow
    Write-Host "  - cat_image" -ForegroundColor White
    Write-Host "  - dog_api" -ForegroundColor White
    Write-Host "  - anime_image" -ForegroundColor White
    Write-Host "  - wallpaper" -ForegroundColor White
    Write-Host "  - weather" -ForegroundColor White
    Write-Host "  - quotes" -ForegroundColor White
    Write-Host "  - cat_facts" -ForegroundColor White
    Write-Host "  - qrcode" -ForegroundColor White
    Write-Host "  - random_user" -ForegroundColor White
    Write-Host "  - random_image" -ForegroundColor White
    exit 1
}

Write-Host "将验证 $($toolsToTest.Count) 个工具..." -ForegroundColor Cyan
Write-Host ""

$results = @()
$successCount = 0
$failCount = 0

foreach ($tool in $toolsToTest) {
    Write-Host "[$tool]" -ForegroundColor Magenta
    $query = Get-ToolTestQuery -Name $tool
    if (-not $query) {
        $query = "测试 $tool"
        Write-Host "    [WARN] 没有预设查询，使用默认测试" -ForegroundColor Yellow
    } else {
        Write-Host "    查询: $query" -ForegroundColor Gray
    }

    $result = Test-ToolExecution -Name $tool -Query $query
    $results += $result

    if ($result.Success) { $successCount++ } else { $failCount++ }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "验证结果汇总" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "成功: $successCount" -ForegroundColor Green
Write-Host "失败: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "失败的工具:" -ForegroundColor Red
    foreach ($r in $results) {
        if (-not $r.Success) {
            Write-Host "  - $($r.Tool): $($r.Error)" -ForegroundColor Red
        }
    }
}

exit $(if ($failCount -gt 0) { 1 } else { 0 })
