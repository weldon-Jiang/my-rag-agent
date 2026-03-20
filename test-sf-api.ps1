$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$body = @{
    model = "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B"
    messages = @(
        @{ role = "system"; content = "你是一个有帮助的AI助手" }
        @{ role = "user"; content = "你好" }
    )
    temperature = 0.7
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer sk-upmtmjiewttqjsgbfndwayryxfebntvmwrwcvdkybsqjioqf"
    "Content-Type" = "application/json"
}

Write-Host "=== 测试 SiliconFlow API ==="
Write-Host "URL: https://api.siliconflow.cn/v1/chat/completions"
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://api.siliconflow.cn/v1/chat/completions" -Method Post -Headers $headers -Body $body -TimeoutSec 30
    Write-Host "Success! Status: 200"
    Write-Host "Response:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Response Body: $responseBody"
    }
}
