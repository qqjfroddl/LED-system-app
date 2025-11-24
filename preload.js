const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 향후 렌더러와 통신이 필요하면 이곳에 추가
});





