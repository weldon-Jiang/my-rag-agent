# 代码注释完整性验证脚本
# 用法: .\validate-comments.ps1 [-Files <array>]

param(
    [string[]]$Files = @(),
    [string]$BaseDir = "d:\chinatravel\my-rag-agent"
)

$ErrorActionPreference = "Continue"

# 默认要检查的文件
$defaultFiles = @(
    "public\app.js",
    "public\router\router.js",
    "public\utils\api.js",
    "public\pages\chat\chat.js",
    "public\pages\knowledge\knowledge.js",
    "public\pages\skill-tools\skill-tools.js",
    "public\pages\models\models.js",
    "server\routes\chat.js",
    "server\skills\index.js",
    "server\skills\skills-manager.js",
    "server\tools\tools-manager.js",
    "server\tools\tools-manifest.js",
    "server\controllers\chat-controller.js",
    "server\services\chat-service.js",
    "server\middleware\logger.js",
    "server\middleware\error-handler.js"
)

function Test-FileHasComments {
    param([string]$FilePath)

    $result = @{
        File = $FilePath
        FullPath = Join-Path $BaseDir $FilePath
        Exists = $false
        Functions = @()
        UndocumentedFunctions = @()
        Issues = @()
    }

    # 检查文件是否存在
    if (-not (Test-Path $result.FullPath)) {
        $result.Issues += "文件不存在"
        return $result
    }
    $result.Exists = $true

    # 读取文件内容
    $content = Get-Content $result.FullPath -Raw -ErrorAction SilentlyContinue
    if (-not $content) {
        $result.Issues += "无法读取文件"
        return $result
    }

    # 正则匹配函数定义（不包括已经匹配过的）
    # 匹配: async function xxx(), function xxx(), const xxx = async function(), class Xxx
    $functionPattern = '(?m)^(?:async\s+)?function\s+(\w+)\s*\('
    $arrowFunctionPattern = '(?m)^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>'
    $classPattern = '(?m)^class\s+(\w+)'

    $allMatches = @()

    # 查找普通函数
    $matches = [regex]::Matches($content, $functionPattern)
    foreach ($match in $matches) {
        $allMatches += @{
            Name = $match.Groups[1].Value
            Line = $match.Index
            Type = "function"
        }
    }

    # 查找箭头函数（仅顶层的）
    $matches = [regex]::Matches($content, $arrowFunctionPattern)
    foreach ($match in $matches) {
        $allMatches += @{
            Name = $match.Groups[1].Value
            Line = $match.Index
            Type = "arrow"
        }
    }

    # 查找类
    $matches = [regex]::Matches($content, $classPattern)
    foreach ($match in $matches) {
        $allMatches += @{
            Name = $match.Groups[1].Value
            Line = $match.Index
            Type = "class"
        }
    }

    $result.Functions = $allMatches

    # 检查每个函数前是否有 JSDoc 注释
    foreach ($func in $allMatches) {
        # 获取函数定义之前的 500 个字符
        $startIndex = [Math]::Max(0, $func.Line - 500)
        $prefix = $content.Substring($startIndex, $func.Line - $startIndex)

        # 检查是否有 JSDoc 注释（/** ... */）
        $hasJSDoc = $prefix -match '(?s)/\*\*.*?\*/\s*$'

        if (-not $hasJSDoc) {
            $result.UndocumentedFunctions += @{
                Name = $func.Name
                Type = $func.Type
            }
        }
    }

    return $result
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "代码注释完整性验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 确定要检查的文件
$filesToCheck = @()
if ($Files -and $Files.Count -gt 0) {
    $filesToCheck = $Files
} else {
    $filesToCheck = $defaultFiles
}

Write-Host "将检查 $($filesToCheck.Count) 个文件..." -ForegroundColor Cyan
Write-Host ""

$allResults = @()
$totalFunctions = 0
$totalUndocumented = 0

foreach ($file in $filesToCheck) {
    Write-Host "[$file]" -ForegroundColor Magenta
    $result = Test-FileHasComments -FilePath $file

    if ($result.Issues.Count -gt 0) {
        foreach ($issue in $result.Issues) {
            Write-Host "  [ERROR] $issue" -ForegroundColor Red
        }
        continue
    }

    $funcCount = $result.Functions.Count
    $undocCount = $result.UndocumentedFunctions.Count

    $totalFunctions += $funcCount
    $totalUndocumented += $undocCount

    Write-Host "  函数数量: $funcCount" -ForegroundColor Cyan
    if ($undocCount -gt 0) {
        Write-Host "  未注释: $undocCount" -ForegroundColor Yellow
        foreach ($func in $result.UndocumentedFunctions) {
            Write-Host "    - $($func.Type) $($func.Name)()" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [OK] 所有函数均有注释" -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "验证结果汇总" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "检查文件数: $($filesToCheck.Count)" -ForegroundColor Cyan
Write-Host "函数总数: $totalFunctions" -ForegroundColor Cyan
Write-Host "已注释: $($totalFunctions - $totalUndocumented)" -ForegroundColor Green
Write-Host "未注释: $totalUndocumented" -ForegroundColor $(if ($totalUndocumented -gt 0) { "Yellow" } else { "Green" })

if ($totalUndocumented -eq 0) {
    Write-Host ""
    Write-Host "[OK] 所有代码均有注释！" -ForegroundColor Green
}

exit $(if ($totalUndocumented -gt 0) { 1 } else { 0 })
