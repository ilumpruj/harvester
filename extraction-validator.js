// Extraction Validator - Validates and scores the completeness of extracted data

class ExtractionValidator {
  constructor() {
    this.minTextLength = 100;
    this.minCompanyNameLength = 3;
    this.expectedElements = {
      companyName: { weight: 30, required: true },
      description: { weight: 20, required: true },
      contactInfo: { weight: 15, required: false },
      services: { weight: 10, required: false },
      location: { weight: 10, required: false },
      images: { weight: 5, required: false },
      socialLinks: { weight: 5, required: false },
      metadata: { weight: 5, required: false }
    };
  }

  // Main validation function
  validateExtraction(extractedData, pageContent = null) {
    const validation = {
      isComplete: false,
      score: 0,
      missingElements: [],
      suggestions: [],
      details: {}
    };

    // Validate company data
    if (extractedData.companies && extractedData.companies.length > 0) {
      validation.details.companyCount = extractedData.companies.length;
      
      // Check each company
      extractedData.companies.forEach((company, index) => {
        const companyValidation = this.validateCompany(company);
        validation.details[`company_${index}`] = companyValidation;
        
        if (index === 0) { // Use first company for overall score
          validation.score = companyValidation.score;
          validation.missingElements = companyValidation.missingElements;
        }
      });
    } else {
      validation.missingElements.push('No companies found');
      validation.suggestions.push('Wait for dynamic content to load');
      validation.suggestions.push('Check if page requires user interaction');
    }

    // Additional page-level validation
    if (pageContent) {
      const pageValidation = this.validatePageContent(pageContent);
      validation.details.pageValidation = pageValidation;
      
      // Merge suggestions
      validation.suggestions = [...validation.suggestions, ...pageValidation.suggestions];
    }

    // Determine if extraction is complete
    validation.isComplete = validation.score >= 70;
    
    // Add final suggestions based on score
    if (validation.score < 30) {
      validation.suggestions.push('Consider waiting longer for page to fully load');
      validation.suggestions.push('Try extracting with less aggressive HTML stripping');
    } else if (validation.score < 70) {
      validation.suggestions.push('Some important data may be missing');
      validation.suggestions.push('Check for lazy-loaded content');
    }

    return validation;
  }

  // Validate individual company data
  validateCompany(company) {
    const result = {
      score: 0,
      foundElements: [],
      missingElements: [],
      details: {}
    };

    // Check company name
    if (company.name && company.name.length >= this.minCompanyNameLength) {
      result.score += this.expectedElements.companyName.weight;
      result.foundElements.push('companyName');
      result.details.nameQuality = this.assessNameQuality(company.name);
    } else {
      result.missingElements.push('companyName');
    }

    // Check for additional extracted data
    if (company.context) {
      // Context provides clues about data quality
      if (company.context.nearbyText && company.context.nearbyText.length > this.minTextLength) {
        result.score += this.expectedElements.description.weight;
        result.foundElements.push('description');
      } else {
        result.missingElements.push('description');
      }
    }

    // Check confidence score
    if (company.confidence) {
      result.details.confidence = company.confidence;
      // Boost score for high confidence extractions
      if (company.confidence > 0.8) {
        result.score += 10;
      }
    }

    return result;
  }

  // Validate page content for completeness indicators
  validatePageContent(pageContent) {
    const result = {
      suggestions: [],
      indicators: {}
    };

    // Check for loading indicators
    if (pageContent.html) {
      const loadingPatterns = [
        /class=".*loading.*"/i,
        /class=".*spinner.*"/i,
        /class=".*skeleton.*"/i,
        /<div[^>]*>\s*Loading\s*<\/div>/i,
        /data-loading="true"/i
      ];

      for (const pattern of loadingPatterns) {
        if (pattern.test(pageContent.html)) {
          result.indicators.hasLoadingElements = true;
          result.suggestions.push('Page still has loading indicators - wait longer');
          break;
        }
      }
    }

    // Check for AJAX content indicators
    const ajaxPatterns = [
      /data-ajax/i,
      /data-dynamic/i,
      /vue-app/i,
      /react-root/i,
      /ng-app/i
    ];

    for (const pattern of ajaxPatterns) {
      if (pageContent.html && pattern.test(pageContent.html)) {
        result.indicators.hasDynamicContent = true;
        result.suggestions.push('Page uses dynamic content loading - use mutation observer');
        break;
      }
    }

    // Check content density
    if (pageContent.html) {
      const textContent = pageContent.html.replace(/<[^>]*>/g, '').trim();
      const contentDensity = textContent.length / pageContent.html.length;
      result.indicators.contentDensity = contentDensity;

      if (contentDensity < 0.1) {
        result.suggestions.push('Low text density - page might not be fully loaded');
      }
    }

    return result;
  }

  // Assess the quality of extracted company name
  assessNameQuality(name) {
    const quality = {
      score: 0,
      issues: []
    };

    // Length check
    if (name.length < 5) {
      quality.issues.push('Name too short');
    } else if (name.length > 100) {
      quality.issues.push('Name suspiciously long');
    } else {
      quality.score += 25;
    }

    // Check for placeholder text
    const placeholders = ['company name', 'example', 'demo', 'test', 'lorem ipsum'];
    if (placeholders.some(p => name.toLowerCase().includes(p))) {
      quality.issues.push('Possible placeholder text');
    } else {
      quality.score += 25;
    }

    // Check for proper capitalization
    if (name !== name.toLowerCase() && name !== name.toUpperCase()) {
      quality.score += 25;
    } else {
      quality.issues.push('Unusual capitalization');
    }

    // Check for special characters (good for company names)
    if (/[&.,\-']/.test(name)) {
      quality.score += 15;
    }

    // Check if it's not just a URL slug
    if (!name.includes('-') || name.includes(' ')) {
      quality.score += 10;
    } else {
      quality.issues.push('Might be URL slug');
    }

    return quality;
  }

  // Get extraction strategy based on validation results
  getExtractionStrategy(validation) {
    const strategy = {
      shouldRetry: !validation.isComplete,
      waitTime: 5000,
      method: 'standard',
      options: {}
    };

    if (validation.score < 30) {
      strategy.waitTime = 10000;
      strategy.method = 'aggressive';
      strategy.options = {
        waitForImages: true,
        waitForAjax: true,
        useDeepExtraction: true
      };
    } else if (validation.score < 70) {
      strategy.waitTime = 7000;
      strategy.method = 'enhanced';
      strategy.options = {
        waitForAjax: true,
        expandSearchScope: true
      };
    }

    // Check for specific issues
    if (validation.details.pageValidation?.indicators.hasDynamicContent) {
      strategy.options.useMutationObserver = true;
      strategy.options.mutationTimeout = 15000;
    }

    if (validation.details.pageValidation?.indicators.hasLoadingElements) {
      strategy.options.waitForLoadingComplete = true;
    }

    return strategy;
  }

  // Create a detailed extraction report
  createExtractionReport(extractedData, validation) {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        isComplete: validation.isComplete,
        score: validation.score,
        companiesFound: extractedData.companies?.length || 0,
        dataQuality: this.getQualityRating(validation.score)
      },
      details: validation.details,
      missingElements: validation.missingElements,
      suggestions: validation.suggestions,
      recommendedActions: this.getRecommendedActions(validation)
    };
  }

  // Get quality rating based on score
  getQualityRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Poor';
    return 'Incomplete';
  }

  // Get recommended actions based on validation
  getRecommendedActions(validation) {
    const actions = [];

    if (validation.score < 70) {
      actions.push({
        action: 'retry_extraction',
        priority: 'high',
        method: 'enhanced_wait'
      });
    }

    if (validation.missingElements.includes('description')) {
      actions.push({
        action: 'deep_text_search',
        priority: 'medium',
        target: 'meta_tags_and_structured_data'
      });
    }

    if (validation.details.pageValidation?.indicators.hasDynamicContent) {
      actions.push({
        action: 'monitor_dom_changes',
        priority: 'high',
        duration: 10000
      });
    }

    return actions;
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtractionValidator;
}