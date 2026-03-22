# Native C++ J2534 Addon

This directory contains a native C++ Node.js addon for interfacing directly with J2534 PassThru DLLs from the Electron main process.

This allows the application to directly load and call J2534 functions without relying on an external WebSocket bridge.

## Prerequisites for Windows Build

To compile this native C++ addon, you must have the Windows build tools installed on your machine.

1. Install **Visual Studio Build Tools** (or Visual Studio Community) with the "Desktop development with C++" workload.
2. Install **Python 3**.
3. Run `npm install -g node-gyp` (optional, as `build.bat` uses `npx`).

## Building

Run the `build.bat` file in the root directory. It will automatically:
1. Install dependencies
2. Compile this C++ addon using `node-gyp`
3. Build the React web assets
4. Package the final `.exe` using `electron-builder`

## Usage in Electron (main.js)

Once built, you can require the native addon in your `main.js` and expose it to the renderer process via IPC:

```javascript
const j2534 = require('./build/Release/j2534_native.node');

// Example: Scan for devices
const devices = j2534.scanDevices();
console.log(devices);

// Example: Load a DLL
const success = j2534.loadDLL("C:\\Program Files (x86)\\OpenECU\\OpenPort 2.0\\op20pt32.dll");
if (success) {
    const result = j2534.passThruOpen();
    console.log(result);
}
```
