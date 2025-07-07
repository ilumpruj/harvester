# Sortlist URL Harvester - Complete Guide

## 🎯 Everything is Built into the Chrome Extension!

No servers, no terminals, no localhost - everything runs directly in your Chrome browser.

## Features

### 📊 Built-in Dashboard
- **Real-time statistics** - See companies collected, pages visited, collection rate
- **Live chart** - Visual progress over time
- **Searchable table** - Find specific companies quickly
- **Auto-refresh** - Updates every 5 seconds

### 💾 Automatic Storage
1. **Chrome Storage** - Saves every 30 seconds
2. **IndexedDB** - Unlimited capacity for large datasets
3. **Auto-Downloads** - Saves to `Downloads/sortlist_harvester/` folder
4. **No server needed** - Everything stored locally

### 🎮 Easy Controls
- **Dashboard** - Click extension icon → 📊 Dashboard
- **Settings** - Click extension icon → ⚙️ Settings
- **Downloads** - Click "📁 Open Downloads" in dashboard

## Quick Start

1. **Install Extension**
   - Open Chrome → `chrome://extensions/`
   - Enable Developer mode
   - Load unpacked → Select `chrome_extension` folder

2. **Start Browsing**
   - Go to Sortlist.com
   - Browse normally
   - Extension auto-collects URLs

3. **View Dashboard**
   - Click extension icon
   - Click "📊 Dashboard"
   - See all your data!

## Where Data is Stored

### Automatic Saves
- **Location**: `Downloads/sortlist_harvester/`
- **Format**: `sortlist_auto_TIMESTAMP.json`
- **Frequency**: Every 50 companies (configurable)

### Manual Exports
- **JSON**: Full data with metadata
- **CSV**: For spreadsheet import
- **URLs**: Plain text list

## Dashboard Features

### Stats Cards
- Total Companies
- Pages Visited  
- Collection Rate (per hour)
- Last Updated

### Interactive Chart
- Shows collection progress over time
- Updates in real-time
- Visual representation of your harvesting

### Companies Table
- Search by name or URL
- Sort by date collected
- Copy individual URLs
- Direct links to company pages

### Export Options
- **Export JSON** - Full data export
- **Export CSV** - Spreadsheet format
- **Copy All URLs** - Quick clipboard copy
- **Open Downloads** - Access saved files

## Settings

Access via extension popup → ⚙️ Settings

- **Auto-save interval** - How often to save (default: 30s)
- **Export threshold** - Auto-export every X companies
- **Use IndexedDB** - For unlimited storage
- **Keep backups** - Maintains last 5 backups
- **Save page HTML** - Store full page content

## Tips

1. **Let it run** - Just browse normally, extension handles everything
2. **Check dashboard** - Monitor progress without interrupting collection
3. **Auto-downloads** - Files save to `Downloads/sortlist_harvester/`
4. **Search function** - Quickly find specific companies in dashboard

## No Server Required!

Everything runs in your browser:
- ✅ No localhost to start
- ✅ No terminal commands
- ✅ No external dependencies
- ✅ Works offline
- ✅ Your data stays private

## Data Access

### From Dashboard
- Full visual interface
- Export anytime
- Search and filter

### From Downloads Folder
- Auto-saved JSON files
- Organized in `sortlist_harvester` folder
- Timestamped for easy sorting

### From Chrome DevTools
```javascript
// Access all data
chrome.storage.local.get(null, console.log);
```

---

The extension is completely self-contained - just install and browse!