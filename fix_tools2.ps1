$file = "d:\chinatravel\my-rag-agent\server\routes\chat.js"
$content = Get-Content $file -Raw
$pattern = '(const INTENT_TO_TOOLS = \{[\s\S]*?general: \[. search_knowledge_base.\]\s*\};)'
$replacement = @'
const INTENT_TO_TOOLS = {
  search_knowledge: ['search_knowledge_base'],
  recognize_image: ['recognize_image', 'search_knowledge_base'],
  extract_pdf: ['extract_pdf_text', 'search_knowledge_base'],
  analyze_video: ['analyze_video', 'search_knowledge_base'],
  get_weather: ['get_weather'],
  get_location: ['get_location'],
  read_file: ['read_file'],
  web_search: ['web_search'],
  execute_bash: ['bash', 'python', 'ls'],
  cat_image: ['cat_image'],
  dog_api: ['dog_api'],
  cat_facts: ['cat_facts'],
  quotes: ['quotes'],
  qrcode: ['qrcode'],
  weather: ['weather'],
  random_user: ['random_user'],
  random_image: ['random_image'],
  general: ['search_knowledge_base']
};

function getToolsForIntent(intentName) {
  const skillTools = skillsCenter.getToolsForIntent(intentName);
  if (skillTools && skillTools.length > 0) {
    return skillTools;
  }
  return INTENT_TO_TOOLS[intentName] || INTENT_TO_TOOLS.general;
}
'@
if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacement
    Set-Content $file -Value $content -NoNewline -Encoding UTF8
    Write-Host "Replacement done"
} else {
    Write-Host "Pattern not found"
}