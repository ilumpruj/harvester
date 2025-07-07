// HTML Stripper Utility Module
// Provides functions to clean and extract content from HTML

class HTMLStripper {
  constructor(options = {}) {
    // Check if gentle mode is requested
    const isGentle = options.mode === 'gentle';
    
    this.options = {
      // Stripping options - more conservative in gentle mode
      stripScripts: !isGentle,
      stripStyles: !isGentle,
      stripComments: true,
      stripMeta: !isGentle,
      stripNav: !isGentle,
      stripAds: true, // Always remove ads
      stripSocial: true, // Always remove social widgets
      stripEmpty: !isGentle,
      stripAttributes: !isGentle,
      stripInlineStyles: !isGentle,
      
      // Content preservation
      keepHeadings: true,
      keepParagraphs: true,
      keepLists: true,
      keepTables: true,
      keepImages: true,
      keepLinks: true,
      
      // New gentle mode options
      keepDataAttributes: isGentle,
      keepAriaLabels: true,
      keepMetaTags: isGentle,
      keepStructuredData: isGentle,
      scoreContentImportance: isGentle,
      
      // Override with custom options
      ...options
    };
    
    this.mode = options.mode || 'standard';
  }

  // Main stripping function
  stripHTML(htmlString) {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    
    // In gentle mode, preserve structured data first
    let preservedData = null;
    if (this.options.keepStructuredData) {
      preservedData = this.extractStructuredDataBeforeStripping(doc);
    }
    
    // Apply stripping rules
    if (this.options.stripScripts) this.removeScripts(doc);
    if (this.options.stripStyles) this.removeStyles(doc);
    if (this.options.stripComments) this.removeComments(doc);
    if (this.options.stripMeta && !this.options.keepMetaTags) this.removeMetaTags(doc);
    if (this.options.stripNav) this.removeNavigation(doc);
    if (this.options.stripAds) this.removeAds(doc);
    if (this.options.stripSocial) this.removeSocialWidgets(doc);
    if (this.options.stripInlineStyles) this.removeInlineStyles(doc);
    if (this.options.stripAttributes) this.stripUnnecessaryAttributes(doc);
    if (this.options.stripEmpty) this.removeEmptyElements(doc);
    
    // Extract main content with importance scoring if in gentle mode
    const mainContent = this.options.scoreContentImportance ? 
      this.extractMainContentWithScoring(doc) : 
      this.extractMainContent(doc);
    
    // Clean whitespace
    this.cleanWhitespace(mainContent);
    
    return {
      html: mainContent.innerHTML,
      text: mainContent.textContent.trim(),
      stats: this.getExtractionStats(htmlString, mainContent.innerHTML)
    };
  }

  // Remove script tags
  removeScripts(doc) {
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => script.remove());
  }

  // Remove style tags and link stylesheets
  removeStyles(doc) {
    const styles = doc.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => style.remove());
  }

  // Remove HTML comments
  removeComments(doc) {
    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_COMMENT,
      null,
      false
    );
    
    const comments = [];
    let node;
    while (node = walker.nextNode()) {
      comments.push(node);
    }
    
    comments.forEach(comment => comment.remove());
  }

  // Remove meta tags
  removeMetaTags(doc) {
    const metas = doc.querySelectorAll('meta');
    metas.forEach(meta => meta.remove());
  }

  // Remove navigation elements
  removeNavigation(doc) {
    const navSelectors = [
      'nav',
      'header',
      'footer',
      '[role="navigation"]',
      '.nav',
      '.navigation',
      '.menu',
      '.header',
      '.footer',
      '#nav',
      '#navigation',
      '#menu',
      '#header',
      '#footer'
    ];
    
    const navElements = doc.querySelectorAll(navSelectors.join(', '));
    navElements.forEach(nav => nav.remove());
  }

  // Remove common ad elements
  removeAds(doc) {
    const adSelectors = [
      '.ad',
      '.ads',
      '.advertisement',
      '.banner',
      '.sponsor',
      '[class*="ad-"]',
      '[class*="ads-"]',
      '[id*="ad-"]',
      '[id*="ads-"]',
      'iframe[src*="doubleclick"]',
      'iframe[src*="googlesyndication"]'
    ];
    
    const ads = doc.querySelectorAll(adSelectors.join(', '));
    ads.forEach(ad => ad.remove());
  }

  // Remove social media widgets
  removeSocialWidgets(doc) {
    const socialSelectors = [
      '.social',
      '.share',
      '.sharing',
      '[class*="facebook"]',
      '[class*="twitter"]',
      '[class*="linkedin"]',
      '[class*="instagram"]',
      '[class*="youtube"]',
      '.fb-',
      '.twitter-',
      'iframe[src*="facebook.com"]',
      'iframe[src*="twitter.com"]',
      'iframe[src*="youtube.com"]'
    ];
    
    const socialElements = doc.querySelectorAll(socialSelectors.join(', '));
    socialElements.forEach(element => element.remove());
  }

  // Remove inline styles
  removeInlineStyles(doc) {
    const elementsWithStyle = doc.querySelectorAll('[style]');
    elementsWithStyle.forEach(element => {
      element.removeAttribute('style');
    });
  }

  // Strip unnecessary attributes
  stripUnnecessaryAttributes(doc) {
    const keepAttributes = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'type', 'name', 'value'];
    const allElements = doc.querySelectorAll('*');
    
    allElements.forEach(element => {
      const attributes = Array.from(element.attributes);
      attributes.forEach(attr => {
        // Always keep essential attributes
        if (keepAttributes.includes(attr.name)) return;
        
        // In gentle mode, keep more attributes
        if (this.options.keepDataAttributes && attr.name.startsWith('data-')) {
          return; // Keep data attributes
        }
        if (this.options.keepAriaLabels && attr.name.startsWith('aria-')) {
          return; // Keep ARIA attributes for accessibility
        }
        if (this.options.keepMetaTags && ['itemprop', 'itemscope', 'itemtype'].includes(attr.name)) {
          return; // Keep microdata attributes
        }
        
        // Otherwise remove the attribute
        element.removeAttribute(attr.name);
      });
    });
  }

  // Remove empty elements
  removeEmptyElements(doc) {
    let changed = true;
    while (changed) {
      changed = false;
      const allElements = doc.querySelectorAll('*');
      
      allElements.forEach(element => {
        if (element.children.length === 0 && 
            element.textContent.trim() === '' &&
            !['img', 'br', 'hr', 'input', 'meta', 'link'].includes(element.tagName.toLowerCase())) {
          element.remove();
          changed = true;
        }
      });
    }
  }

  // Extract main content area
  extractMainContent(doc) {
    // Try to find main content area
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '#main',
      '#content',
      '.post',
      '.entry-content'
    ];
    
    for (const selector of mainSelectors) {
      const main = doc.querySelector(selector);
      if (main) {
        return main;
      }
    }
    
    // Fallback to body
    return doc.body;
  }

  // Clean excessive whitespace
  cleanWhitespace(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      node.textContent = node.textContent.replace(/\s+/g, ' ');
    }
  }

  // Get extraction statistics
  getExtractionStats(originalHTML, cleanedHTML) {
    const originalSize = new Blob([originalHTML]).size;
    const cleanedSize = new Blob([cleanedHTML]).size;
    const reduction = ((originalSize - cleanedSize) / originalSize * 100).toFixed(2);
    
    return {
      originalSize: originalSize,
      cleanedSize: cleanedSize,
      reduction: reduction + '%',
      originalSizeKB: (originalSize / 1024).toFixed(2) + ' KB',
      cleanedSizeKB: (cleanedSize / 1024).toFixed(2) + ' KB'
    };
  }

  // Create extraction template
  createTemplate(name, description) {
    return {
      name: name,
      description: description,
      options: { ...this.options },
      created: new Date().toISOString()
    };
  }

  // Apply template
  applyTemplate(template) {
    this.options = { ...template.options };
  }

  // Extract structured data
  extractStructuredData(doc) {
    const data = {
      title: '',
      headings: [],
      paragraphs: [],
      lists: [],
      images: [],
      links: [],
      tables: [],
      // New: Company-specific data
      companyInfo: this.extractCompanyInfo(doc),
      metadata: this.extractMetadata(doc)
    };

    // Extract title
    const title = doc.querySelector('h1');
    if (title) {
      data.title = title.textContent.trim();
    }

    // Extract headings
    if (this.options.keepHeadings) {
      const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
      data.headings = Array.from(headings).map(h => ({
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent.trim()
      }));
    }

    // Extract paragraphs
    if (this.options.keepParagraphs) {
      const paragraphs = doc.querySelectorAll('p');
      data.paragraphs = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(text => text.length > 0);
    }

    // Extract lists
    if (this.options.keepLists) {
      const lists = doc.querySelectorAll('ul, ol');
      data.lists = Array.from(lists).map(list => ({
        type: list.tagName.toLowerCase(),
        items: Array.from(list.querySelectorAll('li'))
          .map(li => li.textContent.trim())
      }));
    }

    // Extract images
    if (this.options.keepImages) {
      const images = doc.querySelectorAll('img');
      data.images = Array.from(images).map(img => ({
        src: img.src,
        alt: img.alt || '',
        title: img.title || ''
      }));
    }

    // Extract links
    if (this.options.keepLinks) {
      const links = doc.querySelectorAll('a');
      data.links = Array.from(links).map(link => ({
        href: link.href,
        text: link.textContent.trim()
      }));
    }

    // Extract tables
    if (this.options.keepTables) {
      const tables = doc.querySelectorAll('table');
      data.tables = Array.from(tables).map(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          return cells.map(cell => cell.textContent.trim());
        });
      });
    }

    return data;
  }

  // Extract company-specific information
  extractCompanyInfo(doc) {
    const info = {
      name: '',
      location: '',
      description: '',
      team: {},
      services: [],
      languages: [],
      portfolio: {},
      awards: {},
      reviews: {},
      contact: {},
      founded: '',
      memberSince: '',
      remoteWork: false,
      specialties: []
    };

    // Company name (already in title, but let's be sure)
    const h1 = doc.querySelector('h1');
    if (h1) {
      info.name = h1.textContent.trim();
    }

    // Location - look for spans after h1 or location-specific classes
    const locationPatterns = [
      'span.p', // Common pattern for location after company name
      '[class*="location"]',
      '[class*="address"]'
    ];
    
    for (const pattern of locationPatterns) {
      const locationElem = doc.querySelector(pattern);
      if (locationElem && locationElem.textContent.includes(',')) {
        info.location = locationElem.textContent.trim();
        break;
      }
    }

    // Description - look for longer text blocks
    const descriptionSelectors = [
      '.text-break-word > span[data-testid="clamp-lines"]',
      '[class*="description"]',
      '.company-description'
    ];
    
    for (const selector of descriptionSelectors) {
      const descElem = doc.querySelector(selector);
      if (descElem && descElem.textContent.length > 100) {
        info.description = descElem.textContent.trim();
        break;
      }
    }

    // Extract info from icon-based sections
    const infoRows = doc.querySelectorAll('.layout-row.layout-align-start-center');
    infoRows.forEach(row => {
      const text = row.textContent.trim();
      
      // Team size
      if (text.includes('people') && text.includes('team')) {
        const match = text.match(/(\d+)\s*people/);
        if (match) {
          info.team.size = parseInt(match[1]);
          info.team.description = text;
        }
      }
      
      // Languages
      if (text.includes('Speaks')) {
        const langMatch = text.match(/Speaks\s+(.+)/);
        if (langMatch) {
          info.languages = langMatch[1].split(',').map(l => l.trim());
        }
      }
      
      // Portfolio
      if (text.includes('projects') && text.includes('portfolio')) {
        const match = text.match(/(\d+)\s*projects/);
        if (match) {
          info.portfolio.count = parseInt(match[1]);
          info.portfolio.description = text;
        }
      }
      
      // Remote work
      if (text.includes('Works remotely')) {
        info.remoteWork = true;
      }
      
      // Member since
      if (text.includes('member since')) {
        const match = text.match(/member since\s+(\d{4})/);
        if (match) {
          info.memberSince = match[1];
        }
      }
      
      // Founded
      if (text.includes('Founded in')) {
        const match = text.match(/Founded in\s+(\d{4})/);
        if (match) {
          info.founded = match[1];
        }
      }
      
      // Awards
      if (text.includes('award')) {
        const match = text.match(/(\d+)\s*award/);
        if (match) {
          info.awards.count = parseInt(match[1]);
          info.awards.description = text;
        }
      }
    });

    // Extract rating and reviews
    const ratingContainer = doc.querySelector('[data-testid*="star-rating"]');
    if (ratingContainer) {
      const ratingText = ratingContainer.closest('div').textContent;
      const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
      if (ratingMatch) {
        info.reviews.rating = parseFloat(ratingMatch[1]);
      }
      
      const reviewsMatch = ratingText.match(/\((\d+)\s*reviews?\)/);
      if (reviewsMatch) {
        info.reviews.count = parseInt(reviewsMatch[1]);
      }
    }

    // Extract services/specialties
    const servicesSection = Array.from(doc.querySelectorAll('h2, h3, h4')).find(h => 
      h.textContent.toLowerCase().includes('service')
    );
    if (servicesSection) {
      const servicesText = servicesSection.textContent;
      const servicesMatch = servicesText.match(/(\d+)\s*services/);
      if (servicesMatch) {
        info.services.push({
          count: parseInt(servicesMatch[1]),
          description: servicesText
        });
      }
    }

    // Category/Industry
    const categoryElem = doc.querySelector('.bold.h4');
    if (categoryElem) {
      info.specialties.push(categoryElem.textContent.trim());
    }

    return info;
  }

  // Extract additional metadata
  extractMetadata(doc) {
    const metadata = {
      buttons: [],
      badges: [],
      stats: []
    };

    // Extract button actions
    const buttons = doc.querySelectorAll('button[data-testid]');
    buttons.forEach(btn => {
      metadata.buttons.push({
        text: btn.textContent.trim(),
        testId: btn.getAttribute('data-testid')
      });
    });

    // Extract any badges or certifications
    const badges = doc.querySelectorAll('[alt*="flag"], [alt*="badge"], [alt*="certified"]');
    badges.forEach(badge => {
      metadata.badges.push({
        alt: badge.alt,
        src: badge.src
      });
    });

    // Extract any additional stats
    const statElements = doc.querySelectorAll('.stat, [class*="stat"], .metric, [class*="metric"]');
    statElements.forEach(stat => {
      const text = stat.textContent.trim();
      if (text && /\d+/.test(text)) {
        metadata.stats.push(text);
      }
    });

    return metadata;
  }

  // Extract structured data before stripping (for gentle mode)
  extractStructuredDataBeforeStripping(doc) {
    const structuredData = {
      jsonLd: [],
      microdata: {},
      metaTags: {}
    };

    // Extract JSON-LD
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        structuredData.jsonLd.push(data);
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    });

    // Extract meta tags
    const metaTags = doc.querySelectorAll('meta');
    metaTags.forEach(meta => {
      if (meta.name) {
        structuredData.metaTags[meta.name] = meta.content;
      }
      if (meta.property) {
        structuredData.metaTags[meta.property] = meta.content;
      }
    });

    // Extract microdata
    const itemScopes = doc.querySelectorAll('[itemscope]');
    itemScopes.forEach((scope, index) => {
      const itemData = {};
      const props = scope.querySelectorAll('[itemprop]');
      props.forEach(prop => {
        itemData[prop.getAttribute('itemprop')] = prop.textContent.trim();
      });
      structuredData.microdata[`item_${index}`] = itemData;
    });

    return structuredData;
  }

  // Extract main content with importance scoring (for gentle mode)
  extractMainContentWithScoring(doc) {
    // Score each container element
    const containers = doc.querySelectorAll('main, article, section, div');
    let bestContainer = null;
    let bestScore = -1;

    containers.forEach(container => {
      const score = this.scoreContainer(container);
      if (score > bestScore) {
        bestScore = score;
        bestContainer = container;
      }
    });

    // Fallback to standard extraction if no good container found
    if (!bestContainer || bestScore < 10) {
      return this.extractMainContent(doc);
    }

    return bestContainer;
  }

  // Score a container for content importance
  scoreContainer(container) {
    let score = 0;

    // Positive signals
    const text = container.textContent.trim();
    const textLength = text.length;
    
    // Length bonus
    if (textLength > 500) score += 10;
    if (textLength > 1000) score += 10;
    
    // Semantic element bonus
    if (container.matches('main, article')) score += 20;
    if (container.matches('[role="main"]')) score += 15;
    
    // Content density
    const links = container.querySelectorAll('a').length;
    const linkDensity = links / Math.max(textLength / 100, 1);
    if (linkDensity < 0.3) score += 10; // Low link density is good
    
    // Paragraph count
    const paragraphs = container.querySelectorAll('p').length;
    if (paragraphs > 3) score += 15;
    
    // List count
    const lists = container.querySelectorAll('ul, ol').length;
    if (lists > 0) score += 5;
    
    // Heading presence
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    if (headings > 0) score += 10;
    
    // Negative signals
    if (container.matches('nav, header, footer, aside')) score -= 30;
    if (container.className.match(/sidebar|widget|ad|banner|popup/i)) score -= 20;
    if (container.id && container.id.match(/sidebar|widget|ad|banner|popup/i)) score -= 20;
    
    // Check for company-specific content
    const companySignals = [
      'company', 'agency', 'about', 'services', 'portfolio',
      'team', 'contact', 'description', 'overview'
    ];
    const containerText = container.textContent.toLowerCase();
    companySignals.forEach(signal => {
      if (containerText.includes(signal)) score += 3;
    });

    return score;
  }

  // Create a gentle stripping preset
  static createGentleStripper() {
    return new HTMLStripper({
      mode: 'gentle',
      stripScripts: false,
      stripStyles: false,
      stripMeta: false,
      stripNav: false,
      stripEmpty: false,
      stripAttributes: false,
      stripInlineStyles: false,
      keepDataAttributes: true,
      keepAriaLabels: true,
      keepMetaTags: true,
      keepStructuredData: true,
      scoreContentImportance: true
    });
  }

  // Get extraction statistics with mode info
  getExtractionStats(originalHTML, cleanedHTML) {
    const originalSize = new Blob([originalHTML]).size;
    const cleanedSize = new Blob([cleanedHTML]).size;
    const reduction = ((originalSize - cleanedSize) / originalSize * 100).toFixed(2);
    
    return {
      originalSize: originalSize,
      cleanedSize: cleanedSize,
      reduction: reduction + '%',
      mode: this.mode,
      isGentle: this.mode === 'gentle'
    };
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLStripper;
}