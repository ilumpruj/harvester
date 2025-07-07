// Universal content script that runs on all websites for auto-browse
console.log('🌐 Universal harvester active on:', window.location.href);
console.log('🤖 Tab info:', {
  url: window.location.href,
  domain: window.location.hostname,
  readyState: document.readyState
});

// Log whether this is a background tab
console.log('👁️ Universal script - Tab state:', {
  hidden: document.hidden,
  visibilityState: document.visibilityState,
  url: window.location.href
});

// Extract data regardless of tab visibility
setTimeout(() => {
  // Check if this is a Sortlist domain (regular content.js will handle it)
  const isSortlistDomain = window.location.hostname.includes('sortlist.');
  
  if (isSortlistDomain) {
    console.log('⏭️ Skipping universal content - Sortlist domain handled by main content script');
    return;
  }
  
  console.log('🔍 Universal content script extracting data from:', window.location.href);
  console.log('🤖 Extracting even though tab is:', document.hidden ? 'HIDDEN/BACKGROUND' : 'VISIBLE');
  
  // Extract basic page information and any useful links
  extractUniversalData();
}, 2000); // Wait 2 seconds for page to load

function extractUniversalData() {
  const data = {
    pageInfo: {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      timestamp: new Date().toISOString()
    },
    companies: [],
    metadata: {}
  };
  
  // Extract company information from various sources
  extractCompanyInfo(data);
  
  // Extract contact information
  extractContactInfo(data);
  
  // Extract social links
  extractSocialLinks(data);
  
  // Extract any Sortlist links found on the page
  extractSortlistLinks(data);
  
  console.log('🎯 Universal extraction complete:', {
    url: data.pageInfo.url,
    companiesFound: data.companies.length,
    hasMetadata: Object.keys(data.metadata).length > 0
  });
  
  // Send data to background script
  if (data.companies.length > 0 || Object.keys(data.metadata).length > 0) {
    chrome.runtime.sendMessage({
      action: 'urlsExtracted',
      data: data,
      source: 'universal-content'
    });
  }
}

function extractCompanyInfo(data) {
  // Try to extract company name from various sources
  const companyName = 
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('.company-name')?.textContent?.trim() ||
    document.querySelector('[class*="company"]')?.textContent?.trim() ||
    document.querySelector('title')?.textContent?.split('|')[0]?.trim() ||
    document.title.split('|')[0].split('-')[0].trim();
  
  if (companyName && companyName.length > 2) {
    data.metadata.companyName = companyName;
    
    // Add this page as a company entry
    data.companies.push({
      url: window.location.href,
      name: companyName,
      extracted_at: new Date().toISOString(),
      source: 'company-website'
    });
  }
}

function extractContactInfo(data) {
  // Look for email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const pageText = document.body.textContent;
  const emails = pageText.match(emailRegex);
  
  if (emails && emails.length > 0) {
    data.metadata.emails = [...new Set(emails)].slice(0, 5); // Max 5 unique emails
  }
  
  // Look for phone numbers
  const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
  const phones = pageText.match(phoneRegex);
  
  if (phones && phones.length > 0) {
    data.metadata.phones = [...new Set(phones)].slice(0, 3); // Max 3 unique phones
  }
}

function extractSocialLinks(data) {
  const socialPlatforms = ['linkedin', 'twitter', 'facebook', 'instagram', 'github'];
  const socialLinks = {};
  
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.href.toLowerCase();
    socialPlatforms.forEach(platform => {
      if (href.includes(platform + '.com')) {
        if (!socialLinks[platform]) {
          socialLinks[platform] = href;
        }
      }
    });
  });
  
  if (Object.keys(socialLinks).length > 0) {
    data.metadata.socialLinks = socialLinks;
  }
}

function extractSortlistLinks(data) {
  // Look for any Sortlist links on the page (back-references)
  const sortlistLinks = [];
  
  // Also look for ANY links that might be company/agency pages
  const allLinks = document.querySelectorAll('a[href]');
  console.log(`🔗 Total links on page: ${allLinks.length}`);
  
  allLinks.forEach(link => {
    const href = link.href;
    
    // Check for Sortlist links
    if (href.includes('sortlist.')) {
      sortlistLinks.push({
        url: href,
        text: link.textContent.trim(),
        name: link.textContent.trim() || 'Sortlist Link',
        extracted_at: new Date().toISOString(),
        source: 'sortlist-back-reference'
      });
    }
    
    // Also check for common company URL patterns even on external sites
    const companyPatterns = ['/agency/', '/agencies/', '/company/', '/companies/', '/provider/', '/portfolio/'];
    if (companyPatterns.some(pattern => href.includes(pattern))) {
      sortlistLinks.push({
        url: href,
        text: link.textContent.trim(),
        name: link.textContent.trim() || 'Company Link',
        extracted_at: new Date().toISOString(),
        source: 'external-company-link'
      });
    }
  });
  
  console.log(`✅ Found ${sortlistLinks.length} relevant links`);
  
  if (sortlistLinks.length > 0) {
    data.companies.push(...sortlistLinks);
  }
}

// Handle errors gracefully
window.addEventListener('error', (e) => {
  console.log('Universal content script error:', e.message);
});