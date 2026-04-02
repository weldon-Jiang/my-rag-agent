$content = Get-Content "d:\chinatravel\my-rag-agent\server\routes\chat.js" -Raw -Encoding UTF8

$oldBlock = @'
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
  general: ['search_knowledge_base']
};
'@

$newBlock = @'
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

$content = $content.Replace($oldBlock, $newBlock)
Set-Content "d:\chinatravel\my-rag-agent\server\routes\chat.js" -Value $content -Encoding UTF8
Write-Host "Done"