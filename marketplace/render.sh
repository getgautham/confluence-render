#!/bin/sh
# Renders the Marketplace listing images from src/ with headless Chrome. Run from this folder.
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC="file://$(cd src && pwd)"
shot() { "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --default-background-color=00000000 \
  --window-size="$2" --screenshot="$PWD/$1" "$SRC/$3" >/dev/null 2>&1; }
shot logo-144.png 144,144 logo.html
shot banner-1120x548.png 1120,548 banner.html
# Highlights: 1840x900, plus the 580x330 crop. Source shots are already cropped below Confluence's top bar; the author byline was hidden.
shot highlight-1-markdown.png 1840,900 "highlight.html?shot=shot-markdown.jpg&x=195&y=0&w=1090&h=708&W=1840&H=900"
shot highlight-1-markdown-crop.png 580,330 "highlight.html?shot=shot-markdown.jpg&x=360&y=226&w=725&h=412&s=0.8&W=580&H=330&pad=-1"
shot highlight-2-dashboard.png 1840,900 "highlight.html?shot=shot-dashboard.jpg&x=195&y=0&w=1090&h=708&W=1840&H=900"
shot highlight-2-dashboard-crop.png 580,330 "highlight.html?shot=shot-dashboard.jpg&x=380&y=26&w=725&h=412&s=0.8&W=580&H=330&pad=-1"
shot highlight-3-onepager.png 1840,900 "highlight.html?shot=shot-onepager.jpg&x=195&y=0&w=1090&h=708&W=1840&H=900"
shot highlight-3-onepager-crop.png 580,330 "highlight.html?shot=shot-onepager.jpg&x=385&y=196&w=730&h=415&s=0.7945&W=580&H=330&pad=-1"
