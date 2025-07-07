# Enhanced Extraction Guide

## Overview
The enhanced extraction system improves data completeness by using progressive extraction attempts, validation, and gentle HTML stripping modes.

## How to Enable Enhanced Extraction

### Option 1: Replace Content Script (Recommended for Testing)
1. Backup the original content script:
   ```bash
   cp content.js content-original.js
   ```

2. Use the enhanced content script:
   ```bash
   cp content-enhanced.js content.js
   ```

3. Reload the extension in Chrome

### Option 2: Update Manifest (For Side-by-Side Testing)
Modify `manifest.json` to use both scripts:
```json
"content_scripts": [
  {
    "matches": ["*://*.sortlist.com/*"],
    "js": ["extraction-validator.js", "content-enhanced.js"],
    "run_at": "document_idle"
  }
]
```

## Features of Enhanced Extraction

### 1. Progressive Extraction
- **First Attempt**: Quick extraction (similar to original)
- **Second Attempt**: Waits for images and AJAX if score < 70%
- **Third Attempt**: Uses mutation observer for dynamic content
- **Final Result**: Best extraction based on completeness score

### 2. Extraction Validation
Each extraction is scored based on:
- Company name quality (30 points)
- Description presence (20 points)
- Contact info (15 points)
- Services/skills (10 points)
- Location (10 points)
- Other signals (15 points)

**Score Interpretation**:
- 90-100: Excellent extraction
- 70-89: Good extraction
- 50-69: Fair extraction
- 30-49: Poor extraction
- 0-29: Incomplete extraction

### 3. Enhanced Data Collection
The enhanced script extracts:
- **Company details**: Description, location, services, rating
- **Structured data**: JSON-LD, microdata, meta tags
- **Context**: Nearby headings, sibling text, parent containers
- **Rich attributes**: ARIA labels, data attributes

### 4. Gentle HTML Stripping
When completeness is low, the system can use gentle mode:
```javascript
// Standard mode (aggressive stripping)
const stripper = new HTMLStripper();

// Gentle mode (preserves more content)
const gentleStripper = HTMLStripper.createGentleStripper();
```

## Monitoring Extraction Quality

### In Console
The enhanced script logs detailed information:
```
🚀 Starting progressive extraction process
📊 Extraction validation: {
  score: 75,
  isComplete: true,
  companiesFound: 12,
  suggestions: []
}
✅ Progressive extraction complete
```

### In Dashboard
Check the validation scores in the harvested pages:
- Look for `validation` field in page data
- Check `extractionAttempt` to see how many tries it took
- Review `suggestions` for improvement ideas

## Troubleshooting

### Low Extraction Scores
1. **Check loading indicators**: Page might still be loading
2. **Dynamic content**: Enable mutation observer in settings
3. **AJAX content**: Increase wait times
4. **Try gentle mode**: Less aggressive HTML stripping

### Missing Data
1. **Verify selectors**: Check if site structure changed
2. **Check console errors**: Look for JavaScript issues
3. **Test manually**: Use Post Preview tab to debug
4. **Review validation**: Check what elements are missing

## Configuration Options

### For Progressive Extraction
```javascript
{
  maxAttempts: 5,              // Maximum extraction attempts
  initialWait: 3000,           // First attempt delay
  progressiveWait: 5000,       // Additional wait between attempts
  enableMutationObserver: true, // Watch for DOM changes
  mutationTimeout: 15000       // Max time for mutations
}
```

### For HTML Stripping
```javascript
{
  mode: 'gentle',              // 'standard' or 'gentle'
  keepDataAttributes: true,    // Preserve data-* attributes
  keepAriaLabels: true,        // Keep accessibility labels
  keepMetaTags: true,          // Keep meta information
  keepStructuredData: true,    // Preserve JSON-LD
  scoreContentImportance: true // Use content scoring
}
```

## Best Practices

1. **Start with standard mode** for most sites
2. **Use gentle mode** for complex or dynamic sites
3. **Monitor validation scores** to identify issues
4. **Export incomplete extractions** for manual review
5. **Create templates** for sites with consistent structure

## Testing the Enhanced System

1. **Test on various page types**:
   - Static company pages
   - Dynamic listing pages
   - AJAX-loaded content
   - Pages with lazy loading

2. **Compare extraction quality**:
   - Original vs Enhanced mode
   - Standard vs Gentle stripping
   - Different wait times

3. **Monitor performance**:
   - Extraction time
   - Memory usage
   - Success rate

## Future Improvements

1. **Machine Learning**: Train model on successful extractions
2. **Pattern Recognition**: Auto-detect page structures
3. **Template Generation**: Automatic rule creation
4. **API Integration**: Direct Claude API for analysis