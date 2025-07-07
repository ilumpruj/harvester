#!/bin/bash

# Script to enable enhanced extraction in the Chrome extension

echo "🚀 Enabling Enhanced Extraction for Chrome Extension"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the chrome_extension directory."
    exit 1
fi

# Backup original content.js if not already backed up
if [ ! -f "content-original-backup.js" ]; then
    echo "📦 Backing up original content.js to content-original-backup.js..."
    cp content.js content-original-backup.js
else
    echo "✓ Backup already exists at content-original-backup.js"
fi

# Replace content.js with enhanced version
echo "🔄 Replacing content.js with enhanced version..."
cp content-enhanced.js content.js

echo ""
echo "✅ Enhanced extraction enabled!"
echo ""
echo "Next steps:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Find 'Web Data Collector' and click the refresh button"
echo "3. Visit a Sortlist page to test the enhanced extraction"
echo ""
echo "To revert to original extraction, run:"
echo "  cp content-original-backup.js content.js"
echo ""
echo "Check the console for extraction quality scores and validation info!"