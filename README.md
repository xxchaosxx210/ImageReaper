# ImageReaper

ImageReaper is a Chrome Extension (MV3) that scans web pages for supported image host links (e.g. ImageBam, Pixhost, etc.), resolves them to their direct image URLs, and downloads them to your computer with customizable save paths and filename prefixes.

## ✨ Features

- **Popup UI**  
  - Simple "Scan Page" button to start scanning the active tab.  
  - Opens a dedicated Results page with found links.

- **Results Page**  
  - Displays all viewer links from the scanned page.  
  - Resolves links from supported hosts into direct image URLs.  
  - Downloads resolved images directly using `chrome.downloads.download`.  
  - Customizable download folder and filename prefix.  
  - Shows failures clearly with a ⚠️ label and styling.

- **Host-specific Resolvers**  
  - **Pixhost**: extracts direct image from page.  
  - **ImageBam**: handles interstitials by setting cookies via `background.js`.  
  - Fallback to `og:image` metadata when available.

- **Background Worker**  
  - Sets `nsfw_inter=1` cookie for ImageBam when interstitials are detected.  
  - Ensures resolvers can fetch real image pages.

- **Options Page**  
  - Configure default save folder and filename prefix.  
  - Settings stored in `chrome.storage.local`.

## 📂 Project Structure

