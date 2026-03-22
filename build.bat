@echo off
echo ===================================================
echo PCM Hammer - Native Windows Compile
echo ===================================================

echo.
echo [1/4] Installing dependencies...
call npm install
call npm install electron electron-builder node-gyp --save-dev

echo.
echo [2/4] Building Native C++ J2534 Addon...
call npx node-gyp rebuild

echo.
echo [3/4] Building web assets...
call npm run build

echo.
echo [4/4] Compiling Native Windows Executable (.exe)...
call npx electron-builder --win

echo.
echo ===================================================
echo Build Complete! Check the "release" folder for the .exe
echo ===================================================
pause
