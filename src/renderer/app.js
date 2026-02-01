const accountsList = document.getElementById('accounts-list');
const addAccountBtn = document.getElementById('add-account-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const tokenInput = document.getElementById('token-input');
const toggleVisibility = document.getElementById('toggle-visibility');
const previewCard = document.getElementById('preview-card');
const previewAvatar = document.getElementById('preview-avatar');
const previewName = document.getElementById('preview-name');
const previewId = document.getElementById('preview-id');
const passwordInput = document.getElementById('password-input');
const confirmPasswordInput = document.getElementById('confirm-password-input');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const contextMenu = document.getElementById('context-menu');
const detailsPanel = document.getElementById('details-panel');

const passwordModal = document.getElementById('password-modal');
const passwordModalTitle = document.getElementById('password-modal-title');
const passwordModalDesc = document.getElementById('password-modal-desc');
const promptPasswordInput = document.getElementById('prompt-password-input');
const passwordError = document.getElementById('password-error');
const passwordCancelBtn = document.getElementById('password-cancel-btn');
const passwordConfirmBtn = document.getElementById('password-confirm-btn');
const passwordModalClose = document.getElementById('password-modal-close');

const notesModal = document.getElementById('notes-modal');
const notesAccountInfo = document.getElementById('notes-account-info');
const notesTextarea = document.getElementById('notes-textarea');
const encryptNotesCheckbox = document.getElementById('encrypt-notes-checkbox');
const notesPasswordGroup = document.getElementById('notes-password-group');
const notesPasswordInput = document.getElementById('notes-password-input');
const notesCancelBtn = document.getElementById('notes-cancel-btn');
const notesSaveBtn = document.getElementById('notes-save-btn');
const notesModalClose = document.getElementById('notes-modal-close');

const settingsModal = document.getElementById('settings-modal');
const settingsAccountInfo = document.getElementById('settings-account-info');
const settingsNickname = document.getElementById('settings-nickname');
const colorPicker = document.getElementById('color-picker');
const iconPicker = document.getElementById('icon-picker');
const settingsCancelBtn = document.getElementById('settings-cancel-btn');
const settingsSaveBtn = document.getElementById('settings-save-btn');
const settingsModalClose = document.getElementById('settings-modal-close');

const appSettingsModal = document.getElementById('app-settings-modal');
const appSettingsBtn = document.getElementById('app-settings-btn');
const appSettingsModalClose = document.getElementById('app-settings-modal-close');
const appSettingsCancelBtn = document.getElementById('app-settings-cancel-btn');
const appSettingsSaveBtn = document.getElementById('app-settings-save-btn');
const themePicker = document.getElementById('theme-picker');
const accentPicker = document.getElementById('accent-picker');
const themePreview = document.getElementById('theme-preview');

let accounts = [];
let currentValidatedUser = null;
let currentToken = null;
let selectedAccount = null;
let passwordPromiseResolve = null;
let currentAction = null;
let selectedColor = null;
let selectedIcon = 'default.ico';
let appSettings = { theme: 'dark', accentColor: '#00d4aa', accentName: 'teal' };

let unlockedAccounts = new Map();

let draggedElement = null;
let draggedIndex = null;

function handleDragStart(e) {
  draggedElement = this;
  draggedIndex = parseInt(this.dataset.index);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.account-card').forEach(card => {
    card.classList.remove('drag-over');
  });
  draggedElement = null;
  draggedIndex = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  if (this !== draggedElement) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  if (this === draggedElement) return;
  
  const fromIndex = draggedIndex;
  const toIndex = parseInt(this.dataset.index);
  
  if (fromIndex === toIndex) return;
  
  const result = await window.api.reorderAccounts(fromIndex, toIndex);
  if (result.success) {
    accounts = result.accounts;
    renderAccounts();
  }
}

async function init() {
  appSettings = await window.api.getAppSettings();
  applyTheme(appSettings);
  
  accounts = await window.api.getAccounts();
  renderAccounts();
  setupEventListeners();
}

function applyTheme(settings) {
  const root = document.documentElement;
  
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(`theme-${settings.theme}`);
  
  root.style.setProperty('--accent-primary', settings.accentColor);
  
  const darkerAccent = adjustColor(settings.accentColor, -20);
  root.style.setProperty('--accent-secondary', darkerAccent);
  
  root.style.setProperty('--accent-glow', `${settings.accentColor}4d`);
  
  const hex = settings.accentColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  root.style.setProperty('--accent-bg-gradient', `rgba(${r}, ${g}, ${b}, 0.25)`);
}

function adjustColor(color, amount) {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function renderAccounts() {
  if (accounts.length === 0) {
    accountsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
          <path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h3>No accounts yet</h3>
        <p>Add your first Discord account to get started</p>
      </div>
    `;
    return;
  }

  accountsList.innerHTML = accounts.map((account, index) => {
    const displayName = account.nickname || account.globalName || account.username;
    const colorStyle = account.color ? `--account-color: ${account.color};` : '';
    const hasColor = account.color ? 'has-color' : '';
    const isUnlocked = unlockedAccounts.has(account.id);
    const unlockClass = isUnlocked ? 'unlocked' : '';
    const hasNitro = account.premium && account.premium > 0;
    
    return `
    <div class="account-card ${hasColor} ${unlockClass}" data-id="${account.id}" data-index="${index}" draggable="true" style="animation-delay: ${index * 50}ms; ${colorStyle}" title="${isUnlocked ? 'Right-click for options' : 'Click to unlock'}">
      <img 
        class="account-avatar" 
        src="${getAvatarUrl(account)}" 
        alt="${account.username}"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a26%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%238888a0%22 font-size=%2240%22>${account.username.charAt(0).toUpperCase()}</text></svg>'"
      >
      <div class="account-info">
        <span class="account-name">
          ${displayName}
          ${hasNitro ? '<img src="../../assets/discord.png" class="nitro-badge" alt="Nitro" title="Discord Nitro">' : ''}
        </span>
        <span class="account-tag">@${account.username}</span>
      </div>
      <div class="account-badges">
        ${account.notes ? '<span class="badge-notes" title="Has notes"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/></svg></span>' : ''}
      </div>
      <div class="account-actions">
        <button class="action-btn switch-btn" title="${isUnlocked ? 'Open Discord' : 'Unlock account'}" data-id="${account.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 3h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="action-btn danger delete-btn" title="Delete account" data-id="${account.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  }).join('');

  document.querySelectorAll('.account-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.action-btn')) {
        handleUnlockAccount(card.dataset.id);
      }
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, card.dataset.id);
    });

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragenter', handleDragEnter);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
  });

  document.querySelectorAll('.switch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const accountId = btn.dataset.id;
      if (unlockedAccounts.has(accountId)) {
        handleSwitchAccount(accountId);
      } else {
        handleUnlockAccount(accountId);
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteAccount(btn.dataset.id);
    });
  });
}

function getAvatarUrl(account) {
  if (account.avatar) {
    const ext = account.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.${ext}?size=128`;
  }
  const defaultIndex = account.discriminator === '0' 
    ? (BigInt(account.id) >> 22n) % 6n 
    : parseInt(account.discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

function setupEventListeners() {
  addAccountBtn.addEventListener('click', openAddModal);
  modalClose.addEventListener('click', closeAddModal);
  cancelBtn.addEventListener('click', closeAddModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeAddModal();
  });

  tokenInput.addEventListener('input', debounce(validateToken, 500));
  toggleVisibility.addEventListener('click', () => {
    tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
  });

  passwordInput.addEventListener('input', checkSaveButton);
  confirmPasswordInput.addEventListener('input', checkSaveButton);
  saveBtn.addEventListener('click', saveAccount);

  passwordModalClose.addEventListener('click', closePasswordModal);
  passwordCancelBtn.addEventListener('click', closePasswordModal);
  passwordConfirmBtn.addEventListener('click', confirmPassword);
  passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) closePasswordModal();
  });
  promptPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmPassword();
  });

  notesModalClose.addEventListener('click', closeNotesModal);
  notesCancelBtn.addEventListener('click', closeNotesModal);
  notesSaveBtn.addEventListener('click', saveNotes);
  notesModal.addEventListener('click', (e) => {
    if (e.target === notesModal) closeNotesModal();
  });
  encryptNotesCheckbox.addEventListener('change', () => {
    notesPasswordGroup.classList.toggle('visible', encryptNotesCheckbox.checked);
  });

  settingsModalClose.addEventListener('click', closeSettingsModal);
  settingsCancelBtn.addEventListener('click', closeSettingsModal);
  settingsSaveBtn.addEventListener('click', saveSettings);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });
  
  colorPicker.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      colorPicker.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedColor = btn.dataset.color || null;
    });
  });

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) hideContextMenu();
  });
  
  contextMenu.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', () => handleContextAction(item.dataset.action));
  });

  const detailsItem = document.querySelector('.context-item.has-details');
  if (detailsItem) {
    detailsItem.addEventListener('mouseenter', showDetailsPanel);
    detailsItem.addEventListener('mouseleave', startHideDetailsTimer);
  }
  detailsPanel.addEventListener('mouseenter', cancelHideDetailsTimer);
  detailsPanel.addEventListener('mouseleave', hideDetailsPanel);

  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.api.openLauncher();
    });
  }

  appSettingsBtn.addEventListener('click', openAppSettingsModal);
  appSettingsModalClose.addEventListener('click', closeAppSettingsModal);
  appSettingsCancelBtn.addEventListener('click', closeAppSettingsModal);
  appSettingsSaveBtn.addEventListener('click', saveAppSettings);
  appSettingsModal.addEventListener('click', (e) => {
    if (e.target === appSettingsModal) closeAppSettingsModal();
  });
  
  themePicker.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      themePicker.querySelectorAll('.theme-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updateThemePreview();
    });
  });
  
  accentPicker.querySelectorAll('.accent-option').forEach(btn => {
    btn.addEventListener('click', () => {
      accentPicker.querySelectorAll('.accent-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updateThemePreview();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAddModal();
      closePasswordModal();
      closeNotesModal();
      closeAppSettingsModal();
      hideContextMenu();
    }
  });
}

function openAddModal() {
  modalOverlay.classList.add('active');
  tokenInput.value = '';
  passwordInput.value = '';
  confirmPasswordInput.value = '';
  tokenInput.focus();
  resetPreview();
  currentValidatedUser = null;
  currentToken = null;
  saveBtn.disabled = true;
}

function closeAddModal() {
  modalOverlay.classList.remove('active');
  resetPreview();
}

function resetPreview() {
  previewCard.classList.remove('visible', 'loading', 'valid', 'invalid');
}

function checkSaveButton() {
  const hasValidToken = currentValidatedUser !== null;
  const hasPassword = passwordInput.value.length >= 4;
  const passwordsMatch = passwordInput.value === confirmPasswordInput.value;
  
  saveBtn.disabled = !(hasValidToken && hasPassword && passwordsMatch);
  
  if (confirmPasswordInput.value && !passwordsMatch) {
    confirmPasswordInput.style.borderColor = 'var(--danger)';
  } else {
    confirmPasswordInput.style.borderColor = '';
  }
}

async function validateToken() {
  const token = tokenInput.value.trim();
  
  if (!token) {
    resetPreview();
    currentValidatedUser = null;
    currentToken = null;
    checkSaveButton();
    return;
  }

  previewCard.classList.add('visible', 'loading');
  previewCard.classList.remove('valid', 'invalid');

  try {
    const result = await window.api.validateToken(token);
    previewCard.classList.remove('loading');

    if (result.valid) {
      currentValidatedUser = result.user;
      currentToken = token;
      
      previewCard.classList.add('valid');
      previewAvatar.src = getAvatarUrl(result.user);
      previewName.textContent = result.user.globalName || result.user.username;
      previewId.textContent = `@${result.user.username}`;
    } else {
      previewCard.classList.add('invalid');
      currentValidatedUser = null;
      currentToken = null;
    }
  } catch (error) {
    previewCard.classList.remove('loading');
    previewCard.classList.add('invalid');
    currentValidatedUser = null;
    currentToken = null;
  }
  
  checkSaveButton();
}

async function saveAccount() {
  if (!currentValidatedUser || !currentToken) return;
  
  const password = passwordInput.value;
  if (password.length < 4) {
    showStatus('Password must be at least 4 characters', 'error');
    return;
  }
  
  if (password !== confirmPasswordInput.value) {
    showStatus('Passwords do not match', 'error');
    return;
  }

  const account = {
    id: currentValidatedUser.id,
    username: currentValidatedUser.username,
    discriminator: currentValidatedUser.discriminator,
    avatar: currentValidatedUser.avatar,
    globalName: currentValidatedUser.globalName,
    email: currentValidatedUser.email,
    phone: currentValidatedUser.phone,
    verified: currentValidatedUser.verified,
    mfaEnabled: currentValidatedUser.mfaEnabled,
    premium: currentValidatedUser.premium || 0,
    token: currentToken
  };

  accounts = await window.api.addAccount(account, password);
  renderAccounts();
  closeAddModal();
  showStatus('Account encrypted and saved', 'success');
}

function promptPassword(title, description) {
  return new Promise((resolve) => {
    passwordPromiseResolve = resolve;
    passwordModalTitle.textContent = title;
    passwordModalDesc.textContent = description;
    promptPasswordInput.value = '';
    passwordError.textContent = '';
    passwordModal.classList.add('active');
    promptPasswordInput.focus();
  });
}

function closePasswordModal() {
  passwordModal.classList.remove('active');
  if (passwordPromiseResolve) {
    passwordPromiseResolve(null);
    passwordPromiseResolve = null;
  }
}

function confirmPassword() {
  const password = promptPasswordInput.value;
  if (!password) {
    passwordError.textContent = 'Please enter a password';
    return;
  }
  
  passwordModal.classList.remove('active');
  if (passwordPromiseResolve) {
    passwordPromiseResolve(password);
    passwordPromiseResolve = null;
  }
}

async function openNotesModal(accountId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;
  
  selectedAccount = account;
  
  notesAccountInfo.innerHTML = `
    <img src="${getAvatarUrl(account)}" alt="${account.username}" class="notes-avatar">
    <div class="notes-account-name">
      <span>${account.globalName || account.username}</span>
      <span class="notes-account-tag">@${account.username}</span>
    </div>
  `;
  
  const result = await window.api.getNotes(accountId);
  
  if (result.success) {
    if (result.isEncrypted) {
      const password = await promptPassword('Decrypt Notes', 'Enter password to view encrypted notes');
      if (password) {
        const decrypted = await window.api.decryptNotes(accountId, password);
        if (decrypted.success) {
          notesTextarea.value = decrypted.data;
        } else {
          showStatus('Wrong password for notes', 'error');
          notesTextarea.value = '';
        }
      } else {
        notesTextarea.value = '';
      }
      encryptNotesCheckbox.checked = true;
      notesPasswordGroup.classList.add('visible');
    } else {
      notesTextarea.value = result.notes;
      encryptNotesCheckbox.checked = false;
      notesPasswordGroup.classList.remove('visible');
    }
  } else {
    notesTextarea.value = '';
  }
  
  notesPasswordInput.value = '';
  notesModal.classList.add('active');
  notesTextarea.focus();
}

function closeNotesModal() {
  notesModal.classList.remove('active');
}

async function saveNotes() {
  if (!selectedAccount) return;
  
  const notes = notesTextarea.value;
  const encrypt = encryptNotesCheckbox.checked;
  const password = encrypt ? notesPasswordInput.value : null;
  
  if (encrypt && (!password || password.length < 4)) {
    showStatus('Password must be at least 4 characters', 'error');
    return;
  }
  
  const result = await window.api.saveNotes(selectedAccount.id, notes, password);
  
  if (result.success) {
    accounts = await window.api.getAccounts();
    renderAccounts();
    closeNotesModal();
    showStatus('Notes saved' + (encrypt ? ' (encrypted)' : ''), 'success');
  } else {
    showStatus('Failed to save notes', 'error');
  }
}

async function handleUnlockAccount(accountId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;

  if (unlockedAccounts.has(accountId)) {
    showStatus(`${account.nickname || account.globalName || account.username} is already unlocked`, 'success');
    return;
  }

  const password = await promptPassword(
    'Unlock Account',
    `Enter password to unlock ${account.globalName || account.username}`
  );
  
  if (!password) return;

  showStatus('Unlocking...', 'loading');

  const tokenResult = await window.api.decryptToken(accountId, password);
  
  if (!tokenResult.success) {
    showStatus('Wrong password', 'error');
    return;
  }

  const detailsResult = await window.api.getAccountDetails(accountId, password);
  
  unlockedAccounts.set(accountId, {
    token: tokenResult.data,
    details: detailsResult.success ? detailsResult.details : null,
    password: password
  });

  const card = document.querySelector(`.account-card[data-id="${accountId}"]`);
  if (card) {
    card.classList.add('unlocked');
  }

  showStatus(`${account.nickname || account.globalName || account.username} unlocked`, 'success');
}

async function handleSwitchAccount(accountId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;

  let password;
  
  if (unlockedAccounts.has(accountId)) {
    password = unlockedAccounts.get(accountId).password;
  } else {
    password = await promptPassword(
      'Open Discord',
      `Enter password for ${account.globalName || account.username}`
    );
    
    if (!password) return;
  }

  showStatus('Opening Discord...', 'loading');

  const result = await window.api.switchAccount(accountId, password);

  if (result.success) {
    showStatus(`Opened Discord for ${account.nickname || account.globalName || account.username}`, 'success');
    
    if (!unlockedAccounts.has(accountId)) {
      const tokenResult = await window.api.decryptToken(accountId, password);
      if (tokenResult.success) {
        unlockedAccounts.set(accountId, { token: tokenResult.data, password: password });
        const card = document.querySelector(`.account-card[data-id="${accountId}"]`);
        if (card) card.classList.add('unlocked');
      }
    }
  } else {
    showStatus(result.error || 'Failed to open Discord', 'error');
  }
}

async function handleDeleteAccount(accountId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;

  const card = document.querySelector(`.account-card[data-id="${accountId}"]`);
  if (card) {
    card.style.transform = 'translateX(100%)';
    card.style.opacity = '0';
    card.style.transition = 'all 0.3s ease';
  }

  setTimeout(async () => {
    accounts = await window.api.deleteAccount(accountId);
    renderAccounts();
    showStatus('Account removed', 'success');
  }, 300);
}

async function handleCopyToken(accountId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;

  const password = await promptPassword(
    'Decrypt Token',
    `Enter password to copy token for ${account.globalName || account.username}`
  );
  
  if (!password) return;

  const result = await window.api.decryptToken(accountId, password);
  
  if (result.success) {
    await navigator.clipboard.writeText(result.data);
    showStatus('Token copied to clipboard', 'success');
  } else {
    showStatus('Wrong password', 'error');
  }
}

function showContextMenu(e, accountId) {
  selectedAccount = accounts.find(a => a.id === accountId);
  if (!selectedAccount) return;
  
  const x = Math.min(e.clientX, window.innerWidth - 200);
  const y = Math.min(e.clientY, window.innerHeight - 250);
  
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.add('active');
}

function hideContextMenu() {
  contextMenu.classList.remove('active');
  hideDetailsPanel();
}

function handleContextAction(action) {
  if (!selectedAccount) return;

  const accountId = selectedAccount.id;
  hideContextMenu();

  switch (action) {
    case 'open':
      handleSwitchAccount(accountId);
      break;
    case 'settings':
      openSettingsModal(accountId);
      break;
    case 'notes':
      openNotesModal(accountId);
      break;
    case 'copy':
      handleCopyToken(accountId);
      break;
    case 'delete':
      handleDeleteAccount(accountId);
      break;
    case 'details':
      break;
  }
}

async function openSettingsModal(accountId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;
  
  selectedAccount = account;
  
  settingsAccountInfo.innerHTML = `
    <img src="${getAvatarUrl(account)}" alt="${account.username}" class="settings-avatar">
    <div class="settings-account-name">
      <span>${account.globalName || account.username}</span>
      <span class="settings-account-tag">@${account.username}</span>
    </div>
  `;
  
  settingsNickname.value = account.nickname || '';
  selectedColor = account.color || null;
  selectedIcon = account.icon || 'default.ico';
  
  colorPicker.querySelectorAll('.color-option').forEach(btn => {
    btn.classList.toggle('selected', (btn.dataset.color || null) === selectedColor);
  });
  
  await loadIconPicker();
  
  settingsModal.classList.add('active');
  settingsNickname.focus();
}

async function loadIconPicker() {
  const icons = await window.api.getAvailableIcons();
  
  iconPicker.innerHTML = icons.map(icon => `
    <button class="icon-option ${icon === selectedIcon ? 'selected' : ''}" data-icon="${icon}" title="${icon}">
      <span class="icon-name">${icon.replace('.ico', '').replace('.png', '')}</span>
    </button>
  `).join('');
  
  iconPicker.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      iconPicker.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIcon = btn.dataset.icon;
    });
  });
}

function closeSettingsModal() {
  settingsModal.classList.remove('active');
}

async function saveSettings() {
  if (!selectedAccount) return;
  
  const nickname = settingsNickname.value.trim() || null;
  
  const result = await window.api.saveAccountSettings(
    selectedAccount.id,
    nickname,
    selectedColor,
    selectedIcon
  );
  
  if (result.success) {
    accounts = await window.api.getAccounts();
    renderAccounts();
    closeSettingsModal();
    showStatus('Settings saved', 'success');
  } else {
    showStatus('Failed to save settings', 'error');
  }
}

let hideDetailsTimeout = null;
let detailsCache = new Map();

async function showDetailsPanel() {
  if (!selectedAccount) return;
  
  cancelHideDetailsTimer();
  
  const menuRect = contextMenu.getBoundingClientRect();
  const panelWidth = 280;
  
  let left = menuRect.right + 8;
  if (left + panelWidth > window.innerWidth) {
    left = menuRect.left - panelWidth - 8;
  }
  
  detailsPanel.style.left = `${left}px`;
  detailsPanel.style.top = `${menuRect.top}px`;
  
  const isUnlocked = unlockedAccounts.has(selectedAccount.id);
  const unlockedData = isUnlocked ? unlockedAccounts.get(selectedAccount.id) : null;
  
  const maskEmail = (email) => {
    if (!isUnlocked) return '🔒 Locked';
    if (!email) return 'Not set';
    const [user, domain] = email.split('@');
    if (!domain) return email;
    return `${user.charAt(0)}•••@${domain}`;
  };
  
  const maskPhone = (phone) => {
    if (!isUnlocked) return '🔒 Locked';
    if (!phone) return 'Not linked';
    return `•••••${phone.slice(-4)}`;
  };
  
  const getBillingText = () => {
    if (!isUnlocked) return '🔒 Locked';
    if (!unlockedData?.details?.billing) return 'No data';
    const billing = unlockedData.details.billing;
    if (billing.length === 0) return 'No payment methods';
    return billing.map(b => {
      if (b.type === 1) return `${b.brand || 'Card'} ••${b.last4}`;
      if (b.type === 2) return `PayPal: ${b.paypalEmail || 'linked'}`;
      return 'Payment method';
    }).join(', ');
  };
  
  const lockState = isUnlocked ? 'unlocked' : 'locked';
  const lockIcon = isUnlocked ? '🔓' : '🔒';
  
  detailsPanel.innerHTML = `
    <div class="details-header">
      <span class="details-title">Account Info</span>
      <span class="unlock-status ${lockState}">${lockIcon}</span>
    </div>
    <div class="details-grid">
      <div class="detail-item">
        <div class="detail-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="detail-content">
          <span class="detail-label">Username</span>
          <span class="detail-value">@${selectedAccount.username}</span>
        </div>
      </div>
      <div class="detail-item hoverable ${isUnlocked ? 'can-reveal' : ''}" data-field="email">
        <div class="detail-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="detail-content">
          <span class="detail-label">Email</span>
          <span class="detail-value masked">${maskEmail(selectedAccount.email)}</span>
          <span class="detail-value revealed">${isUnlocked ? (selectedAccount.email || 'Not set') : '🔒 Locked'}</span>
        </div>
        <span class="lock-icon">${lockIcon}</span>
      </div>
      <div class="detail-item hoverable ${isUnlocked ? 'can-reveal' : ''}" data-field="phone">
        <div class="detail-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="18" x2="12" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="detail-content">
          <span class="detail-label">Phone</span>
          <span class="detail-value masked">${maskPhone(selectedAccount.phone)}</span>
          <span class="detail-value revealed">${isUnlocked ? (selectedAccount.phone || 'Not linked') : '🔒 Locked'}</span>
        </div>
        <span class="lock-icon">${lockIcon}</span>
      </div>
      <div class="detail-item hoverable ${isUnlocked ? 'can-reveal' : ''}" data-field="billing">
        <div class="detail-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
            <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="detail-content">
          <span class="detail-label">Billing</span>
          <span class="detail-value masked">•••• connected</span>
          <span class="detail-value revealed">${getBillingText()}</span>
        </div>
        <span class="lock-icon">${lockIcon}</span>
      </div>
    </div>
    <div class="details-footer">
      <div class="detail-badge ${selectedAccount.verified ? 'active' : ''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Verified
      </div>
      <div class="detail-badge ${selectedAccount.mfaEnabled ? 'active' : ''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2"/>
        </svg>
        2FA
      </div>
    </div>
    <div class="hover-hint">${isUnlocked ? 'Hover to reveal details' : 'Click account to unlock'}</div>
  `;
  
  detailsPanel.classList.add('active');
}


function renderDetails(details) {
  const maskEmail = (email) => {
    if (!email || email === 'Not available') return 'Not available';
    const [user, domain] = email.split('@');
    if (!domain) return email;
    const masked = user.substring(0, 2) + '•'.repeat(Math.max(user.length - 2, 3));
    return `${masked}@${domain}`;
  };
  
  const maskPhone = (phone) => {
    if (!phone || phone === 'Not linked') return 'Not linked';
    return phone.slice(0, -4).replace(/./g, '•') + phone.slice(-4);
  };
  
  const getPremiumBadge = (type) => {
    switch(type) {
      case 1: return '<span class="badge nitro-classic">Nitro Classic</span>';
      case 2: return '<span class="badge nitro">Nitro</span>';
      case 3: return '<span class="badge nitro-basic">Nitro Basic</span>';
      default: return '<span class="badge none">No Nitro</span>';
    }
  };
  
  detailsPanel.innerHTML = `
    <div class="details-header">
      <span class="details-title">Account Details</span>
      ${getPremiumBadge(details.premium)}
    </div>
    <div class="details-grid">
      <div class="detail-item" data-field="email">
        <div class="detail-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="detail-content">
          <span class="detail-label">Email</span>
          <span class="detail-value masked">${maskEmail(details.email)}</span>
          <span class="detail-value revealed">${details.email}</span>
        </div>
      </div>
      <div class="detail-item" data-field="phone">
        <div class="detail-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="18" x2="12" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="detail-content">
          <span class="detail-label">Phone</span>
          <span class="detail-value masked">${maskPhone(details.phone)}</span>
          <span class="detail-value revealed">${details.phone}</span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="detail-content">
          <span class="detail-label">Created</span>
          <span class="detail-value">${details.createdAt}</span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="detail-content">
          <span class="detail-label">Servers</span>
          <span class="detail-value">${details.guildCount} servers</span>
        </div>
      </div>
    </div>
    <div class="details-footer">
      <div class="detail-badge ${details.verified ? 'active' : ''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Verified
      </div>
      <div class="detail-badge ${details.mfaEnabled ? 'active' : ''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2"/>
        </svg>
        2FA
      </div>
    </div>
    <div class="hover-hint">Hover over email/phone to reveal</div>
  `;
}

function startHideDetailsTimer() {
  hideDetailsTimeout = setTimeout(hideDetailsPanel, 300);
}

function cancelHideDetailsTimer() {
  if (hideDetailsTimeout) {
    clearTimeout(hideDetailsTimeout);
    hideDetailsTimeout = null;
  }
}

function hideDetailsPanel() {
  cancelHideDetailsTimer();
  detailsPanel.classList.remove('active');
}

function showStatus(message, type = 'default') {
  statusBar.className = 'status-bar ' + type;
  statusText.textContent = message;

  if (type !== 'loading') {
    setTimeout(() => {
      statusBar.className = 'status-bar';
      statusText.textContent = 'Ready';
    }, 3000);
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function openAppSettingsModal() {
  themePicker.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.theme === appSettings.theme);
  });
  
  accentPicker.querySelectorAll('.accent-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.color === appSettings.accentColor);
  });
  
  updateThemePreview();
  appSettingsModal.classList.add('active');
}

function closeAppSettingsModal() {
  appSettingsModal.classList.remove('active');
}

function updateThemePreview() {
  const selectedTheme = themePicker.querySelector('.theme-option.selected')?.dataset.theme || 'dark';
  const selectedAccent = accentPicker.querySelector('.accent-option.selected')?.dataset.color || '#00d4aa';
  
  themePreview.className = `theme-preview preview-${selectedTheme}`;
  themePreview.style.setProperty('--preview-accent', selectedAccent);
}

async function saveAppSettings() {
  const selectedTheme = themePicker.querySelector('.theme-option.selected')?.dataset.theme || 'dark';
  const selectedAccentBtn = accentPicker.querySelector('.accent-option.selected');
  const selectedAccent = selectedAccentBtn?.dataset.color || '#00d4aa';
  const selectedAccentName = selectedAccentBtn?.dataset.name || 'teal';
  
  const newSettings = {
    theme: selectedTheme,
    accentColor: selectedAccent,
    accentName: selectedAccentName
  };
  
  const result = await window.api.saveAppSettings(newSettings);
  
  if (result.success) {
    appSettings = newSettings;
    applyTheme(newSettings);
    closeAppSettingsModal();
    showStatus('Theme updated', 'success');
  } else {
    showStatus('Failed to save settings', 'error');
  }
}

init();
