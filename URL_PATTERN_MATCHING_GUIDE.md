# URL Pattern Matching Guide

## Overview
The Chrome extension now supports automatic template selection based on URL patterns. When you save a template, it can include URL patterns that will automatically apply the template when harvesting matching pages.

## How It Works

### 1. **Automatic Pattern Generation**
When you fetch a URL in the Post Preview tab, the extension automatically generates a URL pattern:

- `https://www.sortlist.com/agency/the-portal-agency` → `https://www.{domain}/agency/{slug}`
- `https://example.com/products/123` → `https://{domain}/products/{id}`
- `https://blog.site.com/2024/post-title` → `https://{domain}/{id}/{slug}`

### 2. **Pattern Variables**
- `{domain}` - Matches any domain name (e.g., sortlist.com, example.org)
- `{slug}` - Matches URL-friendly text with hyphens (e.g., the-portal-agency)
- `{id}` - Matches numeric IDs (e.g., 123, 2024)
- `{*}` - Matches any path segment

### 3. **Saving Templates with Patterns**
1. Go to Post Preview tab
2. Enter a URL and click "Fetch & Preview"
3. The URL pattern will appear automatically
4. Edit the pattern if needed
5. Configure your stripping options
6. Click "Save as Template"
7. The pattern is saved with the template

### 4. **Automatic Template Selection**
When the harvester runs:
1. It checks the current URL against all saved patterns
2. If a match is found, that template is automatically applied
3. If no match is found, it uses the default template (if set)

## Usage Examples

### Example 1: Company Profile Pages
- URL: `https://www.sortlist.com/agency/digital-solutions`
- Pattern: `https://www.{domain}/agency/{slug}`
- Matches all company profile pages on any domain

### Example 2: Product Pages
- URL: `https://shop.com/products/12345`
- Pattern: `https://{domain}/products/{id}`
- Matches all product pages with numeric IDs

### Example 3: Blog Posts
- URL: `https://blog.example.com/2024/my-awesome-post`
- Pattern: `https://{domain}/{id}/{slug}`
- Matches blog posts with year/slug structure

## Managing Templates

### View Templates with Patterns
In the Post Preview tab, the "Saved Templates" section shows:
- Template name
- Associated URL patterns
- Creation date
- Apply/Delete actions

### Edit Patterns
1. Click on the pattern field after fetching a URL
2. Modify the pattern using the variables
3. Save the template with the updated pattern

### Multiple Patterns
Currently, each template supports one URL pattern. If you need different patterns for the same stripping settings, create multiple templates with different names.

## Best Practices

1. **Test Your Patterns**
   - Fetch different URLs to see the generated patterns
   - Verify patterns match your intended pages

2. **Use Specific Patterns**
   - More specific patterns take precedence
   - Avoid overly broad patterns like `https://{domain}/{*}`

3. **Name Templates Clearly**
   - Use descriptive names like "Sortlist Company Profile"
   - Include the site name for clarity

4. **Default Template**
   - Set a default template in HTML Harvester settings
   - Used when no patterns match

## Troubleshooting

### Pattern Not Matching
- Check if the pattern is too specific
- Verify the pattern syntax
- Test with the exact URL in Post Preview

### Wrong Template Applied
- Check for overlapping patterns
- More specific patterns should be listed first
- Review all saved templates

### Templates Not Syncing
- Refresh the extension
- Check Chrome DevTools console for errors
- Templates are synced to Chrome storage automatically

## Technical Details

### Storage
- Templates with patterns are stored in IndexedDB
- Synced to Chrome storage for background script access
- Pattern matching happens in real-time during harvesting

### Pattern Matching Algorithm
1. Exact domain match or {domain} wildcard
2. Path segments matched in order
3. Variables converted to regex patterns
4. First matching pattern wins

### Integration
- Post Preview: Pattern generation and editing
- HTML Harvester: Template selection and application
- Background Script: Pattern matching during auto-browse

## Future Enhancements
- Multiple patterns per template
- Pattern priority/ordering
- Regular expression support
- Pattern testing tool
- Import/export patterns