// Background service worker
let collectedData = {
  companies: [],
  pages: [],
  allUrls: []
};

// Import storage manager
importScripts('storage_manager.js');
const storageManager = new StorageManager();

// Initialize storage manager and load existing data
storageManager.init().then(data => {
  collectedData = data;
  updateBadge();
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'urlsExtracted') {
    // Add new company URLs
    request.data.companies.forEach(company => {
      if (!collectedData.companies.find(c => c.url === company.url)) {
        collectedData.companies.push(company);
      }
    });
    
    // Add page info
    collectedData.pages.push({
      ...request.data.pageInfo,
      companiesFound: request.data.companies.length
    });
    
    // Store page HTML if requested
    if (request.pageContent) {
      chrome.storage.local.set({
        [`page_${Date.now()}`]: request.pageContent
      });
    }
    
    // Save to storage using storage manager
    storageManager.saveToLocalStorage(collectedData).then(() => {
      console.log('Data auto-saved:', collectedData.companies.length, 'companies');
    });
    
    // Also save to IndexedDB for larger storage
    if (collectedData.companies.length % 10 === 0) {
      storageManager.saveToIndexedDB(collectedData);
    }
    
    // Update badge
    updateBadge();
  }
});

// Handle popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    sendResponse(collectedData);
  } else if (request.action === 'clearData') {
    collectedData = {
      companies: [],
      pages: [],
      allUrls: []
    };
    chrome.storage.local.clear();
    chrome.action.setBadgeText({ text: '0' });
    sendResponse({ success: true });
  } else if (request.action === 'exportData') {
    // Create export data
    const exportData = {
      timestamp: new Date().toISOString(),
      companies: collectedData.companies,
      pages_visited: collectedData.pages.length,
      total_companies: collectedData.companies.length
    };
    sendResponse(exportData);
  }
});

// Helper function to update badge
function updateBadge() {
  chrome.action.setBadgeText({ 
    text: collectedData.companies.length.toString() 
  });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}