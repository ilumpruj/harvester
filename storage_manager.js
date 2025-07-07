// Storage Manager for auto-saving harvested data

class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'sortlist_harvested_data';
    this.BACKUP_PREFIX = 'sortlist_backup_';
    this.AUTO_SAVE_INTERVAL = 30000; // Auto-save every 30 seconds
    this.AUTO_EXPORT_THRESHOLD = 50; // Auto-export every 50 new companies
    this.lastExportCount = 0;
  }

  // Initialize auto-save
  async init() {
    // Start auto-save timer
    setInterval(() => this.autoSave(), this.AUTO_SAVE_INTERVAL);
    
    // Load existing data
    const data = await this.loadData();
    this.lastExportCount = data.companies ? data.companies.length : 0;
    
    return data;
  }

  // Save to Chrome local storage (survives browser restarts)
  async saveToLocalStorage(data) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
      console.log('Data saved to local storage:', data.companies.length, 'companies');
      return true;
    } catch (error) {
      console.error('Failed to save to local storage:', error);
      return false;
    }
  }

  // Load from Chrome local storage
  async loadData() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      return result[this.STORAGE_KEY] || { companies: [], pages: [], allUrls: [] };
    } catch (error) {
      console.error('Failed to load data:', error);
      return { companies: [], pages: [], allUrls: [] };
    }
  }

  // Auto-save current data
  async autoSave() {
    const data = await this.loadData();
    
    // Create backup with timestamp
    const backupKey = `${this.BACKUP_PREFIX}${Date.now()}`;
    await chrome.storage.local.set({ [backupKey]: data });
    
    // Clean old backups (keep last 5)
    this.cleanOldBackups();
    
    // Check if should auto-export
    if (data.companies.length - this.lastExportCount >= this.AUTO_EXPORT_THRESHOLD) {
      this.autoExport(data);
      this.lastExportCount = data.companies.length;
    }
  }

  // Auto-export to downloads
  async autoExport(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportData = {
      timestamp: new Date().toISOString(),
      companies: data.companies,
      pages_visited: data.pages.length,
      total_companies: data.companies.length,
      urls_text: data.companies.map(c => c.url).join('\n')
    };

    // Create blob
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    // Create download using FileReader
    try {
      const reader = new FileReader();
      reader.onload = function() {
        chrome.downloads.download({
          url: reader.result,
          filename: `sortlist_auto_${timestamp}.json`,
          saveAs: false // Auto-save without prompt
        }, () => {
          console.log('Auto-exported data with', data.companies.length, 'companies');
        });
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Auto-export error:', error);
    }
  }

  // Clean old backups
  async cleanOldBackups() {
    const storage = await chrome.storage.local.get();
    const backupKeys = Object.keys(storage)
      .filter(key => key.startsWith(this.BACKUP_PREFIX))
      .sort()
      .reverse();
    
    // Keep only last 5 backups
    if (backupKeys.length > 5) {
      const keysToRemove = backupKeys.slice(5);
      await chrome.storage.local.remove(keysToRemove);
    }
  }

  // Export to IndexedDB for larger storage
  async saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SortlistHarvester', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['companies'], 'readwrite');
        const store = transaction.objectStore('companies');
        
        // Clear and add all data
        store.clear();
        data.companies.forEach(company => {
          store.add({
            ...company,
            id: company.url,
            saved_at: new Date().toISOString()
          });
        });
        
        transaction.oncomplete = () => {
          console.log('Data saved to IndexedDB');
          resolve(true);
        };
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('companies')) {
          const store = db.createObjectStore('companies', { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: true });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('saved_at', 'saved_at', { unique: false });
        }
      };
    });
  }

  // Create downloadable file and auto-download
  async createDownloadableFile(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportData = {
      timestamp: new Date().toISOString(),
      companies: data.companies,
      pages_visited: data.pages.length,
      total_companies: data.companies.length,
      urls_text: data.companies.map(c => c.url).join('\n')
    };

    // Create blob
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    // Download using FileReader instead of URL.createObjectURL
    try {
      const reader = new FileReader();
      reader.onload = function() {
        chrome.downloads.download({
          url: reader.result,
          filename: `sortlist_harvester/sortlist_auto_${timestamp}.json`,
          saveAs: false // Auto-save without prompt
        }, (downloadId) => {
          console.log('Auto-downloaded file with ID:', downloadId);
        });
      };
      reader.readAsDataURL(blob);
      
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      return false;
    }
  }

  // Save to Google Drive (requires OAuth)
  async saveToGoogleDrive(data) {
    // This requires OAuth setup
    // Implementation would use Chrome Identity API
    console.log('Google Drive save not implemented yet');
  }
}

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionStorageManager;
}