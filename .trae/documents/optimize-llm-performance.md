# 提升上下文发送给大模型的性能

## 问题
大模型回应慢，可能原因：
1. 每次请求都重新加载模型配置（`loadModels()`）
2. 大量 console.log 输出影响性能
3. 上下文内容过长
4. 请求中没有使用流式输出

## 优化方案

### Step 1: 缓存模型配置
在服务启动时加载模型配置，后续请求复用缓存：
```javascript
let modelCache = null;

function getModels() {
    if (!modelCache) {
        modelCache = loadModels();
    }
    return modelCache;
}
```

### Step 2: 减少 console.log 输出
- 移除或简化调试日志
- 保留关键错误日志即可

### Step 3: 优化上下文内容
- 限制上下文长度
- 去除重复信息
- 精简格式化

### Step 4: 添加超时配置
为 axios 请求添加合理的超时时间：
```javascript
const response = await axios.post(fullURL, requestBody, { 
    headers, 
    timeout: 60000  // 60秒超时
});
```

## 改动文件
- `server/routes/chat.js` - 优化性能相关代码
