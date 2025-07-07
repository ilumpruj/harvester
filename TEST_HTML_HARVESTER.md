# HTML Harvester Testing Guide

## Overview
The HTML Harvester system is now implemented and ready for testing. This guide will help you verify all functionality.

## Testing Steps

### 1. **Test the HTML Stripper and Storage**
1. Open `test-harvester.html` in your browser
2. Click through each test button to verify:
   - HTML stripping removes scripts, styles, and comments
   - Storage saves and retrieves pages correctly
   - Compression works properly
   - Full workflow processes pages end-to-end

### 2. **Test Post Preview Tab**
1. Open the extension dashboard
2. Click on "Post Preview" tab
3. Enter a Sortlist URL (e.g., `https://www.sortlist.com/agency/example`)
4. Configure stripping options:
   - Toggle different options to see their effects
   - Try different view modes (Original, Cleaned, Side by Side, Extracted Data)
5. Test export features:
   - Copy Cleaned HTML
   - Download HTML
   - Prepare for Claude

### 3. **Test Auto-Harvest**
1. Ensure auto-harvest is enabled in settings
2. Visit any Sortlist page
3. Check the console for "Auto-harvesting page..." message
4. Return to dashboard and check HTML Harvester tab
5. Verify the page appears in the harvested pages list

### 4. **Test HTML Harvester Tab**
1. Open HTML Harvester tab in dashboard
2. Verify you see:
   - Storage statistics
   - List of harvested pages
   - Search functionality
   - Export options
3. Test operations:
   - Search for pages by URL
   - View individual pages
   - Delete pages
   - Export for Claude
   - Clear all storage

### 5. **Test Template System**
1. In Post Preview, after cleaning a page:
   - Click "Save as Template"
   - Give it a name and description
2. Templates can be reused for consistent extraction

## Expected Results

### Successful HTML Stripping
- Scripts removed ✓
- Styles removed ✓
- Comments removed ✓
- Tracking attributes removed ✓
- Clean, readable HTML output ✓

### Successful Storage
- Pages saved with compression ✓
- Metadata preserved ✓
- Quick retrieval ✓
- Export works correctly ✓

### Successful Auto-Harvest
- Pages automatically saved when visiting Sortlist ✓
- No user intervention required ✓
- Background processing ✓

## Troubleshooting

### If auto-harvest isn't working:
1. Check console for errors
2. Verify settings in storage: `chrome.storage.local.get(['harvesterSettings'])`
3. Ensure content script is loading on Sortlist pages

### If storage fails:
1. Check IndexedDB quota in DevTools
2. Clear storage and try again
3. Check for browser compatibility

### If stripping doesn't work as expected:
1. Check the stripping options configuration
2. View the original vs cleaned comparison
3. Adjust options as needed

## Next Steps

Once testing is complete, the system is ready for:
1. Claude to analyze the cleaned HTML
2. Claude to create extraction rules based on patterns
3. Automated field mapping for company data

## Console Commands for Debugging

```javascript
// Check harvester settings
chrome.storage.local.get(['harvesterSettings'], console.log)

// Check harvested pages count
chrome.storage.local.get(['harvestedPages'], result => {
  console.log('Pages:', result.harvestedPages?.length || 0)
})

// Force harvest current page
chrome.runtime.sendMessage({
  action: 'harvestPage',
  data: {
    url: window.location.href,
    title: document.title,
    html: document.documentElement.outerHTML,
    timestamp: new Date().toISOString()
  }
}, console.log)
```