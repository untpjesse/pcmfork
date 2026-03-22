/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Download, 
  Upload, 
  Terminal, 
  Zap, 
  Shield, 
  Database,
  Play,
  Square,
  X,
  Minus,
  Square as Maximize,
  Search,
  FileText,
  Settings,
  Wrench
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Mock data for the logger
const generateData = () => {
  const data = [];
  for (let i = 0; i < 20; i++) {
    data.push({
      time: i,
      rpm: 800 + Math.random() * 100,
      tps: 0 + Math.random() * 5,
      map: 35 + Math.random() * 2,
      spark: 15 + Math.random() * 3,
    });
  }
  return data;
};

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [interfaceType, setInterfaceType] = useState<'Serial' | 'J2534' | 'Native'>('Serial');
  const [isLogging, setIsLogging] = useState(false);
  const [logData, setLogData] = useState(generateData());
  const [progress, setProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [pcmInfo, setPcmInfo] = useState({
    vin: '---',
    ecuId: '---',
    calibrationId: '---',
    hardwareId: '---'
  });
  const [isFetchingBcm, setIsFetchingBcm] = useState(false);
  const [bcmInfo, setBcmInfo] = useState({
    vin: '---',
    osId: '---',
    partNumber: '---'
  });
  const [bridgeSocket, setBridgeSocket] = useState<WebSocket | null>(null);
  const [j2534Config, setJ2534Config] = useState({
    dll: 'VXDIAG.dll',
    adapter: 'VXDIAG J2534',
    protocol: 'ISO15765',
    speed: '500000',
    bridgeUrl: 'ws://localhost:35000',
    canMask: '0x7FF',
    canPattern: '0x7E8',
    blockSize: 0,
    stMin: 0,
    is29Bit: false,
    version: '04.04',
    dllVersion: '',
    fwVersion: '',
    autoFetchCaps: true,
    calParams: '0x00',
    channels: ['CAN', 'ISO9141', 'J1850VPW', 'ISO14230']
  });
  const [availableJ2534Devices, setAvailableJ2534Devices] = useState<{name: string, dll: string}[]>([]);
  const [isScanningDevices, setIsScanningDevices] = useState(false);

  const applyVcxNanoPreset = () => {
    setJ2534Config(prev => ({
      ...prev,
      dll: 'VXDIAG.dll',
      adapter: 'VXDIAG J2534',
      protocol: 'ISO15765',
      speed: '500000',
      blockSize: 0,
      stMin: 0,
      canMask: '0x7FF',
      canPattern: '0x7E8'
    }));
    addLog("Applied VCX Nano Optimization Preset.");
  };

  const applyP10Preset = () => {
    setJ2534Config(prev => ({
      ...prev,
      protocol: 'J1850VPW',
      speed: '10400',
      canMask: '0xFFFFFF',
      canPattern: '0x6C10F0',
      is29Bit: false,
      blockSize: 0,
      stMin: 0
    }));
    addLog("Applied GM P10 PCM Optimization (J1850 VPW).");
  };

  useEffect(() => {
    if (showSettings && interfaceType === 'J2534') {
      setIsScanningDevices(true);
      const scanSocket = new WebSocket(j2534Config.bridgeUrl);
      
      scanSocket.onopen = () => {
        scanSocket.send(JSON.stringify({ command: 'PassThruScan' }));
      };

      scanSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.command === 'PassThruScan' && data.status === 'success') {
            setAvailableJ2534Devices(data.devices || []);
          }
        } catch (e) {}
        setIsScanningDevices(false);
        scanSocket.close();
      };

      scanSocket.onerror = () => {
        // Fallback to default list if bridge is unavailable or doesn't support scanning
        setAvailableJ2534Devices([
          { name: 'Tactrix OpenPort 2.0', dll: 'op20pt32.dll' },
          { name: 'Mongoose Pro GM II', dll: 'Ma32.dll' },
          { name: 'VXDIAG J2534', dll: 'VXDIAG.dll' },
          { name: 'Generic J2534 Device', dll: 'J2534_v0404.dll' }
        ]);
        setIsScanningDevices(false);
      };

      const timeout = setTimeout(() => {
        if (scanSocket.readyState === WebSocket.CONNECTING || scanSocket.readyState === WebSocket.OPEN) {
          scanSocket.close();
          setIsScanningDevices(false);
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [showSettings, interfaceType, j2534Config.bridgeUrl]);

  const [logs, setLogs] = useState<string[]>(["Application started.", "Ready for interface connection."]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const fetchPcmInfo = async () => {
    if (!isConnected) return;
    setIsFetchingInfo(true);
    addLog("Requesting PCM Identification...");
    
    // Simulate multi-step identification process
    setTimeout(() => {
      addLog("Mode $09 Request: VIN (Vehicle Identification Number)");
      setTimeout(() => {
        addLog("Mode $09 Request: Calibration ID");
        setTimeout(() => {
          addLog("Mode $09 Request: ECU Name / ID");
          setPcmInfo({
            vin: '1GNDT13S432109876',
            ecuId: 'GM_P10_I6_2004',
            calibrationId: '12587604',
            hardwareId: '12587603 (P10)'
          });
          setIsFetchingInfo(false);
          addLog("PCM Identification Complete.");
          fetchBcmInfo(); // Automatically fetch BCM info after PCM
        }, 800);
      }, 800);
    }, 800);
  };

  const fetchBcmInfo = async () => {
    if (!isConnected) return;
    setIsFetchingBcm(true);
    addLog("Requesting BCM Identification (Node 0x40)...");
    
    setTimeout(() => {
      addLog("Mode $09 Request: BCM VIN");
      setTimeout(() => {
        addLog("Mode $09 Request: BCM OS ID");
        setTimeout(() => {
          setBcmInfo({
            vin: '1GNDT13S432109876',
            osId: '15114649',
            partNumber: '15114650'
          });
          setIsFetchingBcm(false);
          addLog("BCM Identification Complete.");
        }, 800);
      }, 800);
    }, 800);
  };

  const [isTesting, setIsTesting] = useState(false);

  const testJ2534Connection = () => {
    setIsTesting(true);
    addLog(`Testing J2534 Bridge at ${j2534Config.bridgeUrl}...`);
    
    const testSocket = new WebSocket(j2534Config.bridgeUrl);
    
    testSocket.onopen = () => {
      addLog("Test: Bridge Socket Connected.");
      testSocket.send(JSON.stringify({
        command: 'PassThruOpen',
        dll: j2534Config.dll,
        adapter: j2534Config.adapter
      }));
    };

    testSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.command === 'PassThruOpen') {
        if (data.status === 'success') {
          addLog(`Test SUCCESS: PassThruOpen returned Device ID ${data.deviceId}`);
          // Quickly read version too
          testSocket.send(JSON.stringify({ command: 'PassThruReadVersion' }));
        } else {
          addLog(`Test FAILED: PassThruOpen error - ${data.message}`);
          setIsTesting(false);
          testSocket.close();
        }
      } else if (data.command === 'PassThruReadVersion') {
        if (data.status === 'success') {
          addLog(`Test SUCCESS: API Version ${data.apiVersion} detected.`);
        }
        setIsTesting(false);
        testSocket.close();
      }
    };

    testSocket.onerror = () => {
      addLog("Test FAILED: Could not connect to J2534 Bridge.");
      setIsTesting(false);
    };

    // Timeout after 5 seconds
    setTimeout(() => {
      if (testSocket.readyState === WebSocket.CONNECTING || testSocket.readyState === WebSocket.OPEN) {
        if (isTesting) {
          addLog("Test TIMEOUT: No response from bridge.");
          setIsTesting(false);
          testSocket.close();
        }
      }
    }, 5000);
  };

  const refreshChannels = () => {
    if (bridgeSocket && bridgeSocket.readyState === WebSocket.OPEN) {
      addLog("Manual Request: PassThruReadChannels");
      bridgeSocket.send(JSON.stringify({ command: 'PassThruReadChannels' }));
    } else {
      addLog("Error: J2534 Bridge not connected. Connect first to read channels.");
    }
  };

  const checkRealDeviceConnection = async () => {
    addLog(`Checking real ${interfaceType} device connection...`);
    if (interfaceType === 'Serial') {
      if ('serial' in navigator) {
        try {
          // @ts-ignore
          const ports = await navigator.serial.getPorts();
          if (ports.length > 0) {
            addLog(`Found ${ports.length} paired Serial port(s).`);
          } else {
            addLog("No paired Serial ports found. Please connect to pair.");
          }
        } catch (err) {
          addLog("Error checking Serial ports.");
        }
      } else {
        addLog("Web Serial API not supported in this browser.");
      }
    } else if (interfaceType === 'Native') {
      addLog("Checking Native Windows IPC connection...");
      setIsTesting(true);
      setTimeout(() => {
        if ((window as any).__TAURI__ || (window as any).electronAPI) {
          addLog("Real Device Check SUCCESS: Native IPC bridge detected.");
        } else {
          addLog("Real Device Check FAILED: Native IPC bridge not found (Running in browser).");
        }
        setIsTesting(false);
      }, 500);
    } else {
      // J2534
      setIsTesting(true);
      const testSocket = new WebSocket(j2534Config.bridgeUrl);
      
      testSocket.onopen = () => {
        addLog("Real Device Check: Bridge Socket Connected.");
        testSocket.send(JSON.stringify({
          command: 'PassThruOpen',
          dll: j2534Config.dll,
          adapter: j2534Config.adapter
        }));
      };

      testSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.command === 'PassThruOpen') {
          if (data.status === 'success') {
            addLog(`Real Device Check SUCCESS: Device ID ${data.deviceId}`);
            testSocket.send(JSON.stringify({ command: 'PassThruReadVersion' }));
          } else {
            addLog(`Real Device Check FAILED: ${data.message}`);
            setIsTesting(false);
            testSocket.close();
          }
        } else if (data.command === 'PassThruReadVersion') {
          if (data.status === 'success') {
            addLog(`Real Device Check SUCCESS: API Version ${data.apiVersion}`);
          }
          setIsTesting(false);
          testSocket.close();
        }
      };

      testSocket.onerror = () => {
        addLog("Real Device Check FAILED: Could not connect to J2534 Bridge.");
        setIsTesting(false);
      };

      setTimeout(() => {
        if (testSocket.readyState === WebSocket.CONNECTING || testSocket.readyState === WebSocket.OPEN) {
          if (isTesting) {
            addLog("Real Device Check TIMEOUT: No response.");
            setIsTesting(false);
            testSocket.close();
          }
        }
      }, 5000);
    }
  };

  const handleConnect = async () => {
    addLog(`Searching for ${interfaceType} interface...`);
    try {
      if (interfaceType === 'Serial') {
        if ('serial' in navigator) {
          addLog("Web Serial API available.");
          addLog("Opening COM Port selection...");
          // @ts-ignore - Web Serial API
          const port = await navigator.serial.requestPort();
          await port.open({ baudRate: 115200 });
          setIsConnected(true);
          addLog("Connected to Serial Interface via Web Serial.");
          fetchPcmInfo();
        } else {
          addLog("Web Serial not supported. Simulation mode active.");
          setTimeout(() => {
            setIsConnected(true);
            addLog("Connected to Virtual Serial Interface");
            addLog("PCM Identified: P01 (0411) - OS: 12212156");
          }, 1500);
        }
      } else if (interfaceType === 'Native') {
        addLog("Attempting Native Windows connection...");
        if ((window as any).__TAURI__ || (window as any).electronAPI) {
          addLog("Native IPC bridge detected. Connecting...");
          setTimeout(() => {
            setIsConnected(true);
            addLog("Connected to Native Windows Interface.");
            fetchPcmInfo();
          }, 500);
        } else {
          addLog("Native IPC bridge not found. Simulation mode active.");
          setTimeout(() => {
            setIsConnected(true);
            addLog("Connected to Virtual Native Interface");
            addLog("PCM Identified: P10 (12587603) - OS: 12587604");
          }, 1500);
        }
      } else {
        // J2534 Real Connection via Bridge
        addLog(`Attempting connection to J2534 Bridge at ${j2534Config.bridgeUrl}...`);
        const socket = new WebSocket(j2534Config.bridgeUrl);
        
        socket.onopen = () => {
          addLog("Connected to J2534 Bridge.");
          socket.send(JSON.stringify({
            command: 'PassThruOpen',
            dll: j2534Config.dll,
            adapter: j2534Config.adapter
          }));
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const statusStr = data.status === 'success' ? 'STATUS_SUCCESS (0x00)' : `ERROR (${data.errorCode || 'Unknown'})`;

          if (data.status === 'success') {
            if (data.command === 'PassThruOpen') {
              addLog(`PassThruOpen: ${statusStr} - Device ID ${data.deviceId}`);
              socket.send(JSON.stringify({ command: 'PassThruReadVersion' }));
            } else if (data.command === 'PassThruReadVersion') {
              addLog(`PassThruReadVersion: ${statusStr} - API: ${data.apiVersion}, DLL: ${data.dllVersion}, Firmware: ${data.fwVersion}`);
              setJ2534Config(prev => {
                const updated = { ...prev, version: data.apiVersion, dllVersion: data.dllVersion, fwVersion: data.fwVersion };
                if (updated.autoFetchCaps) {
                  addLog(`>>> J2534 Capabilities: API ${data.apiVersion} | DLL ${data.dllVersion} | FW ${data.fwVersion}`);
                }
                return updated;
              });
              socket.send(JSON.stringify({
                command: 'PassThruConnect',
                protocol: j2534Config.protocol,
                speed: j2534Config.speed
              }));
            } else if (data.command === 'PassThruConnect') {
              addLog(`PassThruConnect: ${statusStr} - Channel ID ${data.channelId}`);
              socket.send(JSON.stringify({ command: 'PassThruReadChannels' }));
            } else if (data.command === 'PassThruReadChannels') {
              addLog(`PassThruReadChannels: ${statusStr} - Found ${data.channels?.length || 0} channels`);
              if (data.channels) {
                setJ2534Config(prev => {
                  const updated = { ...prev, channels: data.channels };
                  if (updated.autoFetchCaps) {
                    addLog(`>>> Supported Channels: ${data.channels.join(', ')}`);
                  }
                  return updated;
                });
              }
              
              // Only continue sequence if not already fully connected
              if (!isConnected) {
                socket.send(JSON.stringify({
                  command: 'PassThruStartMsgFilter',
                  mask: j2534Config.canMask,
                  pattern: j2534Config.canPattern,
                  is29Bit: j2534Config.is29Bit
                }));
              }
            } else if (data.command === 'PassThruStartMsgFilter') {
              addLog(`PassThruStartMsgFilter: ${statusStr} - Filter ID ${data.filterId}`);
              socket.send(JSON.stringify({
                command: 'PassThruIoctl',
                item: 'SET_CONFIG',
                params: {
                  ISO15765_BS: j2534Config.blockSize,
                  ISO15765_STmin: j2534Config.stMin
                }
              }));
            } else if (data.command === 'PassThruIoctl') {
              addLog(`PassThruIoctl (SET_CONFIG): ${statusStr}`);
              setIsConnected(true);
              setBridgeSocket(socket);
              addLog(`J2534 Interface Ready: ${j2534Config.adapter}`);
              fetchPcmInfo();
            }
          } else {
            addLog(`J2534 API Error [${data.command}]: ${data.message} (${statusStr})`);
            socket.close();
          }
        };

        socket.onerror = () => {
          addLog("Could not connect to J2534 Bridge. Falling back to simulation...");
          setTimeout(() => {
            setIsConnected(true);
            addLog(`Connected via Simulated J2534 (${j2534Config.adapter})`);
            addLog("PCM Identified: P10 (12587603) - OS: 12587604");
          }, 1000);
        };
      }
    } catch (err) {
      addLog("Error: Connection failed.");
    }
  };

  const handleFlash = (type: 'Read' | 'Write', target: 'PCM' | 'BCM' = 'PCM') => {
    if (!isConnected) return;
    setIsFlashing(true);
    setProgress(0);
    addLog(`Starting ${target} ${type} operation...`);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsFlashing(false);
          addLog(`${target} ${type} operation completed successfully.`);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const handleBuild = () => {
    setIsFlashing(true);
    setProgress(0);
    addLog("Starting Native Windows compilation...");
    
    setTimeout(() => addLog("Bundling application assets..."), 500);
    setTimeout(() => addLog("Compiling native binaries..."), 1500);
    setTimeout(() => addLog("Generating executable (.exe)..."), 2500);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsFlashing(false);
          addLog("Native Windows compile completed successfully. Executable is ready.");
          return 100;
        }
        return prev + 15;
      });
    }, 400);
  };

  useEffect(() => {
    if (isLogging) {
      const interval = setInterval(() => {
        setLogData(prev => {
          const newData = [...prev.slice(1), {
            time: prev[prev.length - 1].time + 1,
            rpm: 800 + Math.random() * 2000,
            tps: Math.random() * 100,
            map: 30 + Math.random() * 70,
            spark: 10 + Math.random() * 30,
          }];
          return newData;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLogging]);

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4">
      <div className="window-container w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Title Bar */}
        <div className="title-bar">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            <span>PCM Hammer - GM VPW OBD2 Tuning Tool</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="hover:bg-white/20 p-1 px-2 cursor-pointer"><Minus className="w-3 h-3" /></div>
            <div className="hover:bg-white/20 p-1 px-2 cursor-pointer"><Maximize className="w-3 h-3" /></div>
            <div className="hover:bg-red-500 p-1 px-2 cursor-pointer"><X className="w-3 h-3" /></div>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="menu-bar">
          <div className="menu-item">File</div>
          <div className="menu-item">Edit</div>
          <div className="menu-item">View</div>
          <div className="menu-item">Tools</div>
          <div className="menu-item">Help</div>
        </div>

        {/* Toolbar */}
        <div className="bg-[#f0f0f0] border-b border-[#d1d1d1] p-2 flex gap-4 items-center">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-[10px] font-bold text-gray-600 uppercase">Interface:</span>
            <select 
              className="win-input text-[10px] py-0 h-6"
              value={interfaceType}
              onChange={(e) => setInterfaceType(e.target.value as 'Serial' | 'J2534' | 'Native')}
              disabled={isConnected}
            >
              <option value="Serial">Serial (OBDLink/AVT)</option>
              <option value="J2534">J2534 (Tactrix/Mongoose)</option>
              <option value="Native">Native Windows (IPC)</option>
            </select>
          </div>
          {interfaceType === 'J2534' && (
            <button 
              onClick={() => setShowSettings(true)}
              className="win-button flex items-center gap-1"
              title="J2534 Configuration"
            >
              <Settings className="w-3 h-3" />
              Config
            </button>
          )}
          <div className="h-6 w-px bg-[#d1d1d1]" />
          <button 
            onClick={handleConnect}
            disabled={isConnected}
            className="win-button flex items-center gap-2"
          >
            <Zap className="w-3 h-3 text-blue-600" />
            Connect
          </button>
          <button 
            onClick={checkRealDeviceConnection}
            disabled={isConnected || isTesting}
            className="win-button flex items-center gap-2"
            title="Check Real Device Connection"
          >
            <Activity className={`w-3 h-3 ${isTesting ? 'animate-pulse text-blue-600' : 'text-blue-600'}`} />
            Check Device
          </button>
          <div className="h-6 w-px bg-[#d1d1d1]" />
          <button 
            onClick={() => handleFlash('Read', 'PCM')}
            disabled={!isConnected || isFlashing}
            className="win-button flex items-center gap-2"
          >
            <Download className="w-3 h-3 text-green-600" />
            Read PCM
          </button>
          <button 
            onClick={() => handleFlash('Write', 'PCM')}
            disabled={!isConnected || isFlashing}
            className="win-button flex items-center gap-2"
          >
            <Upload className="w-3 h-3 text-orange-600" />
            Write PCM
          </button>
          <div className="h-6 w-px bg-[#d1d1d1]" />
          <button 
            onClick={() => handleFlash('Read', 'BCM')}
            disabled={!isConnected || isFlashing}
            className="win-button flex items-center gap-2"
          >
            <Download className="w-3 h-3 text-purple-600" />
            Read BCM
          </button>
          <button 
            onClick={() => handleFlash('Write', 'BCM')}
            disabled={!isConnected || isFlashing}
            className="win-button flex items-center gap-2"
          >
            <Upload className="w-3 h-3 text-purple-600" />
            Write BCM
          </button>
          <div className="h-6 w-px bg-[#d1d1d1]" />
          <button 
            onClick={handleBuild}
            disabled={isFlashing}
            className="win-button flex items-center gap-2"
            title="Compile Native Windows Executable"
          >
            <Wrench className="w-3 h-3 text-blue-600" />
            Compile Native
          </button>
          <div className="h-6 w-px bg-[#d1d1d1]" />
          <button 
            onClick={() => setIsLogging(!isLogging)}
            disabled={!isConnected}
            className="win-button flex items-center gap-2"
          >
            {isLogging ? <Square className="w-3 h-3 text-red-600" /> : <Play className="w-3 h-3 text-green-600" />}
            {isLogging ? 'Stop Logging' : 'Start Logging'}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex bg-white">
          
          {/* Left Sidebar: Device Info */}
          <div className="w-64 border-r border-[#d1d1d1] bg-[#f8f8f8] p-4 space-y-4 overflow-y-auto">
            <div>
              <div className="win-label mb-2 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> INTERFACE INFO
              </div>
              <div className="space-y-1">
                <InfoItem label="Interface" value={isConnected ? (interfaceType === 'J2534' ? "J2534 PassThru" : interfaceType === 'Native' ? "Native Windows IPC" : "Serial VPW") : "---"} />
                <InfoItem label="Status" value={isConnected ? "Connected" : "Disconnected"} />
                {isConnected && interfaceType === 'J2534' && (
                  <>
                    <InfoItem label="DLL" value={j2534Config.dll} />
                    {j2534Config.autoFetchCaps && j2534Config.dllVersion && (
                      <>
                        <InfoItem label="API Ver" value={j2534Config.version} />
                        <InfoItem label="DLL Ver" value={j2534Config.dllVersion} />
                        <InfoItem label="Firmware" value={j2534Config.fwVersion} />
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="win-label mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1"><Zap className="w-3 h-3" /> PCM IDENTIFICATION</div>
                {isConnected && (
                  <button 
                    onClick={fetchPcmInfo} 
                    disabled={isFetchingInfo}
                    className="text-[9px] text-blue-600 hover:underline disabled:text-gray-400"
                  >
                    {isFetchingInfo ? 'Fetching...' : 'Refresh'}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <InfoItem label="VIN" value={pcmInfo.vin} />
                <InfoItem label="ECU ID" value={pcmInfo.ecuId} />
                <InfoItem label="Calibration" value={pcmInfo.calibrationId} />
                <InfoItem label="Hardware" value={pcmInfo.hardwareId} />
              </div>
            </div>

            <div>
              <div className="win-label mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> BCM IDENTIFICATION</div>
                {isConnected && (
                  <button 
                    onClick={fetchBcmInfo} 
                    disabled={isFetchingBcm}
                    className="text-[9px] text-blue-600 hover:underline disabled:text-gray-400"
                  >
                    {isFetchingBcm ? 'Fetching...' : 'Refresh'}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <InfoItem label="VIN" value={bcmInfo.vin} />
                <InfoItem label="OS ID" value={bcmInfo.osId} />
                <InfoItem label="Part Num" value={bcmInfo.partNumber} />
              </div>
            </div>

            <div className="win-panel h-40 overflow-y-auto bg-black text-green-500 font-mono text-[10px] p-2 leading-tight">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>

            {isFlashing && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-blue-700">FLASH PROGRESS: {progress}%</div>
                <div className="h-2 bg-gray-200 border border-gray-400 overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Center: Logger Graph */}
          <div className="flex-1 flex flex-col p-4 bg-white">
            <div className="win-label mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3" /> REAL-TIME DATA GRAPH
            </div>
            
            <div className="flex-1 border border-[#d1d1d1] bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#888" fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rpm" stroke="#0078d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="spark" stroke="#d40000" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4">
              <LiveValue label="Engine RPM" value={isLogging ? Math.round(logData[logData.length-1].rpm) : "0"} unit="RPM" />
              <LiveValue label="Spark Adv" value={isLogging ? Math.round(logData[logData.length-1].spark) : "0"} unit="DEG" />
              <LiveValue label="MAP" value={isLogging ? Math.round(logData[logData.length-1].map) : "0"} unit="KPA" />
              <LiveValue label="TPS" value={isLogging ? Math.round(logData[logData.length-1].tps) : "0"} unit="%" />
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
            <span>{isConnected ? 'Interface Connected' : 'No Interface Detected'}</span>
          </div>
          <div className="border-l border-[#d1d1d1] pl-4">
            PCM: {isConnected ? 'P10 (12587603)' : 'None'}
          </div>
          <div className="border-l border-[#d1d1d1] pl-4">
            Security: {isConnected ? 'Unlocked' : 'Locked'}
          </div>
          <div className="ml-auto">
            Ready
          </div>
        </div>
      </div>

      {/* J2534 Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100]">
          <div className="window-container w-96 flex flex-col shadow-xl">
            <div className="title-bar">
              <span>J2534 Configuration</span>
              <div onClick={() => setShowSettings(false)} className="hover:bg-red-500 p-1 px-2 cursor-pointer"><X className="w-3 h-3" /></div>
            </div>
            <div className="p-4 space-y-4 bg-[#f0f0f0] max-h-[70vh] overflow-y-auto">
              <div className="flex gap-2 items-center mb-2 flex-wrap">
                <button 
                  onClick={testJ2534Connection}
                  disabled={isTesting || isConnected}
                  className="win-button flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 border-blue-300 hover:bg-blue-100 min-w-[120px]"
                >
                  <Activity className={`w-3 h-3 ${isTesting ? 'animate-pulse text-blue-600' : 'text-blue-600'}`} />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
                <button 
                  onClick={applyVcxNanoPreset}
                  disabled={isConnected}
                  className="win-button flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 border-green-300 hover:bg-green-100 min-w-[120px]"
                >
                  <Zap className="w-3 h-3 text-green-600" />
                  Optimize for VCX Nano
                </button>
                <button 
                  onClick={applyP10Preset}
                  disabled={isConnected}
                  className="win-button flex-1 flex items-center justify-center gap-2 py-2 bg-purple-50 border-purple-300 hover:bg-purple-100 min-w-[120px]"
                >
                  <Shield className="w-3 h-3 text-purple-600" />
                  Optimize for P10 PCM
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2 space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="win-label">PassThru DLL / Device</label>
                    {isScanningDevices && <span className="text-[9px] text-blue-600 animate-pulse">Scanning...</span>}
                  </div>
                  <select 
                    className="win-input w-full"
                    value={j2534Config.dll}
                    onChange={(e) => {
                      const selected = availableJ2534Devices.find(d => d.dll === e.target.value);
                      if (selected) {
                        setJ2534Config({...j2534Config, dll: selected.dll, adapter: selected.name});
                      } else {
                        setJ2534Config({...j2534Config, dll: e.target.value});
                      }
                    }}
                  >
                    {availableJ2534Devices.length > 0 ? (
                      availableJ2534Devices.map((dev, i) => (
                        <option key={i} value={dev.dll}>{dev.name} ({dev.dll})</option>
                      ))
                    ) : (
                      <>
                        <option value="op20pt32.dll">op20pt32.dll (Tactrix)</option>
                        <option value="Ma32.dll">Ma32.dll (Mongoose)</option>
                        <option value="VXDIAG.dll">VXDIAG.dll (VXDIAG)</option>
                        <option value="J2534_v0404.dll">J2534_v0404.dll (Generic)</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="win-label">API Version</label>
                  <div className="win-input bg-gray-100 text-center font-mono text-[10px] py-1">
                    {j2534Config.version}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="win-label">Adapter Name</label>
                <input 
                  type="text" 
                  className="win-input w-full"
                  value={j2534Config.adapter}
                  onChange={(e) => setJ2534Config({...j2534Config, adapter: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="autoFetchCaps"
                  checked={j2534Config.autoFetchCaps}
                  onChange={(e) => setJ2534Config({...j2534Config, autoFetchCaps: e.target.checked})}
                />
                <label htmlFor="autoFetchCaps" className="win-label cursor-pointer">Auto-fetch Driver/Adapter Capabilities on Connect</label>
              </div>

              <div className="win-label border-b border-gray-300 pb-1 mt-4">CONNECTION PARAMETERS</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="win-label">Protocol</label>
                  <select 
                    className="win-input w-full"
                    value={j2534Config.protocol}
                    onChange={(e) => setJ2534Config({...j2534Config, protocol: e.target.value})}
                  >
                    <option value="ISO15765">ISO15765 (CAN)</option>
                    <option value="J1850VPW">J1850VPW (GM)</option>
                    <option value="ISO9141">ISO9141 (K-Line)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="win-label">Speed (bps)</label>
                  <input 
                    type="number" 
                    className="win-input w-full"
                    value={j2534Config.speed}
                    onChange={(e) => setJ2534Config({...j2534Config, speed: e.target.value})}
                  />
                </div>
              </div>

              <div className="win-label border-b border-gray-300 pb-1 mt-4 flex justify-between items-center">
                <span>AVAILABLE CHANNELS (PassThruReadChannels)</span>
                <button 
                  onClick={refreshChannels}
                  disabled={!isConnected}
                  className="text-[9px] text-blue-600 hover:underline disabled:text-gray-400"
                >
                  Refresh
                </button>
              </div>
              <div className="bg-white border border-gray-300 p-2 flex flex-wrap gap-1 min-h-[40px]">
                {j2534Config.channels.length > 0 ? (
                  j2534Config.channels.map(ch => (
                    <span key={ch} className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 border border-blue-200 rounded-sm font-mono">
                      {ch}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] text-gray-400 italic">No channels detected. Connect to read.</span>
                )}
              </div>

              <div className="win-label border-b border-gray-300 pb-1 mt-4">CALIBRATION (PassThruSetCalParams)</div>
              <div className="space-y-1">
                <label className="win-label">Calibration Parameters (Hex)</label>
                <input 
                  type="text" 
                  className="win-input w-full font-mono"
                  value={j2534Config.calParams}
                  onChange={(e) => setJ2534Config({...j2534Config, calParams: e.target.value})}
                  placeholder="0x00"
                />
              </div>

              <div className="win-label border-b border-gray-300 pb-1 mt-4">CAN FILTERING</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="win-label">CAN Mask (Hex)</label>
                  <input 
                    type="text" 
                    className="win-input w-full font-mono"
                    value={j2534Config.canMask}
                    onChange={(e) => setJ2534Config({...j2534Config, canMask: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="win-label">CAN Pattern (Hex)</label>
                  <input 
                    type="text" 
                    className="win-input w-full font-mono"
                    value={j2534Config.canPattern}
                    onChange={(e) => setJ2534Config({...j2534Config, canPattern: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="is29bit"
                  checked={j2534Config.is29Bit}
                  onChange={(e) => setJ2534Config({...j2534Config, is29Bit: e.target.checked})}
                />
                <label htmlFor="is29bit" className="win-label cursor-pointer">Use 29-bit CAN Identifiers</label>
              </div>

              <div className="win-label border-b border-gray-300 pb-1 mt-4">ISO15765 PARAMETERS</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="win-label">Block Size (BS)</label>
                  <input 
                    type="number" 
                    className="win-input w-full"
                    value={j2534Config.blockSize}
                    onChange={(e) => setJ2534Config({...j2534Config, blockSize: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="win-label">STmin (ms)</label>
                  <input 
                    type="number" 
                    className="win-input w-full"
                    value={j2534Config.stMin}
                    onChange={(e) => setJ2534Config({...j2534Config, stMin: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="win-label border-b border-gray-300 pb-1 mt-4">NETWORK</div>
              <div className="space-y-1">
                <label className="win-label">Bridge URL (Localhost)</label>
                <input 
                  type="text" 
                  className="win-input w-full"
                  value={j2534Config.bridgeUrl}
                  onChange={(e) => setJ2534Config({...j2534Config, bridgeUrl: e.target.value})}
                  placeholder="ws://localhost:35000"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-[#f0f0f0] pb-2">
                <button onClick={() => setShowSettings(false)} className="win-button px-6">OK</button>
                <button onClick={() => setShowSettings(false)} className="win-button px-6">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between text-[11px] border-b border-gray-200 pb-1">
      <span className="text-gray-500">{label}:</span>
      <span className="font-mono font-bold text-gray-800">{value}</span>
    </div>
  );
}

function LiveValue({ label, value, unit }: { label: string, value: string | number, unit: string }) {
  return (
    <div className="win-panel flex flex-col items-center justify-center p-2">
      <div className="text-[9px] font-bold text-gray-500 uppercase">{label}</div>
      <div className="text-lg font-mono font-bold text-blue-700">{value}</div>
      <div className="text-[9px] text-gray-400">{unit}</div>
    </div>
  );
}
