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
  // Proxy settings
  enableProxy: false,
  proxyType: 'http',
  proxyHost: '',
  proxyPort: '',
  proxyUsername: '',
  proxyPassword: '',
  rotateProxies: false,
  proxyList: '',
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
  // Proxy settings
  document.getElementById('enableProxy').checked = settings.enableProxy;
  document.getElementById('proxyType').value = settings.proxyType;
  document.getElementById('proxyHost').value = settings.proxyHost;
  document.getElementById('proxyPort').value = settings.proxyPort;
  document.getElementById('proxyUsername').value = settings.proxyUsername;
  document.getElementById('proxyPassword').value = settings.proxyPassword;
  document.getElementById('rotateProxies').checked = settings.rotateProxies;
  document.getElementById('proxyList').value = settings.proxyList;
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
  
  // Show/hide proxy list based on rotate proxies setting
  toggleProxyListVisibility();
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
    // Proxy settings
    enableProxy: document.getElementById('enableProxy').checked,
    proxyType: document.getElementById('proxyType').value,
    proxyHost: document.getElementById('proxyHost').value,
    proxyPort: document.getElementById('proxyPort').value,
    proxyUsername: document.getElementById('proxyUsername').value,
    proxyPassword: document.getElementById('proxyPassword').value,
    rotateProxies: document.getElementById('rotateProxies').checked,
    proxyList: document.getElementById('proxyList').value,
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

// Toggle proxy list visibility
function toggleProxyListVisibility() {
  const rotateProxies = document.getElementById('rotateProxies').checked;
  const proxyListContainer = document.getElementById('proxyListContainer');
  proxyListContainer.style.display = rotateProxies ? 'block' : 'none';
}

// Add event listener for rotate proxies checkbox
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('rotateProxies').addEventListener('change', toggleProxyListVisibility);
});