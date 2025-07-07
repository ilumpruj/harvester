// Stealth Configuration Settings

const StealthConfig = {
  // Production mode - set to false to enable debug logging
  production: true,
  
  // Feature toggles
  features: {
    randomization: true,
    userAgentRotation: true,
    humanSimulation: true,
    rateLimiting: true,
    blockingDetection: true,
    decoyVisits: false // disabled by default
  },
  
  // Timing configuration (in milliseconds)
  timing: {
    minDelay: 20000,      // 20 seconds minimum between requests
    maxDelay: 60000,      // 60 seconds maximum
    tabDuration: {
      min: 10000,         // 10 seconds minimum tab open
      max: 25000          // 25 seconds maximum
    },
    humanBehavior: {
      initialPause: { min: 500, max: 2000 },
      scrollDelay: { min: 300, max: 1000 },
      readingSpeed: 250   // words per minute
    }
  },
  
  // Rate limiting configuration
  rateLimiting: {
    requestsPerHour: {
      low: 100,           // Normal operation
      medium: 50,         // Cautious mode
      high: 20            // Very cautious
    },
    backoffMultiplier: 1.5,
    cooldownPeriods: {
      low: 60000,         // 1 minute
      medium: 300000,     // 5 minutes
      high: 900000        // 15 minutes
    }
  },
  
  // Blocking detection keywords
  blockingKeywords: [
    'captcha',
    'robot',
    'automated',
    'rate limit',
    'too many requests',
    'access denied',
    'blocked',
    'suspicious activity',
    'unusual traffic',
    'verify you are human',
    'cloudflare'
  ],
  
  // Decoy sites for traffic mixing
  decoySites: [
    'https://www.google.com',
    'https://www.wikipedia.org',
    'https://www.reddit.com',
    'https://news.ycombinator.com',
    'https://www.linkedin.com',
    'https://www.twitter.com'
  ],
  
  // User agent rotation pool
  userAgents: {
    desktop: [
      // Chrome Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      
      // Chrome Mac
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      
      // Firefox
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Gecko/20100101 Firefox/122.0',
      
      // Edge
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
    ]
  },
  
  // Viewport sizes for randomization
  viewports: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1680, height: 1050 }
  ]
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StealthConfig;
} else {
  window.StealthConfig = StealthConfig;
}