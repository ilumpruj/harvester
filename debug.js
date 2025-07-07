// Debug script to manually test extension functionality
console.log('🔧 Debug script loaded');

// Function to manually test content script
function testContentScript() {
  console.log('🧪 Testing content script...');
  
  // Check if we're on a Sortlist page
  const isSortlist = window.location.href.includes('sortlist.');
  console.log('📍 On Sortlist page:', isSortlist);
  
  if (!isSortlist) {
    console.log('⚠️ Not on a Sortlist page, manually testing link extraction');
  }
  
  // Test link extraction
  const links = document.querySelectorAll('a[href]');
  console.log('🔗 Total links found:', links.length);
  
  const companyPatterns = [
    '/agency/',
    '/agencies/',
    '/company/',
    '/companies/',
    '/provider/',
    '/profile/',
    '/portfolio/'
  ];
  
  let companyLinks = [];
  links.forEach(link => {
    const href = link.href;
    if (companyPatterns.some(pattern => href.includes(pattern))) {
      companyLinks.push({
        url: href,
        text: link.textContent.trim(),
        name: link.textContent.trim() || 'Unknown'
      });
    }
  });
  
  console.log('🏢 Company links found:', companyLinks.length);
  console.log('📋 Sample company links:', companyLinks.slice(0, 5));
  
  // Test sending to background
  chrome.runtime.sendMessage({
    action: 'urlsExtracted',
    data: {
      companies: companyLinks,
      all: Array.from(links).slice(0, 10).map(l => ({ url: l.href, text: l.textContent.trim() })),
      pageInfo: {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
      }
    },
    source: 'manual-debug-test'
  }, response => {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to send test data:', chrome.runtime.lastError);
    } else {
      console.log('✅ Test data sent successfully:', response);
    }
  });
  
  return {
    totalLinks: links.length,
    companyLinks: companyLinks.length,
    isSortlist: isSortlist
  };
}

// Function to check extension status
function checkExtensionStatus() {
  console.log('🔍 Checking extension status...');
  
  chrome.runtime.sendMessage({ action: 'getData' }, (data) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Extension not responding:', chrome.runtime.lastError);
    } else {
      console.log('✅ Extension is active. Current data:', {
        companies: data?.companies?.length || 0,
        pages: data?.pages?.length || 0
      });
    }
  });
}

// Function to force data save
function forceSave() {
  console.log('💾 Forcing data save...');
  chrome.runtime.sendMessage({ action: 'exportData' }, (data) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to export data:', chrome.runtime.lastError);
    } else {
      console.log('✅ Current extension data:', data);
    }
  });
}

// Make functions available globally for console testing
window.testExtension = {
  testContentScript,
  checkExtensionStatus,
  forceSave
};

console.log('🎮 Debug functions available:');
console.log('- testExtension.testContentScript() - Test URL extraction');
console.log('- testExtension.checkExtensionStatus() - Check if extension is working');
console.log('- testExtension.forceSave() - View current data');