# 技能工具同步验证脚本
# 用法: .\validate-skills-tools.ps1

param(
    [string]$BaseURL = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

function Get-SkillsAndTools {
    $url = "$BaseURL/api/skills"

    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json

        return @{
            Success = $true
            SkillsCount = ($data.skills | Measure-Object).Count
            ToolsCount = ($data.tools | Measure-Object).Count
            SkillsByCategory = $data.skillsByCategory
            ToolsWithDescriptions = $data.toolsWithDescriptions
            Data = $data
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Test-SkillsStructure {
    param($Skills)

    $issues = @()

    foreach ($skill in $Skills) {
        if (-not $skill.name) {
            $issues += "技能缺少 name 字段"
        }
        if (-not $skill.description) {
            $issues += "技能 '$($skill.name)' 缺少 description 字段"
        }
        if (-not $skill.trigger) {
            $issues += "技能 '$($skill.name)' 缺少 trigger 字段"
        }
        if (-not $skill.tools) {
            $issues += "技能 '$($skill.name)' 缺少 tools 字段"
        }
    }

    return $issues
}

function Test-ToolsStructure {
    param($Tools)

    $issues = @()

    foreach ($tool in $Tools) {
        if (-not $tool.name) {
            $issues += "工具缺少 name 字段"
        }
        if (-not $tool.description) {
            $issues += "工具缺少 description 字段"
        }
    }

    return $issues
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "技能工具同步验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取数据
Write-Host "[1/3] 获取技能工具数据..." -ForegroundColor Yellow
$result = Get-SkillsAndTools

if (-not $result.Success) {
    Write-Host "[ERROR] 无法获取数据: $($result.Error)" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] 获取成功" -ForegroundColor Green
Write-Host "  - 技能数量: $($result.SkillsCount)" -ForegroundColor Cyan
Write-Host "  - 工具数量: $($result.ToolsCount)" -ForegroundColor Cyan
Write-Host ""

# 验证技能结构
Write-Host "[2/3] 验证技能结构..." -ForegroundColor Yellow
$allSkills = @()
foreach ($category in $result.SkillsByCategory.PSObject.Properties) {
    $allSkills += $category.Value
}
$skillIssues = Test-SkillsStructure -Skills $allSkills

if ($skillIssues.Count -eq 0) {
    Write-Host "[OK] 技能结构验证通过" -ForegroundColor Green
} else {
    Write-Host "[WARN] 发现 $($skillIssues.Count) 个问题:" -ForegroundColor Yellow
    foreach ($issue in $skillIssues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
}
Write-Host ""

# 验证工具结构
Write-Host "[3/3] 验证工具结构..." -ForegroundColor Yellow
$allTools = @()
foreach ($group in $result.ToolsWithDescriptions) {
    $allTools += $group.tools
}
$toolIssues = Test-ToolsStructure -Tools $allTools

if ($toolIssues.Count -eq 0) {
    Write-Host "[OK] 工具结构验证通过" -ForegroundColor Green
} else {
    Write-Host "[WARN] 发现 $($toolIssues.Count) 个问题:" -ForegroundColor Yellow
    foreach ($issue in $toolIssues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
}
Write-Host ""

# 输出技能列表
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "技能列表" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
foreach ($category in $result.SkillsByCategory.PSObject.Properties) {
    Write-Host "[$($category.Name)]" -ForegroundColor Magenta
    foreach ($skill in $category.Value) {
        $tools = if ($skill.tools) { $skill.tools -join ", " } else { "(无)" }
        Write-Host "  - $($skill.name): $($skill.description)" -ForegroundColor White
        Write-Host "    触发词: $($skill.trigger -join ", ")" -ForegroundColor Gray
        Write-Host "    工具: $tools" -ForegroundColor Gray
    }
    Write-Host ""
}

# 输出工具分类
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "工具分类" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
foreach ($group in $result.ToolsWithDescriptions) {
    Write-Host "[$($group.category)]" -ForegroundColor Magenta
    foreach ($tool in $group.tools) {
        Write-Host "  - $($tool.name): $($tool.description)" -ForegroundColor White
    }
    Write-Host ""
}

exit 0
