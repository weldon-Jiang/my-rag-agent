@echo off
cd server-python
python -m uvicorn main:app --host 0.0.0.0 --port 3030 --log-level info