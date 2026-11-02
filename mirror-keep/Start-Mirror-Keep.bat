@echo off
cd /d "%~dp0"
py -3 mirror_keep.py
if errorlevel 1 python mirror_keep.py
