# Extraction Rules Explained

## How the Extraction Rules Were Determined

I analyzed the HTML structure of Sortlist company pages and identified consistent patterns. Here's how I came up with the extraction rules:

### 1. Pattern Recognition Process

I looked for:
- **Consistent HTML structures** across multiple company pages
- **Unique CSS classes** that Sortlist uses
- **Text patterns** that indicate specific information
- **DOM relationships** (e.g., location often follows company name)

### 2. Key Discovery Methods

#### CSS Selectors
- **Company Name**: Always in `<h1>` tags
- **Location**: Found in `<span class="p">` immediately after the h1
- **Info Rows**: All use `.layout-row.layout-align-start-center`
- **Description**: Uses `data-testid="clamp-lines"` attribute

#### Text Pattern Matching
- **Team Size**: Pattern like "11-50 people in their team"
- **Languages**: Always starts with "Speaks"
- **Portfolio**: Contains "projects in portfolio"
- **Founded**: Pattern "Founded in YYYY"

### 3. Extraction Configuration Structure

The configuration I export contains:

```json
{
  "selectors": {
    // CSS selectors for finding elements
  },
  "patterns": {
    // Regular expressions for extracting data from text
  },
  "textIndicators": {
    // Simple text matches for boolean fields
  },
  "extractionFlow": [
    // Step-by-step extraction process
  ]
}
```

### 4. Why This Approach Works

1. **Fallback Selectors**: Multiple selectors tried in order
2. **Pattern Flexibility**: Regex handles variations (e.g., "11 people" vs "11-50 people")
3. **Context Awareness**: Location must contain comma, description must be >100 chars
4. **Gentle Mode**: Preserves more HTML structure when needed

### 5. Using the Export Button

Click "🔧 Export Extraction Config" to:
- View all extraction rules in a formatted window
- Copy the configuration to clipboard
- Download as JSON file
- Share with AI for creating automated extractors

### 6. Future Improvements

The exported configuration can be used to:
- Train AI models on extraction patterns
- Create site-specific extraction templates
- Build automated field mapping systems
- Generate extraction code for other websites

## Example Extraction Flow

1. **Find Company Name**
   ```javascript
   const companyName = doc.querySelector('h1').textContent;
   ```

2. **Extract Location**
   ```javascript
   const locationSpan = doc.querySelector('h1 + span.p');
   if (locationSpan && locationSpan.textContent.includes(',')) {
     location = locationSpan.textContent;
   }
   ```

3. **Process Info Rows**
   ```javascript
   const rows = doc.querySelectorAll('.layout-row.layout-align-start-center');
   rows.forEach(row => {
     const text = row.textContent;
     // Match against patterns
     if (text.includes('people')) extractTeamSize(text);
     if (text.includes('Speaks')) extractLanguages(text);
     // etc.
   });
   ```

This systematic approach ensures reliable extraction across different company pages while being flexible enough to handle variations in the HTML structure.