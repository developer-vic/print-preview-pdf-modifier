@echo off
REM Print Preview PDF Modifier - Windows Setup Script
REM This script will install all dependencies and start the project

echo ================================
echo   Print Preview PDF Modifier
echo   One-Command Setup Script
echo ================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install Node.js which includes npm.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js and npm are installed

REM Install dependencies
echo [INFO] Installing project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully

REM Install Playwright browsers
echo [INFO] Installing Playwright browsers...
call npx playwright install
if %errorlevel% neq 0 (
    echo [WARNING] Failed to install Playwright browsers. You may need to install them manually.
)
echo [SUCCESS] Playwright browsers installed successfully

REM Start the project
echo [INFO] Starting Print Preview PDF Modifier...
echo [INFO] Both backend and frontend services will start now.
echo [INFO] Press Ctrl+C to stop both services.
echo.

call npm start

pause
