# HTML vers Markdown — Extension Chrome

Website: https://www.ingesta.net

Convert web articles, selections, or full pages into clean Markdown instantly with this Manifest V3 Chrome Extension powered by Turndown.js.

---

## Features

- **Instant HTML to Markdown Conversion**: Fast conversion of any article, webpage, or selected text.
- **3 Extraction Modes**:
  - **Article Only**: Automatically strips scripts, ads, footers, and headers to extract main content.
  - **Selection**: Converts only highlighted text on the page.
  - **Full Page**: Captures the entire page layout.
- **Powered by Turndown.js & GFM**: Full support for GitHub Flavored Markdown (Tables, Task Lists, Strikethrough).
- **Customizable Formatting**:
  - ATX (`#`) vs Setext (`===`) Headings
  - Fenced (` ``` `) vs Indented Code Blocks
  - Custom Bullet List Markers (`-`, `*`, `+`)
  - Horizontal Rule markers (`---`, `***`, `___`)
  - Image inclusion toggles
- **Formatted Live Preview**: Switch between raw Markdown text and rendered preview.
- **One-Click Actions**: Quick copy to clipboard & instant `.md` file download.

---

## Project Structure

```
html-to-markdown-extension/
├── manifest.json            # Extension Manifest V3 configuration
├── package.json             # Build commands and Turndown dependencies
├── LICENSE                  # MIT License
├── CONTRIBUTING.md          # Guide for open-source contributors
├── README.md                # Documentation & Setup guide
├── icons/                   # Extension icons (16, 48, 128px)
├── lib/
│   └── turndown-bundle.js   # Bundled Turndown.js + GFM Plugin
├── scripts/
│   └── generate-icons.js    # Canvas icon builder
└── src/
    ├── background/
    │   └── background.js    # Context menus & storage defaults
    ├── content/
    │   └── content.js       # HTML extraction & sanitization script
    ├── lib/
    │   └── turndown-entry.js# ESBuild entry point
    └── popup/
        ├── popup.html       # Extension popup UI structure
        ├── popup.css        # Popup styling
        └── popup.js         # Core popup controller logic
```

---

## How to Install and Test Locally in Chrome

1. **Clone or Download this repository** to your local machine:
   ```bash
   git clone https://github.com/ingesta-net/html-to-markdown
   ```

2. **Install dependencies and build the extension bundle**:
   ```bash
   cd html-to-markdown-extension
   npm install
   npm run build
   ```

3. **Load the Extension into Chrome**:
   - Open Google Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** toggle in the top-right corner.
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `html-to-markdown-extension` directory.

4. **Pin and Use**:
   - Click the extensions puzzle piece icon in Chrome's toolbar and pin **HTML to Markdown**.
   - Click the extension icon on any webpage to convert it to Markdown!



## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on submitting pull requests.

## License

This project is open-source under the [MIT License](LICENSE).
