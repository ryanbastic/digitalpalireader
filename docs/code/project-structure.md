# Project Structure

This guide explains what each folder and important file does in the Digital Pali Reader.

## Root Directory Overview

```
digitalpalireader/
├── _dprhtml/          # Main application source code
├── public/            # Static assets (images, data files)
├── sa/                # Sanskrit/Pali analysis data (dictionaries)
├── docs/              # Documentation
├── coding-conventions/ # Development guidelines
├── components/        # Future component structure (currently empty)
├── index.html         # Main HTML entry point
├── package.json       # Project dependencies
├── vite.config.js     # Build configuration
├── Dockerfile         # Container deployment
└── Makefile           # Docker build commands
```

## Detailed Breakdown

### `_dprhtml/` - Main Application Code

This is where most of the application code lives.

```
_dprhtml/
├── js/                # All JavaScript code
│   ├── entry.js       # ** START HERE ** Main entry point
│   ├── main.js        # Application initialization
│   ├── main-core.js   # Core UI setup
│   ├── dprviewmodel.js # UI state management (Knockout.js)
│   ├── deps.js        # jQuery & Knockout setup
│   ├── legacy/        # Original XUL-era code (57 files)
│   │   └── web/       # Web-specific adaptations
│   ├── features/      # Modern feature modules
│   │   ├── navigation/
│   │   ├── search/
│   │   ├── dictionary/
│   │   ├── settings-dialog/
│   │   └── ...
│   └── mock-server/   # Testing utilities
├── css/               # Stylesheets
│   ├── index.css      # Main styles
│   ├── styles.css     # Application styles
│   └── font-styles.css # Typography
├── fonts/             # Custom fonts
├── dpr_globals.js     # Global configuration
├── help.html          # Help documentation
└── sw.js              # Service Worker (offline support)
```

#### Key Files to Understand First

1. **`entry.js`** - The application starts here
   - Imports all CSS files
   - Loads all JavaScript modules
   - This is what Vite builds from

2. **`main.js`** - Initialization logic
   - Sets up global handlers
   - Binds Knockout view model
   - Registers event listeners

3. **`dprviewmodel.js`** - UI State Management
   - Controls what's visible on screen
   - Manages tabs and sidebars
   - Handles URL parameters

4. **`legacy/`** folder - The core functionality
   - Don't be intimidated by "legacy"
   - These files contain the actual features
   - See [Legacy Modules](#legacy-modules-explained) below

### `public/` - Static Assets

```
public/
├── tipitaka/          # Pali canon text files (XML)
├── images/            # Icons and graphics
├── etc/               # Additional resources
├── en/                # English localization
└── favicon.png        # Browser icon
```

These files are served directly without processing.

### `sa/` - Dictionary and Analysis Data

```
sa/
├── dict/              # Dictionary files (~90MB)
│   ├── A-41.xml       # Capital letter entries
│   ├── a-61.xml       # Lowercase entries
│   └── ...            # Alphabetically organized
└── roots/             # Word root analysis data
```

This is the scholarly content that makes DPR useful.

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Lists all dependencies and npm scripts |
| `pnpm-lock.yaml` | Locks exact dependency versions |
| `vite.config.js` | Build tool configuration |
| `biome.json` | Code linting/formatting rules |
| `vitest.setup.js` | Test environment setup |
| `manifest.webmanifest` | Progressive Web App settings |
| `Dockerfile` | Container build instructions |
| `Makefile` | Docker build shortcuts |

## Legacy Modules Explained

The `_dprhtml/js/legacy/` folder contains 57 JavaScript files from when DPR was a Firefox extension. These are organized by function:

### Analysis Modules
- `analysis.js` - Main text analysis
- `declensions.js` - Noun/adjective forms
- `conjugations.js` - Verb forms
- `inflect.js` - Word inflection logic

### Navigation Modules
- `navigation.js` - Text navigation system
- `navpar.js` - Navigation parameters
- `navmove.js` - Movement between texts
- `history.js` - Navigation history

### Search Modules
- `search.js` - Full-text search
- `search_history.js` - Search history
- `search_utils.js` - Search utilities

### Dictionary Modules
- `dict.js` - Dictionary lookups
- `dict_xml.js` - XML dictionary parsing
- `inflections.js` - Word form recognition

### UI Modules
- `sidebar.js` - Sidebar functionality
- `dialogs.js` - Popup dialogs
- `output.js` - Text display
- `format.js` - Text formatting

### Data Modules
- `xml.js` - XML parsing
- `prefload.js` - Data preloading
- `translit.js` - Transliteration

## Features Directory Structure

The `_dprhtml/js/features/` folder contains modern, modular code:

```
features/
├── index.js           # Exports all features
├── navigation/        # Text navigation UI
│   ├── index.js
│   ├── tab-content.js
│   └── ...
├── search/            # Search interface
├── dictionary/        # Dictionary interface
├── settings-dialog/   # User preferences
├── bottom-pane/       # Information panel
├── landing-page/      # Welcome screen
├── installation/      # PWA setup
└── other-dialogs/     # Bookmarks, quotes, etc.
```

Each feature folder typically contains:
- `index.js` - Main feature logic
- `tab-content.js` - UI tab content
- Additional helper files

## File Naming Conventions

- **`*.js`** - JavaScript modules
- **`*.css`** - Stylesheets
- **`*.html`** - HTML templates
- **`*.xml`** - Data files (texts, dictionaries)
- **`*.test.js`** - Unit tests

## What To Edit Where

| To Change... | Edit Files In... |
|--------------|------------------|
| Application behavior | `_dprhtml/js/legacy/` or `_dprhtml/js/features/` |
| Visual appearance | `_dprhtml/css/` |
| UI layout | `index.html` or feature HTML files |
| Build process | `vite.config.js` |
| Dependencies | `package.json` (then run `pnpm install`) |
| Code style rules | `biome.json` |
| Docker deployment | `Dockerfile` or `Makefile` |
