@echo off
echo.
echo ========================================
echo   MITHRA Energy Analyzer - Docker Launcher
echo ========================================
echo.
echo Starting Docker setup and launch script...
echo.

REM Check if PowerShell script exists
if not exist "start-mithra-docker.ps1" (
    echo ERROR: start-mithra-docker.ps1 not found!
    echo Please ensure you're running this from the mithra-energy-analyzer directory.
    pause
    exit /b 1
)

REM Run PowerShell script with execution policy bypass
powershell.exe -ExecutionPolicy Bypass -File "start-mithra-docker.ps1"

REM Keep window open if there was an error
if %ERRORLEVEL% neq 0 (
    echo.
    echo Script completed with errors. Press any key to close...
    pause >nul
)