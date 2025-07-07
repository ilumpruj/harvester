// Enhanced Content Script with Progressive Extraction
console.log('🔗 Enhanced Sortlist URL Harvester: Active on', window.location.href);

// Inline ExtractionValidator class since content scripts can't easily import modules
class ExtractionValidator {
  constructor() {
    this.minTextLength = 100;
    this.minCompanyNameLength = 3;
    this.expectedElements = {
      companyName: { weight: 30, required: true },
      description: { weight: 20, required: true },
      contactInfo: { weight: 15, required: false },
      services: { weight: 10, required: false },
      location: { weight: 10, required: false },
      images: { weight: 5, required: false },
      socialLinks: { weight: 5, required: false },
      metadata: { weight: 5, required: false }
    };
  }

  validateExtraction(extractedData, pageContent = null) {
    const validation = {
      isComplete: false,
      score: 0,
      missingElements: [],
      suggestions: [],
      details: {}
    };

    if (extractedData.companies && extractedData.companies.length > 0) {
      validation.details.companyCount = extractedData.companies.length;
      
      extractedData.companies.forEach((company, index) => {
        const companyValidation = this.validateCompany(company);
        validation.details[`company_${index}`] = companyValidation;
        
        if (index === 0) {
          validation.score = companyValidation.score;
          validation.missingElements = companyValidation.missingElements;
        }
      });
    } else {
      validation.missingElements.push('No companies found');
      validation.suggestions.push('Wait for dynamic content to load');
      validation.suggestions.push('Check if page requires user interaction');
    }

    if (pageContent) {
      const pageValidation = this.validatePageContent(pageContent);
      validation.details.pageValidation = pageValidation;
      validation.suggestions = [...validation.suggestions, ...pageValidation.suggestions];
    }

    validation.isComplete = validation.score >= 70;
    
    if (validation.score < 30) {
      validation.suggestions.push('Consider waiting longer for page to fully load');
      validation.suggestions.push('Try extracting with less aggressive HTML stripping');
    } else if (validation.score < 70) {
      validation.suggestions.push('Some important data may be missing');
      validation.suggestions.push('Check for lazy-loaded content');
    }

    return validation;
  }

  validateCompany(company) {
    const result = {
      score: 0,
      foundElements: [],
      missingElements: [],
      details: {}
    };

    if (company.name && company.name.length >= this.minCompanyNameLength) {
      result.score += this.expectedElements.companyName.weight;
      result.foundElements.push('companyName');
      result.details.nameQuality = this.assessNameQuality(company.name);
    } else {
      result.missingElements.push('companyName');
    }

    if (company.context) {
      if (company.context.nearbyText && company.context.nearbyText.length > this.minTextLength) {
        result.score += this.expectedElements.description.weight;
        result.foundElements.push('description');
      } else {
        result.missingElements.push('description');
      }
    }

    if (company.confidence) {
      result.details.confidence = company.confidence;
      if (company.confidence > 0.8) {
        result.score += 10;
      }
    }

    return result;
  }

  validatePageContent(pageContent) {
    const result = {
      suggestions: [],
      indicators: {}
    };

    if (pageContent.html) {
      const loadingPatterns = [
        /class=".*loading.*"/i,
        /class=".*spinner.*"/i,
        /class=".*skeleton.*"/i,
        /<div[^>]*>\s*Loading\s*<\/div>/i,
        /data-loading="true"/i
      ];

      for (const pattern of loadingPatterns) {
        if (pattern.test(pageContent.html)) {
          result.indicators.hasLoadingElements = true;
          result.suggestions.push('Page still has loading indicators - wait longer');
          break;
        }
      }
    }

    const ajaxPatterns = [
      /data-ajax/i,
      /data-dynamic/i,
      /vue-app/i,
      /react-root/i,
      /ng-app/i
    ];

    for (const pattern of ajaxPatterns) {
      if (pageContent.html && pattern.test(pageContent.html)) {
        result.indicators.hasDynamicContent = true;
        result.suggestions.push('Page uses dynamic content loading - use mutation observer');
        break;
      }
    }

    if (pageContent.html) {
      const textContent = pageContent.html.replace(/<[^>]*>/g, '').trim();
      const contentDensity = textContent.length / pageContent.html.length;
      result.indicators.contentDensity = contentDensity;

      if (contentDensity < 0.1) {
        result.suggestions.push('Low text density - page might not be fully loaded');
      }
    }

    return result;
  }

  assessNameQuality(name) {
    const quality = {
      score: 0,
      issues: []
    };

    if (name.length < 5) {
      quality.issues.push('Name too short');
    } else if (name.length > 100) {
      quality.issues.push('Name suspiciously long');
    } else {
      quality.score += 25;
    }

    const placeholders = ['company name', 'example', 'demo', 'test', 'lorem ipsum'];
    if (placeholders.some(p => name.toLowerCase().includes(p))) {
      quality.issues.push('Possible placeholder text');
    } else {
      quality.score += 25;
    }

    if (name !== name.toLowerCase() && name !== name.toUpperCase()) {
      quality.score += 25;
    } else {
      quality.issues.push('Unusual capitalization');
    }

    if (/[&.,\-']/.test(name)) {
      quality.score += 15;
    }

    if (!name.includes('-') || name.includes(' ')) {
      quality.score += 10;
    } else {
      quality.issues.push('Might be URL slug');
    }

    return quality;
  }

  getExtractionStrategy(validation) {
    const strategy = {
      shouldRetry: !validation.isComplete,
      waitTime: 5000,
      method: 'standard',
      options: {}
    };

    if (validation.score < 30) {
      strategy.waitTime = 10000;
      strategy.method = 'aggressive';
      strategy.options = {
        waitForImages: true,
        waitForAjax: true,
        useDeepExtraction: true
      };
    } else if (validation.score < 70) {
      strategy.waitTime = 7000;
      strategy.method = 'enhanced';
      strategy.options = {
        waitForAjax: true,
        expandSearchScope: true
      };
    }

    if (validation.details.pageValidation?.indicators.hasDynamicContent) {
      strategy.options.useMutationObserver = true;
      strategy.options.mutationTimeout = 15000;
    }

    if (validation.details.pageValidation?.indicators.hasLoadingElements) {
      strategy.options.waitForLoadingComplete = true;
    }

    return strategy;
  }
}

// Load extraction validator
const validator = new ExtractionValidator();

// Enhanced extraction state
let extractionState = {
  attempts: 0,
  maxAttempts: 5,
  data: null,
  bestExtraction: null,
  isComplete: false,
  lastScore: 0
};

// Enhanced URL extraction with progressive attempts
async function extractUrlsProgressive(options = {}) {
  console.log('🧠 Starting progressive extraction, attempt:', extractionState.attempts + 1);
  
  const extractionOptions = {
    waitForImages: options.waitForImages || false,
    expandedSearch: options.expandedSearch || false,
    includeMetadata: options.includeMetadata || true,
    deepTextExtraction: options.deepTextExtraction || false,
    ...options
  };
  
  // Wait for any pending content if specified
  if (extractionOptions.waitForImages) {
    await waitForImages();
  }
  
  if (extractionOptions.waitForAjax) {
    await waitForAjaxComplete();
  }
  
  // Perform extraction with enhanced data collection
  const urls = {
    companies: [],
    all: [],
    pageInfo: {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      metadata: extractionOptions.includeMetadata ? extractPageMetadata() : {},
      extractionAttempt: extractionState.attempts + 1
    }
  };

  // Enhanced link extraction
  const links = document.querySelectorAll('a[href]');
  const linkDataArray = [];
  
  links.forEach(link => {
    const href = link.href;
    if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
    
    // Enhanced link data extraction
    const linkData = {
      url: href,
      text: link.textContent.trim().substring(0, 200),
      title: link.title || '',
      context: extractLinkContext(link),
      urlAnalysis: analyzeUrl(href),
      // New: Extract more comprehensive data
      enrichedData: extractionOptions.deepTextExtraction ? extractEnrichedLinkData(link) : null
    };
    
    linkDataArray.push(linkData);
    urls.all.push(linkData);
    
    if (isSortlistUrl(href) && !isNavigationUrl(href)) {
      const companyData = {
        url: href,
        name: extractCompanyNameEnhanced(link, href, extractionOptions),
        extracted_at: new Date().toISOString(),
        confidence: calculateLinkValue(linkData),
        context: linkData.context,
        // New: Additional company details
        details: extractionOptions.deepTextExtraction ? extractCompanyDetails(link) : null
      };
      
      urls.companies.push(companyData);
    }
  });

  // Remove duplicates and sort by confidence
  urls.companies = deduplicateAndSort(urls.companies);
  
  // Validate extraction completeness
  const validation = validator.validateExtraction(urls, { html: document.documentElement.outerHTML });
  urls.pageInfo.validation = validation;
  
  // Update extraction state
  extractionState.attempts++;
  extractionState.lastScore = validation.score;
  
  // Keep best extraction so far
  if (!extractionState.bestExtraction || validation.score > extractionState.bestExtraction.validation.score) {
    extractionState.bestExtraction = urls;
  }
  
  console.log('📊 Extraction validation:', {
    score: validation.score,
    isComplete: validation.isComplete,
    companiesFound: urls.companies.length,
    suggestions: validation.suggestions
  });
  
  return urls;
}

// Extract enriched link data for better completeness
function extractEnrichedLinkData(link) {
  const enrichedData = {
    nearbyHeadings: [],
    siblingText: [],
    parentContext: null,
    imageAlt: null
  };
  
  // Find nearby headings
  let element = link;
  let searchDepth = 5;
  while (element && searchDepth > 0) {
    element = element.previousElementSibling || element.parentElement;
    if (element) {
      const heading = element.querySelector('h1, h2, h3, h4, h5, h6') || 
                     (element.matches('h1, h2, h3, h4, h5, h6') ? element : null);
      if (heading) {
        enrichedData.nearbyHeadings.push(heading.textContent.trim());
      }
    }
    searchDepth--;
  }
  
  // Get sibling text
  const siblings = link.parentElement ? Array.from(link.parentElement.children) : [];
  siblings.forEach(sibling => {
    if (sibling !== link && sibling.textContent.trim()) {
      enrichedData.siblingText.push(sibling.textContent.trim().substring(0, 200));
    }
  });
  
  // Get parent context
  const card = link.closest('article, .card, .item, [class*="company"], [class*="agency"]');
  if (card) {
    enrichedData.parentContext = {
      class: card.className,
      id: card.id,
      text: card.textContent.trim().substring(0, 500)
    };
  }
  
  // Check for associated images
  const img = link.querySelector('img') || link.parentElement?.querySelector('img');
  if (img) {
    enrichedData.imageAlt = img.alt;
  }
  
  return enrichedData;
}

// Enhanced company name extraction
function extractCompanyNameEnhanced(link, url, options = {}) {
  let name = extractCompanyName(link, url); // Use existing function first
  
  // If name is poor quality, try enhanced extraction
  if (!name || name.length < 5 || name.match(/^(view|click|more|details|see|visit)/i)) {
    
    // Try structured data
    const structuredData = findNearbyStructuredData(link);
    if (structuredData && structuredData.name) {
      name = structuredData.name;
    }
    
    // Try meta information from card/container
    if (!name && options.deepTextExtraction) {
      const container = link.closest('article, .card, .item, [class*="company"]');
      if (container) {
        // Look for specific patterns
        const patterns = [
          { selector: '.company-name, .agency-name, .title', attribute: 'textContent' },
          { selector: '[itemprop="name"]', attribute: 'textContent' },
          { selector: 'h1, h2, h3', attribute: 'textContent' },
          { selector: 'img', attribute: 'alt' }
        ];
        
        for (const pattern of patterns) {
          const element = container.querySelector(pattern.selector);
          if (element) {
            const value = element[pattern.attribute];
            if (value && value.trim().length > 3) {
              name = value.trim();
              break;
            }
          }
        }
      }
    }
  }
  
  return name;
}

// Extract additional company details
function extractCompanyDetails(link) {
  const details = {
    description: null,
    location: null,
    services: [],
    rating: null,
    tags: []
  };
  
  const container = link.closest('article, .card, .item, [class*="company"]');
  if (!container) return details;
  
  // Look for description
  const descPatterns = ['.description', '.summary', '.excerpt', 'p'];
  for (const pattern of descPatterns) {
    const elem = container.querySelector(pattern);
    if (elem && elem.textContent.trim().length > 20) {
      details.description = elem.textContent.trim().substring(0, 500);
      break;
    }
  }
  
  // Look for location
  const locationPatterns = ['.location', '.address', '[class*="location"]', '[class*="address"]'];
  for (const pattern of locationPatterns) {
    const elem = container.querySelector(pattern);
    if (elem) {
      details.location = elem.textContent.trim();
      break;
    }
  }
  
  // Look for services/tags
  const tagElements = container.querySelectorAll('.tag, .skill, .service, [class*="tag"], [class*="skill"]');
  tagElements.forEach(tag => {
    const text = tag.textContent.trim();
    if (text && text.length < 50) {
      details.services.push(text);
    }
  });
  
  // Look for rating
  const ratingPatterns = ['.rating', '.stars', '[class*="rating"]', '[data-rating]'];
  for (const pattern of ratingPatterns) {
    const elem = container.querySelector(pattern);
    if (elem) {
      const rating = elem.getAttribute('data-rating') || elem.textContent.trim();
      if (rating) {
        details.rating = rating;
        break;
      }
    }
  }
  
  return details;
}

// Extract page metadata for validation
function extractPageMetadata() {
  const metadata = {
    metaTags: {},
    structuredData: [],
    openGraph: {},
    documentInfo: {}
  };
  
  // Meta tags
  document.querySelectorAll('meta').forEach(meta => {
    if (meta.name) {
      metadata.metaTags[meta.name] = meta.content;
    }
    if (meta.property && meta.property.startsWith('og:')) {
      metadata.openGraph[meta.property] = meta.content;
    }
  });
  
  // Structured data (JSON-LD)
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      metadata.structuredData.push(data);
    } catch (e) {
      console.error('Failed to parse structured data:', e);
    }
  });
  
  // Document info
  metadata.documentInfo = {
    readyState: document.readyState,
    contentLength: document.documentElement.innerHTML.length,
    imageCount: document.images.length,
    linkCount: document.links.length,
    hasFrames: window.frames.length > 0
  };
  
  return metadata;
}

// Find nearby structured data
function findNearbyStructuredData(element) {
  // Check for microdata
  const itemScope = element.closest('[itemscope]');
  if (itemScope) {
    const data = {};
    itemScope.querySelectorAll('[itemprop]').forEach(item => {
      data[item.getAttribute('itemprop')] = item.textContent.trim();
    });
    return data;
  }
  
  return null;
}

// Wait for images to load
async function waitForImages() {
  const images = Array.from(document.images);
  const promises = images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve);
      img.addEventListener('error', resolve);
      setTimeout(resolve, 3000); // Timeout after 3s per image
    });
  });
  
  await Promise.all(promises);
  console.log('✅ All images loaded or timed out');
}

// Wait for AJAX requests to complete
async function waitForAjaxComplete() {
  return new Promise(resolve => {
    let pendingRequests = 0;
    
    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function() {
      pendingRequests++;
      return originalOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function() {
      this.addEventListener('loadend', () => {
        pendingRequests--;
      });
      return originalSend.apply(this, arguments);
    };
    
    // Check for completion
    const checkInterval = setInterval(() => {
      if (pendingRequests === 0) {
        clearInterval(checkInterval);
        // Restore original methods
        XMLHttpRequest.prototype.open = originalOpen;
        XMLHttpRequest.prototype.send = originalSend;
        resolve();
      }
    }, 500);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      XMLHttpRequest.prototype.open = originalOpen;
      XMLHttpRequest.prototype.send = originalSend;
      resolve();
    }, 10000);
  });
}

// Deduplicate and sort companies
function deduplicateAndSort(companies) {
  const seen = new Map();
  
  companies.forEach(company => {
    const key = company.url;
    if (!seen.has(key) || company.confidence > seen.get(key).confidence) {
      seen.set(key, company);
    }
  });
  
  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
}

// Progressive extraction controller
async function performProgressiveExtraction() {
  console.log('🚀 Starting progressive extraction process');
  
  // Reset state
  extractionState = {
    attempts: 0,
    maxAttempts: 5,
    data: null,
    bestExtraction: null,
    isComplete: false,
    lastScore: 0
  };
  
  // First attempt - quick extraction
  let result = await extractUrlsProgressive({
    waitForImages: false,
    expandedSearch: false,
    deepTextExtraction: false
  });
  
  // Check if we need more attempts
  const strategy = validator.getExtractionStrategy(result.pageInfo.validation);
  
  if (strategy.shouldRetry && extractionState.attempts < extractionState.maxAttempts) {
    console.log('📈 Extraction incomplete, trying enhanced strategy:', strategy.method);
    
    // Wait as recommended
    await new Promise(resolve => setTimeout(resolve, strategy.waitTime));
    
    // Try with enhanced options
    result = await extractUrlsProgressive({
      waitForImages: strategy.options.waitForImages || false,
      waitForAjax: strategy.options.waitForAjax || false,
      expandedSearch: strategy.options.expandSearchScope || false,
      deepTextExtraction: strategy.options.useDeepExtraction || false
    });
  }
  
  // Use mutation observer if recommended
  if (strategy.options.useMutationObserver && extractionState.attempts < extractionState.maxAttempts) {
    console.log('👁️ Using mutation observer for dynamic content');
    await watchForDynamicContent(strategy.options.mutationTimeout || 10000);
  }
  
  // Return best extraction
  const finalResult = extractionState.bestExtraction || result;
  console.log('✅ Progressive extraction complete:', {
    finalScore: finalResult.pageInfo.validation.score,
    attempts: extractionState.attempts,
    companiesFound: finalResult.companies.length
  });
  
  return finalResult;
}

// Watch for dynamic content with intelligent detection
async function watchForDynamicContent(timeout = 10000) {
  return new Promise(resolve => {
    let significantChanges = 0;
    let lastChangeTime = Date.now();
    
    const observer = new MutationObserver(async (mutations) => {
      // Check if mutations are significant
      const significant = mutations.some(mutation => {
        return mutation.type === 'childList' && 
               mutation.addedNodes.length > 0 &&
               Array.from(mutation.addedNodes).some(node => 
                 node.nodeType === Node.ELEMENT_NODE && 
                 (node.querySelector('a') || node.matches('a'))
               );
      });
      
      if (significant) {
        significantChanges++;
        lastChangeTime = Date.now();
        
        // Re-extract after significant changes
        if (significantChanges % 3 === 0) { // Every 3 significant changes
          console.log('🔄 Significant DOM changes detected, re-extracting...');
          const result = await extractUrlsProgressive({
            expandedSearch: true,
            deepTextExtraction: true
          });
          
          if (result.pageInfo.validation.score > extractionState.lastScore) {
            extractionState.bestExtraction = result;
            extractionState.lastScore = result.pageInfo.validation.score;
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
    
    // Check periodically if changes have stopped
    const checkInterval = setInterval(() => {
      if (Date.now() - lastChangeTime > 2000) { // 2 seconds of no changes
        clearInterval(checkInterval);
        observer.disconnect();
        console.log('✅ DOM stabilized after', significantChanges, 'significant changes');
        resolve();
      }
    }, 500);
    
    // Timeout
    setTimeout(() => {
      clearInterval(checkInterval);
      observer.disconnect();
      console.log('⏱️ Mutation observer timeout reached');
      resolve();
    }, timeout);
  });
}

// Initialize extraction when ready
let extractedData = null;

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('📄 Page ready, starting progressive extraction');
  performProgressiveExtraction().then(data => {
    extractedData = data;
    sendExtractedData(data);
    autoHarvestPage();
  });
} else {
  window.addEventListener('load', () => {
    console.log('📄 Page loaded, starting progressive extraction');
    performProgressiveExtraction().then(data => {
      extractedData = data;
      sendExtractedData(data);
      autoHarvestPage();
    });
  });
}

// Send extracted data to background
function sendExtractedData(data) {
  chrome.runtime.sendMessage({
    action: 'urlsExtracted',
    data: data,
    pageContent: capturePageContent(),
    source: 'enhanced-content-script'
  }, response => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error sending data:', chrome.runtime.lastError);
    } else {
      console.log('✅ Enhanced data sent to background:', response);
    }
  });
}

// ============= Helper Functions from original content.js =============

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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    sendResponse({
      urls: extractedData || performProgressiveExtraction(),
      pageContent: capturePageContent()
    });
  }
});