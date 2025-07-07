// Settings page script

// Default settings
const defaultSettings = {
  autoSave: true,
  autoSaveInterval: 30,
  autoExport: true,
  exportThreshold: 50,
  useIndexedDB: true,
  keepBackups: true,
  savePageHTML: false,
  enableServer: false,
  serverUrl: 'http://localhost:3000'
};

// Load settings
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await loadSettings();
  
  // Apply settings to UI
  document.getElementById('autoSave').checked = settings.autoSave;
  document.getElementById('autoSaveInterval').value = settings.autoSaveInterval;
  document.getElementById('autoExport').checked = settings.autoExport;
  document.getElementById('exportThreshold').value = settings.exportThreshold;
  document.getElementById('useIndexedDB').checked = settings.useIndexedDB;
  document.getElementById('keepBackups').checked = settings.keepBackups;
  document.getElementById('savePageHTML').checked = settings.savePageHTML;
  document.getElementById('enableServer').checked = settings.enableServer;
  document.getElementById('serverUrl').value = settings.serverUrl;
});

// Save settings
document.getElementById('saveSettings').addEventListener('click', async () => {
  const settings = {
    autoSave: document.getElementById('autoSave').checked,
    autoSaveInterval: parseInt(document.getElementById('autoSaveInterval').value),
    autoExport: document.getElementById('autoExport').checked,
    exportThreshold: parseInt(document.getElementById('exportThreshold').value),
    useIndexedDB: document.getElementById('useIndexedDB').checked,
    keepBackups: document.getElementById('keepBackups').checked,
    savePageHTML: document.getElementById('savePageHTML').checked,
    enableServer: document.getElementById('enableServer').checked,
    serverUrl: document.getElementById('serverUrl').value
  };
  
  await chrome.storage.sync.set({ settings });
  
  // Notify background script
  chrome.runtime.sendMessage({ 
    action: 'settingsUpdated', 
    settings: settings 
  });
  
  showStatus('Settings saved successfully!', 'success');
});

// Load settings from storage
async function loadSettings() {
  const result = await chrome.storage.sync.get({ settings: defaultSettings });
  return result.settings;
}

// Show status message
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}