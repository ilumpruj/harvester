// Advanced features for the extension

// Auto-download when reaching threshold
const AUTO_DOWNLOAD_THRESHOLD = 100; // Download after 100 companies

// Check if should auto-download
function checkAutoDownload(companyCount) {
  if (companyCount >= AUTO_DOWNLOAD_THRESHOLD && companyCount % AUTO_DOWNLOAD_THRESHOLD === 0) {
    chrome.runtime.sendMessage({ action: 'exportData' }, (exportData) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sortlist_batch_${timestamp}.json`;
      
      chrome.downloads.download({
        url: 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2)),
        filename: filename,
        saveAs: false
      });
    });
  }
}

// Pattern matching for different types of company pages
const enhancedPatterns = {
  company: [
    /\/agency\/([^\/]+)$/,
    /\/company\/([^\/]+)$/,
    /\/provider\/([^\/]+)$/,
    /\/profile\/([^\/]+)$/,
    /\/agencies\/[^\/]+\/([^\/]+)$/,
    /\/([^\/]+)\/portfolio$/
  ],
  
  listing: [
    /\/agencies\/?$/,
    /\/agencies\/[^\/]+\/?$/,
    /\/search\//,
    /\/browse\//,
    /\/directory\//
  ]
};

// Extract structured data from page
function extractStructuredData() {
  const data = {
    companies: [],
    metadata: {}
  };
  
  // Look for JSON-LD structured data
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach(script => {
    try {
      const jsonData = JSON.parse(script.textContent);
      if (jsonData['@type'] === 'Organization' || jsonData['@type'] === 'LocalBusiness') {
        data.companies.push({
          name: jsonData.name,
          url: jsonData.url || window.location.href,
          description: jsonData.description,
          address: jsonData.address,
          telephone: jsonData.telephone,
          email: jsonData.email,
          structured_data: jsonData
        });
      }
    } catch (e) {
      console.error('Failed to parse JSON-LD:', e);
    }
  });
  
  // Extract from meta tags
  const metaTags = {
    title: document.querySelector('meta[property="og:title"]')?.content,
    description: document.querySelector('meta[property="og:description"]')?.content,
    image: document.querySelector('meta[property="og:image"]')?.content,
    url: document.querySelector('meta[property="og:url"]')?.content
  };
  
  data.metadata = metaTags;
  
  return data;
}

// Intelligent scroll to load dynamic content
async function intelligentScroll() {
  const initialHeight = document.body.scrollHeight;
  let scrollCount = 0;
  const maxScrolls = 10;
  
  while (scrollCount < maxScrolls) {
    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if new content loaded
    const newHeight = document.body.scrollHeight;
    if (newHeight === initialHeight) {
      // No new content, try clicking "Load more" buttons
      const loadMoreButtons = document.querySelectorAll(
        'button:contains("Load more"), button:contains("Show more"), a:contains("View more")'
      );
      
      if (loadMoreButtons.length > 0) {
        loadMoreButtons[0].click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        break; // No more content to load
      }
    }
    
    scrollCount++;
  }
}

// Export functions for use in content.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkAutoDownload,
    enhancedPatterns,
    extractStructuredData,
    intelligentScroll
  };
}