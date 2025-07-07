// Content script that runs on Sortlist pages
console.log('🔗 Sortlist URL Harvester: Active on', window.location.href);
console.log('🔍 Looking for company URLs...');
console.log('📍 User agent:', navigator.userAgent);
console.log('📍 Page ready state:', document.readyState);
console.log('🤖 Is auto-browse tab:', window.name === 'auto-browse' ? 'YES' : 'NO');

// Enhanced URL extraction with intelligent analysis
function extractUrls() {
  console.log('🧠 Starting intelligent URL extraction...');
  
  // First, analyze the page structure
  const pageAnalysis = analyzePageStructure();
  
  const urls = {
    companies: [],
    all: [],
    pageInfo: {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      analysis: pageAnalysis
    }
  };

  // Find all links with enhanced metadata
  const links = document.querySelectorAll('a[href]');
  const linkDataArray = [];
  
  links.forEach(link => {
    const href = link.href;
    
    // Skip invalid URLs
    if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
    
    // Extract rich metadata for each link
    const linkData = {
      url: href,
      text: link.textContent.trim().substring(0, 200),
      title: link.title || '',
      context: extractLinkContext(link),
      urlAnalysis: analyzeUrl(href)
    };
    
    linkDataArray.push(linkData);
    urls.all.push(linkData);
    
    // Check if it's a Sortlist URL (potential company)
    if (isSortlistUrl(href) && !isNavigationUrl(href)) {
      urls.companies.push({
        url: href,
        name: extractCompanyName(link, href),
        extracted_at: new Date().toISOString(),
        confidence: calculateLinkValue(linkData),
        context: linkData.context
      });
    }
  });

  // Analyze link patterns
  const patterns = detectLinkPatterns(linkDataArray);
  
  // Classify the page
  const pageClassification = classifyPage({
    url: window.location.href,
    linkCount: linkDataArray.length,
    companyCount: urls.companies.length,
    patterns: patterns,
    structure: pageAnalysis
  });
  
  // Add classification to page info
  urls.pageInfo.classification = pageClassification;
  urls.pageInfo.patterns = patterns;
  urls.pageInfo.linkStats = {
    total: linkDataArray.length,
    sortlist: urls.companies.length,
    navigation: linkDataArray.filter(l => l.context.isNavigation).length,
    collection: linkDataArray.filter(l => l.context.isInCollection).length
  };

  // Remove duplicates
  urls.companies = Array.from(new Set(urls.companies.map(c => c.url)))
    .map(url => urls.companies.find(c => c.url === url));
  
  // Sort companies by confidence
  urls.companies.sort((a, b) => b.confidence - a.confidence);
  
  console.log('📊 Extraction complete:', {
    pageType: pageClassification.type,
    collectionScore: pageClassification.collectionScore,
    totalLinks: linkDataArray.length,
    companyLinks: urls.companies.length,
    patterns: patterns.summary
  });
  
  return urls;
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

// Auto-harvest functionality
async function autoHarvestPage() {
  // Check if auto-harvest is enabled
  chrome.storage.local.get(['harvesterSettings'], async (result) => {
    const settings = result.harvesterSettings || { autoHarvest: true };
    
    if (settings.autoHarvest) {
      console.log('🌐 Auto-harvesting page...');
      
      // Send page content to background for processing
      chrome.runtime.sendMessage({
        action: 'harvestPage',
        data: {
          url: window.location.href,
          title: document.title,
          html: document.documentElement.outerHTML,
          timestamp: new Date().toISOString()
        }
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error harvesting page:', chrome.runtime.lastError);
        } else {
          console.log('✅ Page harvested successfully');
        }
      });
    }
  });
}

// Wait for page to fully load before extracting
function performExtraction() {
  try {
    let extractedData = extractUrls();
    let pageContent = capturePageContent();

    console.log('📊 Extracted data:', {
      total_links: extractedData.all.length,
      company_urls: extractedData.companies.length,
      companies: extractedData.companies.slice(0, 3), // Show first 3 for debugging
      page_title: document.title
    });

    // Send data to background script
    chrome.runtime.sendMessage({
      action: 'urlsExtracted',
      data: extractedData,
      pageContent: pageContent,
      source: 'main-content-script'
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error sending data:', chrome.runtime.lastError);
      } else {
        console.log('✅ Data sent to background:', response);
      }
    });

    return extractedData;
  } catch (error) {
    console.error('❌ Error during extraction:', error);
    return null;
  }
}

// Extract URLs when page loads
let extractedData = null;

// Log tab visibility
console.log('👁️ Tab visibility:', {
  hidden: document.hidden,
  visibilityState: document.visibilityState,
  hasFocus: document.hasFocus()
});

// Try extraction immediately if page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('📄 Page already loaded, extracting immediately');
  extractedData = performExtraction();
  autoHarvestPage(); // Auto-harvest after extraction
} else {
  // Wait for page to load
  console.log('⏳ Waiting for page to load...');
  window.addEventListener('load', () => {
    console.log('📄 Page loaded, starting extraction');
    extractedData = performExtraction();
    autoHarvestPage(); // Auto-harvest after extraction
  });
}

// Also try extraction after a delay for dynamic content
setTimeout(() => {
  if (!extractedData) {
    console.log('⏰ Delayed extraction attempt...');
    extractedData = performExtraction();
  }
}, 3000);

// Re-extract when page content changes (for dynamic content)
const observer = new MutationObserver((mutations) => {
  // Only re-extract if we have initial data
  if (!extractedData) return;
  
  // Debounce to avoid too many extractions
  clearTimeout(window.extractTimeout);
  window.extractTimeout = setTimeout(() => {
    const newData = extractUrls();
    if (newData.companies.length > extractedData.companies.length) {
      extractedData = newData;
      chrome.runtime.sendMessage({
        action: 'urlsExtracted',
        data: extractedData,
        pageContent: capturePageContent(),
        source: 'dynamic-content-update'
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error sending dynamic update:', chrome.runtime.lastError);
        } else {
          console.log('🔄 Updated data sent (dynamic content):', newData.companies.length, 'companies');
        }
      });
    }
  }, 2000);
});

// Start observing only after initial extraction
setTimeout(() => {
  if (document.body && extractedData) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    console.log('👁️ Started observing DOM changes for dynamic content');
  }
}, 3000);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    sendResponse({
      urls: extractUrls(),
      pageContent: capturePageContent()
    });
  }
});

// ============= Helper Functions for Intelligent Analysis =============

// Analyze overall page structure
function analyzePageStructure() {
  const analysis = {
    hasLists: document.querySelectorAll('ul, ol').length,
    hasGrids: document.querySelectorAll('[class*="grid"], [class*="Grid"]').length,
    hasCards: document.querySelectorAll('[class*="card"], [class*="Card"], [class*="item"], [class*="Item"]').length,
    hasPagination: document.querySelectorAll('[class*="pagination"], [class*="page"], .pagination, .pager').length > 0,
    totalLinks: document.querySelectorAll('a[href]').length,
    totalImages: document.querySelectorAll('img').length,
    linkDensity: 0,
    repeatingStructures: 0
  };
  
  // Calculate link density
  const textLength = document.body.textContent.length;
  analysis.linkDensity = textLength > 0 ? analysis.totalLinks / (textLength / 1000) : 0;
  
  // Find repeating structures (indicators of listing pages)
  const containers = document.querySelectorAll('article, .item, .card, [class*="list-item"]');
  const structureMap = {};
  containers.forEach(container => {
    const structure = getElementStructure(container);
    structureMap[structure] = (structureMap[structure] || 0) + 1;
  });
  analysis.repeatingStructures = Object.values(structureMap).filter(count => count > 3).length;
  
  return analysis;
}

// Extract context information for a link
function extractLinkContext(link) {
  const parent = link.parentElement;
  const grandParent = parent?.parentElement;
  
  // Check structural context
  const isInList = link.closest('ul, ol, nav, .list, .listing') !== null;
  const isInGrid = link.closest('[class*="grid"], [class*="Grid"], .grid') !== null;
  const isInCard = link.closest('[class*="card"], [class*="Card"], article, .item') !== null;
  const isInNav = link.closest('nav, header, footer, .navigation, .menu') !== null;
  
  // Count nearby links
  const container = link.closest('div, section, article, li');
  const siblingLinks = container ? container.querySelectorAll('a').length : 1;
  const nearbyText = container ? container.textContent.trim().substring(0, 200) : '';
  
  // Analyze link purpose
  const linkText = link.textContent.trim().toLowerCase();
  const isNavigation = isInNav || linkText.match(/^(home|about|contact|blog|services|next|prev|previous|\d+)$/);
  const isPagination = link.href.includes('page=') || link.href.includes('/page/') || linkText.match(/^(\d+|next|prev)$/);
  
  return {
    isInList,
    isInGrid,
    isInCard,
    isInNav,
    isNavigation,
    isPagination,
    isInCollection: isInList || isInGrid,
    siblingLinks,
    nearbyText,
    depth: getElementDepth(link),
    containerTag: container ? container.tagName.toLowerCase() : 'none'
  };
}

// Analyze URL structure
function analyzeUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    return {
      domain: urlObj.hostname,
      path: urlObj.pathname,
      depth: pathParts.length,
      hasNumbers: /\d/.test(urlObj.pathname),
      hasQuery: urlObj.search.length > 0,
      pathParts: pathParts,
      isLikelyDetail: pathParts.length > 3 || /\d{4,}/.test(urlObj.pathname),
      isLikelyListing: pathParts.some(part => ['list', 'index', 'directory', 'categories', 'all'].includes(part.toLowerCase()))
    };
  } catch (e) {
    return {
      domain: '',
      path: url,
      depth: 0,
      hasNumbers: false,
      hasQuery: false,
      pathParts: [],
      isLikelyDetail: false,
      isLikelyListing: false
    };
  }
}

// Check if URL is a Sortlist URL
function isSortlistUrl(url) {
  const sortlistDomains = ['sortlist.com', 'sortlist.be', 'sortlist.fr', 'sortlist.co.uk', 'sortlist.us'];
  try {
    const urlObj = new URL(url);
    return sortlistDomains.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
    return false;
  }
}

// Check if URL is likely navigation/utility
function isNavigationUrl(url) {
  const navPatterns = [
    '/login', '/signup', '/register', '/terms', '/privacy', '/about', '/contact',
    '/blog', '/news', '/help', '/faq', '/careers', '/jobs'
  ];
  return navPatterns.some(pattern => url.toLowerCase().includes(pattern));
}

// Extract company name intelligently
function extractCompanyName(link, url) {
  let name = link.textContent.trim();
  
  // If link text is too short or generic, try other strategies
  if (!name || name.length < 3 || name.match(/^(view|click|more|details|see|visit)/i)) {
    // Try aria-label
    name = link.getAttribute('aria-label') || '';
    
    // Try title attribute
    if (!name) name = link.title || '';
    
    // Try to find nearby heading
    if (!name) {
      const container = link.closest('article, li, div, section');
      const heading = container?.querySelector('h1, h2, h3, h4, h5, h6');
      name = heading?.textContent.trim() || '';
    }
    
    // Try to find nearby text that looks like a company name
    if (!name) {
      const parent = link.parentElement;
      const texts = Array.from(parent?.childNodes || [])
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .filter(text => text.length > 3);
      name = texts[0] || '';
    }
    
    // Last resort: parse from URL
    if (!name) {
      const urlParts = url.split('/').filter(Boolean);
      const lastPart = urlParts[urlParts.length - 1];
      name = lastPart.replace(/-/g, ' ').replace(/_/g, ' ');
    }
  }
  
  return name;
}

// Calculate link value/confidence
function calculateLinkValue(linkData) {
  let score = 0.5; // Base score
  
  // Context bonuses
  if (linkData.context.isInList) score += 0.15;
  if (linkData.context.isInGrid) score += 0.15;
  if (linkData.context.isInCard) score += 0.1;
  if (!linkData.context.isNavigation) score += 0.1;
  
  // URL analysis bonuses
  if (linkData.urlAnalysis.depth >= 2 && linkData.urlAnalysis.depth <= 4) score += 0.1;
  if (linkData.url.includes('/agency/') || linkData.url.includes('/company/')) score += 0.2;
  
  // Text quality bonus
  if (linkData.text && linkData.text.length > 5 && !linkData.text.match(/^(click|view|more)/i)) score += 0.1;
  
  // Penalty for navigation/utility links
  if (linkData.context.isPagination) score -= 0.3;
  if (linkData.context.isInNav) score -= 0.2;
  
  return Math.max(0, Math.min(1, score));
}

// Detect patterns in links
function detectLinkPatterns(links) {
  const patterns = {
    urlPatterns: {},
    structuralPatterns: {},
    domainDistribution: {},
    commonPaths: [],
    repeatingGroups: 0,
    summary: {}
  };
  
  // Analyze URL patterns
  links.forEach(link => {
    // Domain distribution
    const domain = link.urlAnalysis.domain;
    patterns.domainDistribution[domain] = (patterns.domainDistribution[domain] || 0) + 1;
    
    // Path patterns
    link.urlAnalysis.pathParts.forEach((part, index) => {
      const key = `level_${index}:${part}`;
      patterns.urlPatterns[key] = (patterns.urlPatterns[key] || 0) + 1;
    });
    
    // Structural patterns
    const structure = `${link.context.containerTag}_${link.context.isInList}_${link.context.isInGrid}`;
    patterns.structuralPatterns[structure] = (patterns.structuralPatterns[structure] || 0) + 1;
  });
  
  // Find common path patterns
  const pathCounts = {};
  links.forEach(link => {
    const path = link.urlAnalysis.pathParts.slice(0, 2).join('/');
    pathCounts[path] = (pathCounts[path] || 0) + 1;
  });
  patterns.commonPaths = Object.entries(pathCounts)
    .filter(([path, count]) => count > 3)
    .sort((a, b) => b[1] - a[1])
    .map(([path, count]) => ({ path, count }));
  
  // Count repeating groups
  patterns.repeatingGroups = Object.values(patterns.structuralPatterns).filter(count => count > 5).length;
  
  // Create summary
  patterns.summary = {
    dominantDomain: Object.entries(patterns.domainDistribution).sort((a, b) => b[1] - a[1])[0]?.[0],
    hasRepeatingStructure: patterns.repeatingGroups > 2,
    commonPathCount: patterns.commonPaths.length,
    linkDiversity: Object.keys(patterns.domainDistribution).length
  };
  
  return patterns;
}

// Classify page based on analysis
function classifyPage(data) {
  const features = {
    linkDensity: data.structure.linkDensity,
    repeatingStructures: data.structure.repeatingStructures,
    hasPagination: data.structure.hasPagination,
    gridOrListPresent: data.structure.hasLists > 0 || data.structure.hasGrids > 0,
    highLinkCount: data.linkCount > 50,
    companyRatio: data.companyCount / Math.max(data.linkCount, 1)
  };
  
  // Calculate collection score (0-1)
  let collectionScore = 0;
  
  // Strong indicators
  if (features.repeatingStructures > 3) collectionScore += 0.3;
  if (features.linkDensity > 5) collectionScore += 0.2;
  if (features.hasPagination) collectionScore += 0.2;
  if (features.gridOrListPresent) collectionScore += 0.1;
  if (features.highLinkCount) collectionScore += 0.1;
  if (features.companyRatio > 0.3) collectionScore += 0.1;
  
  // URL analysis
  const url = data.url.toLowerCase();
  if (url.includes('/agencies') || url.includes('/directory') || url.includes('/list')) {
    collectionScore += 0.3;
  }
  
  return {
    type: collectionScore > 0.5 ? 'collection' : 'detail',
    subType: detectPageSubType(features, url),
    collectionScore: Math.min(1, collectionScore),
    confidence: calculateClassificationConfidence(features),
    features: features,
    signals: {
      isListing: collectionScore > 0.5,
      isPaginated: features.hasPagination,
      hasRepeatingContent: features.repeatingStructures > 3,
      linkDensity: features.linkDensity
    }
  };
}

// Helper functions
function getElementDepth(element) {
  let depth = 0;
  let current = element;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

function getElementStructure(element) {
  const children = Array.from(element.children);
  return children.map(child => `${child.tagName}:${child.className}`).join(',');
}

function detectPageSubType(features, url) {
  if (url.includes('search') || url.includes('?q=')) return 'search-results';
  if (url.includes('category') || url.includes('categories')) return 'category';
  if (features.hasPagination) return 'paginated-list';
  if (features.repeatingStructures > 5) return 'directory';
  if (features.linkDensity < 2) return 'content-page';
  return 'unknown';
}

function calculateClassificationConfidence(features) {
  let signals = 0;
  let totalSignals = 6;
  
  if (features.linkDensity > 5) signals++;
  if (features.repeatingStructures > 3) signals++;
  if (features.hasPagination) signals++;
  if (features.gridOrListPresent) signals++;
  if (features.highLinkCount) signals++;
  if (features.companyRatio > 0.3) signals++;
  
  return signals / totalSignals;
}