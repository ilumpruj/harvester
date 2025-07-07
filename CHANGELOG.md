# Changelog

All notable changes to the Intelligent Chrome Extension Harvester will be documented in this file.

## [2.0.0] - 2024-01-08 - Intelligent Auto-Detection System

### Added
- 🧠 **Intelligent Page Classification**
  - Automatic detection of collection vs detail pages
  - Link density analysis
  - Structural pattern recognition
  - No manual configuration needed

- 🗺️ **Dynamic Site Mapping (SiteMap class)**
  - Learns site structure as it crawls
  - Tracks domain statistics
  - Pattern learning system
  - Improves efficiency over time

- 📊 **Enhanced Link Extraction**
  - Extracts ALL links with rich metadata
  - Context analysis (grid, list, navigation)
  - Confidence scoring for each link
  - URL structure analysis

- 🎯 **Smart Priority Queue**
  - Replaces simple collection tags
  - Dynamic scoring based on:
    - Learned patterns
    - Domain reputation
    - URL structure
    - Historical success rates

- 📈 **Intelligence Dashboard Tab**
  - Visualizes learning progress
  - Shows top-performing domains
  - Displays learned patterns
  - Real-time statistics

### Changed
- Auto-browse now uses intelligent prioritization
- Content extraction captures page classification data
- Background script includes pattern learning
- Storage includes site map data persistence

### Technical Improvements
- Better memory management
- Enhanced error handling
- Improved duplicate detection
- Smarter URL normalization

## [1.5.0] - 2024-01-07 - Auto-Browse & Collections

### Added
- 🤖 **Auto-Browse Feature**
  - Automatically visits collected URLs
  - Background tab operation
  - Configurable intervals
  - Progress tracking

- 🏷️ **Collection Page Management**
  - Manual tagging system for high-value pages
  - Priority queue for collection pages
  - URL pattern matching

- 📊 **Enhanced Dashboard**
  - Multi-tab interface
  - Auto-browse controls
  - Collection management
  - Activity logging

### Fixed
- URL deduplication with anchors
- CSP violations
- Storage quota management
- Auto-save reliability

## [1.0.0] - 2024-01-05 - Initial Release

### Features
- ✅ Automatic URL extraction from Sortlist
- ✅ Real-time popup statistics
- ✅ Dashboard with data visualization
- ✅ Export to JSON/CSV
- ✅ Session persistence
- ✅ Chrome storage integration

### Core Functionality
- Content script for Sortlist domains
- Background service worker
- Popup interface
- Full dashboard
- Storage management

## Future Roadmap

### Planned Features
- [ ] Anti-scraping countermeasures
- [ ] Proxy support
- [ ] Multi-site support
- [ ] API integration
- [ ] Cloud sync
- [ ] Team collaboration features