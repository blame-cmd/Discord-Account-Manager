const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const accountData = JSON.parse(process.argv[2] || '{}');

if (!accountData.token) {
  console.error('No token provided');
  app.quit();
}

app.setName(`Discord - ${accountData.nickname || accountData.globalName || accountData.username}`);

const gotLock = app.requestSingleInstanceLock({ accountId: accountData.id });
if (!gotLock) {
  app.quit();
}

let discordWindow;

function createWindow() {
  const iconFile = accountData.icon || 'default.ico';
  const iconPath = path.join(__dirname, '../assets', iconFile);
  
  const partition = `persist:discord-${accountData.id}`;
  const ses = session.fromPartition(partition);
  
  ses.clearStorageData().then(() => {
    discordWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 940,
      minHeight: 500,
      title: `Discord - ${accountData.nickname || accountData.globalName || accountData.username}`,
      icon: iconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: partition
      }
    });

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    discordWindow.webContents.setUserAgent(userAgent);

    discordWindow.webContents.on('dom-ready', async () => {
      const token = accountData.token;
      const injectScript = `
        (function() {
          const token = ${JSON.stringify(token)};
          
          try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.contentWindow.localStorage.setItem('token', '"' + token + '"');
            iframe.remove();
          } catch(e) { console.log('iframe method failed:', e); }
          
          try {
            localStorage.setItem('token', '"' + token + '"');
          } catch(e) {}
          
          try {
            const origGet = Storage.prototype.getItem;
            Storage.prototype.getItem = function(key) {
              if (key === 'token') return '"' + token + '"';
              return origGet.apply(this, arguments);
            };
          } catch(e) {}
          
          console.log('[BlameManager] Token injected');
        })();
      `;
      await discordWindow.webContents.executeJavaScript(injectScript);
    });

    discordWindow.webContents.on('did-finish-load', async () => {
      const currentUrl = discordWindow.webContents.getURL();
      
      if (currentUrl.includes('discord.com/login')) {
        const token = accountData.token;
        const redirectScript = `
          (function() {
            const token = ${JSON.stringify(token)};
            try {
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              document.body.appendChild(iframe);
              iframe.contentWindow.localStorage.setItem('token', '"' + token + '"');
              iframe.remove();
            } catch(e) {}
            try { localStorage.setItem('token', '"' + token + '"'); } catch(e) {}
            setTimeout(() => { location.href = '/channels/@me'; }, 300);
          })();
        `;
        await discordWindow.webContents.executeJavaScript(redirectScript);
      }
    });

    discordWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.includes('discord.com') || url.includes('discordapp.com')) {
        discordWindow.loadURL(url);
      } else {
        require('electron').shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    discordWindow.loadURL('https://discord.com/login');

    discordWindow.on('closed', () => {
      app.quit();
    });
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
