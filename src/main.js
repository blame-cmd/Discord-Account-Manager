const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const crypto = require('crypto');
const Store = require('electron-store');

let chacha20poly1305, utf8ToBytes, bytesToUtf8;

async function loadCrypto() {
  const chacha = await import('@noble/ciphers/chacha.js');
  const utils = await import('@noble/ciphers/utils.js');
  chacha20poly1305 = chacha.chacha20poly1305;
  utf8ToBytes = utils.utf8ToBytes;
  bytesToUtf8 = utils.bytesToUtf8;
}

const store = new Store({
  name: 'accounts',
  encryptionKey: 'blame-manager-secure-key-2024',
  defaults: {
    accounts: [],
    settings: {
      theme: 'dark',
      accentColor: '#00d4aa',
      accentName: 'teal'
    }
  }
});

const passwordStore = new Store({
  name: 'passwords',
  encryptionKey: 'blame-manager-passwords-key-2024',
  defaults: {
    passwords: []
  }
});

let mainWindow;
const discordProcesses = new Map();

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

function encryptChaCha20Poly1305(plaintext, password) {
  const salt = crypto.randomBytes(16);
  const nonce = crypto.randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = chacha20poly1305(new Uint8Array(key), new Uint8Array(nonce));
  const plaintextBytes = utf8ToBytes(plaintext);
  const encrypted = cipher.encrypt(plaintextBytes);
  const result = Buffer.concat([salt, nonce, Buffer.from(encrypted)]);
  return result.toString('base64');
}

function decryptChaCha20Poly1305(encryptedBase64, password) {
  try {
    const data = Buffer.from(encryptedBase64, 'base64');
    const salt = data.subarray(0, 16);
    const nonce = data.subarray(16, 28);
    const encrypted = data.subarray(28);
    const key = deriveKey(password, salt);
    const decipher = chacha20poly1305(new Uint8Array(key), new Uint8Array(nonce));
    const decrypted = decipher.decrypt(new Uint8Array(encrypted));
    return { success: true, data: bytesToUtf8(decrypted) };
  } catch (error) {
    return { success: false, error: 'Decryption failed - wrong password?' };
  }
}

function getIconForAccent(accentName) {
  const iconMap = {
    'blue': 'default.ico',
  };
  return iconMap[accentName] || `${accentName}.ico`;
}

function createWindow() {
  const fs = require('fs');
  let iconPath = path.join(__dirname, '../assets/mullvaad.ico');
  
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, '../assets/default.ico');
  }
  
  mainWindow = new BrowserWindow({
    width: 550,
    height: 720,
    frame: false,
    transparent: true,
    resizable: false,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: iconPath
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/launcher.html'));
}

app.whenReady().then(async () => {
  await loadCrypto();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-accounts', () => {
  const accounts = store.get('accounts');
  return accounts.map(acc => ({
    id: acc.id,
    username: acc.username,
    discriminator: acc.discriminator,
    avatar: acc.avatar,
    globalName: acc.globalName,
    email: acc.email,
    phone: acc.phone,
    verified: acc.verified,
    mfaEnabled: acc.mfaEnabled,
    premium: acc.premium || 0,
    hasPassword: !!acc.encryptedToken,
    notes: acc.notes || '',
    encryptedNotes: acc.encryptedNotes || null,
    nickname: acc.nickname || null,
    color: acc.color || null,
    icon: acc.icon || 'default.ico'
  }));
});

ipcMain.handle('get-available-icons', () => {
  const fs = require('fs');
  const assetsPath = path.join(__dirname, '../assets');
  try {
    const files = fs.readdirSync(assetsPath);
    return files.filter(f => f.endsWith('.ico') || f.endsWith('.png'));
  } catch (e) {
    return ['default.ico'];
  }
});

ipcMain.handle('save-account-settings', (event, { accountId, nickname, color, icon }) => {
  const accounts = store.get('accounts');
  const accountIndex = accounts.findIndex(a => a.id === accountId);
  
  if (accountIndex === -1) {
    return { success: false, error: 'Account not found' };
  }
  
  accounts[accountIndex].nickname = nickname || null;
  accounts[accountIndex].color = color || null;
  accounts[accountIndex].icon = icon || 'default.ico';
  
  store.set('accounts', accounts);
  
  return { success: true };
});

ipcMain.handle('add-account', (event, { account, password }) => {
  const accounts = store.get('accounts');
  const encryptedToken = encryptChaCha20Poly1305(account.token, password);
  
  const newAccount = {
    id: account.id,
    username: account.username,
    discriminator: account.discriminator,
    avatar: account.avatar,
    globalName: account.globalName,
    email: account.email,
    phone: account.phone,
    verified: account.verified,
    mfaEnabled: account.mfaEnabled,
    premium: account.premium || 0,
    encryptedToken: encryptedToken,
    notes: '',
    encryptedNotes: null,
    createdAt: Date.now()
  };
  
  const existingIndex = accounts.findIndex(a => a.id === account.id);
  
  if (existingIndex >= 0) {
    newAccount.notes = accounts[existingIndex].notes;
    newAccount.encryptedNotes = accounts[existingIndex].encryptedNotes;
    accounts[existingIndex] = newAccount;
  } else {
    accounts.push(newAccount);
  }
  
  store.set('accounts', accounts);
  
  return accounts.map(acc => ({
    id: acc.id,
    username: acc.username,
    discriminator: acc.discriminator,
    avatar: acc.avatar,
    globalName: acc.globalName,
    email: acc.email,
    phone: acc.phone,
    verified: acc.verified,
    mfaEnabled: acc.mfaEnabled,
    premium: acc.premium || 0,
    hasPassword: !!acc.encryptedToken,
    notes: acc.notes || '',
    encryptedNotes: acc.encryptedNotes || null,
    nickname: acc.nickname || null,
    color: acc.color || null,
    icon: acc.icon || null
  }));
});

ipcMain.handle('delete-account', (event, accountId) => {
  const accounts = store.get('accounts').filter(a => a.id !== accountId);
  store.set('accounts', accounts);
  return accounts.map(acc => ({
    id: acc.id,
    username: acc.username,
    discriminator: acc.discriminator,
    avatar: acc.avatar,
    globalName: acc.globalName,
    email: acc.email,
    phone: acc.phone,
    verified: acc.verified,
    mfaEnabled: acc.mfaEnabled,
    premium: acc.premium || 0,
    hasPassword: !!acc.encryptedToken,
    notes: acc.notes || '',
    encryptedNotes: acc.encryptedNotes || null,
    nickname: acc.nickname || null,
    color: acc.color || null,
    icon: acc.icon || null
  }));
});

ipcMain.handle('reorder-accounts', (event, { fromIndex, toIndex }) => {
  const accounts = store.get('accounts');
  
  if (fromIndex < 0 || fromIndex >= accounts.length || toIndex < 0 || toIndex >= accounts.length) {
    return { success: false, error: 'Invalid index' };
  }
  
  const [movedAccount] = accounts.splice(fromIndex, 1);
  accounts.splice(toIndex, 0, movedAccount);
  
  store.set('accounts', accounts);
  
  return {
    success: true,
    accounts: accounts.map(acc => ({
      id: acc.id,
      username: acc.username,
      discriminator: acc.discriminator,
      avatar: acc.avatar,
      globalName: acc.globalName,
      email: acc.email,
      phone: acc.phone,
      verified: acc.verified,
      mfaEnabled: acc.mfaEnabled,
      premium: acc.premium || 0,
      hasPassword: !!acc.encryptedToken,
      notes: acc.notes || '',
      encryptedNotes: acc.encryptedNotes || null,
      nickname: acc.nickname || null,
      color: acc.color || null,
      icon: acc.icon || null
    }))
  };
});

ipcMain.handle('decrypt-token', (event, { accountId, password }) => {
  const accounts = store.get('accounts');
  const account = accounts.find(a => a.id === accountId);
  
  if (!account || !account.encryptedToken) {
    return { success: false, error: 'Account not found' };
  }
  
  const result = decryptChaCha20Poly1305(account.encryptedToken, password);
  return result;
});

ipcMain.handle('get-notes', (event, accountId) => {
  const accounts = store.get('accounts');
  const account = accounts.find(a => a.id === accountId);
  
  if (!account) {
    return { success: false, error: 'Account not found' };
  }
  
  return { 
    success: true, 
    notes: account.notes || '',
    isEncrypted: !!account.encryptedNotes
  };
});

ipcMain.handle('save-notes', (event, { accountId, notes, password }) => {
  const accounts = store.get('accounts');
  const accountIndex = accounts.findIndex(a => a.id === accountId);
  
  if (accountIndex === -1) {
    return { success: false, error: 'Account not found' };
  }
  
  if (password) {
    accounts[accountIndex].encryptedNotes = encryptChaCha20Poly1305(notes, password);
    accounts[accountIndex].notes = '[Encrypted]';
  } else {
    accounts[accountIndex].notes = notes;
    accounts[accountIndex].encryptedNotes = null;
  }
  
  store.set('accounts', accounts);
  return { success: true };
});

ipcMain.handle('decrypt-notes', (event, { accountId, password }) => {
  const accounts = store.get('accounts');
  const account = accounts.find(a => a.id === accountId);
  
  if (!account || !account.encryptedNotes) {
    return { success: false, error: 'No encrypted notes found' };
  }
  
  return decryptChaCha20Poly1305(account.encryptedNotes, password);
});

ipcMain.handle('switch-account', async (event, { accountId, password }) => {
  try {
    const accounts = store.get('accounts');
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
    
    const decrypted = decryptChaCha20Poly1305(account.encryptedToken, password);
    if (!decrypted.success) {
      return { success: false, error: 'Wrong password' };
    }
    
    const token = decrypted.data;
    
    if (discordProcesses.has(account.id)) {
      const existingWindow = discordProcesses.get(account.id);
      if (existingWindow && !existingWindow.isDestroyed()) {
        existingWindow.focus();
        return { success: true, message: 'Discord window already open for this account' };
      }
      discordProcesses.delete(account.id);
    }

    const iconFile = account.icon || 'default.ico';
    const fs = require('fs');
    let iconPath = path.join(__dirname, '../assets', iconFile);
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../assets/default.ico');
    }

    const partition = `persist:discord-${account.id}`;
    const ses = session.fromPartition(partition);
    
    await ses.clearStorageData();

    const discordWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 940,
      minHeight: 500,
      title: `Discord - ${account.nickname || account.globalName || account.username}`,
      icon: iconPath,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: partition
      }
    });

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    discordWindow.webContents.setUserAgent(userAgent);

    discordWindow.webContents.on('dom-ready', async () => {
      const injectScript = `
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
          try {
            const origGet = Storage.prototype.getItem;
            Storage.prototype.getItem = function(key) {
              if (key === 'token') return '"' + token + '"';
              return origGet.apply(this, arguments);
            };
          } catch(e) {}

          const style = document.createElement('style');
          style.textContent = \`
            html, body, #app-mount {
              border-radius: 12px !important;
              overflow: hidden !important;
            }
            body {
              background: transparent !important;
            }
            .platform-win .titleBar_a934d8 {
              -webkit-app-region: drag;
            }
            .winButtonClose_f17fb6, .winButton_f17fb6 {
              -webkit-app-region: no-drag;
            }
          \`;
          document.head.appendChild(style);
        })();
      `;
      await discordWindow.webContents.executeJavaScript(injectScript);
    });

    discordWindow.webContents.on('did-finish-load', async () => {
      const currentUrl = discordWindow.webContents.getURL();
      if (currentUrl.includes('discord.com/login')) {
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
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    discordWindow.webContents.on('will-prevent-unload', (event) => {
      event.preventDefault();
    });

    discordProcesses.set(account.id, discordWindow);

    discordWindow.on('closed', () => {
      discordProcesses.delete(account.id);
    });

    discordWindow.loadURL('https://discord.com/login');

    return { success: true };
  } catch (error) {
    console.error('Switch account error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('validate-token', async (event, token) => {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': token }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      let billing = [];
      try {
        const billingResponse = await fetch('https://discord.com/api/v10/users/@me/billing/payment-sources', {
          headers: { 'Authorization': token }
        });
        if (billingResponse.ok) {
          billing = await billingResponse.json();
        }
      } catch (e) {}
      
      return {
        valid: true,
        user: {
          id: data.id,
          username: data.username,
          discriminator: data.discriminator,
          avatar: data.avatar,
          globalName: data.global_name,
          email: data.email || null,
          phone: data.phone || null,
          verified: data.verified || false,
          mfaEnabled: data.mfa_enabled || false,
          premium: data.premium_type || 0,
          billing: billing.length > 0 ? billing.map(b => ({
            type: b.type,
            brand: b.brand || null,
            last4: b.last_4 || null,
            paypalEmail: b.email || null
          })) : []
        }
      };
    }
    return { valid: false };
  } catch (error) {
    return { valid: false, error: error.message };
  }
});

ipcMain.handle('get-account-details', async (event, { accountId, password }) => {
  try {
    const accounts = store.get('accounts');
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
    
    const decrypted = decryptChaCha20Poly1305(account.encryptedToken, password);
    if (!decrypted.success) {
      return { success: false, error: 'Wrong password' };
    }
    
    const token = decrypted.data;
    
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': token }
    });
    
    if (!userResponse.ok) {
      return { success: false, error: 'Invalid token' };
    }
    
    const userData = await userResponse.json();
    
    let guildCount = 0;
    try {
      const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { 'Authorization': token }
      });
      if (guildsResponse.ok) {
        const guilds = await guildsResponse.json();
        guildCount = guilds.length;
      }
    } catch (e) {}
    
    let billing = [];
    try {
      const billingResponse = await fetch('https://discord.com/api/v10/users/@me/billing/payment-sources', {
        headers: { 'Authorization': token }
      });
      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        billing = billingData.map(b => ({
          type: b.type,
          brand: b.brand || null,
          last4: b.last_4 || null,
          paypalEmail: b.email || null
        }));
      }
    } catch (e) {}
    
    return {
      success: true,
      details: {
        id: userData.id,
        username: userData.username,
        globalName: userData.global_name,
        email: userData.email || 'Not available',
        phone: userData.phone || 'Not linked',
        verified: userData.verified || false,
        mfaEnabled: userData.mfa_enabled || false,
        premium: userData.premium_type,
        guildCount: guildCount,
        createdAt: getDiscordTimestamp(userData.id),
        billing: billing
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function getDiscordTimestamp(id) {
  const epoch = 1420070400000;
  const binary = BigInt(id) >> 22n;
  const timestamp = Number(binary) + epoch;
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

ipcMain.handle('get-app-settings', () => {
  return store.get('settings') || { theme: 'dark', accentColor: '#00d4aa', accentName: 'teal' };
});

ipcMain.handle('save-app-settings', (event, settings) => {
  store.set('settings', settings);
  
  const fs = require('fs');
  const iconFile = getIconForAccent(settings.accentName);
  const iconPath = path.join(__dirname, '../assets', iconFile);
  
  if (fs.existsSync(iconPath)) {
    mainWindow.setIcon(iconPath);
  } else {
    const defaultIcon = path.join(__dirname, '../assets/default.ico');
    if (fs.existsSync(defaultIcon)) {
      mainWindow.setIcon(defaultIcon);
    }
  }
  
  return { success: true };
});

ipcMain.on('minimize-window', () => mainWindow.minimize());
ipcMain.on('maximize-window', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('close-window', () => mainWindow.close());

ipcMain.on('open-manager', (event, managerType) => {
  console.log('open-manager received:', managerType);
  if (managerType === 'discord') {
    console.log('Loading Discord manager...');
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  } else if (managerType === 'password') {
    console.log('Loading Password manager...');
    mainWindow.loadFile(path.join(__dirname, 'renderer/password-manager.html'));
  } else {
    console.error('Unknown manager type:', managerType);
  }
});

ipcMain.handle('get-passwords', () => {
  const passwords = passwordStore.get('passwords');
  return passwords.map(pwd => ({
    id: pwd.id,
    username: pwd.username || null,
    email: pwd.email || null,
    site: pwd.site || null,
    photo: pwd.photo || null,
    hasPassword: !!pwd.encryptedPassword,
    hasNotes: !!pwd.encryptedNotes
  }));
});

ipcMain.handle('add-password', (event, passwordData, encryptionPassword) => {
  const passwords = passwordStore.get('passwords');
  const { username, email, password, site, photo, notes } = passwordData;
  
  const encryptedPassword = encryptChaCha20Poly1305(password, encryptionPassword);
  const encryptedNotes = notes ? encryptChaCha20Poly1305(notes, encryptionPassword) : null;
  
  const newPassword = {
    id: Date.now().toString(),
    username: username || null,
    email: email || null,
    site: site || null,
    photo: photo || null,
    encryptedPassword: encryptedPassword,
    encryptedNotes: encryptedNotes,
    createdAt: Date.now()
  };
  
  passwords.push(newPassword);
  passwordStore.set('passwords', passwords);
  
  return { success: true };
});

ipcMain.handle('update-password', (event, passwordId, passwordData, encryptionPassword) => {
  const passwords = passwordStore.get('passwords');
  const passwordIndex = passwords.findIndex(p => p.id === passwordId);
  
  if (passwordIndex === -1) {
    return { success: false, error: 'Password not found' };
  }
  
  const { username, email, password, site, photo, notes } = passwordData;
  
  const encryptedPassword = encryptChaCha20Poly1305(password, encryptionPassword);
  const encryptedNotes = notes ? encryptChaCha20Poly1305(notes, encryptionPassword) : null;
  
  passwords[passwordIndex] = {
    ...passwords[passwordIndex],
    username: username || null,
    email: email || null,
    site: site || null,
    photo: photo || null,
    encryptedPassword: encryptedPassword,
    encryptedNotes: encryptedNotes,
    updatedAt: Date.now()
  };
  
  passwordStore.set('passwords', passwords);
  
  return { success: true };
});

ipcMain.handle('delete-password', (event, passwordId) => {
  const passwords = passwordStore.get('passwords').filter(p => p.id !== passwordId);
  passwordStore.set('passwords', passwords);
  return { success: true };
});

ipcMain.handle('decrypt-password', (event, passwordId, encryptionPassword) => {
  const passwords = passwordStore.get('passwords');
  const password = passwords.find(p => p.id === passwordId);
  
  if (!password || !password.encryptedPassword) {
    return { success: false, error: 'Password not found' };
  }
  
  const decryptedPassword = decryptChaCha20Poly1305(password.encryptedPassword, encryptionPassword);
  if (!decryptedPassword.success) {
    return { success: false, error: 'Wrong password' };
  }
  
  let decryptedNotes = null;
  if (password.encryptedNotes) {
    const notesResult = decryptChaCha20Poly1305(password.encryptedNotes, encryptionPassword);
    if (notesResult.success) {
      decryptedNotes = notesResult.data;
    }
  }
  
  return {
    success: true,
    data: {
      username: password.username,
      email: password.email,
      password: decryptedPassword.data,
      site: password.site,
      photo: password.photo,
      notes: decryptedNotes
    }
  };
});

ipcMain.handle('open-launcher', () => {
  mainWindow.loadFile(path.join(__dirname, 'renderer/launcher.html'));
});
