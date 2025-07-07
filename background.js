// Background service worker - Fixed version
let collectedData = {
  companies: [],
  pages: [],
  allUrls: []
};

// Auto-browse functionality
let autoBrowseState = {
  enabled: false,
  interval: 30000, // 30 seconds default
  currentIndex: 0,
  visitedUrls: new Set(),
  intervalId: null
};

// Collection page management
let collectionTags = [];

async function loadCollectionTags() {
  try {
    const result = await chrome.storage.local.get(['collection_tags']);
    collectionTags = result.collection_tags || [];
    console.log('Loaded collection tags:', collectionTags.length);
  } catch (error) {
    console.error('Error loading collection tags:', error);
    collectionTags = [];
  }
}

async function saveCollectionTags() {
  try {
    await chrome.storage.local.set({ 'collection_tags': collectionTags });
    console.log('Saved collection tags:', collectionTags.length);
  } catch (error) {
    console.error('Error saving collection tags:', error);
  }
}

function isCollectionUrl(url) {
  return collectionTags.some(tag => {
    if (!tag.enabled) return false;
    
    const urlLower = url.toLowerCase();
    const pattern = tag.pattern.toLowerCase();
    
    // Simple pattern matching
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      // Contains pattern
      const searchTerm = pattern.slice(1, -1);
      return urlLower.includes(searchTerm);
    } else if (pattern.endsWith('-')) {
      // Starts with pattern
      const searchTerm = pattern.slice(0, -1);
      return urlLower.includes(searchTerm);
    } else {
      // Contains pattern
      return urlLower.includes(pattern);
    }
  });
}

function classifyUrls(urls) {
  const classification = {
    collection: [],
    individual: []
  };
  
  urls.forEach(company => {
    if (isCollectionUrl(company.url)) {
      classification.collection.push(company);
    } else {
      classification.individual.push(company);
    }
  });
  
  return classification;
}

function addCollectionTag(pattern, description) {
  const newTag = {
    id: Date.now().toString(),
    pattern: pattern.trim(),
    description: description.trim(),
    enabled: true,
    created_at: new Date().toISOString(),
    matches: 0
  };
  
  collectionTags.push(newTag);
  return newTag;
}

function removeCollectionTag(tagId) {
  collectionTags = collectionTags.filter(tag => tag.id !== tagId);
}

function toggleCollectionTag(tagId, enabled) {
  const tag = collectionTags.find(tag => tag.id === tagId);
  if (tag) {
    tag.enabled = enabled;
  }
}

// Import storage manager and stealth utilities
try {
  importScripts('storage_manager.js');
  importScripts('stealth-utils.js');
} catch (e) {
  console.log('Some modules not loaded:', e);
}

const storageManager = typeof ExtensionStorageManager !== 'undefined' ? new ExtensionStorageManager() : null;

// Initialize - load existing data from storage
async function initialize() {
  try {
    console.log('🚀 Initializing background script with intelligent features...');
    
    // Load all critical data from Chrome storage
    const result = await chrome.storage.local.get([
      'sortlist_harvested_data', 
      'auto_browse_state',
      'collection_tags',
      'site_map_data'
    ]);
    
    // Restore collected data
    if (result.sortlist_harvested_data) {
      collectedData = result.sortlist_harvested_data;
      console.log('📂 Loaded existing data:', collectedData.companies.length, 'companies');
    } else {
      console.log('📂 No existing data found, starting fresh');
    }
    
    // Restore auto-browse state
    if (result.auto_browse_state) {
      autoBrowseState.visitedUrls = new Set(result.auto_browse_state.visitedUrls || []);
      autoBrowseState.currentIndex = result.auto_browse_state.currentIndex || 0;
      console.log('🤖 Restored auto-browse state:', autoBrowseState.visitedUrls.size, 'visited URLs');
    }
    
    // Restore site map data
    if (result.site_map_data) {
      try {
        // Reconstruct Maps from stored data
        const { pages, domains, patterns } = result.site_map_data;
        if (pages) siteMap.pages = new Map(pages);
        if (domains) siteMap.domains = new Map(domains);
        if (patterns) siteMap.patterns = new Map(patterns);
        console.log('🗺️ Restored site map:', siteMap.getSiteStatistics());
      } catch (e) {
        console.error('Error restoring site map:', e);
      }
    }
    
    // Load collection tags (keeping for backward compatibility)
    await loadCollectionTags();
    
    // Initialize storage manager if available
    if (storageManager) {
      const data = await storageManager.init();
      if (data && data.companies && data.companies.length > collectedData.companies.length) {
        collectedData = data;
      }
    }
    
    updateBadge();
    console.log('✅ Background script initialization complete with intelligent features');
  } catch (error) {
    console.error('❌ Error initializing:', error);
  }
}

// Call initialize
initialize();

// Single message listener for all actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  switch (request.action) {
    case 'urlsExtracted':
      handleUrlsExtracted(request, sender);
      sendResponse({ success: true });
      break;
      
    case 'getData':
      sendResponse(collectedData);
      break;
      
    case 'clearData':
      clearAllData();
      sendResponse({ success: true });
      break;
      
    case 'exportData':
      const exportData = {
        timestamp: new Date().toISOString(),
        companies: collectedData.companies,
        pages_visited: collectedData.pages.length,
        total_companies: collectedData.companies.length,
        urls_text: collectedData.companies.map(c => c.url).join('\n')
      };
      sendResponse(exportData);
      break;
      
    case 'settingsUpdated':
      console.log('Settings updated:', request.settings);
      sendResponse({ success: true });
      break;
      
    case 'startAutoBrowse':
      startAutoBrowse(request.settings);
      sendResponse({ success: true });
      break;
      
    case 'stopAutoBrowse':
      stopAutoBrowse();
      sendResponse({ success: true });
      break;
      
    case 'getAutoBrowseState':
      sendResponse({
        ...autoBrowseState,
        unvisitedCount: getUnvisitedUrls().length,
        totalUrls: collectedData.companies.length,
        visitedCount: autoBrowseState.visitedUrls.size
      });
      break;
      
    case 'resetVisited':
      autoBrowseState.visitedUrls.clear();
      autoBrowseState.currentIndex = 0;
      sendResponse({ success: true });
      break;
      
    case 'getCollectionTags':
      sendResponse({ tags: collectionTags });
      break;
      
    case 'addCollectionTag':
      const newTag = addCollectionTag(request.pattern, request.description);
      saveCollectionTags().then(() => {
        sendResponse({ success: true, tag: newTag });
      });
      break;
      
    case 'removeCollectionTag':
      removeCollectionTag(request.tagId);
      saveCollectionTags().then(() => {
        sendResponse({ success: true });
      });
      break;
      
    case 'toggleCollectionTag':
      toggleCollectionTag(request.tagId, request.enabled);
      saveCollectionTags().then(() => {
        sendResponse({ success: true });
      });
      break;
      
    case 'classifyUrls':
      const classification = classifyUrls(collectedData.companies);
      
      // Update match counts for tags
      collectionTags.forEach(tag => {
        tag.matches = collectedData.companies.filter(company => 
          isCollectionUrl(company.url) && 
          company.url.toLowerCase().includes(tag.pattern.toLowerCase())
        ).length;
      });
      
      sendResponse({
        classification,
        stats: {
          collection: classification.collection.length,
          individual: classification.individual.length,
          total: collectedData.companies.length
        }
      });
      break;
      
    case 'getSiteMapStats':
      sendResponse({
        stats: siteMap.getSiteStatistics(),
        success: true
      });
      break;
      
    case 'blockingDetected':
      handleBlockingDetection(request);
      sendResponse({ success: true });
      break;
      
    default:
      console.log('Unknown action:', request.action);
      sendResponse({ error: 'Unknown action' });
  }
  
  // Return true to indicate async response
  return true;
});

// Handle URLs extracted from content script - Enhanced version
async function handleUrlsExtracted(request, sender) {
  const source = request.source || 'content-script';
  const pageInfo = request.data.pageInfo;
  
  console.log(`📥 Processing ENHANCED data from ${source}:`, {
    url: pageInfo?.url,
    classification: pageInfo?.classification?.type,
    collectionScore: pageInfo?.classification?.collectionScore,
    companies: request.data.companies.length,
    totalLinks: request.data.all?.length || request.data.allLinks?.length,
    patterns: pageInfo?.patterns?.summary,
    tabId: sender.tab?.id
  });
  
  // Add page to site map for learning
  if (pageInfo && pageInfo.classification) {
    siteMap.addPage(pageInfo.url, pageInfo);
    console.log('📊 Site map updated:', siteMap.getSiteStatistics());
  }
  
  // Process ALL links for crawling (not just companies)
  const allLinks = request.data.allLinks || request.data.all || [];
  allLinks.forEach(linkData => {
    // Store all Sortlist URLs for potential crawling
    if (linkData.url && linkData.url.includes('sortlist') && !isNavigationUrl(linkData.url)) {
      const normalizedUrl = normalizeUrl(linkData.url);
      const existingUrls = collectedData.companies.map(c => normalizeUrl(c.url));
      
      if (!existingUrls.includes(normalizedUrl)) {
        // Add with enhanced metadata
        collectedData.companies.push({
          url: linkData.url,
          name: linkData.text || 'Unknown',
          extracted_at: new Date().toISOString(),
          source_tab: sender.tab.id,
          normalized_url: normalizedUrl,
          confidence: linkData.confidence || 0.5,
          context: linkData.context || {},
          fromPage: {
            url: pageInfo?.url,
            type: pageInfo?.classification?.type
          }
        });
      }
    }
  });
  
  // Debug information
  if (request.data.companies.length > 0) {
    console.log('🎯 High-confidence company URLs:', 
      request.data.companies
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 3)
        .map(c => ({
          url: c.url,
          name: c.name,
          confidence: c.confidence
        }))
    );
  }
  
  let newCompaniesAdded = 0;
  
  // Add new company URLs (limit to 5000 to avoid quota issues)
  request.data.companies.forEach(company => {
    const existingUrls = collectedData.companies.map(c => c.url);
    
    // Check for duplicates using normalized URLs
    if (!isDuplicateUrl(company.url, existingUrls)) {
      collectedData.companies.push({
        url: company.url,
        name: company.name || 'Unknown',
        extracted_at: company.extracted_at || new Date().toISOString(),
        source_tab: sender.tab.id,
        normalized_url: normalizeUrl(company.url) // Store normalized version for reference
      });
      newCompaniesAdded++;
    } else {
      console.log('🔄 Skipped duplicate URL:', company.url, '→', normalizeUrl(company.url));
    }
  });
  
  // Limit to 5000 companies to avoid storage issues
  if (collectedData.companies.length > 5000) {
    collectedData.companies = collectedData.companies.slice(-5000);
  }
  
  console.log(`✅ Added ${newCompaniesAdded} new companies from ${source}:`, {
    total: collectedData.companies.length,
    newUrls: newCompaniesAdded > 0 ? request.data.companies.slice(0, 3).map(c => c.url) : 'none'
  });
  
  // Force update badge to show new count
  updateBadge();
  
  // If this is from auto-browse, log it prominently
  if (sender.tab && sender.tab.url) {
    console.log(`🤖 AUTO-BROWSE RESULT from ${sender.tab.url}: Added ${newCompaniesAdded} new companies`);
    
    // Notify dashboard about auto-browse collection
    chrome.runtime.sendMessage({
      action: 'dataUpdated',
      companies: collectedData.companies.length,
      newCompanies: newCompaniesAdded,
      source: 'auto-browse',
      fromUrl: sender.tab.url
    }).catch(() => {});
  }
  
  // Add page info
  if (request.data.pageInfo) {
    collectedData.pages.push({
      ...request.data.pageInfo,
      companiesFound: request.data.companies.length,
      timestamp: new Date().toISOString()
    });
  }
  
  // Skip storing page content/HTML to avoid quota issues
  console.log('⏭️ Skipping page content storage to save quota');
  
  // Save to storage
  await saveData();
  
  // Update badge
  updateBadge();
  
  // Notify any open tabs (like dashboard)
  chrome.runtime.sendMessage({
    action: 'dataUpdated',
    companies: collectedData.companies.length,
    newCompanies: newCompaniesAdded
  }).catch(() => {
    // Ignore errors if no listeners
  });
}

// Save data to storage
async function saveData() {
  try {
    // Prepare site map data for storage (convert Maps to arrays)
    const siteMapData = {
      pages: Array.from(siteMap.pages.entries()),
      domains: Array.from(siteMap.domains.entries()),
      patterns: Array.from(siteMap.patterns.entries())
    };
    
    // Save to Chrome storage
    await chrome.storage.local.set({
      'sortlist_harvested_data': collectedData,
      'site_map_data': siteMapData
    });
    
    console.log('Data saved to Chrome storage with site map');
    
    // Use storage manager if available
    if (storageManager) {
      await storageManager.saveToLocalStorage(collectedData);
      
      // Check for auto-export
      const settings = await getSettings();
      if (settings.autoExport && collectedData.companies.length % settings.exportThreshold === 0) {
        await storageManager.createDownloadableFile(collectedData);
      }
    }
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Clear all data
async function clearAllData() {
  collectedData = {
    companies: [],
    pages: [],
    allUrls: []
  };
  
  try {
    await chrome.storage.local.clear();
    updateBadge();
    console.log('All data cleared');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// Clean up storage to avoid quota issues
async function cleanupStorage() {
  try {
    const storage = await chrome.storage.local.get();
    const keys = Object.keys(storage);
    
    // Remove old page data
    const pageKeys = keys.filter(key => key.startsWith('page_')).sort();
    if (pageKeys.length > 50) {
      const keysToRemove = pageKeys.slice(0, pageKeys.length - 50);
      await chrome.storage.local.remove(keysToRemove);
      console.log('Cleaned up', keysToRemove.length, 'old page entries');
    }
    
    // Check storage usage
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    console.log('Storage usage:', Math.round(bytesInUse / 1024), 'KB');
    
    // If over 4MB, clear old data (reduced threshold)
    if (bytesInUse > 4 * 1024 * 1024) {
      console.log('Storage getting full, reducing data...');
      
      // Keep only recent 500 companies to free up space
      collectedData.companies = collectedData.companies.slice(-500);
      collectedData.pages = collectedData.pages.slice(-20);
      collectedData.allUrls = []; // Clear this completely
      
      await saveData();
      console.log('Data reduced to prevent quota issues');
    }
  } catch (error) {
    console.error('Error cleaning storage:', error);
  }
}

// Update badge with current count
function updateBadge() {
  const count = collectedData.companies.length;
  chrome.action.setBadgeText({ 
    text: count > 0 ? count.toString() : ''
  });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}

// Get settings with defaults
async function getSettings() {
  const defaults = {
    autoSave: true,
    autoSaveInterval: 30,
    autoExport: true,
    exportThreshold: 50,
    useIndexedDB: true,
    keepBackups: true,
    savePageHTML: false
  };
  
  try {
    const result = await chrome.storage.sync.get({ settings: defaults });
    return result.settings;
  } catch (error) {
    return defaults;
  }
}

// Auto-save with randomized intervals
let autoSaveInterval;
function scheduleAutoSave() {
  const baseInterval = 30000; // 30 seconds
  const nextInterval = (typeof StealthUtils !== 'undefined' && StealthUtils) ? StealthUtils.randomDelay(baseInterval, 0.3) : baseInterval;
  
  autoSaveInterval = setTimeout(() => {
    if (collectedData.companies.length > 0) {
      const log = (typeof StealthUtils !== 'undefined' && StealthUtils) ? StealthUtils.stealthLog : console;
      log.log(`💾 Auto-saving ${collectedData.companies.length} companies...`);
      saveData().catch(error => {
        log.error('❌ Save failed:', error);
      });
    }
    scheduleAutoSave(); // Schedule next save
  }, nextInterval);
}
scheduleAutoSave();

// URL normalization functions
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Remove fragment/anchor (everything after #)
    urlObj.hash = '';
    
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ref', 'source', 'campaign_id', '_ga', '_gl'
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Standardize trailing slash
    if (urlObj.pathname.endsWith('/') && urlObj.pathname.length > 1) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch (e) {
    console.warn('Failed to normalize URL:', url, e);
    return url;
  }
}

function isDuplicateUrl(url, existingUrls) {
  const normalized = normalizeUrl(url);
  return existingUrls.some(existing => normalizeUrl(existing) === normalized);
}

// Intelligent auto-browse with smart priority queue
function getUnvisitedUrls() {
  const unvisited = collectedData.companies.filter(company => {
    const normalizedUrl = normalizeUrl(company.url);
    return !autoBrowseState.visitedUrls.has(normalizedUrl);
  });
  
  // Use site map to intelligently prioritize URLs
  const prioritizedUrls = siteMap.getHighValuePages(unvisited.map(c => c.url))
    .map(url => unvisited.find(c => c.url === url))
    .filter(Boolean);
  
  // Log intelligent prioritization
  console.log('🧠 Intelligent priority queue:', {
    total: prioritizedUrls.length,
    topUrls: prioritizedUrls.slice(0, 5).map(c => ({
      url: c.url,
      score: siteMap.calculateUrlScore(c.url),
      fromPage: c.fromPage?.type || 'unknown'
    })),
    siteStats: siteMap.getSiteStatistics()
  });
  
  return prioritizedUrls;
}

// Check if URL is likely navigation/utility (moved from content.js)
function isNavigationUrl(url) {
  const navPatterns = [
    '/login', '/signup', '/register', '/terms', '/privacy', '/about', '/contact',
    '/blog', '/news', '/help', '/faq', '/careers', '/jobs'
  ];
  return navPatterns.some(pattern => url.toLowerCase().includes(pattern));
}

// Rate limiter instance
const rateLimiter = (typeof StealthUtils !== 'undefined' && StealthUtils) ? new StealthUtils.RateLimiter() : null;

// Auto-browse with stealth enhancements
function startAutoBrowse(settings = {}) {
  const log = (typeof StealthUtils !== 'undefined' && StealthUtils) ? StealthUtils.stealthLog : console;
  log.log('Starting auto-browse with stealth mode...');
  
  // Update settings
  autoBrowseState.interval = settings.interval || 30000;
  autoBrowseState.enabled = true;
  
  // Start browsing with initial delay
  scheduleNextBrowse();
}

// Schedule next browse with randomized timing
function scheduleNextBrowse() {
  if (!autoBrowseState.enabled) return;
  
  // Clear any existing interval
  if (autoBrowseState.intervalId) {
    clearTimeout(autoBrowseState.intervalId);
  }
  
  // Calculate next delay with randomization
  const baseDelay = autoBrowseState.interval;
  const nextDelay = (typeof StealthUtils !== 'undefined' && StealthUtils) ? 
    StealthUtils.randomDelay(baseDelay, 0.4) : baseDelay;
  
  const log = (typeof StealthUtils !== 'undefined' && StealthUtils) ? StealthUtils.stealthLog : console;
  log.info(`Next browse in ${nextDelay}ms`);
  
  autoBrowseState.intervalId = setTimeout(async () => {
    if (autoBrowseState.enabled) {
      await browseNextUrl();
      scheduleNextBrowse(); // Schedule next
    }
  }, nextDelay);
}

function stopAutoBrowse() {
  console.log('Stopping auto-browse...');
  autoBrowseState.enabled = false;
  
  if (autoBrowseState.intervalId) {
    clearInterval(autoBrowseState.intervalId);
    autoBrowseState.intervalId = null;
  }
}

async function browseNextUrl() {
  const log = (typeof StealthUtils !== 'undefined' && StealthUtils) ? StealthUtils.stealthLog : console;
  const unvisitedUrls = getUnvisitedUrls();
  
  if (unvisitedUrls.length === 0) {
    log.log('No more unvisited URLs');
    stopAutoBrowse();
    
    // Notify dashboard that auto-browse completed
    chrome.runtime.sendMessage({
      action: 'autoBrowseComplete',
      message: 'All URLs have been visited!'
    }).catch(() => {});
    
    return;
  }
  
  // Get next URL
  const company = unvisitedUrls[0];
  const isCollection = isCollectionUrl(company.url);
  
  // Apply rate limiting if available
  if (rateLimiter) {
    try {
      const urlObj = new URL(company.url);
      const delay = await rateLimiter.getDelay(urlObj.hostname);
      if (delay > autoBrowseState.interval) {
        log.info(`Rate limiting: waiting ${delay}ms for ${urlObj.hostname}`);
        await new Promise(resolve => setTimeout(resolve, delay - autoBrowseState.interval));
      }
    } catch (e) {
      log.error('Rate limiter error:', e);
    }
  }
  
  log.log(`🤖 Auto-browsing ${isCollection ? '🏷️ COLLECTION' : '📄 individual'} page:`, company.url, `(${autoBrowseState.visitedUrls.size + 1}/${collectedData.companies.length})`);
  
  try {
    // Normalize URL for deduplication
    const normalizedUrl = normalizeUrl(company.url);
    
    // Mark as visited BEFORE opening (to prevent duplicates)
    autoBrowseState.visitedUrls.add(normalizedUrl);
    
    // Check if this is a Sortlist URL (will trigger content script) or external URL
    const isSortlistUrl = company.url.includes('sortlist.com') || 
                         company.url.includes('sortlist.be') || 
                         company.url.includes('sortlist.fr') || 
                         company.url.includes('sortlist.co.uk') || 
                         company.url.includes('sortlist.us');
    
    console.log('🔍 URL analysis:', {
      original: company.url,
      normalized: normalizedUrl,
      isSortlistUrl,
      willTriggerContentScript: isSortlistUrl,
      isDuplicate: normalizedUrl !== company.url
    });
    
    // Create new tab and navigate
    const tab = await chrome.tabs.create({
      url: company.url,
      active: false // Open in background
    });
    
    console.log('📄 Opened tab:', tab.id, 'for URL:', company.url);
    
    // Log auto-browse tab creation
    console.log(`🤖 AUTO-BROWSE TAB ${tab.id} created for: ${company.url}`);
    
    // Notify dashboard immediately
    chrome.runtime.sendMessage({
      action: 'autoBrowseUpdate',
      currentUrl: company.url,
      visitedCount: autoBrowseState.visitedUrls.size,
      unvisitedCount: unvisitedUrls.length - 1,
      tabId: tab.id,
      progress: `${autoBrowseState.visitedUrls.size}/${collectedData.companies.length}`,
      isCollection: isCollection,
      pageType: isCollection ? 'Collection' : 'Individual'
    }).catch(() => {});
    
    // Wait with randomized duration for content extraction
    const baseTabDuration = 15000; // 15 seconds base
    const tabDuration = (typeof StealthUtils !== 'undefined' && StealthUtils) ? 
      StealthUtils.randomDelay(baseTabDuration, 0.4) : baseTabDuration;
    
    setTimeout(async () => {
      try {
        log.log('🗑️ Closing auto-browse tab:', tab.id, `after ${tabDuration}ms`);
        await chrome.tabs.remove(tab.id);
      } catch (e) {
        log.log('Tab already closed:', tab.id);
      }
    }, tabDuration);
    
  } catch (error) {
    console.error('Error auto-browsing URL:', error);
    // Still mark as visited to avoid getting stuck (use normalized URL)
    const normalizedUrl = normalizeUrl(company.url);
    autoBrowseState.visitedUrls.add(normalizedUrl);
  }
}

// ============= Intelligent Site Mapping & Pattern Learning =============

class SiteMap {
  constructor() {
    this.pages = new Map(); // URL -> PageInfo
    this.domains = new Map(); // Domain -> DomainInfo
    this.patterns = new Map(); // Pattern -> Success metrics
    this.linkGraph = new Map(); // URL -> Set of linked URLs
  }
  
  addPage(url, pageData) {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Store page information
    this.pages.set(url, {
      url: url,
      type: pageData.classification.type,
      subType: pageData.classification.subType,
      collectionScore: pageData.classification.collectionScore,
      linkCount: pageData.linkStats.total,
      companyCount: pageData.linkStats.sortlist,
      extractedAt: new Date().toISOString(),
      patterns: pageData.patterns,
      depth: urlObj.pathname.split('/').filter(Boolean).length
    });
    
    // Update domain statistics
    if (!this.domains.has(domain)) {
      this.domains.set(domain, {
        domain: domain,
        pageCount: 0,
        companyCount: 0,
        collectionPages: 0,
        avgCollectionScore: 0
      });
    }
    
    const domainInfo = this.domains.get(domain);
    domainInfo.pageCount++;
    domainInfo.companyCount += pageData.linkStats.sortlist;
    if (pageData.classification.type === 'collection') {
      domainInfo.collectionPages++;
    }
    domainInfo.avgCollectionScore = 
      (domainInfo.avgCollectionScore * (domainInfo.pageCount - 1) + pageData.classification.collectionScore) 
      / domainInfo.pageCount;
    
    // Learn patterns from successful pages
    if (pageData.linkStats.sortlist > 10) {
      this.learnPattern(url, pageData);
    }
  }
  
  learnPattern(url, pageData) {
    const urlObj = new URL(url);
    const pathPattern = this.extractPathPattern(urlObj.pathname);
    
    if (!this.patterns.has(pathPattern)) {
      this.patterns.set(pathPattern, {
        pattern: pathPattern,
        occurrences: 0,
        avgCompanyYield: 0,
        avgCollectionScore: 0,
        examples: []
      });
    }
    
    const patternInfo = this.patterns.get(pathPattern);
    patternInfo.occurrences++;
    patternInfo.avgCompanyYield = 
      (patternInfo.avgCompanyYield * (patternInfo.occurrences - 1) + pageData.linkStats.sortlist) 
      / patternInfo.occurrences;
    patternInfo.avgCollectionScore = 
      (patternInfo.avgCollectionScore * (patternInfo.occurrences - 1) + pageData.classification.collectionScore) 
      / patternInfo.occurrences;
    patternInfo.examples.push(url);
  }
  
  extractPathPattern(path) {
    // Convert specific IDs/numbers to patterns
    const parts = path.split('/').filter(Boolean);
    return parts.map(part => {
      if (/^\d+$/.test(part)) return '[id]';
      if (/^[a-f0-9]{8,}$/i.test(part)) return '[hash]';
      if (/\d{4,}/.test(part)) return part.replace(/\d{4,}/g, '[id]');
      return part;
    }).join('/');
  }
  
  getHighValuePages(urls) {
    // Score and rank URLs based on learned patterns and site structure
    return urls.map(url => {
      const score = this.calculateUrlScore(url);
      return { url, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.url);
  }
  
  calculateUrlScore(url) {
    let score = 50; // Base score
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const pathPattern = this.extractPathPattern(urlObj.pathname);
      
      // Domain reputation bonus
      if (this.domains.has(domain)) {
        const domainInfo = this.domains.get(domain);
        score += domainInfo.avgCollectionScore * 30;
        if (domainInfo.companyCount > 50) score += 20;
      }
      
      // Pattern matching bonus
      if (this.patterns.has(pathPattern)) {
        const patternInfo = this.patterns.get(pathPattern);
        score += patternInfo.avgCollectionScore * 40;
        score += Math.min(patternInfo.avgCompanyYield, 20);
      }
      
      // URL structure bonuses
      const depth = urlObj.pathname.split('/').filter(Boolean).length;
      if (depth === 2 || depth === 3) score += 10; // Prefer mid-level pages
      
      // Keywords in path
      const pathLower = urlObj.pathname.toLowerCase();
      if (pathLower.includes('agencies') || pathLower.includes('directory')) score += 30;
      if (pathLower.includes('list') || pathLower.includes('all')) score += 20;
      if (pathLower.includes('category') || pathLower.includes('search')) score += 15;
      
      // Pagination bonus
      if (urlObj.search.includes('page=')) score += 10;
      
    } catch (e) {
      console.error('Error scoring URL:', url, e);
    }
    
    return score;
  }
  
  getSiteStatistics() {
    return {
      totalPages: this.pages.size,
      totalDomains: this.domains.size,
      patternsLearned: this.patterns.size,
      topDomains: Array.from(this.domains.entries())
        .sort((a, b) => b[1].companyCount - a[1].companyCount)
        .slice(0, 5)
        .map(([domain, info]) => ({ domain, ...info })),
      topPatterns: Array.from(this.patterns.entries())
        .sort((a, b) => b[1].avgCompanyYield - a[1].avgCompanyYield)
        .slice(0, 5)
        .map(([pattern, info]) => ({ pattern, ...info }))
    };
  }
}

// Global site map instance
const siteMap = new SiteMap();

// Blocking detection handler
function handleBlockingDetection(request) {
  const log = (typeof StealthUtils !== 'undefined' && StealthUtils) ? StealthUtils.stealthLog : console;
  log.warn('🚫 Blocking detected:', request);
  
  // Stop auto-browse if running
  if (autoBrowseState.enabled) {
    log.info('Pausing auto-browse due to blocking detection');
    autoBrowseState.enabled = false;
    
    // Notify dashboard
    chrome.runtime.sendMessage({
      action: 'autoBrowseUpdate',
      status: 'paused',
      reason: 'Blocking detected',
      url: request.url
    }).catch(() => {});
    
    // Schedule resume after cooldown
    const cooldown = request.cooldownTime || 300000; // 5 min default
    setTimeout(() => {
      log.info('Attempting to resume after cooldown');
      if (!autoBrowseState.enabled && collectedData.companies.length > 0) {
        autoBrowseState.enabled = true;
        scheduleNextBrowse();
      }
    }, cooldown);
  }
  
  // Update badge to show warning
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
  
  // Reset badge after cooldown
  setTimeout(() => {
    updateBadge();
  }, 30000);
}

console.log('Background script initialized with intelligent site mapping and stealth features');