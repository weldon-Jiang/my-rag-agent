# 技能功能测试脚本
# 用法: .\test-skill.ps1 -SkillName <string> [-FilePath <string>] [-Query <string>]

param(
    [string]$SkillName = "",
    [string]$FilePath = "",
    [string]$Query = "",
    [string]$BaseURL = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

function Test-SkillViaAPI {
    param(
        [string]$Skill,
        [string]$File,
        [string]$UserQuery
    )

    Write-Host "Testing Skill: $Skill" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray

    $url = "$BaseURL/api/skills/process"
    $body = @{
        skill = $Skill
        query = $UserQuery
    }

    if ($File) {
        if (Test-Path $File) {
            $fileBytes = [System.IO.File]::ReadAllBytes($File)
            $fileName = Split-Path $File -Leaf
            $fileBase64 = [Convert]::ToBase64String($fileBytes)
            $body.file = @{
                filename = $fileName
                filepath = $File
                content = $fileBase64
            }
            Write-Host "File: $File" -ForegroundColor Gray
        } else {
            Write-Host "[ERROR] File not found: $File" -ForegroundColor Red
            return
        }
    }

    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 10) -TimeoutSec 120
        $data = $response.Content | ConvertFrom-Json

        if ($data.success) {
            Write-Host "[OK] Success" -ForegroundColor Green
            Write-Host "Result: $($data.result)" -ForegroundColor White
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
Write-Host "技能功能测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SkillName) {
    Write-Host "[ERROR] 请指定技能名称 (-SkillName)" -ForegroundColor Red
    Write-Host ""
    Write-Host "可用技能:" -ForegroundColor Yellow
    Write-Host "  - images-skill  (图片识别)" -ForegroundColor White
    Write-Host "  - videos-skill  (视频分析)" -ForegroundColor White
    Write-Host "  - pdfs-skill    (PDF解析)" -ForegroundColor White
    Write-Host "  - weather-skill (天气查询)" -ForegroundColor White
    Write-Host "  - location-skill (位置查询)" -ForegroundColor White
    Write-Host "  - web-search-skill (网页搜索)" -ForegroundColor White
    exit 1
}

if (-not $Query -and -not $FilePath) {
    $Query = "测试 $SkillName"
}

Test-SkillViaAPI -Skill $SkillName -File $FilePath -UserQuery $Query

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
