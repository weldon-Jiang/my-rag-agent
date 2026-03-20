$body = @{
    model = "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B"
    messages = @(
        @{ role = "system"; content = "你是一个有帮助的AI助手" }
        @{ role = "user"; content = "你好" }
    )
    temperature = 0.7
} | ConvertTo-Json -Compress

$headers = @{
    "Authorization" = "Bearer sk-upmtmjiewttqjsgbfndwayryxfebntvmwrwcvdkybsqjioqf"
    "Content-Type" = "application/json"
}

$response = Invoke-WebRequest -Uri "https://api.siliconflow.cn/v1/chat/completions" -Method Post -Headers $headers -Body $body -TimeoutSec 30
$response.StatusCode
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
