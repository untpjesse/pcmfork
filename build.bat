@echo off
echo ===================================================
echo PCM Hammer - Native Windows Compile
echo ===================================================

echo.
echo [1/3] Installing dependencies...
call npm install
call npm install electron electron-builder --save-dev

echo.
echo [2/3] Building web assets...
call npm run build

echo.
echo [3/3] Compiling Native Windows Executable (.exe)...
call npx electron-builder --win

echo.
echo ===================================================
echo Build Complete! Check the "release" folder for the .exe
echo ===================================================
pause
