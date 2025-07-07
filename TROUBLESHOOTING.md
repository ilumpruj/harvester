# Troubleshooting Guide

## Extension Not Collecting URLs?

### 1. Check Extension is Active

1. **Open Browser Console** (F12) on Sortlist
2. Look for these messages:
   - `🔗 Sortlist URL Harvester: Active on...`
   - `🔍 Looking for company URLs...`
   - `📊 Extracted data:...`

If you don't see these, the extension isn't running.

### 2. Reload the Extension

1. Go to `chrome://extensions/`
2. Find "Sortlist URL Harvester"
3. Click the refresh icon ↻
4. Reload the Sortlist page

### 3. Check Permissions

Make sure the extension has permission for:
- sortlist.com
- sortlist.be  
- sortlist.fr
- sortlist.co.uk

### 4. Test the Extension

1. Open the test page: `chrome-extension://[YOUR_EXTENSION_ID]/test.html`
2. Click "Check Extension Status"
3. You should see company URLs being detected

### 5. View Console Logs

#### Content Script Logs:
- Right-click page → Inspect
- Go to Console tab
- Look for messages starting with 🔗, 🔍, 📊

#### Background Script Logs:
1. Go to `chrome://extensions/`
2. Click "background page" link under your extension
3. Check console for:
   - `Background received message:`
   - `Processing extracted URLs:`
   - `Added X new companies`

### 6. Check Data Storage

1. Open the Dashboard (click extension → 📊 Dashboard)
2. Or in console, run:
```javascript
chrome.storage.local.get(null, console.log);
```

### 7. Common Issues

#### "No companies found"
- Sortlist may have changed their URL structure
- Check if links contain `/agency/`, `/company/`, etc.
- Try scrolling to load more content

#### Dashboard not updating
- Make sure auto-refresh is ON
- Try manually refreshing (F5)
- Check browser console for errors

#### Badge count not showing
- Extension may need to be reloaded
- Check if data is actually being saved

### 8. Manual Verification

In browser console on Sortlist, run:
```javascript
// See all links with agency pattern
document.querySelectorAll('a[href*="/agency/"]').forEach(a => console.log(a.href));
```

### 9. Reset Extension

If nothing works:
1. Click extension icon → Clear All Data
2. Reload extension at `chrome://extensions/`
3. Try browsing Sortlist again

### 10. Debug Mode

Add to any Sortlist page console:
```javascript
// Force re-extraction
window.postMessage({ type: 'DEBUG_EXTRACT' }, '*');
```

## Still Not Working?

1. Check Chrome version (must be recent)
2. Disable other extensions temporarily
3. Try in Incognito (with extension allowed)
4. Check if Sortlist is blocking automated access