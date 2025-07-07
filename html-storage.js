// HTML Storage Module using IndexedDB
// Handles storage of harvested HTML pages with compression and metadata

class HTMLStorage {
  constructor() {
    this.dbName = 'HTMLHarvesterDB';
    this.dbVersion = 1;
    this.db = null;
    this.storageLimit = 100 * 1024 * 1024; // 100MB default
  }

  // Initialize the database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('pages')) {
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('url', 'url', { unique: false });
          pageStore.createIndex('domain', 'domain', { unique: false });
          pageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
          templateStore.createIndex('name', 'name', { unique: true });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Save a harvested page
  async savePage(pageData) {
    const transaction = this.db.transaction(['pages'], 'readwrite');
    const store = transaction.objectStore('pages');

    // Add metadata
    const page = {
      id: this.generateId(),
      url: pageData.url,
      domain: new URL(pageData.url).hostname,
      timestamp: new Date().toISOString(),
      originalSize: pageData.originalSize,
      cleanedSize: pageData.cleanedSize,
      reduction: pageData.reduction,
      template: pageData.template || null,
      originalHTML: await this.compress(pageData.originalHTML),
      cleanedHTML: await this.compress(pageData.cleanedHTML),
      extractedData: pageData.extractedData || null
    };

    return new Promise((resolve, reject) => {
      const request = store.add(page);
      request.onsuccess = () => resolve(page.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Get a page by ID
  async getPage(id) {
    const transaction = this.db.transaction(['pages'], 'readonly');
    const store = transaction.objectStore('pages');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = async () => {
        const page = request.result;
        if (page) {
          // Decompress HTML
          page.originalHTML = await this.decompress(page.originalHTML);
          page.cleanedHTML = await this.decompress(page.cleanedHTML);
        }
        resolve(page);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pages (without HTML content for performance)
  async getAllPages() {
    const transaction = this.db.transaction(['pages'], 'readonly');
    const store = transaction.objectStore('pages');

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      const pages = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Don't include HTML content in list
          const page = { ...cursor.value };
          delete page.originalHTML;
          delete page.cleanedHTML;
          pages.push(page);
          cursor.continue();
        } else {
          resolve(pages);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Search pages by URL
  async searchPages(query) {
    const allPages = await this.getAllPages();
    return allPages.filter(page => 
      page.url.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Delete a page
  async deletePage(id) {
    const transaction = this.db.transaction(['pages'], 'readwrite');
    const store = transaction.objectStore('pages');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save a template
  async saveTemplate(template) {
    const transaction = this.db.transaction(['templates'], 'readwrite');
    const store = transaction.objectStore('templates');

    const templateData = {
      id: this.generateId(),
      ...template,
      created: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(templateData);
      request.onsuccess = () => resolve(templateData.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all templates
  async getTemplates() {
    const transaction = this.db.transaction(['templates'], 'readonly');
    const store = transaction.objectStore('templates');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete a template by name
  async deleteTemplate(name) {
    const transaction = this.db.transaction(['templates'], 'readwrite');
    const store = transaction.objectStore('templates');
    const index = store.index('name');

    return new Promise((resolve, reject) => {
      // First find the template by name
      const getRequest = index.get(name);
      
      getRequest.onsuccess = () => {
        const template = getRequest.result;
        if (template) {
          // Delete by ID
          const deleteRequest = store.delete(template.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve(); // Template not found, consider it deleted
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Get storage statistics
  async getStats() {
    const pages = await this.getAllPages();
    let totalSize = 0;
    let totalReduction = 0;

    pages.forEach(page => {
      totalSize += page.cleanedSize;
      totalReduction += parseFloat(page.reduction);
    });

    const avgReduction = pages.length > 0 ? 
      (totalReduction / pages.length).toFixed(2) : 0;

    return {
      pageCount: pages.length,
      totalSize: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      avgReduction: avgReduction + '%',
      storageUsed: await this.getStorageUsed()
    };
  }

  // Export pages for Claude
  async exportForClaude(pageIds = null) {
    const pages = [];
    
    if (pageIds) {
      for (const id of pageIds) {
        const page = await this.getPage(id);
        if (page) pages.push(page);
      }
    } else {
      const allPages = await this.getAllPages();
      for (const pageInfo of allPages) {
        const page = await this.getPage(pageInfo.id);
        if (page) pages.push(page);
      }
    }

    // Format for Claude
    return pages.map(page => ({
      url: page.url,
      timestamp: page.timestamp,
      html: page.cleanedHTML,
      extractedData: page.extractedData
    }));
  }

  // Export all pages as ZIP
  async exportAsZip() {
    const pages = await this.exportForClaude();
    
    // Create a structure for ZIP
    const files = {};
    
    pages.forEach((page, index) => {
      const filename = `page_${index + 1}_${page.url.replace(/[^a-z0-9]/gi, '_')}.html`;
      files[filename] = page.html;
      
      // Add metadata file
      const metaFilename = `page_${index + 1}_metadata.json`;
      files[metaFilename] = JSON.stringify({
        url: page.url,
        timestamp: page.timestamp,
        extractedData: page.extractedData
      }, null, 2);
    });

    return files;
  }

  // Clear all storage
  async clearStorage() {
    const transaction = this.db.transaction(['pages', 'templates'], 'readwrite');
    
    return new Promise((resolve, reject) => {
      const pagesClear = transaction.objectStore('pages').clear();
      const templatesClear = transaction.objectStore('templates').clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Utility functions
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Simple compression using browser's CompressionStream API if available
  async compress(text) {
    if ('CompressionStream' in window) {
      const stream = new Blob([text]).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(compressedStream).blob();
      return await compressedBlob.text();
    }
    return text; // Return uncompressed if API not available
  }

  async decompress(text) {
    if ('DecompressionStream' in window) {
      try {
        const stream = new Blob([text]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(decompressedStream).blob();
        return await decompressedBlob.text();
      } catch (e) {
        // If decompression fails, assume it's not compressed
        return text;
      }
    }
    return text;
  }

  async getStorageUsed() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usageMB: (estimate.usage / 1024 / 1024).toFixed(2),
        quotaMB: (estimate.quota / 1024 / 1024).toFixed(2)
      };
    }
    return null;
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLStorage;
}