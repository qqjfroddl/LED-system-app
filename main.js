const { app, BrowserWindow, Menu, Tray, Notification, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const createTrayIcon = () => {
    if (tray) return;
    const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABEklEQVRYR+2WwQ6DMAxF/6ArqjrgTgjqEu1EYIcbEJ7DPTImEmDxTZ7S1QoFIrgtfdc7Lzb4mL6ILAOxBqYAXFb6GVI19XIfZ6IelJjd68SWQS3D2yjzhSTFIRgAgFshxK9CwT8CerRR96k2ftNNWaNQXkcl1RMbn31ZSoMKEP7oWKnhkO4AyAGPgZe5xWmMQN4xrz41VaP/IgvzE+KUKnsuTflm4ldajKu7R3F0Xv8h2SmeRlt7AdlH5p8o6ju7PxSzDT6cMfeJKh8kMC2drlgpFQ4G7E0eidU5ZSUzhb9TcoezeAGKxe3qRpCiR4raVkWPgQPPaK2iMxvoa7JN38YM+SZMLxrpq/oqgqFinoCGGVEUurI6DRQOXZxJpGdF5aUgIhEspBCdg7gPTYkNc01vUogAAAABJRU5ErkJggg==';
    const icon = nativeImage.createFromDataURL(`data:image/png;base64,${base64Icon}`);
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    const menu = Menu.buildFromTemplate([
        {
            label: '창 열기',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: '타이머 완료 테스트 알림',
            click: () => {
                new Notification({
                    title: '분출 타이머',
                    body: '테스트 알림입니다. 작업 시간이 완료되었습니다!',
                    timeoutType: 'never'
                }).show();
            }
        },
        { type: 'separator' },
        {
            label: '종료',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setToolTip('인생관리시스템');
    tray.setContextMenu(menu);
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
};

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 1024,
        minHeight: 720,
        backgroundColor: '#f5f5f5',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
};

app.whenReady().then(() => {
    createWindow();
    createTrayIcon();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow) {
            mainWindow.show();
        }
    });
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});





