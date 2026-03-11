@echo off
title Danprel Resource Console
echo.
echo  ============================================================
echo   DANPREL Engineering Automation
echo   Resource Allocation Console
echo  ============================================================
echo.
echo  Starting server...
echo  Once ready, open: http://localhost:3000
echo.
node "%~dp0server.js"
pause
