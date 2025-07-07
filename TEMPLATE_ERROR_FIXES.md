# Template Error Fixes

## Errors Fixed

### 1. **ConstraintError: Unable to add key to index 'name'**
**Cause**: Trying to save a template with a duplicate name (IndexedDB requires unique names)
**Fix**: 
- Check for existing templates before saving
- Show confirmation dialog if name already exists
- Delete old template before saving new one with same name

### 2. **TypeError: Cannot read properties of null (reading 'transaction')**
**Cause**: `htmlStorage` was not initialized when trying to access templates
**Fix**:
- Added `await initializeHTMLStorage()` to all template functions
- Made `setupPostPreview()` async and await storage initialization
- Updated DOMContentLoaded to handle async setup functions

## Code Changes

### 1. **Template Save with Duplicate Check**
```javascript
// Check if template with this name already exists
const existingTemplates = await htmlStorage.getTemplates();
if (existingTemplates.some(t => t.name === name)) {
  if (!confirm(`A template named "${name}" already exists. Replace it?`)) {
    return;
  }
  // Delete the existing template first
  await htmlStorage.deleteTemplate(name);
}
```

### 2. **Storage Initialization in All Template Functions**
- `loadTemplatesList()` - Added initialization
- `applyTemplate()` - Added initialization
- `deleteTemplate()` - Added initialization
- `loadTemplatesIntoDropdown()` - Added initialization

### 3. **Async Setup Functions**
- Made `setupPostPreview()` async
- Updated `DOMContentLoaded` to await async setup functions

## About the 'sortlist' Template

If you saved a template named 'sortlist' but can't select it, please:
1. Refresh the extension (chrome://extensions → Reload)
2. Check if it appears in the "Saved Templates" section in Post Preview tab
3. If not visible, create it again with the stripping options you want
4. The template should then appear in both Post Preview and HTML Harvester tabs

## Testing
1. Save a new template - should work without errors
2. Save a template with existing name - should show confirmation
3. Templates should load without "null transaction" errors
4. Selected template should persist after page reload