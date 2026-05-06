"""
启动服务器脚本
"""
import subprocess
import sys
import os
import time

def main():
    print("启动服务器...")
    
    # 构建命令
    cmd = [
        sys.executable, "-m", "uvicorn", 
        "main:app", 
        "--host", "0.0.0.0", 
        "--port", "3030", 
        "--log-level", "info"
    ]
    
    # 获取服务器目录
    server_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 启动子进程 - 不捕获输出，让它直接输出到控制台
    proc = subprocess.Popen(
        cmd,
        cwd=server_dir,
        stdout=None,
        stderr=None,
        stdin=None
    )
    
    print("服务器进程已启动")
    
    # 等待并检查进程状态
    while True:
        time.sleep(1)
        if proc.poll() is not None:
            print("服务器进程已退出，退出码:", proc.returncode)
            break
        print("服务器运行中...")

if __name__ == "__main__":
    main()