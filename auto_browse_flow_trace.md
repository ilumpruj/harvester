# Chrome Extension Auto-Browse Flow Trace

## Overview
This document traces the exact flow when auto-browse opens a new tab and collects URLs, showing console logs and timing.

## Flow Sequence with Console Logs

### 1. User Starts Auto-Browse (T=0ms)
**Location**: Dashboard/Popup
**Action**: User clicks "Start Auto-Browsing"

```javascript
// dashboard.js
console.log('🚀 User clicked Start Auto-Browse button');
chrome.runtime.sendMessage({
  action: 'startAutoBrowse',
  settings: { interval: 30000 }
});
```

### 2. Background Script Receives Command (T=5ms)
**Location**: background.js
**Function**: Message listener → startAutoBrowse()

```javascript
// background.js (line 164)
console.log('Background received message: startAutoBrowse');

// background.js (line 561)
console.log('Starting auto-browse...');
// Output: "Starting auto-browse..."

// Immediately calls browseNextUrl()
```

### 3. Browse Next URL Function Executes (T=10ms)
**Location**: background.js
**Function**: browseNextUrl()

```javascript
// background.js (line 592)
// Get unvisited URLs with priority (collection pages first)
console.log('📊 Priority queue:', {
  total: 150,
  collection: 20,
  individual: 130
});
// Output: "📊 Priority queue: {total: 150, collection: 20, individual: 130}"

// background.js (line 610)
console.log('🤖 Auto-browsing 🏷️ COLLECTION page: https://www.sortlist.com/agencies/web-development (1/150)');
// Output: "🤖 Auto-browsing 🏷️ COLLECTION page: https://www.sortlist.com/agencies/web-development (1/150)"

// background.js (line 628)
console.log('🔍 URL analysis:', {
  original: 'https://www.sortlist.com/agencies/web-development',
  normalized: 'https://www.sortlist.com/agencies/web-development',
  isSortlistUrl: true,
  willTriggerContentScript: true,
  isDuplicate: false
});
```

### 4. Chrome Tab Created (T=50ms)
**Location**: background.js → Chrome API
**Action**: New tab opens in background

```javascript
// background.js (line 637)
const tab = await chrome.tabs.create({
  url: company.url,
  active: false // Background tab
});

// background.js (line 642)
console.log('📄 Opened tab: 12345 for URL: https://www.sortlist.com/agencies/web-development');
// Output: "📄 Opened tab: 12345 for URL: https://www.sortlist.com/agencies/web-development"

// background.js (line 645)
console.log('🤖 AUTO-BROWSE TAB 12345 created for: https://www.sortlist.com/agencies/web-development');
```

### 5. Content Scripts Triggered (T=100ms - 2000ms)
**Location**: Tab 12345
**Scripts**: Both content.js and universal-content.js are injected

#### 5a. Main Content Script (content.js) - Sortlist Pages Only
```javascript
// content.js (line 2) - T=100ms
console.log('🔗 Sortlist URL Harvester: Active on https://www.sortlist.com/agencies/web-development');
console.log('🔍 Looking for company URLs...');
console.log('📍 User agent: Mozilla/5.0...');
console.log('📍 Page ready state: loading');
console.log('🤖 Is auto-browse tab: NO');

// content.js (line 111) - T=105ms
console.log('👁️ Tab visibility:', {
  hidden: true,
  visibilityState: 'hidden',
  hasFocus: false
});

// content.js (line 123) - T=110ms
console.log('⏳ Waiting for page to load...');
```

#### 5b. Universal Content Script (universal-content.js) - All Pages
```javascript
// universal-content.js (line 2) - T=100ms
console.log('🌐 Universal harvester active on: https://www.sortlist.com/agencies/web-development');
console.log('🤖 Tab info:', {
  url: 'https://www.sortlist.com/agencies/web-development',
  domain: 'www.sortlist.com',
  readyState: 'loading'
});

// universal-content.js (line 10) - T=105ms
console.log('👁️ Universal script - Tab state:', {
  hidden: true,
  visibilityState: 'hidden',
  url: 'https://www.sortlist.com/agencies/web-development'
});
```

### 6. Page Load Complete & Extraction Begins (T=2000ms)
**Location**: Tab 12345
**Trigger**: Page load event or 2-second timeout

#### 6a. Universal Content Script Checks (T=2100ms)
```javascript
// universal-content.js (line 22) - T=2100ms
console.log('⏭️ Skipping universal content - Sortlist domain handled by main content script');
// Universal script exits for Sortlist domains
```

#### 6b. Main Content Script Extraction (T=2100ms)
```javascript
// content.js (line 125) - When page loads
console.log('📄 Page loaded, starting extraction');

// content.js (line 79) - performExtraction()
console.log('📊 Extracted data:', {
  total_links: 245,
  company_urls: 48,
  companies: [
    {url: 'https://www.sortlist.com/agency/example-agency-1', name: 'Example Agency 1'},
    {url: 'https://www.sortlist.com/agency/example-agency-2', name: 'Example Agency 2'},
    {url: 'https://www.sortlist.com/agency/example-agency-3', name: 'Example Agency 3'}
  ],
  page_title: 'Web Development Agencies | Sortlist'
});
```

### 7. Data Sent to Background Script (T=2150ms)
**Location**: content.js → background.js
**Action**: Chrome runtime message

```javascript
// content.js (line 87)
chrome.runtime.sendMessage({
  action: 'urlsExtracted',
  data: extractedData,
  pageContent: pageContent,
  source: 'main-content-script'
});

// content.js (line 96)
console.log('✅ Data sent to background: {success: true}');
```

### 8. Background Script Processes Data (T=2200ms)
**Location**: background.js
**Function**: handleUrlsExtracted()

```javascript
// background.js (line 280)
console.log('📥 Processing extracted URLs from main-content-script:', {
  companies: 48,
  totalLinks: 245,
  url: 'https://www.sortlist.com/agencies/web-development',
  title: 'Web Development Agencies | Sortlist',
  tabId: 12345,
  frameId: 0
});

// background.js (line 291)
console.log('🔗 Sample company URLs found:', [
  {url: 'https://www.sortlist.com/agency/example-agency-1', name: 'Example Agency 1'},
  {url: 'https://www.sortlist.com/agency/example-agency-2', name: 'Example Agency 2'},
  {url: 'https://www.sortlist.com/agency/example-agency-3', name: 'Example Agency 3'}
]);

// background.js (line 333)
console.log('✅ Added 48 new companies from main-content-script:', {
  total: 198,
  newUrls: [
    'https://www.sortlist.com/agency/example-agency-1',
    'https://www.sortlist.com/agency/example-agency-2',
    'https://www.sortlist.com/agency/example-agency-3'
  ]
});

// background.js (line 344)
console.log('🤖 AUTO-BROWSE RESULT from https://www.sortlist.com/agencies/web-development: Added 48 new companies');
```

### 9. Dashboard Notification (T=2250ms)
**Location**: background.js → dashboard
**Action**: Update UI

```javascript
// background.js (line 346)
chrome.runtime.sendMessage({
  action: 'dataUpdated',
  companies: 198,
  newCompanies: 48,
  source: 'auto-browse',
  fromUrl: 'https://www.sortlist.com/agencies/web-development'
});

// background.js (line 649)
chrome.runtime.sendMessage({
  action: 'autoBrowseUpdate',
  currentUrl: 'https://www.sortlist.com/agencies/web-development',
  visitedCount: 1,
  unvisitedCount: 149,
  tabId: 12345,
  progress: '1/150',
  isCollection: true,
  pageType: 'Collection'
});
```

### 10. Additional Extraction Attempt (T=3000ms)
**Location**: content.js
**Trigger**: 3-second timeout for dynamic content

```javascript
// content.js (line 133)
console.log('⏰ Delayed extraction attempt...');
// Usually skipped if data already extracted
```

### 11. DOM Observer Setup (T=3000ms)
**Location**: content.js
**Purpose**: Watch for dynamic content changes

```javascript
// content.js (line 172)
console.log('👁️ Started observing DOM changes for dynamic content');
```

### 12. Tab Closure (T=15000ms)
**Location**: background.js
**Action**: Auto-close after 15 seconds

```javascript
// background.js (line 662)
console.log('🗑️ Closing auto-browse tab: 12345 after extraction');
```

### 13. Next URL Processing (T=30000ms)
**Location**: background.js
**Trigger**: Interval timer (30 seconds)

```javascript
// The cycle repeats with the next URL in the priority queue
console.log('🤖 Auto-browsing 📄 individual page: https://example-agency.com (2/150)');
```

## Flow Diagram

```
User Action (T=0)
    ↓
Background Script (T=5ms)
    ├─ Get unvisited URLs (prioritized)
    ├─ Create background tab (T=50ms)
    └─ Mark URL as visited
         ↓
Content Scripts Injected (T=100ms)
    ├─ content.js (Sortlist only)
    └─ universal-content.js (all sites)
         ↓
Page Load Wait (T=100-2000ms)
    ├─ Immediate if ready
    ├─ Load event listener
    └─ 3-second timeout fallback
         ↓
URL Extraction (T=2100ms)
    ├─ Find all links
    ├─ Filter company URLs
    └─ Remove duplicates
         ↓
Send to Background (T=2150ms)
    └─ Chrome runtime message
         ↓
Background Processing (T=2200ms)
    ├─ Normalize URLs
    ├─ Check duplicates
    ├─ Add to collection
    └─ Save to storage
         ↓
UI Updates (T=2250ms)
    ├─ Badge count
    └─ Dashboard notification
         ↓
Tab Closes (T=15000ms)
         ↓
Wait for Next Interval (T=30000ms)
```

## Key Timing Points

1. **Tab Creation**: ~50ms after command
2. **Content Script Injection**: ~100ms after tab creation
3. **Page Load Wait**: 0-2000ms (depends on page)
4. **Extraction**: Immediate after page ready
5. **Data Transfer**: ~50ms for message passing
6. **Processing**: ~50ms for deduplication
7. **Tab Lifetime**: 15 seconds total
8. **Cycle Interval**: 30 seconds between URLs

## URL Collection Triggers

1. **Primary Trigger**: Page load event or document ready state
2. **Fallback Trigger**: 3-second timeout
3. **Dynamic Trigger**: DOM mutation observer (for AJAX content)
4. **Manual Trigger**: Direct message from popup

## Data Flow Summary

1. **Source**: Content scripts extract URLs from DOM
2. **Transport**: Chrome runtime messaging
3. **Processing**: Background script deduplicates and normalizes
4. **Storage**: Chrome local storage + optional IndexedDB
5. **Feedback**: Badge update + dashboard notifications