# Harvester Improvements Plan

## Issues to Fix

### 1. Storage Limitation Issue
**Problem**: Only stores up to 100 pages in Chrome storage, older pages get deleted
**Solution**: 
- Use IndexedDB (via html-storage.js) for unlimited storage
- Remove the 100-page limit
- Implement proper deduplication by URL

### 2. Missing Harvester Delay Configuration
**Problem**: No configurable delay between harvesting pages
**Solution**:
- Add delay settings to harvester settings UI
- Implement configurable wait time (5-60 seconds)
- Use the same StealthUtils for randomized delays

### 3. Missing Anti-Scraping Measures
**Problem**: Harvester doesn't use stealth features like regular auto-browse
**Solution**:
- Apply StealthUtils randomization
- Add random mouse movements simulation
- Implement viewport randomization
- Add user-agent rotation

## Supabase Integration Plan

### Database Schema

```sql
-- Create raw_harvest table
CREATE TABLE raw_harvest (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  html_content TEXT NOT NULL,
  cleaned_html TEXT,
  original_size INTEGER,
  cleaned_size INTEGER,
  reduction_percentage INTEGER,
  template_used TEXT,
  matched_by_pattern BOOLEAN DEFAULT FALSE,
  extraction_quality_score INTEGER,
  metadata JSONB,
  harvested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_raw_harvest_url ON raw_harvest(url);
CREATE INDEX idx_raw_harvest_domain ON raw_harvest(domain);
CREATE INDEX idx_raw_harvest_harvested_at ON raw_harvest(harvested_at DESC);
CREATE INDEX idx_raw_harvest_template ON raw_harvest(template_used);

-- Create extracted_companies table (for processed data)
CREATE TABLE extracted_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  harvest_id UUID REFERENCES raw_harvest(id),
  company_name TEXT NOT NULL,
  company_url TEXT,
  description TEXT,
  location TEXT,
  services TEXT[],
  contact_info JSONB,
  social_links JSONB,
  confidence_score DECIMAL(3,2),
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create harvest_sessions table (for tracking auto-browse sessions)
CREATE TABLE harvest_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT,
  total_urls INTEGER,
  processed_urls INTEGER,
  successful_harvests INTEGER,
  failed_harvests INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Integration Architecture

```
Chrome Extension <-> Supabase
      |
      +-- Real-time sync on harvest
      +-- Batch upload option
      +-- Auto-sync every 5 minutes
      +-- Conflict resolution by URL + timestamp
```

### Features to Implement

1. **Supabase Configuration**
   - Add Supabase settings to extension options
   - Store URL, anon key, and project ref
   - Test connection button

2. **Auto-Sync Features**
   - Real-time sync after each page harvest
   - Batch sync for offline harvesting
   - Sync status indicator in UI
   - Retry logic for failed syncs

3. **Data Export/Import**
   - Export from IndexedDB to Supabase
   - Import from Supabase to view historical data
   - Deduplication by URL

4. **Analytics Dashboard**
   - Total pages harvested over time
   - Success rate by domain
   - Template effectiveness metrics
   - Storage usage trends

## Implementation Steps

### Phase 1: Fix Storage Issues (Immediate)
1. Modify `handlePageHarvest` to use IndexedDB via html-storage.js
2. Remove 100-page limit
3. Implement proper deduplication

### Phase 2: Add Delay & Stealth (Day 1)
1. Add delay settings to harvester UI
2. Implement StealthUtils in harvester auto-browse
3. Add progress indicators with time remaining

### Phase 3: Supabase Integration (Day 2-3)
1. Create Supabase project and tables
2. Add Supabase client to extension
3. Implement sync functionality
4. Add UI for connection settings

### Phase 4: Advanced Features (Day 4-5)
1. Batch processing for large datasets
2. Analytics dashboard
3. Export/import tools
4. Session management

## Security Considerations

1. **API Keys**
   - Store Supabase anon key in extension settings
   - Never expose service role key
   - Use RLS policies for data access

2. **Data Privacy**
   - Option to exclude sensitive data
   - Anonymization features
   - GDPR compliance options

3. **Rate Limiting**
   - Implement client-side rate limiting
   - Respect Supabase quotas
   - Queue system for large batches