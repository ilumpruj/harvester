// Dashboard functionality
let autoRefresh = true;
let refreshInterval;
let collectionChart;
let allCompanies = [];
let autoBrowseState = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  initializeChart();
  loadData();
  setupEventListeners();
  setupTabs();
  setupAutoBrowse();
  setupCollections();
  setupIntelligence();
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

// Render companies table
function renderCompaniesTable(companies) {
  const tbody = document.getElementById('companiesBody');
  const emptyState = document.getElementById('emptyState');
  
  if (companies.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Sort by most recent first
  const sortedCompanies = [...companies].reverse();
  
  tbody.innerHTML = sortedCompanies.map(company => `
    <tr>
      <td class="company-name">${company.name || 'Unknown'}</td>
      <td>
        <a href="${company.url}" target="_blank" class="company-url">
          ${company.url.length > 50 ? company.url.substr(0, 50) + '...' : company.url}
        </a>
      </td>
      <td class="timestamp">${new Date(company.extracted_at).toLocaleString()}</td>
      <td>
        <button class="btn-secondary btn-copy-url" style="padding: 5px 10px; font-size: 12px;" 
                data-url="${company.url}">
          Copy
        </button>
      </td>
    </tr>
  `).join('');
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

// Make copyUrl available globally
window.copyUrl = copyUrl;