# Quick Start Guide

Get the Nimbalyst Web Clipper extension up and running in 5 minutes.

## Step 1: Build the Extension

```bash
cd packages/browser-extension
pnpm install
pnpm run build
```

This creates a `dist/` directory with the packaged extension.

## Step 2: Load in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`

2. Enable **Developer mode** (toggle switch in top-right corner)

3. Click **"Load unpacked"** button

4. Navigate to and select: `packages/browser-extension/dist`

5. The Nimbalyst Web Clipper icon should appear in your toolbar

## Step 3: Try It Out

The desktop app must already be running. Clipping uses its local HTTP endpoint, not a `nimbalyst://` URL handler. See the [current user guide](./README.md) for usage and troubleshooting; the older implementation summary records a previous design.

### Test the Extension UI

1. Navigate to any website (try Wikipedia)
2. Click the Nimbalyst extension icon in your toolbar
3. You should see:
   - "Clip Page" button
   - "Clip Selection" button (enabled if text is selected)

### Test the Context Menu

1. Right-click anywhere on a web page
2. You should see Nimbalyst options:
   - "Clip page to Nimbalyst"
   - "Clip selection to Nimbalyst" (if text is selected)

### What Happens When You Click?

When you click to clip:
1. Extension converts the page to markdown
2. Sends JSON to `http://127.0.0.1:3456/clip`, trying ports through 3465 when a connection fails
3. Reports the desktop response; the desktop handles saving the clip in the workspace

If no desktop instance responds, the popup reports a connection error. Do not register or replace a URL handler to fix this HTTP connection. Browser-to-desktop operation still needs to be tested in the intended environment; this guide is not a test result.

## Debugging

### View Extension Console

**Background Service Worker**:
1. Go to `chrome://extensions/`
2. Find "Nimbalyst Web Clipper"
3. Click "Service worker" link
4. Console opens with background script logs

**Content Script**:
1. Open any web page
2. Open DevTools (F12)
3. Look for "Nimbalyst Web Clipper content script loaded" message

**Popup**:
1. Right-click extension icon
2. Select "Inspect popup"
3. DevTools opens for popup

### Common Issues

**Extension doesn't appear**:
- Make sure Developer mode is enabled
- Try clicking the puzzle piece icon in Chrome toolbar
- Pin the extension to make it always visible

**Build errors**:
- Make sure you ran `pnpm install` first
- Check that Node.js 24 is installed (see `.nvmrc`)
- Try `pnpm run clean && pnpm run build`

**Context menus don't appear**:
- Reload the extension in `chrome://extensions/`
- Try refreshing the web page

## Next Steps

1. **For developers**: See `DEVELOPMENT.md` for detailed development guide

2. **For testing**: See `DEVELOPMENT.md` Testing section for comprehensive test cases

3. **For Nimbalyst integration**: See the HTTP architecture and prerequisites in [README.md](./README.md)

## File Structure

```
packages/browser-extension/
├── dist/                    # Built extension (load this in Chrome)
├── src/
│   ├── background/         # Service worker
│   ├── content/            # Content script
│   └── popup/              # Popup UI
├── icons/                  # Included PNG icons (16/32/48/128px)
├── manifest.json           # Extension manifest
├── README.md              # Full user documentation
├── DEVELOPMENT.md         # Developer guide
└── QUICK_START.md         # This file
```

## Getting Help

- Check `README.md` for user documentation
- Check `DEVELOPMENT.md` for developer documentation
- Check `IMPLEMENTATION_SUMMARY.md` for technical details
- Check browser console for error messages
- Check extension service worker console for background errors

## License

Part of the Nimbalyst project. See main repository for license.
