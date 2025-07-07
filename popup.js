// Popup script
let autoBrowseInterval = null;
let claudeBridgeConnected = false;

document.addEventListener('DOMContentLoaded', () => {
  // Get current data
  chrome.runtime.sendMessage({ action: 'getData' }, (data) => {
    updateUI(data);
  });
  
  // Get auto-browse state
  updateAutoBrowseState();
  
  // Set up auto-browse controls
  setupAutoBrowse();
  
  // Set up Claude Bridge controls
  setupClaudeBridge();
  
  // Copy URLs button
  document.getElementById('copyUrls').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'getData' }, (data) => {
      const urls = data.companies.map(c => c.url).join('\n');
      navigator.clipboard.writeText(urls).then(() => {
        showStatus('URLs copied to clipboard!', 'success');
      });
    });
  });
  
  // Export data button
  document.getElementById('exportData').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'exportData' }, (exportData) => {
      // Add URLs text format
      exportData.urls_text = exportData.companies.map(c => c.url).join('\n');
      
      // Create blob and download using Chrome downloads API
      try {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        
        const reader = new FileReader();
        reader.onload = function() {
          chrome.downloads.download({
            url: reader.result,
            filename: `sortlist_companies_${new Date().toISOString().split('T')[0]}.json`
          });
        };
        reader.readAsDataURL(blob);
        
        showStatus('Data exported!', 'success');
      } catch (error) {
        console.error('Export error:', error);
        showStatus('Export failed', 'error');
      }
    });
  });
  
  // Clear data button
  document.getElementById('clearData').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all collected data?')) {
      chrome.runtime.sendMessage({ action: 'clearData' }, () => {
        updateUI({ companies: [], pages: [] });
        showStatus('All data cleared!', 'success');
      });
    }
  });
});

// Auto-browse functionality
function setupAutoBrowse() {
  // Start button
  document.getElementById('startAutoBrowse').addEventListener('click', () => {
    const interval = parseInt(document.getElementById('browseInterval').value) * 1000;
    
    chrome.runtime.sendMessage({
      action: 'startAutoBrowse',
      settings: { interval }
    }, () => {
      updateAutoBrowseUI(true);
      showStatus('Auto-browse started!', 'success');
      updateAutoBrowseState();
    });
  });
  
  // Stop button
  document.getElementById('stopAutoBrowse').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopAutoBrowse' }, () => {
      updateAutoBrowseUI(false);
      showStatus('Auto-browse stopped!', 'success');
      updateAutoBrowseState();
    });
  });
  
  // Update auto-browse state every second
  autoBrowseInterval = setInterval(() => {
    updateAutoBrowseState();
  }, 1000);
}

function updateAutoBrowseState() {
  chrome.runtime.sendMessage({ action: 'getAutoBrowseState' }, (state) => {
    if (state) {
      // Update counts
      document.getElementById('unvisitedCount').textContent = state.unvisitedCount || 0;
      document.getElementById('visitedCount').textContent = state.visitedCount || 0;
      
      // Update UI
      updateAutoBrowseUI(state.enabled);
      
      // Update progress bar
      const total = state.totalUrls || 0;
      const visited = state.visitedCount || 0;
      if (total > 0) {
        const percentage = (visited / total) * 100;
        document.getElementById('progressBar').style.width = `${percentage}%`;
      }
    }
  });
}

function updateAutoBrowseUI(isRunning) {
  const startBtn = document.getElementById('startAutoBrowse');
  const stopBtn = document.getElementById('stopAutoBrowse');
  const statusEl = document.getElementById('autoBrowseStatus');
  const currentUrlEl = document.getElementById('currentUrl');
  
  if (isRunning) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    statusEl.className = 'status-indicator running';
    statusEl.textContent = '▶️ Running';
    currentUrlEl.style.display = 'block';
  } else {
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    statusEl.className = 'status-indicator stopped';
    statusEl.textContent = '⏹️ Stopped';
    currentUrlEl.style.display = 'none';
  }
}

// Listen for auto-browse updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autoBrowseUpdate') {
    const urlText = document.getElementById('currentUrlText');
    if (urlText && message.currentUrl) {
      urlText.textContent = message.currentUrl.length > 50 ? 
        message.currentUrl.substring(0, 50) + '...' : 
        message.currentUrl;
    }
  } else if (message.action === 'dataUpdated') {
    // Refresh data when new companies are found
    chrome.runtime.sendMessage({ action: 'getData' }, (data) => {
      updateUI(data);
    });
  }
});

function updateUI(data) {
  // Update counts
  document.getElementById('companyCount').textContent = data.companies.length;
  document.getElementById('pageCount').textContent = data.pages.length;
  
  // Update companies list
  const listContainer = document.getElementById('companiesList');
  
  if (data.companies.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>No companies found yet.</p>
        <p>Browse Sortlist to collect URLs!</p>
      </div>
    `;
  } else {
    listContainer.innerHTML = data.companies
      .slice(-20) // Show last 20
      .reverse()
      .map(company => `
        <div class="company-item">
          <div class="company-name">${company.name || 'Unknown Company'}</div>
          <div class="company-url">${company.url}</div>
        </div>
      `)
      .join('');
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// Clean up interval when popup closes
window.addEventListener('unload', () => {
  if (autoBrowseInterval) {
    clearInterval(autoBrowseInterval);
  }
});

// ============= Claude Bridge Functions =============

function setupClaudeBridge() {
  // Check initial connection status
  updateClaudeStatus();
  
  // Connect button
  document.getElementById('connectClaude').addEventListener('click', () => {
    if (!claudeBridgeConnected) {
      chrome.runtime.sendMessage({ action: 'connectToClaude' }, (response) => {
        if (response.success) {
          showStatus('Connecting to Claude Bridge...', 'success');
          // Status will be updated via message listener
        }
      });
    } else {
      // Disconnect
      chrome.runtime.sendMessage({ action: 'disconnectFromClaude' }, (response) => {
        if (response.success) {
          showStatus('Disconnected from Claude Bridge', 'success');
          updateClaudeStatus();
        }
      });
    }
  });
  
  // Analyze button
  document.getElementById('analyzeClaude').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'getData' }, (data) => {
      if (data.companies.length === 0) {
        showStatus('No data to analyze', 'error');
        return;
      }
      
      // Show loading state
      const analysisContent = document.getElementById('analysisContent');
      analysisContent.textContent = 'Analyzing data with Claude...';
      document.getElementById('claudeResults').style.display = 'block';
      
      // Send to Claude
      chrome.runtime.sendMessage({
        action: 'sendToClaude',
        data: {
          companies: data.companies.slice(-50), // Send last 50 companies
          pageInfo: data.pages[data.pages.length - 1] || null
        }
      }, (response) => {
        if (response.error) {
          analysisContent.textContent = 'Error: ' + response.error;
          showStatus('Analysis failed', 'error');
        } else {
          showStatus('Analysis sent to Claude', 'success');
        }
      });
    });
  });
}

function updateClaudeStatus() {
  chrome.runtime.sendMessage({ action: 'getClaudeBridgeStatus' }, (status) => {
    claudeBridgeConnected = status.connected;
    
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const connectBtn = document.getElementById('connectClaude');
    const analyzeBtn = document.getElementById('analyzeClaude');
    
    if (claudeBridgeConnected) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected';
      connectBtn.textContent = 'Disconnect';
      connectBtn.classList.add('connected');
      analyzeBtn.style.display = 'block';
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Disconnected';
      connectBtn.textContent = 'Connect to Claude';
      connectBtn.classList.remove('connected');
      analyzeBtn.style.display = 'none';
      document.getElementById('claudeResults').style.display = 'none';
    }
  });
}

// Listen for Claude Bridge status updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'claudeBridgeStatus') {
    claudeBridgeConnected = message.connected;
    updateClaudeStatus();
  } else if (message.action === 'claudeAnalysisComplete') {
    // Display analysis results
    const analysisContent = document.getElementById('analysisContent');
    analysisContent.textContent = message.data.result;
    document.getElementById('claudeResults').style.display = 'block';
    showStatus('Analysis complete!', 'success');
  }
});