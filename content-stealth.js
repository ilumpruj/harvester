// Stealth-enhanced content script for Sortlist pages

// Simple stealth utilities (embedded to avoid loading issues)
const stealth = {
  // Check if we're in production mode
  isProduction: true, // Set to false for debugging
  
  // Conditional logging
  log: (...args) => {
    if (!stealth.isProduction) console.log(...args);
  },
  
  // Random delay generator
  randomDelay: (base, variance = 0.4) => {
    const min = base * (1 - variance);
    const max = base * (1 + variance);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  // Sleep function
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, stealth.randomDelay(ms))),
  
  // Simulate human scrolling
  humanScroll: async () => {
    const steps = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < steps; i++) {
      window.scrollBy({
        top: 100 + Math.random() * 200,
        behavior: 'smooth'
      });
      await stealth.sleep(500);
    }
  },
  
  // Detect blocking
  detectBlocking: () => {
    const bodyText = document.body.textContent.toLowerCase();
    const blockingKeywords = ['captcha', 'robot', 'blocked', 'rate limit', 'access denied'];
    return blockingKeywords.some(keyword => bodyText.includes(keyword));
  }
};

// Content script initialization
stealth.log('🔗 Stealth Harvester: Active on', window.location.href);
stealth.log('📍 Page ready state:', document.readyState);

// Import the original extraction functions
const script = document.createElement('script');
script.textContent = `
  ${extractUrls.toString()}
  ${analyzePageStructure.toString()}
  ${extractLinkContext.toString()}
  ${analyzeUrl.toString()}
  ${isSortlistUrl.toString()}
  ${isNavigationUrl.toString()}
  ${extractCompanyName.toString()}
  ${calculateLinkValue.toString()}
  ${detectLinkPatterns.toString()}
  ${classifyPage.toString()}
  ${getElementDepth.toString()}
  ${getElementStructure.toString()}
  ${detectPageSubType.toString()}
  ${calculateClassificationConfidence.toString()}
`;

// Enhanced extraction with stealth
async function performStealthExtraction() {
  try {
    // Add initial random delay
    await stealth.sleep(1000);
    
    // Check for blocking
    if (stealth.detectBlocking()) {
      stealth.log('⚠️ Blocking detected!');
      chrome.runtime.sendMessage({
        action: 'blockingDetected',
        url: window.location.href,
        severity: 'high'
      });
      return null;
    }
    
    // Simulate human behavior
    if (Math.random() > 0.3) { // 70% of the time
      await stealth.humanScroll();
      await stealth.sleep(2000); // Reading time
    }
    
    // Perform extraction
    const data = extractUrls();
    
    stealth.log('📊 Extraction complete:', {
      total: data.all.length,
      companies: data.companies.length
    });
    
    return data;
  } catch (error) {
    stealth.log('❌ Extraction error:', error);
    return null;
  }
}

// Function to save page HTML
function capturePageContent() {
  return {
    html: document.documentElement.outerHTML,
    url: window.location.href,
    title: document.title,
    captured_at: new Date().toISOString()
  };
}

// Main extraction flow
let extractedData = null;

// Randomized extraction timing
async function scheduleExtraction() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    stealth.log('📄 Page ready, scheduling extraction');
    const delay = stealth.randomDelay(2000, 0.5);
    setTimeout(async () => {
      extractedData = await performStealthExtraction();
      if (extractedData) {
        sendToBackground(extractedData);
      }
    }, delay);
  } else {
    window.addEventListener('load', () => scheduleExtraction());
  }
}

// Send data to background
function sendToBackground(data) {
  chrome.runtime.sendMessage({
    action: 'urlsExtracted',
    data: data,
    pageContent: capturePageContent(),
    source: 'stealth-content-script'
  }, response => {
    if (chrome.runtime.lastError) {
      stealth.log('❌ Error sending data:', chrome.runtime.lastError);
    } else {
      stealth.log('✅ Data sent successfully');
    }
  });
}

// Dynamic content monitoring
const observer = new MutationObserver((mutations) => {
  if (!extractedData) return;
  
  clearTimeout(window.reExtractTimeout);
  window.reExtractTimeout = setTimeout(async () => {
    const newData = await performStealthExtraction();
    if (newData && newData.companies.length > extractedData.companies.length) {
      extractedData = newData;
      sendToBackground(newData);
    }
  }, stealth.randomDelay(3000));
});

// Start extraction
scheduleExtraction();

// Start observing after delay
setTimeout(() => {
  if (document.body && extractedData) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    stealth.log('👁️ Monitoring for dynamic content');
  }
}, 5000);

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    performStealthExtraction().then(data => {
      sendResponse({
        urls: data,
        pageContent: capturePageContent()
      });
    });
    return true; // Will respond asynchronously
  }
});