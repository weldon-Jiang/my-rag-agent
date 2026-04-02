$file = "d:\chinatravel\my-rag-agent\server\routes\chat.js"
$content = Get-Content $file -Raw -Encoding UTF8

$content = $content -replace "INTENT_TO_TOOLS\[segment\.primaryIntent\] \|\| \[\]", "getToolsForIntent(segment.primaryIntent) || []"
$content = $content -replace "INTENT_TO_TOOLS\[intent\] \|\| INTENT_TO_TOOLS\.general", "getToolsForIntent(intent) || getToolsForIntent('general')"

Set-Content $file -Value $content -Encoding UTF8
Write-Host "Done"