# main.py
import uvicorn
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 正在啟動 AI 情感諮商室 (Web UI)...")

    uvicorn.run("web.app:app", host="0.0.0.0", port=8000, reload=False)