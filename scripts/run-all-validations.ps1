# 运行所有验证脚本
# 用法: .\run-all-validations.ps1

param(
    [switch]$SkipComments,
    [string]$BaseURL = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "$Title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Invoke-ValidationScript {
    param([string]$ScriptPath, [string]$Name, [string[]]$Args = @())

    Write-Section "$Name"

    $fullPath = Join-Path $ScriptDir $ScriptPath
    if (-not (Test-Path $fullPath)) {
        Write-Host "[ERROR] 脚本不存在: $fullPath" -ForegroundColor Red
        return $false
    }

    try {
        $output = & $fullPath @Args 2>&1
        $exitCode = $LASTEXITCODE

        foreach ($line in $output) {
            Write-Host $line
        }

        return $exitCode -eq 0 -or $exitCode -eq $null
    } catch {
        Write-Host "[ERROR] 执行失败: $_" -ForegroundColor Red
        return $false
    }
}

Write-Section "My RAG Agent - 验证套件"
Write-Host "Base URL: $BaseURL" -ForegroundColor Cyan
Write-Host "时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

$results = @{}

# 1. API 验证
$results["API验证"] = Invoke-ValidationScript -ScriptPath "validate-api.ps1" -Name "API 接口验证"

# 2. 技能工具同步验证
$results["技能工具验证"] = Invoke-ValidationScript -ScriptPath "validate-skills-tools.ps1" -Name "技能工具同步验证"

# 3. 工具执行验证
$results["工具执行验证"] = Invoke-ValidationScript -ScriptPath "validate-tool-execution.ps1" -Name "工具执行验证" -Args @("-ToolNames", @("cat_image", "weather"))

# 4. 代码注释验证（可选跳过）
if (-not $SkipComments) {
    $results["注释验证"] = Invoke-ValidationScript -ScriptPath "validate-comments.ps1" -Name "代码注释完整性验证"
}

# 结果汇总
Write-Section "验证结果汇总"
$allPassed = $true
foreach ($test in $results.GetEnumerator()) {
    $status = if ($test.Value) { "[PASS]" } else { "[FAIL]" }
    $color = if ($test.Value) { "Green" } else { "Red" }
    Write-Host "$($test.Key): $status" -ForegroundColor $color
    if (-not $test.Value) { $allPassed = $false }
}

Write-Host ""
if ($allPassed) {
    Write-Host "所有验证通过！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "部分验证失败，请检查上述输出。" -ForegroundColor Yellow
    exit 1
}
