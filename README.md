# Sortlist URL Harvester - Chrome Extension

A Chrome extension that automatically collects company URLs from Sortlist as you browse naturally.

## Features

### 🔗 Automatic URL Collection
- Detects company/agency URLs automatically
- Works on all Sortlist domains (.com, .be, .fr, .co.uk, .us)
- Runs in the background as you browse

### 📸 Page Snapshot
- Captures full HTML of each page
- Stores page content for later analysis
- Timestamps all captures

### 📊 Real-time Statistics
- Shows count of companies found
- Tracks pages visited
- Updates badge with current count

### 💾 Export Options
- **Copy URLs** - One-click copy all URLs to clipboard
- **Export JSON** - Download complete data with metadata
- **Clear All** - Reset collected data

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `chrome_extension` folder
5. The extension icon will appear in your toolbar

## How to Use

### Automatic Collection
1. Simply browse Sortlist normally
2. The extension automatically detects and collects company URLs
3. The badge shows the current count of companies found

### Manual Actions
Click the extension icon to:
- View collected companies
- Copy all URLs to clipboard
- Export data as JSON
- Clear all collected data

## What It Collects

### Company Information
- URL of the company profile
- Company name (from link text)
- Timestamp of when found

### Page Information
- Full HTML content
- Page URL and title
- Timestamp of capture

## Data Format

### Exported JSON Structure
```json
{
  "timestamp": "2024-01-05T12:00:00Z",
  "companies": [
    {
      "url": "https://www.sortlist.com/agency/example",
      "name": "Example Agency",
      "extracted_at": "2024-01-05T12:00:00Z"
    }
  ],
  "pages_visited": 10,
  "total_companies": 25,
  "urls_text": "https://www.sortlist.com/agency/example\n..."
}
```

## URL Detection Patterns

The extension looks for URLs containing:
- `/agency/`
- `/agencies/`
- `/company/`
- `/companies/`
- `/provider/`
- `/profile/`
- `/portfolio/`

## Privacy & Permissions

- Only active on Sortlist domains
- Data stored locally in your browser
- No external servers or tracking
- You control when to export/clear data

## Tips

1. **Browse Naturally** - Just use Sortlist normally
2. **Check Progress** - Badge shows company count
3. **Export Regularly** - Don't lose collected data
4. **Multiple Domains** - Works on all Sortlist regional sites

## Troubleshooting

**Extension not working?**
- Check that you're on a Sortlist domain
- Refresh the page after installing
- Check Chrome console for errors

**No companies detected?**
- Some pages may load content dynamically
- Try scrolling to load more content
- Click "Load more" buttons if available

**Data not saving?**
- Check Chrome storage permissions
- Try clearing data and starting fresh

## Technical Details

- Uses Chrome Manifest V3
- Content script injected on Sortlist domains
- Background service worker manages data
- Local storage for persistence

---

This extension bypasses Cloudflare by running in your actual browser session!