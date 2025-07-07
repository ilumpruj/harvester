#!/usr/bin/env python3

# Simple script to create icon placeholders
import json

# Create simple SVG icons
svg_template = '''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#4CAF50" rx="20"/>
  <circle cx="50" cy="35" r="8" fill="white"/>
  <circle cx="30" cy="65" r="8" fill="white"/>
  <circle cx="70" cy="65" r="8" fill="white"/>
  <line x1="50" y1="35" x2="30" y2="65" stroke="white" stroke-width="3"/>
  <line x1="50" y1="35" x2="70" y2="65" stroke="white" stroke-width="3"/>
  <line x1="30" y1="65" x2="70" y2="65" stroke="white" stroke-width="3"/>
</svg>'''

# Create icon files
sizes = [16, 48, 128]
for size in sizes:
    with open(f'icon{size}.png', 'w') as f:
        f.write(f"<!-- Placeholder for {size}x{size} icon -->\n")
        f.write(svg_template.format(size=size))

print("Icon placeholders created!")
print("\nTo use the extension:")
print("1. Open Chrome and go to chrome://extensions/")
print("2. Enable 'Developer mode' (top right)")
print("3. Click 'Load unpacked'")
print("4. Select the chrome_extension folder")
print("\nThe extension will then be active!")