// Emergency clear script - manually clear all Chrome storage
console.log('🚨 EMERGENCY CLEAR: Clearing all extension storage...');

// Clear all Chrome storage
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

// Clear session storage if available
try {
  chrome.storage.session.clear(() => {
    console.log('✅ Session storage cleared');
  });
} catch (e) {
  console.log('Session storage not available');
}

// Reset badge
try {
  chrome.action.setBadgeText({ text: '' });
  console.log('✅ Badge reset');
} catch (error) {
  console.log('❌ Badge reset failed:', error);
}

console.log('🎉 EMERGENCY CLEAR COMPLETE!');
console.log('📝 Now reload the extension completely');

// Provide easy console function
window.emergencyClear = () => {
  chrome.storage.local.clear();
  chrome.storage.sync.clear();
  try { chrome.storage.session.clear(); } catch(e) {}
  try { chrome.action.setBadgeText({ text: '' }); } catch(e) {}
  console.log('Emergency clear executed!');
};