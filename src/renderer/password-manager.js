const passwordsList = document.getElementById('passwords-list');
const addPasswordBtn = document.getElementById('add-password-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const contextMenu = document.getElementById('context-menu');
const backBtn = document.getElementById('back-btn');

const passwordModal = document.getElementById('password-modal');
const passwordModalDesc = document.getElementById('password-modal-desc');
const promptPasswordInput = document.getElementById('prompt-password-input');
const passwordError = document.getElementById('password-error');
const passwordCancelBtn = document.getElementById('password-cancel-btn');
const passwordConfirmBtn = document.getElementById('password-confirm-btn');
const passwordModalClose = document.getElementById('password-modal-close');

const appSettingsModal = document.getElementById('app-settings-modal');
const appSettingsBtn = document.getElementById('app-settings-btn');
const appSettingsModalClose = document.getElementById('app-settings-modal-close');
const appSettingsCancelBtn = document.getElementById('app-settings-cancel-btn');
const appSettingsSaveBtn = document.getElementById('app-settings-save-btn');
const themePicker = document.getElementById('theme-picker');
const accentPicker = document.getElementById('accent-picker');

const passwordUsername = document.getElementById('password-username');
const passwordEmail = document.getElementById('password-email');
const passwordPassword = document.getElementById('password-password');
const passwordSite = document.getElementById('password-site');
const passwordPhoto = document.getElementById('password-photo');
const passwordNotes = document.getElementById('password-notes');
const encryptionPassword = document.getElementById('encryption-password');
const togglePasswordVisibility = document.getElementById('toggle-password-visibility');

let passwords = [];
let selectedPassword = null;
let passwordPromiseResolve = null;
let appSettings = { theme: 'dark', accentColor: '#00d4aa', accentName: 'teal' };
let unlockedPasswords = new Map();
let isEditing = false;

async function init() {
  appSettings = await window.api.getAppSettings();
  applyTheme(appSettings);
  
  passwords = await window.api.getPasswords();
  renderPasswords();
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

function renderPasswords() {
  if (passwords.length === 0) {
    passwordsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2"/>
        </svg>
        <h3>No passwords yet</h3>
        <p>Add your first password entry to get started</p>
      </div>
    `;
    return;
  }

  passwordsList.innerHTML = passwords.map((password, index) => {
    const isUnlocked = unlockedPasswords.has(password.id);
    const unlockClass = isUnlocked ? 'unlocked' : '';
    let siteName = 'No site';
    if (password.site) {
      try {
        siteName = new URL(password.site).hostname.replace('www.', '');
      } catch (e) {
        siteName = password.site;
      }
    }
    const displayName = password.username || password.email || siteName;
    const photoUrl = password.photo || `https://www.google.com/s2/favicons?domain=${password.site || 'example.com'}&sz=128`;
    
    return `
    <div class="account-card ${unlockClass}" data-id="${password.id}" data-index="${index}" style="animation-delay: ${index * 50}ms;" title="${isUnlocked ? 'Right-click for options' : 'Click to unlock'}">
      <img 
        class="account-avatar" 
        src="${photoUrl}" 
        alt="${displayName}"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a26%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%238888a0%22 font-size=%2240%22>${displayName.charAt(0).toUpperCase()}</text></svg>'"
      >
      <div class="account-info">
        <span class="account-name">${displayName}</span>
        <span class="account-tag">${siteName}</span>
      </div>
      <div class="account-badges">
        ${password.notes ? '<span class="badge-notes" title="Has notes"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/></svg></span>' : ''}
      </div>
      <div class="account-actions">
        <button class="action-btn switch-btn" title="${isUnlocked ? 'View details' : 'Unlock entry'}" data-id="${password.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="action-btn danger delete-btn" title="Delete entry" data-id="${password.id}">
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
        handleUnlockPassword(card.dataset.id);
      }
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, card.dataset.id);
    });
  });

  document.querySelectorAll('.switch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const passwordId = btn.dataset.id;
      if (unlockedPasswords.has(passwordId)) {
        viewPasswordDetails(passwordId);
      } else {
        handleUnlockPassword(passwordId);
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeletePassword(btn.dataset.id);
    });
  });
}

function setupEventListeners() {
  backBtn.addEventListener('click', () => {
    window.api.openLauncher();
  });

  addPasswordBtn.addEventListener('click', openAddModal);
  modalClose.addEventListener('click', closeAddModal);
  cancelBtn.addEventListener('click', closeAddModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeAddModal();
  });

  togglePasswordVisibility.addEventListener('click', () => {
    passwordPassword.type = passwordPassword.type === 'password' ? 'text' : 'password';
  });

  saveBtn.addEventListener('click', savePassword);

  passwordModalClose.addEventListener('click', closePasswordModal);
  passwordCancelBtn.addEventListener('click', closePasswordModal);
  passwordConfirmBtn.addEventListener('click', confirmPassword);
  passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) closePasswordModal();
  });
  promptPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmPassword();
  });

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) hideContextMenu();
  });
  
  contextMenu.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', () => handleContextAction(item.dataset.action));
  });

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
    });
  });
  
  accentPicker.querySelectorAll('.accent-option').forEach(btn => {
    btn.addEventListener('click', () => {
      accentPicker.querySelectorAll('.accent-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAddModal();
      closePasswordModal();
      closeAppSettingsModal();
      hideContextMenu();
    }
  });
}

function openAddModal() {
  isEditing = false;
  modalTitle.textContent = 'Add Password';
  modalOverlay.classList.add('active');
  passwordUsername.value = '';
  passwordEmail.value = '';
  passwordPassword.value = '';
  passwordSite.value = '';
  passwordPhoto.value = '';
  passwordNotes.value = '';
  encryptionPassword.value = '';
  passwordUsername.focus();
}

function closeAddModal() {
  modalOverlay.classList.remove('active');
  isEditing = false;
  selectedPassword = null;
}

async function savePassword() {
  const username = passwordUsername.value.trim();
  const email = passwordEmail.value.trim();
  const password = passwordPassword.value;
  const site = passwordSite.value.trim();
  const photo = passwordPhoto.value.trim();
  const notes = passwordNotes.value.trim();
  const encryptionPwd = encryptionPassword.value;

  if (!encryptionPwd || encryptionPwd.length < 4) {
    showStatus('Encryption password must be at least 4 characters', 'error');
    return;
  }

  if (!password) {
    showStatus('Password is required', 'error');
    return;
  }

  const passwordData = {
    username,
    email,
    password,
    site,
    photo,
    notes
  };

  if (isEditing && selectedPassword) {
    const result = await window.api.updatePassword(selectedPassword.id, passwordData, encryptionPwd);
    if (result.success) {
      passwords = await window.api.getPasswords();
      renderPasswords();
      closeAddModal();
      showStatus('Password updated', 'success');
    } else {
      showStatus(result.error || 'Failed to update password', 'error');
    }
  } else {
    const result = await window.api.addPassword(passwordData, encryptionPwd);
    if (result.success) {
      passwords = await window.api.getPasswords();
      renderPasswords();
      closeAddModal();
      showStatus('Password encrypted and saved', 'success');
    } else {
      showStatus(result.error || 'Failed to save password', 'error');
    }
  }
}

function promptPassword(title, description) {
  return new Promise((resolve) => {
    passwordPromiseResolve = resolve;
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

async function handleUnlockPassword(passwordId) {
  const password = passwords.find(p => p.id === passwordId);
  if (!password) return;

  if (unlockedPasswords.has(passwordId)) {
    showStatus('Password entry is already unlocked', 'success');
    return;
  }

  const encryptionPwd = await promptPassword(
    'Unlock Entry',
    `Enter encryption password for ${password.username || password.email || 'this entry'}`
  );
  
  if (!encryptionPwd) return;

  showStatus('Unlocking...', 'loading');

  const result = await window.api.decryptPassword(passwordId, encryptionPwd);
  
  if (!result.success) {
    showStatus('Wrong password', 'error');
    return;
  }

  unlockedPasswords.set(passwordId, {
    data: result.data,
    encryptionPwd: encryptionPwd
  });

  const card = document.querySelector(`.account-card[data-id="${passwordId}"]`);
  if (card) {
    card.classList.add('unlocked');
  }

  showStatus('Entry unlocked', 'success');
}

async function viewPasswordDetails(passwordId) {
  const password = passwords.find(p => p.id === passwordId);
  if (!password) return;

  if (!unlockedPasswords.has(passwordId)) {
    await handleUnlockPassword(passwordId);
    if (!unlockedPasswords.has(passwordId)) return;
  }

  const unlocked = unlockedPasswords.get(passwordId);
  const data = unlocked.data;

  const details = `
Username: ${data.username || 'N/A'}
Email: ${data.email || 'N/A'}
Password: ${data.password || 'N/A'}
Site: ${data.site || 'N/A'}
Notes: ${data.notes || 'N/A'}
  `.trim();

  alert(details);
}

async function handleDeletePassword(passwordId) {
  const password = passwords.find(p => p.id === passwordId);
  if (!password) return;

  const card = document.querySelector(`.account-card[data-id="${passwordId}"]`);
  if (card) {
    card.style.transform = 'translateX(100%)';
    card.style.opacity = '0';
    card.style.transition = 'all 0.3s ease';
  }

  setTimeout(async () => {
    const result = await window.api.deletePassword(passwordId);
    if (result.success) {
      passwords = await window.api.getPasswords();
      unlockedPasswords.delete(passwordId);
      renderPasswords();
      showStatus('Password entry removed', 'success');
    } else {
      showStatus('Failed to delete entry', 'error');
    }
  }, 300);
}

async function handleCopyPassword(passwordId) {
  const password = passwords.find(p => p.id === passwordId);
  if (!password) return;

  if (!unlockedPasswords.has(passwordId)) {
    await handleUnlockPassword(passwordId);
    if (!unlockedPasswords.has(passwordId)) return;
  }

  const unlocked = unlockedPasswords.get(passwordId);
  await navigator.clipboard.writeText(unlocked.data.password);
  showStatus('Password copied to clipboard', 'success');
}

function showContextMenu(e, passwordId) {
  selectedPassword = passwords.find(p => p.id === passwordId);
  if (!selectedPassword) return;
  
  const x = Math.min(e.clientX, window.innerWidth - 200);
  const y = Math.min(e.clientY, window.innerHeight - 250);
  
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.add('active');
}

function hideContextMenu() {
  contextMenu.classList.remove('active');
}

function handleContextAction(action) {
  if (!selectedPassword) return;

  const passwordId = selectedPassword.id;
  hideContextMenu();

  switch (action) {
    case 'view':
      viewPasswordDetails(passwordId);
      break;
    case 'edit':
      editPassword(passwordId);
      break;
    case 'copy':
      handleCopyPassword(passwordId);
      break;
    case 'delete':
      handleDeletePassword(passwordId);
      break;
  }
}

async function editPassword(passwordId) {
  const password = passwords.find(p => p.id === passwordId);
  if (!password) return;

  if (!unlockedPasswords.has(passwordId)) {
    await handleUnlockPassword(passwordId);
    if (!unlockedPasswords.has(passwordId)) return;
  }

  isEditing = true;
  selectedPassword = password;
  modalTitle.textContent = 'Edit Password';

  const unlocked = unlockedPasswords.get(passwordId);
  const data = unlocked.data;

  passwordUsername.value = data.username || '';
  passwordEmail.value = data.email || '';
  passwordPassword.value = data.password || '';
  passwordSite.value = data.site || '';
  passwordPhoto.value = data.photo || '';
  passwordNotes.value = data.notes || '';
  encryptionPassword.value = unlocked.encryptionPwd;

  modalOverlay.classList.add('active');
  passwordUsername.focus();
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

function openAppSettingsModal() {
  themePicker.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.theme === appSettings.theme);
  });
  
  accentPicker.querySelectorAll('.accent-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.color === appSettings.accentColor);
  });
  
  appSettingsModal.classList.add('active');
}

function closeAppSettingsModal() {
  appSettingsModal.classList.remove('active');
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