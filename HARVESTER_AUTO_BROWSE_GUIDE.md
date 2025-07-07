# Harvester Auto-Browse Guide

## Overview
The Harvester Auto-Browse is a dedicated auto-browsing feature specifically for harvesting pages that match your active template patterns. Unlike the regular auto-browse (which discovers new URLs), this feature only visits URLs that match templates you've marked as active.

## Key Differences

### Regular Auto-Browse (Discovery)
- Visits ALL collected URLs randomly
- Purpose: Discover new companies and pages
- No template filtering
- Found in: Overview tab

### Harvester Auto-Browse (Targeted Harvesting)
- Only visits URLs matching active template patterns
- Purpose: Efficiently harvest specific types of pages
- Template-based filtering
- Found in: HTML Harvester tab

## How to Use

### 1. Create Templates with URL Patterns
1. Go to Post Preview tab
2. Enter a URL (e.g., `https://www.sortlist.com/agency/example`)
3. The URL pattern is generated automatically
4. Configure stripping options
5. Save as template

### 2. Activate Templates
1. Go to Post Preview tab → Saved Templates
2. Click the status button to toggle Active/Inactive
3. Only active templates will be used for harvesting

### 3. Start Harvester Auto-Browse
1. Go to HTML Harvester tab
2. Find the "Harvester Auto-Browse" section
3. Check how many URLs match your active templates
4. Click "Start Harvester Auto-Browse"

### 4. Monitor Progress
- **Status**: Shows if harvester is running
- **Progress**: Current URL / Total URLs
- **Stats**: Successful, Failed, and Pending harvests
- **Active Templates**: Shows which templates are being used

## Example Workflow

### Setting Up Sortlist Company Harvesting
1. **Create Template**:
   - URL: `https://www.sortlist.com/agency/the-portal-agency`
   - Pattern: `https://www.{domain}/agency/{slug}`
   - Save as: "Sortlist Company Profile"

2. **Activate Template**:
   - Status: Active ✓
   - This template will now match all Sortlist agency pages

3. **Start Harvesting**:
   - Click "Preview URLs" to see matching pages
   - Click "Start Harvester Auto-Browse"
   - Extension visits only agency pages

## Features

### URL Pattern Matching
- `{domain}` - Matches any domain
- `{slug}` - Matches URL-friendly text
- `{id}` - Matches numeric IDs
- `{*}` - Matches any segment

### Template Management
- **Active Templates**: Used for harvesting
- **Inactive Templates**: Ignored during harvesting
- **No Pattern**: Templates without patterns are skipped

### Harvesting Process
1. Filters all collected URLs against active patterns
2. Skips already harvested URLs
3. Opens each URL in background tab
4. Auto-harvests if enabled
5. Applies matching template automatically

## Settings

### In HTML Harvester Tab
- **Auto-harvest visited pages**: Must be ON
- **Auto-apply matching templates**: Recommended ON
- **Use URL pattern matching**: Must be ON

### Browse Interval
- Default: 30 seconds between pages
- Gives time for page to load and harvest

## Best Practices

1. **Be Specific with Patterns**
   - More specific patterns = more targeted harvesting
   - Avoid overly broad patterns

2. **Activate Only What You Need**
   - Keep only relevant templates active
   - Deactivate templates when not needed

3. **Monitor Progress**
   - Check failed harvests
   - Review harvested pages quality

4. **Use Preview**
   - Always preview URLs before starting
   - Verify patterns match intended pages

## Troubleshooting

### No URLs Found
- Check if templates are active
- Verify templates have URL patterns
- Ensure you have collected URLs first

### Harvesting Not Working
- Verify "Auto-harvest visited pages" is ON
- Check if template patterns are correct
- Look for errors in browser console

### Wrong Pages Being Harvested
- Review your URL patterns
- Make patterns more specific
- Deactivate broad templates

## Advanced Usage

### Multiple Templates
- Multiple active templates work together
- URLs matching ANY active pattern will be harvested
- Use different templates for different page types

### Pattern Priority
- First matching template wins
- Order templates by specificity
- Most specific patterns should be first

### Efficiency Tips
- Run discovery auto-browse first to collect URLs
- Then use harvester auto-browse for targeted collection
- Combine with stealth mode for anti-blocking

## Integration with Claude

Once pages are harvested with proper templates:
1. Export harvested data via "Export for Claude"
2. Templates ensure consistent data structure
3. Claude can analyze the structured data
4. Future: Claude will create extraction rules automatically