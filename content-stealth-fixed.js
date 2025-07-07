// Stealth-enhanced content script
// This runs INSTEAD of content.js on Sortlist pages

// Simple stealth utilities
const stealth = {
  isProduction: true, // Set to false for debugging
  
  log: (...args) => {
    if (!stealth.isProduction) console.log(...args);
  },
  
  randomDelay: (base, variance = 0.4) => {
    const min = base * (1 - variance);
    const max = base * (1 + variance);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, stealth.randomDelay(ms))),
  
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
  
  detectBlocking: () => {
    const bodyText = document.body.textContent.toLowerCase();
    const blockingKeywords = ['captcha', 'robot', 'blocked', 'rate limit', 'access denied'];
    return blockingKeywords.some(keyword => bodyText.includes(keyword));
  }
};

// Basic URL extraction (simplified version)
function extractUrls() {
  const urls = {
    companies: [],
    all: [],
    pageInfo: {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    }
  };

  const links = document.querySelectorAll('a[href]');
  
  links.forEach(link => {
    const href = link.href;
    
    if (!href || href === '#' || href.startsWith('javascript:')) return;
    
    urls.all.push({
      url: href,
      text: link.textContent.trim().substring(0, 100)
    });
    
    // Simple company detection
    const companyPatterns = ['/agency/', '/agencies/', '/company/', '/companies/', '/provider/', '/profile/', '/portfolio/'];
    
    if (companyPatterns.some(pattern => href.includes(pattern)) && href.includes('sortlist')) {
      urls.companies.push({
        url: href,
        name: link.textContent.trim() || 'Unknown',
        extracted_at: new Date().toISOString()
      });
    }
  });

  // Remove duplicates
  urls.companies = Array.from(new Set(urls.companies.map(c => c.url)))
    .map(url => urls.companies.find(c => c.url === url));
  
  return urls;
}

// Main extraction with stealth
async function performStealthExtraction() {
  try {
    await stealth.sleep(1000);
    
    if (stealth.detectBlocking()) {
      stealth.log('⚠️ Blocking detected!');
      chrome.runtime.sendMessage({
        action: 'blockingDetected',
        url: window.location.href,
        severity: 'high'
      });
      return null;
    }
    
    // Human simulation
    if (Math.random() > 0.3) {
      await stealth.humanScroll();
      await stealth.sleep(2000);
    }
    
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

// Send to background
function sendToBackground(data) {
  chrome.runtime.sendMessage({
    action: 'urlsExtracted',
    data: data,
    source: 'stealth-content-script'
  }, response => {
    if (chrome.runtime.lastError) {
      stealth.log('❌ Error sending data:', chrome.runtime.lastError);
    } else {
      stealth.log('✅ Data sent successfully');
    }
  });
}

// Initialize
let extractedData = null;

async function init() {
  stealth.log('🔗 Stealth harvester active on', window.location.href);
  
  // Wait for page to stabilize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }
  
  // Random initial delay
  const delay = stealth.randomDelay(2000, 0.5);
  await stealth.sleep(delay);
  
  // Extract data
  extractedData = await performStealthExtraction();
  if (extractedData) {
    sendToBackground(extractedData);
  }
  
  // Monitor for changes
  const observer = new MutationObserver(() => {
    clearTimeout(window.reExtractTimeout);
    window.reExtractTimeout = setTimeout(async () => {
      const newData = await performStealthExtraction();
      if (newData && newData.companies.length > (extractedData?.companies.length || 0)) {
        extractedData = newData;
        sendToBackground(newData);
      }
    }, stealth.randomDelay(3000));
  });
  
  setTimeout(() => {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      stealth.log('👁️ Monitoring for changes');
    }
  }, 5000);
}

// Start
init();