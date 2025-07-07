// Stealth utilities for anti-scraping measures

// Configuration
const STEALTH_CONFIG = {
  debugMode: false, // Set to false in production
  enableRandomization: true,
  enableUserAgentRotation: true,
  enableHumanSimulation: true,
  enableRateLimiting: true
};

// ============= Timing Randomization =============

/**
 * Add random variance to delays to appear more human
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} variance - Variance factor (0.0 to 1.0)
 * @returns {number} Randomized delay
 */
function randomDelay(baseDelay, variance = 0.4) {
  if (!STEALTH_CONFIG.enableRandomization) return baseDelay;
  
  const min = baseDelay * (1 - variance);
  const max = baseDelay * (1 + variance);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for a random duration
 * @param {number} ms - Base milliseconds to sleep
 * @param {number} variance - Variance factor
 */
function randomSleep(ms, variance = 0.4) {
  return new Promise(resolve => setTimeout(resolve, randomDelay(ms, variance)));
}

// ============= Stealth Logging =============

/**
 * Conditional logging based on debug mode
 */
const stealthLog = {
  log: (...args) => {
    if (STEALTH_CONFIG.debugMode) console.log(...args);
  },
  error: (...args) => {
    if (STEALTH_CONFIG.debugMode) console.error(...args);
  },
  warn: (...args) => {
    if (STEALTH_CONFIG.debugMode) console.warn(...args);
  },
  info: (...args) => {
    if (STEALTH_CONFIG.debugMode) console.info(...args);
  }
};

// ============= User Agent Rotation =============

const USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  
  // Chrome on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  
  // Firefox on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Gecko/20100101 Firefox/122.0',
  
  // Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  
  // Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

// Session-persistent user agent
let sessionUserAgent = null;

/**
 * Get a user agent for the session (stays consistent per session)
 */
function getSessionUserAgent() {
  if (!STEALTH_CONFIG.enableUserAgentRotation) {
    return navigator.userAgent;
  }
  
  if (!sessionUserAgent) {
    sessionUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    stealthLog.info('Selected user agent for session:', sessionUserAgent);
  }
  return sessionUserAgent;
}

/**
 * Rotate to a new user agent (for new sessions)
 */
function rotateUserAgent() {
  sessionUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return sessionUserAgent;
}

// ============= Human Behavior Simulation =============

/**
 * Simulate human-like scrolling behavior
 */
async function humanScroll() {
  if (!STEALTH_CONFIG.enableHumanSimulation) return;
  
  const scrollSteps = 3 + Math.floor(Math.random() * 5);
  stealthLog.info(`Simulating human scroll: ${scrollSteps} steps`);
  
  for (let i = 0; i < scrollSteps; i++) {
    const scrollAmount = 100 + Math.random() * 300;
    
    // Smooth scroll
    window.scrollBy({
      top: scrollAmount,
      behavior: 'smooth'
    });
    
    // Random pause between scrolls
    await randomSleep(500, 0.5);
  }
  
  // Sometimes scroll back up a bit
  if (Math.random() > 0.7) {
    window.scrollBy({
      top: -(50 + Math.random() * 200),
      behavior: 'smooth'
    });
  }
}

/**
 * Simulate reading time based on content length
 */
async function simulateReading(contentLength = 1000) {
  if (!STEALTH_CONFIG.enableHumanSimulation) return;
  
  // Base reading time: ~200-300 words per minute
  const wordsPerMinute = 200 + Math.random() * 100;
  const estimatedWords = contentLength / 5; // Rough estimate
  const readingTime = (estimatedWords / wordsPerMinute) * 60 * 1000;
  
  // Add some randomness and cap it
  const actualTime = Math.min(randomDelay(readingTime, 0.3), 10000);
  
  stealthLog.info(`Simulating reading for ${actualTime}ms`);
  await randomSleep(actualTime);
}

/**
 * Simulate mouse movement (visual indicator only)
 */
function simulateMouseMovement() {
  // Note: We can't actually move the mouse, but we can trigger mouse events
  const event = new MouseEvent('mousemove', {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: Math.random() * window.innerWidth,
    clientY: Math.random() * window.innerHeight
  });
  
  document.dispatchEvent(event);
}

/**
 * Full human simulation routine
 */
async function simulateHumanBehavior() {
  if (!STEALTH_CONFIG.enableHumanSimulation) return;
  
  stealthLog.info('Starting human behavior simulation');
  
  // Initial pause (like page load reaction)
  await randomSleep(1000, 0.5);
  
  // Scroll and read
  await humanScroll();
  await simulateReading(document.body.textContent.length);
  
  // Maybe scroll some more
  if (Math.random() > 0.5) {
    await humanScroll();
  }
  
  // Simulate some mouse movements
  for (let i = 0; i < 3; i++) {
    simulateMouseMovement();
    await randomSleep(300, 0.5);
  }
}

// ============= Rate Limiting =============

class RateLimiter {
  constructor() {
    this.domainRequests = new Map();
    this.lastRequestTime = new Map();
    this.baseDelay = 30000; // 30 seconds base
  }
  
  /**
   * Get throttled delay for a domain
   */
  async getDelay(domain) {
    if (!STEALTH_CONFIG.enableRateLimiting) return this.baseDelay;
    
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(domain) || 0;
    const timeSinceLastRequest = now - lastRequest;
    const requestCount = this.domainRequests.get(domain) || 0;
    
    // Calculate delay with exponential backoff
    let delay = this.calculateDelay(requestCount, timeSinceLastRequest);
    
    // Update tracking
    this.domainRequests.set(domain, requestCount + 1);
    this.lastRequestTime.set(domain, now);
    
    return delay;
  }
  
  calculateDelay(requestCount, timeSinceLastRequest) {
    let delay = this.baseDelay;
    
    // Exponential backoff based on request count
    if (requestCount < 10) {
      delay = randomDelay(this.baseDelay);
    } else if (requestCount < 50) {
      delay = randomDelay(this.baseDelay * 1.5);
    } else if (requestCount < 100) {
      delay = randomDelay(this.baseDelay * 2);
    } else {
      delay = randomDelay(this.baseDelay * 3);
    }
    
    // If it's been a while since last request, reduce delay
    if (timeSinceLastRequest > 300000) { // 5 minutes
      delay = delay * 0.7;
    }
    
    stealthLog.info(`Rate limiter: ${requestCount} requests, delay: ${delay}ms`);
    return delay;
  }
  
  /**
   * Reset counts for a domain (e.g., after cooldown)
   */
  reset(domain) {
    this.domainRequests.delete(domain);
    this.lastRequestTime.delete(domain);
  }
}

// ============= Blocking Detection =============

/**
 * Detect if we're being blocked or rate limited
 */
function detectBlocking(response) {
  const blockingIndicators = [
    // HTTP status codes
    response.status === 429, // Too Many Requests
    response.status === 403, // Forbidden
    response.status === 503, // Service Unavailable
    
    // Response body checks (if available)
    response.text && response.text.toLowerCase().includes('captcha'),
    response.text && response.text.toLowerCase().includes('robot'),
    response.text && response.text.toLowerCase().includes('automated'),
    response.text && response.text.toLowerCase().includes('rate limit'),
    response.text && response.text.toLowerCase().includes('blocked'),
    
    // Response headers
    response.headers && response.headers.get('X-RateLimit-Remaining') === '0',
    response.headers && response.headers.get('Retry-After')
  ];
  
  return blockingIndicators.some(indicator => indicator);
}

/**
 * Detect blocking from page content
 */
function detectBlockingInPage() {
  const pageText = document.body.textContent.toLowerCase();
  const blockingKeywords = [
    'access denied',
    'captcha',
    'verify you are human',
    'unusual traffic',
    'automated access',
    'rate limit exceeded',
    'too many requests',
    'blocked'
  ];
  
  return blockingKeywords.some(keyword => pageText.includes(keyword));
}

/**
 * Handle blocking with exponential backoff
 */
async function handleBlocking(domain, severity = 'medium') {
  stealthLog.warn(`Blocking detected for ${domain}, severity: ${severity}`);
  
  let cooldownTime;
  switch (severity) {
    case 'low':
      cooldownTime = randomDelay(60000, 0.3); // ~1 minute
      break;
    case 'medium':
      cooldownTime = randomDelay(300000, 0.3); // ~5 minutes
      break;
    case 'high':
      cooldownTime = randomDelay(900000, 0.3); // ~15 minutes
      break;
    default:
      cooldownTime = randomDelay(300000, 0.3);
  }
  
  stealthLog.info(`Entering cooldown for ${cooldownTime}ms`);
  
  // Notify background script about blocking
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'blockingDetected',
      domain: domain,
      severity: severity,
      cooldownTime: cooldownTime
    });
  }
  
  return cooldownTime;
}

// ============= Headers Enhancement =============

/**
 * Get realistic browser headers
 */
function getEnhancedHeaders() {
  const userAgent = getSessionUserAgent();
  
  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  };
}

// ============= Utility Functions =============

/**
 * Generate random viewport size (desktop)
 */
function getRandomViewport() {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1600, height: 900 },
    { width: 1680, height: 1050 }
  ];
  
  return viewports[Math.floor(Math.random() * viewports.length)];
}

/**
 * Check if we should visit a decoy page
 */
function shouldVisitDecoy(visitCount) {
  // Visit decoy page every 10-20 real visits
  const decoyInterval = 10 + Math.floor(Math.random() * 10);
  return visitCount % decoyInterval === 0;
}

// ============= Export =============

// For use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STEALTH_CONFIG,
    randomDelay,
    randomSleep,
    stealthLog,
    getSessionUserAgent,
    rotateUserAgent,
    humanScroll,
    simulateReading,
    simulateHumanBehavior,
    RateLimiter,
    detectBlocking,
    detectBlockingInPage,
    handleBlocking,
    getEnhancedHeaders,
    getRandomViewport,
    shouldVisitDecoy
  };
}

// For use in service workers and background scripts
if (typeof self !== 'undefined') {
  self.StealthUtils = {
    STEALTH_CONFIG,
    randomDelay,
    randomSleep,
    stealthLog,
    getSessionUserAgent,
    rotateUserAgent,
    RateLimiter,
    detectBlocking,
    handleBlocking,
    getEnhancedHeaders,
    getRandomViewport,
    shouldVisitDecoy
  };
}