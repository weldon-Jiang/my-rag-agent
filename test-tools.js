const sandbox = require('./server/sandbox/tools');
const skillsCenter = require('./server/skills');

async function testBashTool() {
    console.log('\n=== 测试 bash 工具 ===');
    const result = await sandbox.execute({
        command: 'echo "Hello from bash"',
        description: '测试 bash'
    });
    console.log('结果:', JSON.stringify(result, null, 2));
}

async function testPythonTool() {
    console.log('\n=== 测试 python 工具 ===');
    const result = await sandbox.executePythonCode({
        code: 'print("Hello from Python")',
        description: '测试 python'
    });
    console.log('结果:', JSON.stringify(result, null, 2));
}

async function testLsTool() {
    console.log('\n=== 测试 ls 工具 ===');
    const result = await sandbox.listDir({
        path: '/mnt/user-data/workspace',
        description: '列出工作目录'
    });
    console.log('结果:', JSON.stringify(result, null, 2));
}

async function testReadFileTool() {
    console.log('\n=== 测试 read_file 工具 ===');
    const result = await sandbox.read({
        path: '/mnt/user-data/workspace/test.txt',
        description: '读取测试文件'
    });
    console.log('结果:', JSON.stringify(result, null, 2));
}

async function testWriteFileTool() {
    console.log('\n=== 测试 write_file 工具 ===');
    const result = await sandbox.write({
        path: '/mnt/user-data/workspace/hello.txt',
        content: 'Hello World!',
        description: '写入测试文件'
    });
    console.log('结果:', JSON.stringify(result, null, 2));
}

async function testStrReplaceTool() {
    console.log('\n=== 测试 str_replace 工具 ===');
    const result = await sandbox.strReplace({
        path: '/mnt/user-data/workspace/hello.txt',
        old_str: 'Hello',
        new_str: 'Hi',
        description: '替换字符串'
    });
    console.log('结果:', JSON.stringify(result, null, 2));
}

async function testClarification() {
    console.log('\n=== 测试 ask_clarification 工具 ===');
    const result = skillsCenter.executeTool('ask_clarification', {
        question: '您想查询哪个城市的天气？',
        clarification_type: 'missing_info',
        context: '需要知道具体城市才能查询天气',
        options: ['北京', '上海', '广州']
    });
    console.log('结果:', JSON.stringify(result, null, 2));
}

async function runTests() {
    await testBashTool();
    await testPythonTool();
    await testLsTool();
    await testReadFileTool();
    await testWriteFileTool();
    await testStrReplaceTool();
    testClarification();
}

runTests().catch(console.error);
