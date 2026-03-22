#ifndef J2534_H
#define J2534_H

#include <windows.h>

#define STATUS_NOERROR 0
#define STATUS_ERR_NOT_SUPPORTED 1

typedef struct {
    unsigned long Parameter;
    unsigned long Value;
} SCONFIG;

typedef struct {
    unsigned long NumOfParams;
    SCONFIG *ConfigPtr;
} SCONFIG_LIST;

typedef struct {
    unsigned long ProtocolID;
    unsigned long RxStatus;
    unsigned long TxFlags;
    unsigned long Timestamp;
    unsigned long DataSize;
    unsigned long ExtraDataIndex;
    unsigned char Data[4128];
} PASSTHRU_MSG;

typedef long (WINAPI *PTOPEN)(void *pName, unsigned long *pDeviceID);
typedef long (WINAPI *PTCLOSE)(unsigned long DeviceID);
typedef long (WINAPI *PTCONNECT)(unsigned long DeviceID, unsigned long ProtocolID, unsigned long Flags, unsigned long BaudRate, unsigned long *pChannelID);
typedef long (WINAPI *PTDISCONNECT)(unsigned long ChannelID);
typedef long (WINAPI *PTREADMSGS)(unsigned long ChannelID, PASSTHRU_MSG *pMsg, unsigned long *pNumMsgs, unsigned long Timeout);
typedef long (WINAPI *PTWRITEMSGS)(unsigned long ChannelID, PASSTHRU_MSG *pMsg, unsigned long *pNumMsgs, unsigned long Timeout);
typedef long (WINAPI *PTSTARTMSGFILTER)(unsigned long ChannelID, unsigned long FilterType, PASSTHRU_MSG *pMaskMsg, PASSTHRU_MSG *pPatternMsg, PASSTHRU_MSG *pFlowControlMsg, unsigned long *pFilterID);
typedef long (WINAPI *PTSTOPMSGFILTER)(unsigned long ChannelID, unsigned long FilterID);
typedef long (WINAPI *PTIOCTL)(unsigned long ChannelID, unsigned long IoctlID, void *pInput, void *pOutput);

#endif
