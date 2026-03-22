#include <node_api.h>
#include <string>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#include "J2534.h"

HMODULE hJ2534 = NULL;
PTOPEN PassThruOpen = NULL;
PTCLOSE PassThruClose = NULL;
PTCONNECT PassThruConnect = NULL;
PTDISCONNECT PassThruDisconnect = NULL;
PTREADMSGS PassThruReadMsgs = NULL;
PTWRITEMSGS PassThruWriteMsgs = NULL;
#endif

napi_value LoadDLL(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    char dllPath[256];
    size_t result;
    napi_get_value_string_utf8(env, args[0], dllPath, sizeof(dllPath), &result);

    bool success = false;

#ifdef _WIN32
    if (hJ2534) {
        FreeLibrary(hJ2534);
    }

    hJ2534 = LoadLibraryA(dllPath);
    success = (hJ2534 != NULL);
    
    if (success) {
        PassThruOpen = (PTOPEN)GetProcAddress(hJ2534, "PassThruOpen");
        PassThruClose = (PTCLOSE)GetProcAddress(hJ2534, "PassThruClose");
        PassThruConnect = (PTCONNECT)GetProcAddress(hJ2534, "PassThruConnect");
        PassThruDisconnect = (PTDISCONNECT)GetProcAddress(hJ2534, "PassThruDisconnect");
        PassThruReadMsgs = (PTREADMSGS)GetProcAddress(hJ2534, "PassThruReadMsgs");
        PassThruWriteMsgs = (PTWRITEMSGS)GetProcAddress(hJ2534, "PassThruWriteMsgs");
    }
#endif

    napi_value ret;
    napi_get_boolean(env, success, &ret);
    return ret;
}

napi_value PTOpen(napi_env env, napi_callback_info info) {
    napi_value retObj;
    napi_create_object(env, &retObj);
    
    long status = 1; // STATUS_ERR_NOT_SUPPORTED
    unsigned long deviceId = 0;

#ifdef _WIN32
    if (PassThruOpen) {
        status = PassThruOpen(NULL, &deviceId);
    }
#endif
    
    napi_value statusVal, deviceIdVal;
    napi_create_int32(env, status, &statusVal);
    napi_create_uint32(env, deviceId, &deviceIdVal);
    
    napi_set_named_property(env, retObj, "status", statusVal);
    napi_set_named_property(env, retObj, "deviceId", deviceIdVal);
    
    return retObj;
}

napi_value PTClose(napi_env env, napi_callback_info info) {
    long status = 1;

#ifdef _WIN32
    if (PassThruClose) {
        size_t argc = 1;
        napi_value args[1];
        napi_get_cb_info(env, info, &argc, args, NULL, NULL);
        
        uint32_t deviceId;
        napi_get_value_uint32(env, args[0], &deviceId);
        
        status = PassThruClose(deviceId);
    }
#endif

    napi_value statusVal;
    napi_create_int32(env, status, &statusVal);
    return statusVal;
}

// Scan registry for J2534 devices
napi_value ScanDevices(napi_env env, napi_callback_info info) {
    napi_value devicesArray;
    napi_create_array(env, &devicesArray);
    
#ifdef _WIN32
    HKEY hKey;
    if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "SOFTWARE\\PassThruSupport.04.04", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        char subKeyName[256];
        DWORD subKeyNameSize = sizeof(subKeyName);
        DWORD index = 0;
        uint32_t arrIndex = 0;
        
        while (RegEnumKeyExA(hKey, index, subKeyName, &subKeyNameSize, NULL, NULL, NULL, NULL) == ERROR_SUCCESS) {
            HKEY hSubKey;
            if (RegOpenKeyExA(hKey, subKeyName, 0, KEY_READ, &hSubKey) == ERROR_SUCCESS) {
                char name[256] = {0};
                char functionLibrary[256] = {0};
                DWORD dataSize = sizeof(name);
                
                RegQueryValueExA(hSubKey, "Name", NULL, NULL, (LPBYTE)name, &dataSize);
                dataSize = sizeof(functionLibrary);
                RegQueryValueExA(hSubKey, "FunctionLibrary", NULL, NULL, (LPBYTE)functionLibrary, &dataSize);
                
                napi_value deviceObj;
                napi_create_object(env, &deviceObj);
                
                napi_value nameVal, dllVal;
                napi_create_string_utf8(env, name, NAPI_AUTO_LENGTH, &nameVal);
                napi_create_string_utf8(env, functionLibrary, NAPI_AUTO_LENGTH, &dllVal);
                
                napi_set_named_property(env, deviceObj, "name", nameVal);
                napi_set_named_property(env, deviceObj, "dll", dllVal);
                
                napi_set_element(env, devicesArray, arrIndex++, deviceObj);
                RegCloseKey(hSubKey);
            }
            index++;
            subKeyNameSize = sizeof(subKeyName);
        }
        RegCloseKey(hKey);
    }
#endif
    return devicesArray;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_value fnLoad, fnOpen, fnClose, fnScan;
    napi_create_function(env, NULL, 0, LoadDLL, NULL, &fnLoad);
    napi_create_function(env, NULL, 0, PTOpen, NULL, &fnOpen);
    napi_create_function(env, NULL, 0, PTClose, NULL, &fnClose);
    napi_create_function(env, NULL, 0, ScanDevices, NULL, &fnScan);
    
    napi_set_named_property(env, exports, "loadDLL", fnLoad);
    napi_set_named_property(env, exports, "passThruOpen", fnOpen);
    napi_set_named_property(env, exports, "passThruClose", fnClose);
    napi_set_named_property(env, exports, "scanDevices", fnScan);
    
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
