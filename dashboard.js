// Dashboard functionality
let autoRefresh = true;
let refreshInterval;
let collectionChart;
let allCompanies = [];
let autoBrowseState = null;

// Pagination state
let currentPage = 1;
let itemsPerPage = 20;
let filteredCompanies = [];

// Stealth status state
let countdownInterval = null;
let nextRequestTime = null;
let stealthSettings = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  initializeChart();
  loadData();
  setupEventListeners();
  setupTabs();
  setupAutoBrowse();
  setupCollections();
  setupIntelligence();
  await setupPostPreview();
  await setupHTMLHarvester();
  startAutoRefresh();
  listenForUpdates();
});

// Listen for real-time updates from background script
function listenForUpdates() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'dataUpdated') {
      console.log('📊 Dashboard: Data updated!', message);
      
      // Add to activity log if new companies were found
      if (message.newCompanies && message.newCompanies > 0) {
        addToActivityLog(`📈 Found ${message.newCompanies} new companies! Total: ${message.companies}`);
      }
      
      loadData(); // Reload data when update received
      updateAutoBrowseStats(); // Update auto-browse stats
    } else if (message.action === 'autoBrowseUpdate') {
      console.log('🤖 Auto-browse update:', message);
      updateCurrentUrl(message.currentUrl, message.progress, message.tabId, message.pageType);
      updateAutoBrowseDisplay(message);
      updateProgressBar(message.visitedCount, message.visitedCount + message.unvisitedCount);
      
      const pageIcon = message.isCollection ? '🏷️' : '📄';
      const pageType = message.pageType || 'Page';
      
      addToActivityLog(`${pageIcon} Visiting ${pageType}: ${message.currentUrl} (${message.progress})`);
      showStatus(`${pageIcon} Visiting ${pageType} ${message.progress}: ${message.currentUrl.substring(0, 40)}...`, 'success');
      
      // Update stealth countdown when a new request starts
      if (message.nextRequestDelay) {
        startStealthCountdown(message.nextRequestDelay);
      }
    } else if (message.action === 'autoBrowseComplete') {
      console.log('🎉 Auto-browse completed');
      addToActivityLog('🎉 Auto-browse completed! All URLs visited.');
      showStatus(message.message, 'success');
      updateAutoBrowseStats();
    }
  });
}

// Initialize simple chart
function initializeChart() {
  const canvas = document.getElementById('collectionChart');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  collectionChart = new SimpleChart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Companies Collected',
        data: [],
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)'
      }]
    },
    options: {
      type: 'line',
      plugins: {
        title: {
          display: true,
          text: 'Collection Progress Over Time'
        }
      }
    }
  });
}

// Load data from storage
async function loadData() {
  try {
    // Get data from background script
    chrome.runtime.sendMessage({ action: 'getData' }, (data) => {
      console.log('Dashboard: Received data:', data);
      
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        return;
      }
      
      if (data) {
        updateDashboard(data);
        updateChart(data);
        allCompanies = data.companies || [];
        renderCompaniesTable(allCompanies);
      } else {
        console.log('No data received');
        // Show empty state
        updateDashboard({ companies: [], pages: [] });
        renderCompaniesTable([]);
      }
    });
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Update dashboard stats
function updateDashboard(data) {
  document.getElementById('totalCompanies').textContent = data.companies?.length || 0;
  document.getElementById('pagesVisited').textContent = data.pages?.length || 0;
  
  // Calculate collection rate
  if (data.companies && data.companies.length > 0) {
    const firstTime = new Date(data.companies[0].extracted_at);
    const lastTime = new Date(data.companies[data.companies.length - 1].extracted_at);
    const hours = (lastTime - firstTime) / (1000 * 60 * 60) || 1;
    const rate = Math.round(data.companies.length / hours);
    document.getElementById('collectionRate').textContent = `${rate}/hr`;
  }
  
  // Update last updated time
  const now = new Date();
  document.getElementById('lastUpdated').textContent = now.toLocaleTimeString();
  
  // Update refresh indicator
  document.getElementById('refreshIndicator').textContent = 'Updated just now';
  setTimeout(() => {
    document.getElementById('refreshIndicator').textContent = '';
  }, 2000);
}

// Update chart with time series data
function updateChart(data) {
  if (!data.companies || data.companies.length === 0) return;
  
  // Group companies by hour
  const hourlyData = {};
  data.companies.forEach(company => {
    const date = new Date(company.extracted_at);
    const hour = date.toISOString().substr(0, 13) + ':00';
    hourlyData[hour] = (hourlyData[hour] || 0) + 1;
  });
  
  // Convert to cumulative data
  const labels = Object.keys(hourlyData).sort();
  const values = [];
  let cumulative = 0;
  
  labels.forEach(label => {
    cumulative += hourlyData[label];
    values.push(cumulative);
  });
  
  // Update chart
  collectionChart.data.labels = labels.map(l => new Date(l).toLocaleTimeString());
  collectionChart.data.datasets[0].data = values;
  collectionChart.update();
}

// Render companies table with pagination
function renderCompaniesTable(companies) {
  const tbody = document.getElementById('companiesBody');
  const emptyState = document.getElementById('emptyState');
  
  if (companies.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    hidePaginationControls();
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Store filtered companies for pagination
  filteredCompanies = [...companies].reverse(); // Sort by most recent first
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  
  // Ensure current page is valid
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  if (currentPage < 1) {
    currentPage = 1;
  }
  
  // Get companies for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const companiesForPage = filteredCompanies.slice(startIndex, endIndex);
  
  // Render table
  tbody.innerHTML = companiesForPage.map(company => {
    // Calculate quality indicators
    const hasConfidence = company.confidence !== undefined;
    const confidencePercent = hasConfidence ? Math.round(company.confidence * 100) : 0;
    const confidenceColor = getConfidenceColor(company.confidence);
    
    // Check for additional details
    const hasDetails = company.details && (
      company.details.description || 
      company.details.location || 
      (company.details.services && company.details.services.length > 0)
    );
    
    // Quality badge
    const qualityBadge = getQualityBadge(company);
    
    return `
      <tr>
        <td class="company-name">
          ${company.name || 'Unknown'}
          ${qualityBadge}
          ${hasDetails ? '<span style="color: #4CAF50; margin-left: 5px;" title="Has additional details">📋</span>' : ''}
        </td>
        <td>
          <a href="${company.url}" target="_blank" class="company-url">
            ${company.url.length > 50 ? company.url.substr(0, 50) + '...' : company.url}
          </a>
        </td>
        <td class="timestamp">
          ${new Date(company.extracted_at).toLocaleString()}
          ${hasConfidence ? `
            <div style="margin-top: 5px;">
              <span style="font-size: 11px; color: #666;">Confidence:</span>
              <span style="font-size: 11px; color: ${confidenceColor}; font-weight: bold;">
                ${confidencePercent}%
              </span>
            </div>
          ` : ''}
        </td>
        <td>
          <button class="btn-secondary btn-copy-url" style="padding: 5px 10px; font-size: 12px;" 
                  data-url="${company.url}">
            Copy
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Update pagination controls
  updatePaginationControls(totalPages);
  
  // Add event listeners for copy buttons
  document.querySelectorAll('.btn-copy-url').forEach(button => {
    button.addEventListener('click', (e) => {
      const url = e.target.getAttribute('data-url');
      copyUrl(url);
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Auto-refresh toggle
  document.getElementById('autoRefreshToggle').addEventListener('click', () => {
    autoRefresh = !autoRefresh;
    document.getElementById('autoRefreshToggle').classList.toggle('active', autoRefresh);
    
    if (autoRefresh) {
      startAutoRefresh();
      showStatus('Auto-refresh enabled', 'success');
    } else {
      stopAutoRefresh();
      showStatus('Auto-refresh disabled', 'success');
    }
  });
  
  // Export JSON
  document.getElementById('exportJSON').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'exportData' }, (exportData) => {
      try {
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        // Use Chrome downloads API instead of URL.createObjectURL
        const reader = new FileReader();
        reader.onload = function() {
          const dataUrl = reader.result;
          chrome.downloads.download({
            url: dataUrl,
            filename: `sortlist_export_${new Date().toISOString().split('T')[0]}.json`
          });
        };
        reader.readAsDataURL(blob);
        
        showStatus('JSON export started!', 'success');
      } catch (error) {
        console.error('Export error:', error);
        showStatus('Export failed', 'error');
      }
    });
  });
  
  // Export CSV
  document.getElementById('exportCSV').addEventListener('click', () => {
    if (allCompanies.length === 0) {
      showStatus('No data to export', 'error');
      return;
    }
    
    // Create CSV
    const csv = [
      ['Company Name', 'URL', 'Extracted At'],
      ...allCompanies.map(c => [
        c.name || 'Unknown',
        c.url,
        c.extracted_at
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    
    try {
      // Use Chrome downloads API
      const reader = new FileReader();
      reader.onload = function() {
        const dataUrl = reader.result;
        chrome.downloads.download({
          url: dataUrl,
          filename: `sortlist_export_${new Date().toISOString().split('T')[0]}.csv`
        });
      };
      reader.readAsDataURL(blob);
      
      showStatus('CSV export started!', 'success');
    } catch (error) {
      console.error('CSV export error:', error);
      showStatus('CSV export failed', 'error');
    }
  });
  
  // Copy all URLs
  document.getElementById('copyAllUrls').addEventListener('click', () => {
    const urls = allCompanies.map(c => c.url).join('\n');
    navigator.clipboard.writeText(urls).then(() => {
      showStatus(`Copied ${allCompanies.length} URLs to clipboard!`, 'success');
    });
  });
  
  // Open downloads folder
  document.getElementById('openDownloads').addEventListener('click', () => {
    chrome.downloads.showDefaultFolder();
    showStatus('Opening downloads folder...', 'success');
  });
  
  // Clear data
  document.getElementById('clearData').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      chrome.runtime.sendMessage({ action: 'clearData' }, () => {
        allCompanies = [];
        loadData();
        showStatus('All data cleared!', 'success');
      });
    }
  });
  
  // Search functionality
  document.getElementById('searchBox').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    // Reset to first page when searching
    currentPage = 1;
    
    if (!searchTerm) {
      renderCompaniesTable(allCompanies);
      return;
    }
    
    const filtered = allCompanies.filter(company => 
      company.name.toLowerCase().includes(searchTerm) ||
      company.url.toLowerCase().includes(searchTerm)
    );
    
    renderCompaniesTable(filtered);
  });
  
  // Event delegation for copy URL buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-copy-url')) {
      const url = e.target.dataset.url;
      copyUrl(url);
    }
  });
}

// Auto-refresh functionality
function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  
  refreshInterval = setInterval(() => {
    if (autoRefresh) {
      loadData();
    }
  }, 5000); // Refresh every 5 seconds
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type} show`;
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

// Copy single URL
function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    showStatus('URL copied to clipboard!', 'success');
  });
}

// Tab functionality
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Remove active from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      // Add active to clicked tab and corresponding content
      tab.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      // Load data when switching tabs
      if (targetTab === 'auto-browse') {
        updateAutoBrowseStats();
      } else if (targetTab === 'collections') {
        loadCollectionTags();
        updateCollectionStats();
      } else if (targetTab === 'intelligence') {
        loadIntelligenceData();
      } else if (targetTab === 'post-preview') {
        // Post preview tab is ready
      } else if (targetTab === 'html-harvester') {
        loadHarvesterStats();
      }
    });
  });
}

// Auto-browse functionality
function setupAutoBrowse() {
  // Start auto-browse
  document.getElementById('startAutoBrowse').addEventListener('click', () => {
    const interval = parseInt(document.getElementById('browseInterval').value) * 1000;
    
    chrome.runtime.sendMessage({
      action: 'startAutoBrowse',
      settings: { interval }
    }, () => {
      updateAutoBrowseUI(true);
      addToActivityLog(`▶️ Auto-browse started! Interval: ${interval/1000}s`);
      showStatus('Auto-browse started!', 'success');
    });
  });
  
  // Stop auto-browse
  document.getElementById('stopAutoBrowse').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopAutoBrowse' }, () => {
      updateAutoBrowseUI(false);
      addToActivityLog('⏹️ Auto-browse stopped by user');
      showStatus('Auto-browse stopped!', 'success');
    });
  });
  
  // Reset visited URLs
  document.getElementById('resetVisited').addEventListener('click', () => {
    if (confirm('Reset visited URL tracking? This will allow auto-browse to visit all URLs again.')) {
      chrome.runtime.sendMessage({ action: 'resetVisited' }, () => {
        updateAutoBrowseStats();
        addToActivityLog('🔄 Visited URL tracking reset');
        showStatus('Visited URLs reset!', 'success');
      });
    }
  });
  
  // Clear activity log
  document.getElementById('clearLog').addEventListener('click', () => {
    document.getElementById('activityLog').innerHTML = '<div style="color: #666;">Auto-browse activity will appear here...</div>';
  });
  
  // Update stats initially
  updateAutoBrowseStats();
  
  // Load stealth settings and start updates
  loadStealthSettings();
  updateUserAgent();
  updateStealthMetrics();
  
  // Update stealth metrics periodically
  setInterval(() => {
    updateStealthMetrics();
    updateUserAgent();
  }, 5000);
}

function updateAutoBrowseStats() {
  chrome.runtime.sendMessage({ action: 'getAutoBrowseState' }, (state) => {
    if (state) {
      autoBrowseState = state;
      document.getElementById('unvisitedCount').textContent = state.unvisitedCount || 0;
      document.getElementById('visitedCount').textContent = state.visitedCount || 0;
      updateAutoBrowseUI(state.enabled);
      
      console.log('📊 Updated auto-browse stats:', {
        visited: state.visitedCount,
        unvisited: state.unvisitedCount,
        total: state.totalUrls
      });
    }
  });
}

function updateAutoBrowseDisplay(message) {
  // Update counts immediately from message
  document.getElementById('visitedCount').textContent = message.visitedCount || 0;
  document.getElementById('unvisitedCount').textContent = message.unvisitedCount || 0;
}

function updateProgressBar(visited, total) {
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  
  if (total > 0) {
    const percentage = (visited / total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${visited}/${total} URLs visited (${Math.round(percentage)}%)`;
  } else {
    progressBar.style.width = '0%';
    progressText.textContent = '0/0 URLs visited';
  }
}

function addToActivityLog(message) {
  const logDiv = document.getElementById('activityLog');
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.style.marginBottom = '4px';
  logEntry.innerHTML = `<span style="color: #999;">[${timestamp}]</span> ${message}`;
  
  // Remove placeholder text if it exists
  if (logDiv.children.length === 1 && logDiv.children[0].textContent.includes('will appear here')) {
    logDiv.innerHTML = '';
  }
  
  logDiv.appendChild(logEntry);
  
  // Auto-scroll to bottom
  logDiv.scrollTop = logDiv.scrollHeight;
  
  // Limit to last 50 entries
  while (logDiv.children.length > 50) {
    logDiv.removeChild(logDiv.firstChild);
  }
}

function updateAutoBrowseUI(isRunning) {
  const startBtn = document.getElementById('startAutoBrowse');
  const stopBtn = document.getElementById('stopAutoBrowse');
  const statusEl = document.getElementById('browseStatus');
  
  if (isRunning) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    statusEl.className = 'status-indicator running';
    statusEl.textContent = '▶️ Running';
  } else {
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    statusEl.className = 'status-indicator stopped';
    statusEl.textContent = '⏹️ Stopped';
  }
}

function updateCurrentUrl(url, progress, tabId, pageType) {
  const currentUrlEl = document.getElementById('currentBrowseUrl');
  if (url) {
    const displayText = progress ? `${progress} - ${url}` : url;
    const typeIcon = pageType === 'Collection' ? '🏷️' : '📄';
    const typeColor = pageType === 'Collection' ? '#2e7d32' : '#4CAF50';
    
    currentUrlEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: ${typeColor};">${typeIcon}</span>
        <span>${displayText}</span>
        ${pageType ? `<span style="color: #666; font-size: 10px;">[${pageType}]</span>` : ''}
        ${tabId ? `<span style="color: #999; font-size: 10px;">(Tab: ${tabId})</span>` : ''}
      </div>
    `;
  } else {
    currentUrlEl.textContent = 'None';
  }
}

// Collection management functionality
function setupCollections() {
  // Add collection tag
  document.getElementById('addCollectionTag').addEventListener('click', () => {
    const pattern = document.getElementById('newTagPattern').value.trim();
    const description = document.getElementById('newTagDescription').value.trim();
    
    if (!pattern) {
      showStatus('Please enter a URL pattern', 'error');
      return;
    }
    
    chrome.runtime.sendMessage({
      action: 'addCollectionTag',
      pattern: pattern,
      description: description || 'Collection page'
    }, (response) => {
      if (response.success) {
        document.getElementById('newTagPattern').value = '';
        document.getElementById('newTagDescription').value = '';
        loadCollectionTags();
        updateCollectionStats();
        showStatus('Collection tag added!', 'success');
        addToActivityLog(`🏷️ Added collection tag: ${pattern}`);
      }
    });
  });
  
  // Refresh preview
  document.getElementById('refreshPreview').addEventListener('click', () => {
    updateUrlPreview();
  });
  
  // Show collection URLs
  document.getElementById('showCollectionUrls').addEventListener('click', () => {
    showUrlsByType('collection');
  });
  
  // Show individual URLs
  document.getElementById('showIndividualUrls').addEventListener('click', () => {
    showUrlsByType('individual');
  });
  
  // Load initial data
  loadCollectionTags();
  updateCollectionStats();
  
  // Event delegation for collection tag buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-toggle-tag')) {
      const tagId = e.target.dataset.tagId;
      const enabled = e.target.dataset.enabled === 'true';
      toggleCollectionTag(tagId, enabled);
    } else if (e.target.classList.contains('btn-remove-tag')) {
      const tagId = e.target.dataset.tagId;
      removeCollectionTag(tagId);
    }
  });
}

function loadCollectionTags() {
  chrome.runtime.sendMessage({ action: 'getCollectionTags' }, (response) => {
    if (response && response.tags) {
      renderCollectionTags(response.tags);
      document.getElementById('activeTagsCount').textContent = response.tags.filter(t => t.enabled).length;
    }
  });
}

function renderCollectionTags(tags) {
  const container = document.getElementById('collectionTagsList');
  
  if (tags.length === 0) {
    container.innerHTML = `
      <div style="color: #666; text-align: center; padding: 20px;">
        No collection tags yet. Add patterns above to prioritize collection pages.
      </div>
    `;
    return;
  }
  
  container.innerHTML = tags.map(tag => `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; background: ${tag.enabled ? '#fff' : '#f8f9fa'};">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: ${tag.enabled ? '#333' : '#999'};">
            <code>${tag.pattern}</code>
            ${tag.enabled ? '' : '<span style="color: #999; font-size: 12px;"> (disabled)</span>'}
          </div>
          <div style="color: #666; font-size: 14px; margin: 5px 0;">
            ${tag.description}
          </div>
          <div style="color: #999; font-size: 12px;">
            ${tag.matches || 0} matching URLs • Created ${new Date(tag.created_at).toLocaleDateString()}
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn-secondary btn-toggle-tag" style="padding: 5px 12px; font-size: 12px;"
                  data-tag-id="${tag.id}" data-enabled="${!tag.enabled}">
            ${tag.enabled ? '⏸️ Disable' : '▶️ Enable'}
          </button>
          <button class="btn-danger btn-remove-tag" style="padding: 5px 12px; font-size: 12px;"
                  data-tag-id="${tag.id}">
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateCollectionStats() {
  chrome.runtime.sendMessage({ action: 'classifyUrls' }, (response) => {
    if (response && response.stats) {
      document.getElementById('matchingUrlsCount').textContent = response.stats.collection;
      document.getElementById('collectionPriorityCount').textContent = response.stats.collection;
      document.getElementById('individualPriorityCount').textContent = response.stats.individual;
    }
  });
}

function updateUrlPreview() {
  chrome.runtime.sendMessage({ action: 'classifyUrls' }, (response) => {
    if (response && response.classification) {
      const preview = document.getElementById('urlPreview');
      const { collection, individual } = response.classification;
      
      preview.innerHTML = `
        <div style="margin-bottom: 15px;">
          <strong>📊 Classification Summary:</strong><br>
          🏷️ Collection Pages: ${collection.length}<br>
          📄 Individual Pages: ${individual.length}<br>
          📈 Total URLs: ${collection.length + individual.length}
        </div>
        
        <div style="margin-bottom: 10px;">
          <strong>🏷️ Collection Pages (First 10):</strong>
        </div>
        ${collection.slice(0, 10).map(c => `
          <div style="margin: 3px 0; color: #2e7d32;">✓ ${c.url}</div>
        `).join('')}
        
        ${collection.length > 10 ? `<div style="color: #666;">... and ${collection.length - 10} more collection pages</div>` : ''}
        
        <div style="margin: 15px 0 10px 0;">
          <strong>📄 Individual Pages (First 5):</strong>
        </div>
        ${individual.slice(0, 5).map(c => `
          <div style="margin: 3px 0; color: #666;">• ${c.url}</div>
        `).join('')}
        
        ${individual.length > 5 ? `<div style="color: #666;">... and ${individual.length - 5} more individual pages</div>` : ''}
      `;
    }
  });
}

function showUrlsByType(type) {
  chrome.runtime.sendMessage({ action: 'classifyUrls' }, (response) => {
    if (response && response.classification) {
      const urls = response.classification[type];
      const preview = document.getElementById('urlPreview');
      
      preview.innerHTML = `
        <div style="margin-bottom: 15px;">
          <strong>${type === 'collection' ? '🏷️ Collection Pages' : '📄 Individual Pages'} (${urls.length} total):</strong>
        </div>
        ${urls.map((c, index) => `
          <div style="margin: 3px 0; ${type === 'collection' ? 'color: #2e7d32;' : 'color: #666;'}">
            ${index + 1}. ${c.url}
            ${c.name !== 'Unknown' ? ` - ${c.name}` : ''}
          </div>
        `).join('')}
      `;
    }
  });
}

// Tag management functions
function toggleCollectionTag(tagId, enabled) {
  chrome.runtime.sendMessage({
    action: 'toggleCollectionTag',
    tagId: tagId,
    enabled: enabled
  }, () => {
    loadCollectionTags();
    updateCollectionStats();
    showStatus(`Tag ${enabled ? 'enabled' : 'disabled'}!`, 'success');
  });
}

function removeCollectionTag(tagId) {
  if (confirm('Delete this collection tag? This cannot be undone.')) {
    chrome.runtime.sendMessage({
      action: 'removeCollectionTag',
      tagId: tagId
    }, () => {
      loadCollectionTags();
      updateCollectionStats();
      showStatus('Collection tag deleted!', 'success');
    });
  }
}

// Intelligence Tab Functions
function loadIntelligenceData() {
  chrome.runtime.sendMessage({ action: 'getSiteMapStats' }, (response) => {
    if (response && response.stats) {
      displayIntelligenceStats(response.stats);
    }
  });
}

function displayIntelligenceStats(stats) {
  // Update stat cards
  document.getElementById('pagesAnalyzed').textContent = stats.totalPages || 0;
  document.getElementById('domainsMapped').textContent = stats.totalDomains || 0;
  document.getElementById('patternsLearned').textContent = stats.patternsLearned || 0;
  
  // Calculate average collection score
  let avgScore = 0;
  if (stats.topDomains && stats.topDomains.length > 0) {
    const totalScore = stats.topDomains.reduce((sum, d) => sum + d.avgCollectionScore, 0);
    avgScore = totalScore / stats.topDomains.length;
  }
  document.getElementById('avgCollectionScore').textContent = avgScore.toFixed(2);
  
  // Display top domains
  displayTopDomains(stats.topDomains || []);
  
  // Display learned patterns
  displayLearnedPatterns(stats.topPatterns || []);
  
  // Update learning chart
  updateLearningChart(stats);
}

function displayTopDomains(domains) {
  const container = document.getElementById('topDomainsList');
  
  if (domains.length === 0) {
    container.innerHTML = `
      <div style="color: #666; text-align: center; padding: 20px;">
        No domains analyzed yet. Start browsing to see insights.
      </div>
    `;
    return;
  }
  
  container.innerHTML = domains.map((domain, index) => `
    <div style="border-bottom: 1px solid #eee; padding: 15px 0; ${index === domains.length - 1 ? 'border-bottom: none;' : ''}">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 600; color: #333; font-size: 16px;">
            ${index + 1}. ${domain.domain}
          </div>
          <div style="color: #666; font-size: 13px; margin-top: 5px;">
            ${domain.pageCount} pages analyzed • ${domain.companyCount} companies found
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: bold; color: #4CAF50;">
            ${(domain.avgCollectionScore * 100).toFixed(0)}%
          </div>
          <div style="font-size: 11px; color: #999;">Collection Score</div>
        </div>
      </div>
      <div style="margin-top: 8px;">
        <div style="background: #e0e0e0; height: 6px; border-radius: 3px; overflow: hidden;">
          <div style="background: #4CAF50; height: 100%; width: ${domain.avgCollectionScore * 100}%;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function displayLearnedPatterns(patterns) {
  const container = document.getElementById('learnedPatternsList');
  
  if (patterns.length === 0) {
    container.innerHTML = `
      <div style="color: #666; text-align: center; padding: 20px;">
        Patterns will appear as the system learns from visited pages.
      </div>
    `;
    return;
  }
  
  container.innerHTML = patterns.map(pattern => `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; background: #fafafa;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <code style="font-size: 14px; color: #2196F3;">/${pattern.pattern}/</code>
          <div style="color: #666; font-size: 12px; margin-top: 5px;">
            Seen ${pattern.occurrences} times • Avg yield: ${pattern.avgCompanyYield.toFixed(1)} companies
          </div>
        </div>
        <div style="text-align: center; padding: 0 15px;">
          <div style="font-size: 24px; font-weight: bold; color: #ff9800;">
            ${pattern.avgCompanyYield.toFixed(0)}
          </div>
          <div style="font-size: 10px; color: #666;">Avg Companies</div>
        </div>
      </div>
      ${pattern.examples && pattern.examples.length > 0 ? `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
          <div style="font-size: 11px; color: #999; margin-bottom: 5px;">Example:</div>
          <div style="font-size: 12px; color: #666; word-break: break-all;">
            ${pattern.examples[0]}
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function updateLearningChart(stats) {
  const canvas = document.getElementById('learningChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;
  
  // Simple bar chart showing domain distribution
  if (stats.topDomains && stats.topDomains.length > 0) {
    const domains = stats.topDomains.slice(0, 5);
    const maxCompanies = Math.max(...domains.map(d => d.companyCount));
    
    const barWidth = canvas.width / (domains.length * 2);
    const barSpacing = barWidth;
    const chartHeight = 150;
    const startY = canvas.height - 30;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    domains.forEach((domain, index) => {
      const barHeight = (domain.companyCount / maxCompanies) * chartHeight;
      const x = index * (barWidth + barSpacing) + barSpacing / 2;
      const y = startY - barHeight;
      
      // Bar
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Value on top
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(domain.companyCount, x + barWidth / 2, y - 5);
      
      // Domain label
      ctx.save();
      ctx.translate(x + barWidth / 2, startY + 5);
      ctx.rotate(-Math.PI / 4);
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(domain.domain.substring(0, 20), 0, 0);
      ctx.restore();
    });
    
    // Title
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Companies Found by Domain', canvas.width / 2, 20);
  } else {
    // No data message
    ctx.fillStyle = '#999';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No learning data yet', canvas.width / 2, canvas.height / 2);
  }
}

// Setup intelligence tab
function setupIntelligence() {
  // Reset intelligence data
  document.getElementById('resetIntelligence')?.addEventListener('click', () => {
    if (confirm('Reset all learned patterns and site mapping data? This cannot be undone.')) {
      // Note: We'd need to add a message handler in background.js for this
      showStatus('Intelligence data reset!', 'success');
      loadIntelligenceData();
    }
  });
  
  // Settings are just for show right now, but could be implemented
  document.getElementById('enableLearning')?.addEventListener('change', (e) => {
    showStatus(`Pattern learning ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
  });
  
  document.getElementById('prioritizeByScore')?.addEventListener('change', (e) => {
    showStatus(`Intelligent prioritization ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
  });
}

// Pagination control functions
function updatePaginationControls(totalPages) {
  let paginationContainer = document.getElementById('paginationControls');
  if (!paginationContainer) {
    // Create pagination container if it doesn't exist
    const companiesTable = document.querySelector('.companies-table');
    if (!companiesTable) {
      console.error('Companies table not found');
      return;
    }
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'paginationControls';
    paginationDiv.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding: 10px;';
    companiesTable.appendChild(paginationDiv);
    paginationContainer = paginationDiv;
  }
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  // Build pagination HTML
  let paginationHTML = '';
  
  // Previous button
  paginationHTML += `
    <button class="btn-secondary btn-page-prev" data-page="${currentPage - 1}" 
            ${currentPage === 1 ? 'disabled' : ''} 
            style="padding: 5px 10px; font-size: 12px;">
      ← Previous
    </button>
  `;
  
  // Page info
  paginationHTML += `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 14px;">
        Page ${currentPage} of ${totalPages}
      </span>
      <span style="color: #666; font-size: 12px;">
        (${filteredCompanies.length} total companies)
      </span>
    </div>
  `;
  
  // Items per page selector
  paginationHTML += `
    <select id="itemsPerPageSelect" 
            style="padding: 5px; font-size: 12px; border: 1px solid #ddd; border-radius: 4px;">
      <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10 per page</option>
      <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20 per page</option>
      <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50 per page</option>
      <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100 per page</option>
    </select>
  `;
  
  // Next button
  paginationHTML += `
    <button class="btn-secondary btn-page-next" data-page="${currentPage + 1}" 
            ${currentPage === totalPages ? 'disabled' : ''}
            style="padding: 5px 10px; font-size: 12px;">
      Next →
    </button>
  `;
  
  paginationContainer.innerHTML = paginationHTML;
  
  // Add event listeners
  const prevBtn = paginationContainer.querySelector('.btn-page-prev');
  if (prevBtn && !prevBtn.disabled) {
    prevBtn.addEventListener('click', (e) => {
      changePage(parseInt(e.target.getAttribute('data-page')));
    });
  }
  
  const nextBtn = paginationContainer.querySelector('.btn-page-next');
  if (nextBtn && !nextBtn.disabled) {
    nextBtn.addEventListener('click', (e) => {
      changePage(parseInt(e.target.getAttribute('data-page')));
    });
  }
  
  const itemsSelect = paginationContainer.querySelector('#itemsPerPageSelect');
  if (itemsSelect) {
    itemsSelect.addEventListener('change', (e) => {
      changeItemsPerPage(e.target.value);
    });
  }
}

function hidePaginationControls() {
  const container = document.getElementById('paginationControls');
  if (container) {
    container.style.display = 'none';
  }
}

function changePage(page) {
  currentPage = page;
  renderCompaniesTable(filteredCompanies.length > 0 ? filteredCompanies : allCompanies);
}

function changeItemsPerPage(value) {
  itemsPerPage = parseInt(value);
  currentPage = 1; // Reset to first page
  renderCompaniesTable(filteredCompanies.length > 0 ? filteredCompanies : allCompanies);
}

// Stealth status functions
function loadStealthSettings() {
  chrome.storage.sync.get({ settings: {} }, (result) => {
    stealthSettings = result.settings;
    updateStealthDisplay();
  });
}

function updateStealthDisplay() {
  if (!stealthSettings) return;
  
  // Update max requests per hour
  document.getElementById('maxRequestsPerHour').textContent = stealthSettings.maxRequestsPerHour || 100;
  
  // Update base delay
  const baseDelay = stealthSettings.minDelay || 30;
  document.getElementById('baseDelay').textContent = `${baseDelay}s`;
  
  // Update proxy status
  updateProxyStatus();
}

function updateProxyStatus() {
  chrome.runtime.sendMessage({ action: 'getProxyStatus' }, (response) => {
    const proxyStatusEl = document.getElementById('proxyStatus');
    if (response && response.enabled) {
      proxyStatusEl.innerHTML = `<span style="color: #0f0;">● Active</span><br><span style="font-size: 11px;">${response.proxy}</span>`;
    } else {
      proxyStatusEl.innerHTML = '<span style="color: #f00;">● Disabled</span>';
    }
  });
}

function startStealthCountdown(totalDelay) {
  // Clear existing countdown
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Set next request time
  nextRequestTime = Date.now() + totalDelay;
  
  // Update randomized delay display
  document.getElementById('randomizedDelay').textContent = `${Math.round(totalDelay / 1000)}s`;
  
  // Update countdown every 100ms for smooth display
  countdownInterval = setInterval(updateCountdown, 100);
  updateCountdown();
}

function updateCountdown() {
  if (!nextRequestTime) {
    document.getElementById('stealthCountdown').textContent = '--:--';
    return;
  }
  
  const remaining = Math.max(0, nextRequestTime - Date.now());
  
  if (remaining === 0) {
    clearInterval(countdownInterval);
    document.getElementById('stealthCountdown').textContent = '00:00';
    return;
  }
  
  const seconds = Math.floor(remaining / 1000);
  const milliseconds = remaining % 1000;
  const minutes = Math.floor(seconds / 60);
  const displaySeconds = seconds % 60;
  
  const timeString = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}.${Math.floor(milliseconds / 100)}`;
  document.getElementById('stealthCountdown').textContent = timeString;
}

function updateStealthMetrics() {
  chrome.runtime.sendMessage({ action: 'getStealthMetrics' }, (response) => {
    if (response) {
      document.getElementById('requestsPerHour').textContent = response.requestsPerHour || 0;
      document.getElementById('blocksDetected').textContent = response.blocksDetected || 0;
      
      const successRate = response.totalRequests > 0 
        ? Math.round((response.successfulRequests / response.totalRequests) * 100)
        : 100;
      document.getElementById('successRate').textContent = `${successRate}%`;
    }
  });
}

function updateUserAgent() {
  chrome.runtime.sendMessage({ action: 'getCurrentUserAgent' }, (response) => {
    if (response && response.userAgent) {
      document.getElementById('currentUserAgent').textContent = response.userAgent;
    }
  });
}

// Post Preview functionality
let currentPreviewData = null;
let htmlStripper = null;
let htmlStorage = null;

async function setupPostPreview() {
  // Initialize HTML stripper and storage
  htmlStripper = new HTMLStripper();
  await initializeHTMLStorage();
  
  // Fetch preview button
  document.getElementById('fetchPreview').addEventListener('click', async () => {
    const url = document.getElementById('previewUrl').value.trim();
    if (!url) {
      showStatus('Please enter a URL', 'error');
      return;
    }
    
    console.log('Fetching URL:', url);
    showStatus('Fetching page...', 'success');
    
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      showStatus('Invalid URL format', 'error');
      return;
    }
    
    // Create a tab to fetch the content
    chrome.tabs.create({ url: url, active: false }, async (tab) => {
      console.log('Tab created:', tab);
      // Wait for the tab to complete loading
      const checkTabReady = async (tabId) => {
        return new Promise((resolve) => {
          const listener = (updatedTabId, changeInfo, tab) => {
            console.log('Tab update:', updatedTabId, changeInfo);
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve(tab);
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          
          // Add timeout to prevent hanging
          setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(null);
          }, 10000); // 10 second timeout
        });
      };
      
      try {
        const readyTab = await checkTabReady(tab.id);
        
        if (!readyTab) {
          showStatus('Timeout waiting for page to load', 'error');
          chrome.tabs.remove(tab.id);
          return;
        }
        
        console.log('Tab ready, injecting script...');
        
        // Inject script using the new API
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return {
              html: document.documentElement.outerHTML,
              url: window.location.href,
              title: document.title
            };
          }
        });
        
        if (results && results[0] && results[0].result) {
          currentPreviewData = results[0].result;
          
          // Generate URL pattern
          const pattern = generateUrlPattern(currentPreviewData.url);
          currentPreviewData.urlPattern = pattern;
          
          // Show URL pattern section
          document.getElementById('urlPatternSection').style.display = 'block';
          document.getElementById('urlPattern').value = pattern;
          
          displayPreview();
          chrome.tabs.remove(tab.id);
          showStatus('Page fetched successfully!', 'success');
        } else {
          showStatus('Failed to fetch page content', 'error');
          chrome.tabs.remove(tab.id);
        }
      } catch (error) {
        console.error('Error fetching page:', error);
        showStatus('Error: ' + error.message, 'error');
        if (tab && tab.id) {
          try {
            chrome.tabs.remove(tab.id);
          } catch (e) {
            console.error('Error removing tab:', e);
          }
        }
      }
    });
  });
  
  // Apply stripping button
  document.getElementById('applyStripping').addEventListener('click', () => {
    if (!currentPreviewData) {
      showStatus('No page loaded', 'error');
      return;
    }
    
    applyStrippingOptions();
    displayPreview();
  });
  
  // Save template button
  document.getElementById('saveTemplate').addEventListener('click', async () => {
    const name = prompt('Enter template name:');
    if (!name) return;
    
    try {
      // Initialize htmlStorage if needed
      await initializeHTMLStorage();
      
      // Check if template with this name already exists
      const existingTemplates = await htmlStorage.getTemplates();
      if (existingTemplates.some(t => t.name === name)) {
        if (!confirm(`A template named "${name}" already exists. Replace it?`)) {
          return;
        }
        // Delete the existing template first
        await htmlStorage.deleteTemplate(name);
      }
      
      const template = htmlStripper.createTemplate(name, 'Custom template');
      
      // Add URL patterns to template if available
      if (currentPreviewData && currentPreviewData.urlPattern) {
        const urlPattern = document.getElementById('urlPattern').value || currentPreviewData.urlPattern;
        template.urlPatterns = [urlPattern];
      }
      
      // New templates are active by default
      template.isActive = true;
      
      await htmlStorage.saveTemplate(template);
      
      // Also save templates with patterns to Chrome storage for background script access
      await syncTemplatesToChromeStorage();
      
      showStatus('Template saved!', 'success');
      
      // Refresh template lists
      await loadTemplatesList();
      await loadTemplatesIntoDropdown();
    } catch (error) {
      console.error('Error saving template:', error);
      showStatus('Error saving template', 'error');
    }
  });
  
  // View mode buttons
  document.getElementById('viewOriginal').addEventListener('click', () => setPreviewMode('original'));
  document.getElementById('viewCleaned').addEventListener('click', () => setPreviewMode('cleaned'));
  document.getElementById('viewSideBySide').addEventListener('click', () => setPreviewMode('sidebyside'));
  document.getElementById('viewExtracted').addEventListener('click', () => setPreviewMode('extracted'));
  
  // Export buttons
  document.getElementById('copyCleanedHtml').addEventListener('click', copyCleanedHTML);
  document.getElementById('downloadCleanedHtml').addEventListener('click', downloadCleanedHTML);
  document.getElementById('shareWithClaude').addEventListener('click', prepareForClaude);
  document.getElementById('exportExtractionConfig').addEventListener('click', exportExtractionConfig);
  
  // Update stripper options when checkboxes change
  const checkboxes = document.querySelectorAll('#post-preview-tab input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateStripperOptions();
      // Auto-apply if preview is loaded
      if (currentPreviewData && currentPreviewData.html) {
        applyStrippingOptions();
        displayPreview();
      }
    });
  });
  
  // Template management
  document.getElementById('refreshTemplates').addEventListener('click', loadTemplatesList);
  document.getElementById('manageTemplates').addEventListener('click', openTemplateManager);
  
  // URL Pattern editing
  document.getElementById('editUrlPattern').addEventListener('click', editUrlPattern);
  
  // Toggle checkboxes event delegation
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-checkboxes')) {
      const type = e.target.dataset.type;
      const checked = e.target.dataset.checked === 'true';
      toggleAllCheckboxes(type, checked);
    }
  });
  
  // Load templates on init
  loadTemplatesList();
  
  // Sync templates to Chrome storage on init
  syncTemplatesToChromeStorage();
}

function updateStripperOptions() {
  const options = {};
  const checkboxes = document.querySelectorAll('#post-preview-tab input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    options[checkbox.id] = checkbox.checked;
  });
  if (htmlStripper) {
    htmlStripper.options = Object.assign(htmlStripper.options || {}, options);
  }
}

// Make this function available globally for HTML onclick handlers
window.updateStripperOptions = updateStripperOptions;

// Toggle all checkboxes function
function toggleAllCheckboxes(type, checked) {
  const prefix = type === 'stripping' ? 'strip' : 'keep';
  const checkboxes = document.querySelectorAll(`input[type="checkbox"][id^="${prefix}"]`);
  checkboxes.forEach(cb => {
    cb.checked = checked;
    // Trigger change event to notify listeners
    cb.dispatchEvent(new Event('change'));
  });
}

// URL Pattern editing function
function editUrlPattern() {
  const input = document.getElementById('urlPattern');
  input.removeAttribute('readonly');
  input.focus();
  input.select();
}

function applyStrippingOptions() {
  updateStripperOptions();
  const result = htmlStripper.stripHTML(currentPreviewData.html);
  currentPreviewData.cleaned = result.html;
  currentPreviewData.stats = result.stats;
  currentPreviewData.extractedData = htmlStripper.extractStructuredData(
    new DOMParser().parseFromString(result.html, 'text/html')
  );
  
  // Update stats display
  document.getElementById('originalSize').textContent = result.stats.originalSizeKB;
  document.getElementById('cleanedSize').textContent = result.stats.cleanedSizeKB;
  document.getElementById('sizeReduction').textContent = result.stats.reduction;
}

function displayPreview() {
  const container = document.getElementById('previewContainer');
  const mode = container.dataset.mode || 'original';
  
  if (!currentPreviewData) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No content loaded</div>';
    return;
  }
  
  if (!currentPreviewData.cleaned) {
    applyStrippingOptions();
  }
  
  switch (mode) {
    case 'original':
      container.innerHTML = `<iframe srcdoc="${escapeHtml(currentPreviewData.html)}" style="width: 100%; height: 100%; border: none;"></iframe>`;
      break;
    case 'cleaned':
      container.innerHTML = `<iframe srcdoc="${escapeHtml(currentPreviewData.cleaned)}" style="width: 100%; height: 100%; border: none;"></iframe>`;
      break;
    case 'sidebyside':
      container.innerHTML = `
        <div style="display: flex; height: 100%;">
          <div style="flex: 1; border-right: 1px solid #ddd;">
            <div style="padding: 10px; background: #f0f0f0; font-weight: bold;">Original</div>
            <iframe srcdoc="${escapeHtml(currentPreviewData.html)}" style="width: 100%; height: calc(100% - 40px); border: none;"></iframe>
          </div>
          <div style="flex: 1;">
            <div style="padding: 10px; background: #f0f0f0; font-weight: bold;">Cleaned</div>
            <iframe srcdoc="${escapeHtml(currentPreviewData.cleaned)}" style="width: 100%; height: calc(100% - 40px); border: none;"></iframe>
          </div>
        </div>
      `;
      break;
    case 'extracted':
      // Format the extracted data nicely
      const extractedData = currentPreviewData.extractedData;
      let formattedHTML = '<div style="padding: 20px; overflow: auto;">';
      
      // Company Info Section
      if (extractedData.companyInfo) {
        const info = extractedData.companyInfo;
        formattedHTML += '<h3>Company Information</h3>';
        formattedHTML += '<div style="margin-left: 20px; margin-bottom: 20px;">';
        
        if (info.name) formattedHTML += `<p><strong>Name:</strong> ${info.name}</p>`;
        if (info.location) formattedHTML += `<p><strong>Location:</strong> ${info.location}</p>`;
        if (info.description) formattedHTML += `<p><strong>Description:</strong> ${info.description}</p>`;
        
        if (info.team && info.team.size) {
          formattedHTML += `<p><strong>Team Size:</strong> ${info.team.size} people</p>`;
        }
        
        if (info.languages && info.languages.length > 0) {
          formattedHTML += `<p><strong>Languages:</strong> ${info.languages.join(', ')}</p>`;
        }
        
        if (info.portfolio && info.portfolio.count) {
          formattedHTML += `<p><strong>Portfolio:</strong> ${info.portfolio.count} projects</p>`;
        }
        
        if (info.reviews) {
          if (info.reviews.rating) formattedHTML += `<p><strong>Rating:</strong> ${info.reviews.rating}/5`;
          if (info.reviews.count) formattedHTML += ` (${info.reviews.count} reviews)`;
          formattedHTML += '</p>';
        }
        
        if (info.founded) formattedHTML += `<p><strong>Founded:</strong> ${info.founded}</p>`;
        if (info.memberSince) formattedHTML += `<p><strong>Member Since:</strong> ${info.memberSince}</p>`;
        if (info.remoteWork) formattedHTML += `<p><strong>Remote Work:</strong> Yes</p>`;
        
        if (info.specialties && info.specialties.length > 0) {
          formattedHTML += `<p><strong>Specialties:</strong> ${info.specialties.join(', ')}</p>`;
        }
        
        formattedHTML += '</div>';
      }
      
      // Raw JSON Section (collapsed by default)
      formattedHTML += '<details style="margin-top: 20px;">';
      formattedHTML += '<summary style="cursor: pointer; font-weight: bold;">Raw Extracted Data (JSON)</summary>';
      formattedHTML += `<pre style="margin-top: 10px; background: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto;">${JSON.stringify(extractedData, null, 2)}</pre>`;
      formattedHTML += '</details>';
      
      formattedHTML += '</div>';
      container.innerHTML = formattedHTML;
      break;
  }
}

function setPreviewMode(mode) {
  const container = document.getElementById('previewContainer');
  container.dataset.mode = mode;
  
  // Update button states
  const buttons = ['viewOriginal', 'viewCleaned', 'viewSideBySide', 'viewExtracted'];
  buttons.forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  
  const modeMap = {
    'original': 'viewOriginal',
    'cleaned': 'viewCleaned',
    'sidebyside': 'viewSideBySide',
    'extracted': 'viewExtracted'
  };
  
  document.getElementById(modeMap[mode]).classList.add('active');
  displayPreview();
}

function copyCleanedHTML() {
  if (!currentPreviewData || !currentPreviewData.cleaned) {
    showStatus('No cleaned HTML available', 'error');
    return;
  }
  
  navigator.clipboard.writeText(currentPreviewData.cleaned).then(() => {
    showStatus('Cleaned HTML copied to clipboard!', 'success');
  });
}

function downloadCleanedHTML() {
  if (!currentPreviewData || !currentPreviewData.cleaned) {
    showStatus('No cleaned HTML available', 'error');
    return;
  }
  
  const blob = new Blob([currentPreviewData.cleaned], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const filename = `cleaned_${new URL(currentPreviewData.url).hostname}_${Date.now()}.html`;
  
  chrome.downloads.download({
    url: url,
    filename: filename
  });
  
  showStatus('Download started!', 'success');
}

function prepareForClaude() {
  if (!currentPreviewData || !currentPreviewData.cleaned) {
    showStatus('No cleaned HTML available', 'error');
    return;
  }
  
  const claudeData = {
    url: currentPreviewData.url,
    title: currentPreviewData.title,
    cleanedHTML: currentPreviewData.cleaned,
    extractedData: currentPreviewData.extractedData,
    stats: currentPreviewData.stats
  };
  
  const blob = new Blob([JSON.stringify(claudeData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = `claude_ready_${Date.now()}.json`;
  
  chrome.downloads.download({
    url: url,
    filename: filename
  });
  
  showStatus('Claude-ready file downloaded!', 'success');
}

// HTML Harvester functionality
async function setupHTMLHarvester() {
  await initializeHTMLStorage();
  
  // Load settings
  const settings = await loadHarvesterSettings();
  document.getElementById('autoHarvest').checked = settings.autoHarvest;
  document.getElementById('applyTemplates').checked = settings.applyTemplates;
  document.getElementById('useUrlPatternMatching').checked = settings.useUrlPatternMatching !== false; // Default to true
  document.getElementById('compressStorage').checked = settings.compressStorage;
  document.getElementById('storageLimit').value = settings.storageLimit;
  
  // Load saved templates into dropdown
  await loadTemplatesIntoDropdown();
  
  // Set the selected template if one was saved
  if (settings.defaultTemplate) {
    document.getElementById('defaultTemplate').value = settings.defaultTemplate;
  }
  
  // Event listeners
  document.getElementById('autoHarvest').addEventListener('change', saveHarvesterSettings);
  document.getElementById('applyTemplates').addEventListener('change', saveHarvesterSettings);
  document.getElementById('useUrlPatternMatching').addEventListener('change', saveHarvesterSettings);
  document.getElementById('compressStorage').addEventListener('change', saveHarvesterSettings);
  document.getElementById('storageLimit').addEventListener('change', saveHarvesterSettings);
  document.getElementById('defaultTemplate').addEventListener('change', saveHarvesterSettings);
  
  document.getElementById('refreshHarvested').addEventListener('click', loadHarvestedPages);
  document.getElementById('searchHarvested').addEventListener('input', searchHarvestedPages);
  
  document.getElementById('exportAllHarvested').addEventListener('click', exportAllAsZip);
  document.getElementById('reprocessAll').addEventListener('click', reprocessAllPages);
  document.getElementById('exportForClaude').addEventListener('click', exportAllForClaude);
  document.getElementById('clearHarvestedStorage').addEventListener('click', clearAllStorage);
  
  // Harvester Auto-Browse event listeners
  document.getElementById('startHarvesterAutoBrowse').addEventListener('click', startHarvesterAutoBrowse);
  document.getElementById('stopHarvesterAutoBrowse').addEventListener('click', stopHarvesterAutoBrowse);
  document.getElementById('previewHarvesterUrls').addEventListener('click', previewHarvesterUrls);
  document.getElementById('debugHarvesterUrls').addEventListener('click', debugHarvesterUrls);
  
  // Load initial data
  loadHarvesterStats();
  loadHarvestedPages();
  updateHarvesterAutoBrowseUI();
  listenForHarvesterUpdates();
}

async function initializeHTMLStorage() {
  if (!htmlStorage) {
    htmlStorage = new HTMLStorage();
    await htmlStorage.init();
  }
}

async function loadHarvesterStats() {
  const stats = await htmlStorage.getStats();
  document.getElementById('pagesHarvested').textContent = stats.pageCount;
  document.getElementById('totalStorage').textContent = stats.totalSizeMB + ' MB';
  document.getElementById('avgReduction').textContent = stats.avgReduction;
  
  // Load template count
  const templates = await htmlStorage.getTemplates();
  document.getElementById('templatesSaved').textContent = templates.length;
  
  // Calculate and display pages to harvest
  const pagesToHarvest = await calculatePagesToHarvest();
  document.getElementById('pagesToHarvest').textContent = pagesToHarvest;
}

// Calculate total pages that match active template patterns
async function calculatePagesToHarvest() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getHarvesterTargetUrls' });
    return response.urls ? response.urls.length : 0;
  } catch (error) {
    console.error('Error calculating pages to harvest:', error);
    return 0;
  }
}

// Calculate pages to harvest for a specific template pattern
async function calculatePagesToHarvestForTemplate(patterns) {
  try {
    if (!patterns || patterns.length === 0) return { toHarvest: 0, harvested: 0 };
    
    // Get all collected URLs
    const allUrls = await chrome.runtime.sendMessage({ action: 'getAllUrls' });
    if (!allUrls || !allUrls.urls) return { toHarvest: 0, harvested: 0 };
    
    // Get harvested pages
    const harvestedPages = await htmlStorage.getAllPages();
    const harvestedUrls = harvestedPages.map(page => page.url);
    
    let matchingUrls = 0;
    let harvestedMatching = 0;
    
    // Check each URL against the patterns
    allUrls.urls.forEach(url => {
      for (const pattern of patterns) {
        if (matchUrlPattern(url, pattern)) {
          matchingUrls++;
          if (harvestedUrls.includes(url)) {
            harvestedMatching++;
          }
          break; // Only count once per URL
        }
      }
    });
    
    return { 
      toHarvest: matchingUrls - harvestedMatching, 
      harvested: harvestedMatching 
    };
  } catch (error) {
    console.error('Error calculating template-specific harvest stats:', error);
    return { toHarvest: 0, harvested: 0 };
  }
}

async function loadHarvestedPages() {
  // Try to load from Chrome storage first (for pages harvested by content script)
  const chromeStorageResult = await chrome.storage.local.get(['harvestedPages']);
  const chromePages = chromeStorageResult.harvestedPages || [];
  
  // Also load from IndexedDB (for pages saved via Post Preview)
  const indexedPages = await htmlStorage.getAllPages();
  
  // Combine and deduplicate pages
  const allPages = [...chromePages];
  
  // Add IndexedDB pages with proper format
  indexedPages.forEach(page => {
    if (!allPages.find(p => p.url === page.url && p.timestamp === page.timestamp)) {
      allPages.push(page);
    }
  });
  
  // Sort by timestamp (newest first)
  allPages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const tbody = document.getElementById('harvestedPagesBody');
  
  if (allPages.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
          No pages harvested yet. Visit pages with auto-harvest enabled to start collecting.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = allPages.map((page, index) => {
    // Check for extraction quality data
    const hasQualityData = page.validation || page.extractionQuality;
    const qualityScore = page.validation?.score || page.extractionQuality?.score || 0;
    const qualityBadge = getHarvestQualityBadge(qualityScore);
    
    // Template info
    const templateInfo = page.template ? 
      `<span style="font-size: 11px; color: #666; display: block;">Template: ${page.template}${page.matchedByPattern ? ' (pattern match)' : ''}</span>` : '';
    
    return `
      <tr>
        <td style="padding: 10px;">
          <a href="${page.url}" target="_blank" style="color: #2196F3; text-decoration: none;">
            ${page.url.substring(0, 50)}${page.url.length > 50 ? '...' : ''}
          </a>
          ${templateInfo}
          ${qualityBadge}
        </td>
        <td style="padding: 10px;">${new Date(page.timestamp).toLocaleString()}</td>
        <td style="padding: 10px;">
          ${(page.cleanedSize / 1024).toFixed(2)} KB
          ${hasQualityData ? `<br><span style="font-size: 11px; color: #666;">Quality: ${qualityScore}%</span>` : ''}
        </td>
        <td style="padding: 10px;">${page.reduction || 'N/A'}</td>
        <td style="padding: 10px;">
          <button class="btn-secondary btn-view-page" data-page-id="${page.id || index}" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">View</button>
          <button class="btn-danger btn-delete-page" data-page-id="${page.id || index}" style="padding: 5px 10px; font-size: 12px;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Update stats to reflect all pages
  document.getElementById('pagesHarvested').textContent = allPages.length;
  
  // Add event listeners to dynamically created buttons
  document.querySelectorAll('.btn-view-page').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const pageId = e.target.getAttribute('data-page-id');
      await viewHarvestedPage(pageId);
    });
  });
  
  document.querySelectorAll('.btn-delete-page').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const pageId = e.target.getAttribute('data-page-id');
      await deleteHarvestedPage(pageId);
    });
  });
}

async function searchHarvestedPages(event) {
  const query = event.target.value;
  const pages = await htmlStorage.searchPages(query);
  // Update display with filtered pages
  // (Reuse the display logic from loadHarvestedPages)
}

async function loadHarvesterSettings() {
  const result = await chrome.storage.local.get(['harvesterSettings']);
  return result.harvesterSettings || {
    autoHarvest: true,
    applyTemplates: true,
    useUrlPatternMatching: true,
    compressStorage: true,
    storageLimit: 100,
    defaultTemplate: ''
  };
}

async function saveHarvesterSettings() {
  const settings = {
    autoHarvest: document.getElementById('autoHarvest').checked,
    applyTemplates: document.getElementById('applyTemplates').checked,
    useUrlPatternMatching: document.getElementById('useUrlPatternMatching').checked,
    compressStorage: document.getElementById('compressStorage').checked,
    storageLimit: parseInt(document.getElementById('storageLimit').value),
    defaultTemplate: document.getElementById('defaultTemplate').value
  };
  
  await chrome.storage.local.set({ harvesterSettings: settings });
}

async function loadTemplatesIntoDropdown() {
  const dropdown = document.getElementById('defaultTemplate');
  if (!dropdown) return;
  
  // Clear existing options except the first one (None)
  while (dropdown.options.length > 1) {
    dropdown.remove(1);
  }
  
  try {
    // Initialize htmlStorage if needed
    await initializeHTMLStorage();
    
    // Get templates from IndexedDB
    const templates = await htmlStorage.getTemplates();
    
    // Add saved templates to dropdown
    templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.name;
      let text = `${template.name} (${template.description || 'Custom template'})`;
      
      // Add URL pattern info if available
      if (template.urlPatterns && template.urlPatterns.length > 0) {
        text += ` - Pattern: ${template.urlPatterns[0]}`;
      }
      
      option.textContent = text;
      dropdown.appendChild(option);
    });
    
    // If no custom templates, add the default ones back
    if (templates.length === 0) {
      const defaults = [
        { value: 'article', text: 'Article' },
        { value: 'company', text: 'Company Profile' },
        { value: 'listing', text: 'Listing Page' }
      ];
      
      defaults.forEach(def => {
        const option = document.createElement('option');
        option.value = def.value;
        option.textContent = def.text;
        dropdown.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading templates:', error);
    showStatus('Error loading templates', 'error');
  }
}

async function exportAllAsZip() {
  showStatus('Preparing ZIP export...', 'success');
  // Implementation for ZIP export
  // Would need a ZIP library like JSZip
}

async function reprocessAllPages() {
  if (!confirm('Reprocess all pages with current settings?')) return;
  showStatus('Reprocessing pages...', 'success');
  // Implementation for reprocessing
}

async function exportAllForClaude() {
  // Get pages from IndexedDB
  const indexedPages = await htmlStorage.exportForClaude();
  
  // Get pages from Chrome storage
  const chromeStorageResult = await chrome.storage.local.get(['harvestedPages']);
  const chromePages = chromeStorageResult.harvestedPages || [];
  
  // Format Chrome storage pages for Claude
  const formattedChromePages = chromePages.map(page => ({
    url: page.url,
    timestamp: page.timestamp,
    html: page.cleanedHTML,
    extractedData: null
  }));
  
  // Combine all pages
  const allPages = [...indexedPages, ...formattedChromePages];
  
  const blob = new Blob([JSON.stringify(allPages, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: `claude_export_${Date.now()}.json`
  });
  
  showStatus(`Export for Claude completed! ${allPages.length} pages exported.`, 'success');
}

async function clearAllStorage() {
  if (!confirm('Clear all harvested pages? This cannot be undone.')) return;
  
  // Clear IndexedDB
  await htmlStorage.clearStorage();
  
  // Clear Chrome storage
  await chrome.storage.local.remove(['harvestedPages']);
  
  loadHarvesterStats();
  loadHarvestedPages();
  showStatus('Storage cleared!', 'success');
}

// Helper functions
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Debug function to test URL pattern matching
window.testUrlPatternMatch = async function(testUrl) {
  console.log('\n=== Testing URL Pattern Match ===');
  console.log('Test URL:', testUrl);
  
  // Generate pattern for this URL
  const generatedPattern = generateUrlPattern(testUrl);
  console.log('Generated pattern:', generatedPattern);
  
  // Get templates from storage
  const result = await chrome.storage.local.get(['templatePatterns']);
  const templates = result.templatePatterns || [];
  console.log('Total templates in storage:', templates.length);
  
  // Check each template
  templates.forEach(template => {
    console.log(`\nTemplate: ${template.name}`);
    console.log('Active:', template.isActive);
    console.log('Patterns:', template.urlPatterns);
    
    if (template.urlPatterns && template.urlPatterns.length > 0) {
      template.urlPatterns.forEach(pattern => {
        const matches = matchUrlPattern(testUrl, pattern);
        console.log(`Pattern "${pattern}" matches: ${matches}`);
      });
    }
  });
  
  // Also test in background script
  console.log('\nTesting with background script...');
  const response = await chrome.runtime.sendMessage({ 
    action: 'getHarvesterTargetUrls' 
  });
  console.log('Harvester target URLs count:', response.urls ? response.urls.length : 0);
  
  // Check if our test URL is in collected URLs
  const allUrlsResponse = await chrome.runtime.sendMessage({ 
    action: 'getAllUrls' 
  });
  const isCollected = allUrlsResponse.urls && allUrlsResponse.urls.includes(testUrl);
  console.log('Is URL in collected URLs?', isCollected);
  
  return { generatedPattern, templates, isCollected };
};

// Get confidence color based on score
function getConfidenceColor(confidence) {
  if (!confidence) return '#999';
  if (confidence >= 0.8) return '#4CAF50'; // Green
  if (confidence >= 0.6) return '#FFC107'; // Amber
  if (confidence >= 0.4) return '#FF9800'; // Orange
  return '#F44336'; // Red
}

// Get quality badge for company
function getQualityBadge(company) {
  // Check if we have validation data (from enhanced extraction)
  if (company.validation && company.validation.score !== undefined) {
    const score = company.validation.score;
    if (score >= 90) return '<span style="color: #4CAF50; margin-left: 5px;" title="Excellent extraction">⭐</span>';
    if (score >= 70) return '<span style="color: #8BC34A; margin-left: 5px;" title="Good extraction">✅</span>';
    if (score >= 50) return '<span style="color: #FFC107; margin-left: 5px;" title="Fair extraction">⚠️</span>';
    return '<span style="color: #F44336; margin-left: 5px;" title="Poor extraction">❌</span>';
  }
  
  // Fallback to confidence-based badge
  if (company.confidence) {
    if (company.confidence >= 0.8) return '<span style="color: #4CAF50; margin-left: 5px;" title="High confidence">✓</span>';
    if (company.confidence >= 0.5) return '<span style="color: #FFC107; margin-left: 5px;" title="Medium confidence">~</span>';
  }
  
  return '';
}

// Get quality badge for harvested pages
function getHarvestQualityBadge(score) {
  if (score >= 90) return '<span style="color: #4CAF50; margin-left: 5px;" title="Excellent extraction">⭐</span>';
  if (score >= 70) return '<span style="color: #8BC34A; margin-left: 5px;" title="Good extraction">✅</span>';
  if (score >= 50) return '<span style="color: #FFC107; margin-left: 5px;" title="Fair extraction">⚠️</span>';
  if (score > 0) return '<span style="color: #F44336; margin-left: 5px;" title="Poor extraction">❌</span>';
  return '';
}

// Make functions available globally
window.copyUrl = copyUrl;
window.changePage = changePage;
window.changeItemsPerPage = changeItemsPerPage;
async function viewHarvestedPage(id) {
  // Try to get from IndexedDB first
  let page = await htmlStorage.getPage(id);
  
  // If not found, try Chrome storage by index
  if (!page && !isNaN(id)) {
    const chromeStorageResult = await chrome.storage.local.get(['harvestedPages']);
    const chromePages = chromeStorageResult.harvestedPages || [];
    page = chromePages[id];
  }
  
  if (page) {
    // Use blob URL instead of data URL for security
    const html = page.cleanedHTML || page.html;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new tab
    const newTab = window.open(url, '_blank');
    
    // Clean up blob URL after the tab loads
    if (newTab) {
      newTab.addEventListener('load', () => {
        setTimeout(() => URL.revokeObjectURL(url), 100);
      });
    }
  } else {
    showStatus('Page not found', 'error');
  }
}

async function deleteHarvestedPage(id) {
  if (confirm('Delete this page?')) {
    // Try to delete from IndexedDB
    try {
      await htmlStorage.deletePage(id);
    } catch (e) {
      // If not in IndexedDB, try Chrome storage
      if (!isNaN(id)) {
        const chromeStorageResult = await chrome.storage.local.get(['harvestedPages']);
        let chromePages = chromeStorageResult.harvestedPages || [];
        chromePages.splice(id, 1);
        await chrome.storage.local.set({ harvestedPages: chromePages });
      }
    }
    
    loadHarvestedPages();
    loadHarvesterStats();
    showStatus('Page deleted!', 'success');
  }
}

// Generate URL pattern from a URL
function generateUrlPattern(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(s => s.length > 0);
    
    let pattern = `${urlObj.protocol}//${urlObj.hostname}`;
    
    // Analyze each path segment
    segments.forEach((segment, index) => {
      // Check if segment is a number
      if (/^\d+$/.test(segment)) {
        pattern += '/{id}';
      }
      // Check if segment looks like a slug (contains hyphens)
      else if (segment.includes('-') && segment.length > 10) {
        pattern += '/{slug}';
      }
      // Check if it's a category-like segment (short, no special chars)
      else if (segment.length < 20 && /^[a-z]+$/i.test(segment)) {
        pattern += '/' + segment;
      }
      // Default to wildcard for complex segments
      else {
        pattern += '/{*}';
      }
    });
    
    // Simplify the domain if it has www
    if (urlObj.hostname.startsWith('www.')) {
      const domain = urlObj.hostname.substring(4);
      pattern = pattern.replace(urlObj.hostname, 'www.{domain}');
    }
    
    console.log(`Generated pattern for ${url}: ${pattern}`);
    
    return pattern;
  } catch (error) {
    console.error('Error generating URL pattern:', error);
    return '';
  }
}

// Match a URL against a pattern
function matchUrlPattern(url, pattern) {
  try {
    // Convert pattern to regex
    let regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\//g, '\\/')
      .replace(/\{domain\}/g, '[^/]+')
      .replace(/\{slug\}/g, '[^/]+')
      .replace(/\{id\}/g, '\\d+')
      .replace(/\{\*\}/g, '[^/]+');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(url);
  } catch (error) {
    console.error('Error matching URL pattern:', error);
    return false;
  }
}

// Sync templates to Chrome storage for background script access
async function syncTemplatesToChromeStorage() {
  try {
    await initializeHTMLStorage();
    const templates = await htmlStorage.getTemplates();
    
    // Create a simplified version for Chrome storage
    const templatePatterns = templates.map(t => ({
      name: t.name,
      urlPatterns: t.urlPatterns || [],
      options: t.options,
      isActive: t.isActive !== false // Default to true for existing templates
    }));
    
    await chrome.storage.local.set({ templatePatterns });
    console.log('Synced templates to Chrome storage:', templatePatterns);
    
    // Debug: Log the patterns for verification
    templatePatterns.forEach(t => {
      console.log(`Template: ${t.name}, Active: ${t.isActive}, Patterns:`, t.urlPatterns);
    });
  } catch (error) {
    console.error('Error syncing templates:', error);
  }
}

// Find matching template for a URL
async function findMatchingTemplate(url) {
  try {
    const result = await chrome.storage.local.get(['templatePatterns']);
    const templates = result.templatePatterns || [];
    
    for (const template of templates) {
      // Skip inactive templates
      if (!template.isActive) continue;
      
      if (template.urlPatterns && template.urlPatterns.length > 0) {
        for (const pattern of template.urlPatterns) {
          if (matchUrlPattern(url, pattern)) {
            return template.name;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding matching template:', error);
    return null;
  }
}

// Export extraction configuration
function exportExtractionConfig() {
  const extractionConfig = {
    name: "Sortlist Company Extraction Rules",
    version: "1.0",
    created: new Date().toISOString(),
    description: "Configuration for extracting company information from Sortlist pages",
    
    selectors: {
      companyName: {
        selector: "h1",
        description: "Main heading containing company name",
        fallback: ".company-name, .agency-name"
      },
      
      location: {
        selectors: [
          "h1 + span.p",
          "[class*='location']",
          "[class*='address']"
        ],
        description: "Location usually appears right after company name",
        pattern: "Must contain comma (e.g., 'Brussels, Belgium')"
      },
      
      description: {
        selectors: [
          ".text-break-word > span[data-testid='clamp-lines']",
          "[class*='description']",
          ".company-description"
        ],
        description: "Company description or about text",
        minLength: 100
      },
      
      infoRows: {
        selector: ".layout-row.layout-align-start-center",
        description: "Icon-based information rows containing various company details",
        extraction: "Text content analysis with pattern matching"
      },
      
      rating: {
        selector: "[data-testid*='star-rating']",
        description: "Star rating container",
        extraction: "Parse rating value and review count from text"
      },
      
      category: {
        selector: ".bold.h4",
        description: "Main service category or specialty"
      },
      
      services: {
        selector: "h2:contains('service'), h3:contains('service'), h4:contains('service')",
        description: "Services section header",
        extraction: "Extract count from text (e.g., '6 services')"
      },
      
      buttons: {
        selector: "button[data-testid]",
        description: "Action buttons with test IDs",
        attributes: ["data-testid", "textContent"]
      }
    },
    
    patterns: {
      teamSize: {
        regex: "(\\\\d+)(?:-\\\\d+)?\\\\s*people",
        description: "Extracts team size from text like '11-50 people in their team'",
        extraction: "First number in the match"
      },
      
      languages: {
        regex: "Speaks\\\\s+(.+)",
        description: "Extracts languages from 'Speaks English, French, Dutch'",
        extraction: "Split by comma"
      },
      
      portfolio: {
        regex: "(\\\\d+)\\\\+?\\\\s*projects",
        description: "Extracts project count from '25+ projects in portfolio'",
        extraction: "Number of projects"
      },
      
      founded: {
        regex: "Founded in\\\\s+(\\\\d{4})",
        description: "Extracts founding year",
        extraction: "4-digit year"
      },
      
      memberSince: {
        regex: "member since\\\\s+(\\\\d{4})",
        description: "Extracts Sortlist membership year",
        extraction: "4-digit year"
      },
      
      awards: {
        regex: "(\\\\d+)\\\\s*award",
        description: "Extracts award count",
        extraction: "Number of awards"
      },
      
      rating: {
        regex: "(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*/\\\\s*5",
        description: "Extracts rating value",
        extraction: "Decimal rating out of 5"
      },
      
      reviews: {
        regex: "\\\\((\\\\d+)\\\\s*reviews?\\\\)",
        description: "Extracts review count",
        extraction: "Number of reviews"
      }
    },
    
    textIndicators: {
      remoteWork: {
        text: "Works remotely",
        description: "Indicates if company works remotely"
      },
      
      services: {
        text: "services",
        description: "Used to identify service count sections"
      }
    },
    
    extractionFlow: [
      "1. Extract company name from h1",
      "2. Look for location in adjacent span or location classes",
      "3. Find description in text-break-word or description classes",
      "4. Iterate through .layout-row elements and match patterns",
      "5. Extract rating and reviews from star rating container",
      "6. Identify main category from bold h4 elements",
      "7. Extract service count from section headers",
      "8. Collect button actions and metadata"
    ],
    
    notes: {
      flexibility: "Selectors are tried in order until a match is found",
      validation: "Description must be >100 chars, location must contain comma",
      patterns: "All regex patterns are case-insensitive by default",
      gentle_mode: "Use gentle stripping mode to preserve more structure",
      future: "These rules can be used by AI to create automated extractors"
    }
  };
  
  // Create a formatted display
  const configDisplay = `
    <div style="padding: 20px; font-family: monospace; font-size: 12px;">
      <h3>Extraction Configuration Export</h3>
      <p>This configuration shows how company data is extracted from Sortlist pages.</p>
      
      <details open>
        <summary style="font-weight: bold; cursor: pointer; margin: 10px 0;">Selectors</summary>
        <pre>${JSON.stringify(extractionConfig.selectors, null, 2)}</pre>
      </details>
      
      <details>
        <summary style="font-weight: bold; cursor: pointer; margin: 10px 0;">Pattern Matching Rules</summary>
        <pre>${JSON.stringify(extractionConfig.patterns, null, 2)}</pre>
      </details>
      
      <details>
        <summary style="font-weight: bold; cursor: pointer; margin: 10px 0;">Text Indicators</summary>
        <pre>${JSON.stringify(extractionConfig.textIndicators, null, 2)}</pre>
      </details>
      
      <details>
        <summary style="font-weight: bold; cursor: pointer; margin: 10px 0;">Extraction Flow</summary>
        <pre>${extractionConfig.extractionFlow.join('\n')}</pre>
      </details>
      
      <div style="margin-top: 20px;">
        <button id="copyConfigBtn">
          Copy Configuration
        </button>
        <button id="downloadConfigBtn">
          Download as JSON
        </button>
      </div>
    </div>
  `;
  
  // Open in new window
  const configWindow = window.open('', 'ExtractionConfig', 'width=800,height=600');
  configWindow.document.write(`
    <html>
      <head>
        <title>Extraction Configuration</title>
        <style>
          body { margin: 0; background: #f5f5f5; }
          pre { background: #fff; padding: 15px; border-radius: 5px; overflow: auto; }
          details { margin: 10px 0; }
          button { 
            background: #4CAF50; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 5px;
          }
          button:hover { background: #45a049; }
        </style>
      </head>
      <body>${configDisplay}</body>
    </html>
  `);
  
  // Add event listeners after window loads
  configWindow.addEventListener('DOMContentLoaded', () => {
    const copyBtn = configWindow.document.getElementById('copyConfigBtn');
    const downloadBtn = configWindow.document.getElementById('downloadConfigBtn');
    
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        configWindow.navigator.clipboard.writeText(JSON.stringify(extractionConfig, null, 2)).then(() => {
          configWindow.alert('Configuration copied to clipboard!');
        });
      });
    }
    
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(extractionConfig, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = configWindow.document.createElement('a');
        a.href = url;
        a.download = 'extraction-config.json';
        a.click();
      });
    }
  });
  
  showStatus('Extraction configuration opened in new window', 'success');
}

// Template management functions
async function loadTemplatesList() {
  const container = document.getElementById('templatesList');
  if (!container) return;
  
  try {
    // Initialize htmlStorage if needed
    await initializeHTMLStorage();
    
    const templates = await htmlStorage.getTemplates();
    
    if (templates.length === 0) {
      container.innerHTML = '<div style="color: #666; padding: 10px;">No templates saved yet. Save a template from the stripping options above.</div>';
      return;
    }
    
    let html = '<div style="padding: 10px;">';
    html += '<table style="width: 100%; border-collapse: collapse;">';
    html += '<thead><tr style="border-bottom: 2px solid #ddd;">';
    html += '<th style="text-align: left; padding: 8px;">Status</th>';
    html += '<th style="text-align: left; padding: 8px;">Name</th>';
    html += '<th style="text-align: left; padding: 8px;">URL Patterns</th>';
    html += '<th style="text-align: center; padding: 8px;">Pages to Harvest</th>';
    html += '<th style="text-align: center; padding: 8px;">Pages Harvested</th>';
    html += '<th style="text-align: left; padding: 8px;">Created</th>';
    html += '<th style="text-align: right; padding: 8px;">Actions</th>';
    html += '</tr></thead><tbody>';
    
    // Calculate stats for each template
    const templateStats = await Promise.all(templates.map(async template => {
      const stats = await calculatePagesToHarvestForTemplate(template.urlPatterns);
      return { ...template, ...stats };
    }));
    
    templateStats.forEach(template => {
      const created = new Date(template.created).toLocaleDateString();
      const patterns = template.urlPatterns || [];
      const patternsDisplay = patterns.length > 0 
        ? patterns.map(p => `<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-size: 11px;">${p}</code>`).join('<br>')
        : '<span style="color: #999; font-size: 12px;">No patterns</span>';
      
      const isActive = template.isActive !== false; // Default to true
      const statusColor = isActive ? '#4CAF50' : '#999';
      const statusText = isActive ? 'Active' : 'Inactive';
      
      html += `<tr style="border-bottom: 1px solid #eee;">`;
      html += `<td style="padding: 8px;">`;
      html += `<button class="toggle-template-status" data-name="${template.name}" data-active="${isActive}" `;
      html += `style="padding: 4px 8px; background: ${statusColor}; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; width: 60px;">`;
      html += `${statusText}</button>`;
      html += `</td>`;
      html += `<td style="padding: 8px; font-weight: bold;">${template.name}</td>`;
      html += `<td style="padding: 8px;">${patternsDisplay}</td>`;
      html += `<td style="padding: 8px; text-align: center; color: #2196F3; font-weight: bold;">${template.toHarvest || 0}</td>`;
      html += `<td style="padding: 8px; text-align: center; color: #4CAF50; font-weight: bold;">${template.harvested || 0}</td>`;
      html += `<td style="padding: 8px; color: #666; font-size: 12px;">${created}</td>`;
      html += `<td style="padding: 8px; text-align: right;">`;
      html += `<button class="apply-template" data-name="${template.name}" style="padding: 4px 8px; margin: 0 2px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">Apply</button>`;
      html += `<button class="delete-template" data-name="${template.name}" style="padding: 4px 8px; margin: 0 2px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">Delete</button>`;
      html += `</td></tr>`;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    // Add event listeners
    container.querySelectorAll('.apply-template').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const templateName = e.target.dataset.name;
        await applyTemplate(templateName);
      });
    });
    
    container.querySelectorAll('.delete-template').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const templateName = e.target.dataset.name;
        if (confirm(`Delete template "${templateName}"?`)) {
          await deleteTemplate(templateName);
        }
      });
    });
    
    // Add event listeners for toggle status buttons
    container.querySelectorAll('.toggle-template-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const templateName = e.target.dataset.name;
        const currentActive = e.target.dataset.active === 'true';
        await toggleTemplateStatus(templateName, !currentActive);
      });
    });
    
  } catch (error) {
    console.error('Error loading templates:', error);
    container.innerHTML = '<div style="color: #f44336; padding: 10px;">Error loading templates</div>';
  }
}

async function applyTemplate(templateName) {
  try {
    await initializeHTMLStorage();
    const templates = await htmlStorage.getTemplates();
    const template = templates.find(t => t.name === templateName);
    
    if (!template) {
      showStatus('Template not found', 'error');
      return;
    }
    
    // Apply the template options to the checkboxes
    Object.entries(template.options).forEach(([key, value]) => {
      const checkbox = document.getElementById(key);
      if (checkbox && checkbox.type === 'checkbox') {
        checkbox.checked = value;
      }
    });
    
    // Update the stripper options
    updateStripperOptions();
    
    showStatus(`Applied template: ${templateName}`, 'success');
  } catch (error) {
    console.error('Error applying template:', error);
    showStatus('Error applying template', 'error');
  }
}

async function deleteTemplate(templateName) {
  try {
    await initializeHTMLStorage();
    await htmlStorage.deleteTemplate(templateName);
    await loadTemplatesList();
    await loadTemplatesIntoDropdown(); // Refresh harvester dropdown too
    await syncTemplatesToChromeStorage(); // Sync after deletion
    showStatus(`Deleted template: ${templateName}`, 'success');
  } catch (error) {
    console.error('Error deleting template:', error);
    showStatus('Error deleting template', 'error');
  }
}

async function toggleTemplateStatus(templateName, newActiveStatus) {
  try {
    await initializeHTMLStorage();
    const templates = await htmlStorage.getTemplates();
    const template = templates.find(t => t.name === templateName);
    
    if (!template) {
      showStatus('Template not found', 'error');
      return;
    }
    
    // Update the template's active status
    template.isActive = newActiveStatus;
    
    // Delete and re-save the template (since we don't have an update method)
    await htmlStorage.deleteTemplate(templateName);
    await htmlStorage.saveTemplate(template);
    
    // Sync to Chrome storage
    await syncTemplatesToChromeStorage();
    
    // Refresh the display
    await loadTemplatesList();
    
    showStatus(`Template "${templateName}" is now ${newActiveStatus ? 'active' : 'inactive'}`, 'success');
  } catch (error) {
    console.error('Error toggling template status:', error);
    showStatus('Error updating template status', 'error');
  }
}

function openTemplateManager() {
  // Open a new window with template management interface
  const managerWindow = window.open('', 'TemplateManager', 'width=800,height=600');
  managerWindow.document.write(`
    <html>
      <head>
        <title>Template Manager</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
          }
          h1 { color: #333; }
          .info { 
            background: #e3f2fd; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .template-info {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          pre {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>Template Manager</h1>
        <div class="info">
          <h3>About Templates</h3>
          <p>Templates save your HTML stripping settings so you can quickly apply them to different pages.</p>
          <p>Templates created in the Post Preview tab are automatically available in the HTML Harvester for auto-harvesting.</p>
        </div>
        
        <div class="template-info">
          <h3>How to Use Templates</h3>
          <ol>
            <li><strong>Create a Template:</strong> Configure stripping options in Post Preview, then click "Save as Template"</li>
            <li><strong>Apply a Template:</strong> Click "Apply" next to any saved template to use its settings</li>
            <li><strong>Auto-Harvesting:</strong> Select a default template in HTML Harvester settings</li>
            <li><strong>Delete Templates:</strong> Click "Delete" to remove unwanted templates</li>
          </ol>
        </div>
        
        <div class="template-info">
          <h3>Template Storage</h3>
          <p>Templates are stored in IndexedDB and include:</p>
          <ul>
            <li>All stripping options (scripts, styles, navigation, etc.)</li>
            <li>Content preservation settings</li>
            <li>Custom name and description</li>
            <li>Creation timestamp</li>
          </ul>
        </div>
        
        <div class="template-info">
          <h3>Best Practices</h3>
          <ul>
            <li>Create different templates for different types of pages (articles, profiles, listings)</li>
            <li>Test templates on sample pages before using for auto-harvesting</li>
            <li>Use descriptive names to identify templates easily</li>
            <li>Export important templates as JSON for backup</li>
          </ul>
        </div>
      </body>
    </html>
  `);
}

// Harvester Auto-Browse Functions
async function startHarvesterAutoBrowse() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'startHarvesterAutoBrowse' });
    
    if (response.success) {
      showStatus(`Started harvester auto-browse with ${response.urlCount} URLs`, 'success');
      updateHarvesterAutoBrowseUI();
    } else {
      showStatus(response.message || 'Failed to start harvester auto-browse', 'error');
    }
  } catch (error) {
    console.error('Error starting harvester auto-browse:', error);
    showStatus('Error starting harvester auto-browse', 'error');
  }
}

async function stopHarvesterAutoBrowse() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'stopHarvesterAutoBrowse' });
    
    if (response.success) {
      showStatus('Stopped harvester auto-browse', 'success');
      updateHarvesterAutoBrowseUI();
    }
  } catch (error) {
    console.error('Error stopping harvester auto-browse:', error);
    showStatus('Error stopping harvester auto-browse', 'error');
  }
}

async function previewHarvesterUrls() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getHarvesterTargetUrls' });
    
    if (response.urls && response.urls.length > 0) {
      // Create a preview window
      const previewWindow = window.open('', 'HarvesterURLsPreview', 'width=800,height=600');
      previewWindow.document.write(`
        <html>
          <head>
            <title>Harvester Target URLs</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              .url-list { 
                max-height: 500px; 
                overflow-y: auto; 
                border: 1px solid #ddd; 
                padding: 10px;
                background: #f5f5f5;
              }
              .url-item { 
                padding: 5px; 
                border-bottom: 1px solid #eee; 
                font-family: monospace;
                font-size: 12px;
              }
              .summary { 
                background: #e3f2fd; 
                padding: 15px; 
                border-radius: 5px; 
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <h1>URLs Matching Active Template Patterns</h1>
            <div class="summary">
              <strong>Total URLs: ${response.count}</strong><br>
              These URLs match the patterns defined in your active templates.
            </div>
            <div class="url-list">
              ${response.urls.map(url => `<div class="url-item">${url}</div>`).join('')}
            </div>
          </body>
        </html>
      `);
    } else {
      showStatus('No URLs found matching active template patterns', 'info');
    }
  } catch (error) {
    console.error('Error previewing harvester URLs:', error);
    showStatus('Error loading harvester URLs', 'error');
  }
}

async function updateHarvesterAutoBrowseUI() {
  try {
    // Get harvester state
    const state = await chrome.runtime.sendMessage({ action: 'getHarvesterAutoBrowseState' });
    
    // Update status
    const statusElement = document.getElementById('harvesterStatus');
    const startBtn = document.getElementById('startHarvesterAutoBrowse');
    const stopBtn = document.getElementById('stopHarvesterAutoBrowse');
    
    if (state.enabled) {
      statusElement.textContent = 'Running';
      statusElement.style.color = '#4CAF50';
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      statusElement.textContent = 'Not Running';
      statusElement.style.color = '#999';
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
    
    // Update progress
    document.getElementById('harvesterProgress').textContent = 
      `${state.currentIndex}/${state.queuedCount}`;
    
    // Update stats
    document.getElementById('harvesterSuccessCount').textContent = 
      state.stats.successfulHarvests || 0;
    document.getElementById('harvesterFailedCount').textContent = 
      state.stats.failedHarvests || 0;
    document.getElementById('harvesterPendingCount').textContent = 
      state.queuedCount - state.currentIndex || 0;
    
    // Get matching URL count
    const urlResponse = await chrome.runtime.sendMessage({ action: 'getHarvesterTargetUrls' });
    document.getElementById('matchingUrlCount').textContent = urlResponse.count || 0;
    
    // Update active templates list
    await updateActiveTemplatesList();
    
  } catch (error) {
    console.error('Error updating harvester UI:', error);
  }
}

async function updateActiveTemplatesList() {
  try {
    await initializeHTMLStorage();
    const templates = await htmlStorage.getTemplates();
    const activeTemplates = templates.filter(t => t.isActive !== false && t.urlPatterns && t.urlPatterns.length > 0);
    
    const listElement = document.getElementById('activeTemplatesList');
    
    if (activeTemplates.length === 0) {
      listElement.innerHTML = '<span style="color: #999;">No active templates with URL patterns</span>';
    } else {
      listElement.innerHTML = activeTemplates.map(t => 
        `<div style="margin: 4px 0;">
          <strong>${t.name}:</strong> 
          <code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-size: 11px;">
            ${t.urlPatterns.join(', ')}
          </code>
        </div>`
      ).join('');
    }
  } catch (error) {
    console.error('Error loading active templates:', error);
  }
}

function listenForHarvesterUpdates() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'harvesterAutoBrowseUpdate') {
      updateHarvesterAutoBrowseUI();
      showStatus(`Harvesting: ${message.currentUrl}`, 'info');
    } else if (message.action === 'harvesterAutoBrowseComplete') {
      updateHarvesterAutoBrowseUI();
      showStatus('Harvester auto-browse completed!', 'success');
    }
  });
}

async function debugHarvesterUrls() {
  try {
    // Get collected data to check what URLs we have
    const response = await chrome.runtime.sendMessage({ action: 'getData' });
    const companies = response.companies || [];
    const allUrls = companies.map(c => c.url);
    
    // Get templates
    await initializeHTMLStorage();
    const templates = await htmlStorage.getTemplates();
    
    // Create debug window
    const debugWindow = window.open('', 'HarvesterDebug', 'width=1000,height=700');
    
    let debugHtml = `
      <html>
        <head>
          <title>Harvester Debug Information</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .template { background: #f5f5f5; margin: 10px 0; padding: 10px; border-radius: 3px; }
            .url-list { max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; }
            .url-item { padding: 2px; border-bottom: 1px solid #eee; }
            .active { background: #e8f5e8; }
            .inactive { background: #f5f5f5; color: #999; }
            pre { background: #f8f8f8; padding: 10px; border-radius: 3px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>Harvester Debug Information</h1>
          
          <div class="section">
            <h2>Collected URLs (${allUrls.length} total)</h2>
            <div class="url-list">
              ${allUrls.slice(0, 20).map(url => `<div class="url-item">${url}</div>`).join('')}
              ${allUrls.length > 20 ? `<div class="url-item">... and ${allUrls.length - 20} more</div>` : ''}
            </div>
          </div>
          
          <div class="section">
            <h2>Templates (${templates.length} total)</h2>
    `;
    
    templates.forEach(template => {
      const isActive = template.isActive !== false;
      const hasPatterns = template.urlPatterns && template.urlPatterns.length > 0;
      
      debugHtml += `
        <div class="template ${isActive ? 'active' : 'inactive'}">
          <strong>${template.name}</strong> - ${isActive ? 'ACTIVE' : 'INACTIVE'}
          ${hasPatterns ? '' : ' (NO PATTERNS)'}
          <br>
          Patterns: ${template.urlPatterns ? template.urlPatterns.join(', ') : 'None'}
        </div>
      `;
    });
    
    debugHtml += `
          </div>
          
          <div class="section">
            <h2>Pattern Testing</h2>
            <p>Test a few URLs against your active template patterns:</p>
            <div id="patternTests"></div>
            <script>
              // Test pattern matching
              const testUrls = ${JSON.stringify(allUrls.slice(0, 10))};
              const templates = ${JSON.stringify(templates.filter(t => t.isActive !== false && t.urlPatterns))};
              
              let testsHtml = '';
              
              testUrls.forEach(url => {
                testsHtml += '<h4>' + url + '</h4>';
                let matched = false;
                
                templates.forEach(template => {
                  if (template.urlPatterns) {
                    template.urlPatterns.forEach(pattern => {
                      // Simple pattern test (not perfect but gives an idea)
                      let regexPattern = pattern
                        .replace(/\\\\./g, '\\\\.')
                        .replace(/\\\\//g, '\\\\/')
                        .replace(/\\{domain\\}/g, '[^/]+')
                        .replace(/\\{id\\}/g, '\\\\d+')
                        .replace(/\\{slug\\}/g, '[a-z0-9-_]+')
                        .replace(/\\{\\*\\}/g, '[^/]+');
                        
                      try {
                        const regex = new RegExp('^' + regexPattern + '/?$', 'i');
                        const matches = regex.test(url);
                        
                        testsHtml += '<div style="margin-left: 20px;">';
                        testsHtml += (matches ? '✅' : '❌') + ' ' + template.name + ': ' + pattern;
                        testsHtml += '<br><small>Regex: ^' + regexPattern + '/?$</small>';
                        testsHtml += '</div>';
                        
                        if (matches) matched = true;
                      } catch (e) {
                        testsHtml += '<div style="margin-left: 20px; color: red;">❌ ' + template.name + ': ERROR - ' + e.message + '</div>';
                      }
                    });
                  }
                });
                
                if (!matched) {
                  testsHtml += '<div style="color: #999; margin-left: 20px;">No templates match this URL</div>';
                }
                testsHtml += '<br>';
              });
              
              document.getElementById('patternTests').innerHTML = testsHtml;
            </script>
          </div>
          
          <div class="section">
            <h2>Troubleshooting Steps</h2>
            <ol>
              <li>Check if you have active templates with URL patterns</li>
              <li>Verify your URL patterns match the collected URLs</li>
              <li>Make sure your Sortlist template is marked as Active</li>
              <li>Check the browser console for detailed matching logs</li>
              <li>Try making your patterns more generic (e.g., use {*} instead of {slug})</li>
            </ol>
          </div>
        </body>
      </html>
    `;
    
    debugWindow.document.write(debugHtml);
    
  } catch (error) {
    console.error('Error creating debug info:', error);
    showStatus('Error creating debug info', 'error');
  }
}

