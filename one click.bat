@echo off
title PCM Hammer - One Click Start
color 0A

echo ===================================================
echo PCM Hammer - J2534 Electron App Setup and Start
echo ===================================================
echo.

echo [1/4] Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo [2/4] Installing NPM dependencies...
call npm install
call npm install electron electron-builder node-gyp @electron/rebuild --save-dev

echo [3/4] Building Native J2534 C++ Addon for Electron...
call npm run build:native
if %errorlevel% neq 0 (
    color 0E
    echo.
    echo [WARNING] Native C++ Addon failed to build!
    echo This usually means you are missing Visual Studio C++ Build Tools or Python.
    echo Please download and install them from Microsoft and Python.org.
    echo.
    echo The app will still start, but native J2534 features may not work.
    pause
    color 0A
)

echo [4/4] Building Frontend and Starting Application...
call npm run build
call npm start

echo.
echo Application closed.
pause
