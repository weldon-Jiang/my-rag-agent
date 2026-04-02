$file = "d:\chinatravel\my-rag-agent\server\routes\chat.js"
$lines = Get-Content $file -Encoding UTF8

$newLines = @()
$skip = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    if ($line -match "const INTENT_TO_TOOLS = \{") {
        $newLines += "const INTENT_TO_TOOLS = {"
        $newLines += "  search_knowledge: ['search_knowledge_base'],"
        $newLines += "  recognize_image: ['recognize_image', 'search_knowledge_base'],"
        $newLines += "  extract_pdf: ['extract_pdf_text', 'search_knowledge_base'],"
        $newLines += "  analyze_video: ['analyze_video', 'search_knowledge_base'],"
        $newLines += "  get_weather: ['get_weather'],"
        $newLines += "  get_location: ['get_location'],"
        $newLines += "  read_file: ['read_file'],"
        $newLines += "  web_search: ['web_search'],"
        $newLines += "  execute_bash: ['bash', 'python', 'ls'],"
        $newLines += "  cat_image: ['cat_image'],"
        $newLines += "  dog_api: ['dog_api'],"
        $newLines += "  cat_facts: ['cat_facts'],"
        $newLines += "  quotes: ['quotes'],"
        $newLines += "  qrcode: ['qrcode'],"
        $newLines += "  weather: ['weather'],"
        $newLines += "  random_user: ['random_user'],"
        $newLines += "  random_image: ['random_image'],"
        $newLines += "  general: ['search_knowledge_base']"
        $newLines += "};"
        $newLines += ""
        $newLines += "function getToolsForIntent(intentName) {"
        $newLines += "  const skillTools = skillsCenter.getToolsForIntent(intentName);"
        $newLines += "  if (skillTools && skillTools.length > 0) {"
        $newLines += "    return skillTools;"
        $newLines += "  }"
        $newLines += "  return INTENT_TO_TOOLS[intentName] || INTENT_TO_TOOLS.general;"
        $newLines += "}"
        $skip = $true
        continue
    }

    if ($skip) {
        if ($line -match "^\};$" -and $i -gt 0 -and $lines[$i-1] -notmatch "general") {
            $skip = $false
        }
        continue
    }

    $newLines += $line
}

$newLines | Set-Content $file -Encoding UTF8
Write-Host "Done"