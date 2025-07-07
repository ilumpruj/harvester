// Simple reset script to clear all storage and start fresh

console.log('🔄 Resetting Sortlist Harvester...');

// Clear all storage
chrome.storage.local.clear(() => {
  if (chrome.runtime.lastError) {
    console.error('❌ Error clearing local storage:', chrome.runtime.lastError);
  } else {
    console.log('✅ Local storage cleared');
  }
});

chrome.storage.sync.clear(() => {
  if (chrome.runtime.lastError) {
    console.error('❌ Error clearing sync storage:', chrome.runtime.lastError);
  } else {
    console.log('✅ Sync storage cleared');
  }
});

// Reset badge
try {
  chrome.action.setBadgeText({ text: '' });
  console.log('✅ Badge reset');
} catch (error) {
  console.error('❌ Error resetting badge:', error);
}

console.log('🎉 Reset complete! Extension is ready for fresh start.');
console.log('💡 Reload any Sortlist pages to start collecting again.');

// Also provide a way to call this from console
window.resetExtension = () => {
  try {
    chrome.storage.local.clear();
    chrome.storage.sync.clear();
    chrome.action.setBadgeText({ text: '' });
    console.log('Extension reset!');
  } catch (error) {
    console.error('Reset error:', error);
  }
};