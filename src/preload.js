const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (account, password) => ipcRenderer.invoke('add-account', { account, password }),
  deleteAccount: (accountId) => ipcRenderer.invoke('delete-account', accountId),
  decryptToken: (accountId, password) => ipcRenderer.invoke('decrypt-token', { accountId, password }),
  reorderAccounts: (fromIndex, toIndex) => ipcRenderer.invoke('reorder-accounts', { fromIndex, toIndex }),
  getAvailableIcons: () => ipcRenderer.invoke('get-available-icons'),
  saveAccountSettings: (accountId, nickname, color, icon) => 
    ipcRenderer.invoke('save-account-settings', { accountId, nickname, color, icon }),
  switchAccount: (accountId, password) => ipcRenderer.invoke('switch-account', { accountId, password }),
  validateToken: (token) => ipcRenderer.invoke('validate-token', token),
  getAccountDetails: (accountId, password) => ipcRenderer.invoke('get-account-details', { accountId, password }),
  getNotes: (accountId) => ipcRenderer.invoke('get-notes', accountId),
  saveNotes: (accountId, notes, password) => ipcRenderer.invoke('save-notes', { accountId, notes, password }),
  decryptNotes: (accountId, password) => ipcRenderer.invoke('decrypt-notes', { accountId, password }),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings: (settings) => ipcRenderer.invoke('save-app-settings', settings),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  getPasswords: () => ipcRenderer.invoke('get-passwords'),
  addPassword: (passwordData, encryptionPassword) => ipcRenderer.invoke('add-password', passwordData, encryptionPassword),
  updatePassword: (passwordId, passwordData, encryptionPassword) => ipcRenderer.invoke('update-password', passwordId, passwordData, encryptionPassword),
  deletePassword: (passwordId) => ipcRenderer.invoke('delete-password', passwordId),
  decryptPassword: (passwordId, encryptionPassword) => ipcRenderer.invoke('decrypt-password', passwordId, encryptionPassword),
  openLauncher: () => ipcRenderer.invoke('open-launcher'),
  openManager: (managerType) => ipcRenderer.send('open-manager', managerType)
});
