// Settings page script

// Default settings
const defaultSettings = {
  // Stealth settings
  stealthMode: true,
  debugMode: false,
  minDelay: 20,
  maxDelay: 60,
  enableHumanSimulation: true,
  enableRateLimiting: true,
  maxRequestsPerHour: 100,
  // Original settings
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
  // Stealth settings
  document.getElementById('stealthMode').checked = settings.stealthMode;
  document.getElementById('debugMode').checked = settings.debugMode;
  document.getElementById('minDelay').value = settings.minDelay;
  document.getElementById('maxDelay').value = settings.maxDelay;
  document.getElementById('enableHumanSimulation').checked = settings.enableHumanSimulation;
  document.getElementById('enableRateLimiting').checked = settings.enableRateLimiting;
  document.getElementById('maxRequestsPerHour').value = settings.maxRequestsPerHour;
  // Original settings
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
    // Stealth settings
    stealthMode: document.getElementById('stealthMode').checked,
    debugMode: document.getElementById('debugMode').checked,
    minDelay: parseInt(document.getElementById('minDelay').value),
    maxDelay: parseInt(document.getElementById('maxDelay').value),
    enableHumanSimulation: document.getElementById('enableHumanSimulation').checked,
    enableRateLimiting: document.getElementById('enableRateLimiting').checked,
    maxRequestsPerHour: parseInt(document.getElementById('maxRequestsPerHour').value),
    // Original settings
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