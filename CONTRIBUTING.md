# Contributing to HTML to Markdown Extension

Thank you for considering contributing to this open-source project! 

## How to Contribute

1. **Fork the Repository**: Click the "Fork" button on the top right of the GitHub repository.
2. **Clone your Fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/html-to-markdown-extension.git
   cd html-to-markdown-extension
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Make your changes**:
   - Popup UI logic: `src/popup/`
   - Content extraction script: `src/content/`
   - Background service worker: `src/background/`
5. **Build the extension**:
   ```bash
   npm run build
   ```
6. **Test locally in Chrome**:
   - Go to `chrome://extensions/`
   - Enable **Developer Mode**
   - Click **Load unpacked** and select this directory.
7. **Commit & Push**:
   ```bash
   git add .
   git commit -m "feat: describe your change"
   git push origin main
   ```
8. **Open a Pull Request**: Submit a PR to the main repository explaining your improvements!

## Guidelines
- Keep code clean and well-documented.
- Maintain existing code styles and standard formatting.
- Ensure all permissions in `manifest.json` remain minimal and privacy-focused.
