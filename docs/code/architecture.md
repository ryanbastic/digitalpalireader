# Code Architecture

This document explains how the Digital Pali Reader code is organized and how data flows through the application.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  index.html                                                  │
│    └── entry.js (Vite entry point)                          │
│          ├── CSS imports (Bootstrap, styles)                │
│          ├── Legacy modules (57 files)                      │
│          ├── Feature modules                                 │
│          └── main.js (initialization)                        │
├─────────────────────────────────────────────────────────────┤
│                    Knockout.js ViewModel                     │
│                    (dprviewmodel.js)                         │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│    Navigation        Search          Dictionary             │
│      Feature         Feature          Feature               │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                              │
│         XML Files (Tipitaka texts, Dictionaries)            │
└─────────────────────────────────────────────────────────────┘
```

## Application Startup Flow

Here's exactly what happens when you open the Digital Pali Reader:

### Step 1: HTML Loads
```
index.html
    │
    ├── Sets up <div> containers for the UI
    ├── Defines whitelist of allowed global objects
    └── Loads entry.js via <script type="module">
```

### Step 2: Entry Point Runs
```
entry.js
    │
    ├── Imports all CSS files
    │   ├── Bootstrap
    │   ├── Font Awesome
    │   └── Custom styles
    │
    ├── Imports legacy modules (attached to window object)
    │   ├── analysis.js, declensions.js, ...
    │   ├── navigation.js, search.js, ...
    │   └── (57 total modules)
    │
    ├── Imports feature modules
    │   ├── navigation/
    │   ├── search/
    │   └── dictionary/
    │
    └── Imports main.js (runs initialization)
```

### Step 3: Application Initializes
```
main.js
    │
    ├── Creates global DPR objects
    │   ├── DPR_G (globals)
    │   ├── DPR_PAL (Pali utilities)
    │   └── DPR_Chrome (UI chrome)
    │
    ├── Creates Knockout ViewModel
    │   └── dprviewmodel.js → ko.applyBindings()
    │
    └── Sets up event listeners
        ├── Keyboard shortcuts
        └── DOM events
```

### Step 4: UI Renders
```
main-core.js
    │
    ├── Initializes resizable panels (splitters)
    ├── Sets up feature tabs
    │   ├── Navigation tab
    │   ├── Search tab
    │   └── Dictionary tab
    │
    └── Shows initial content
```

## The MVVM Pattern (Model-View-ViewModel)

DPR uses **Knockout.js** for the MVVM pattern. Here's what that means:

### Model (Data)
- XML files containing Pali texts
- Dictionary data in `/sa/dict/`
- User preferences stored in browser

### View (UI)
- HTML templates in `index.html`
- CSS styles in `_dprhtml/css/`
- Feature-specific HTML in features folders

### ViewModel (Logic)
- `dprviewmodel.js` - Main state management
- Controls what's visible, handles user actions
- Uses **observables** that automatically update the UI

### How Knockout Bindings Work

```html
<!-- In HTML -->
<div data-bind="visible: showSidebar">
    Sidebar content here
</div>

<button data-bind="click: toggleSidebar">
    Toggle
</button>
```

```javascript
// In dprviewmodel.js
function DPRViewModel() {
    // Observable: UI updates automatically when this changes
    this.showSidebar = ko.observable(true);

    // Function: called when button is clicked
    this.toggleSidebar = function() {
        this.showSidebar(!this.showSidebar());
    };
}
```

When `showSidebar` changes, Knockout automatically:
1. Updates the `visible` binding
2. Shows or hides the div
3. No manual DOM manipulation needed!

## Module Organization

### Legacy Modules (Global Scope)

Legacy modules attach to the `window` object:

```javascript
// In legacy/analysis.js
window.DPR_Analysis = {
    analyzeWord: function(word) {
        // Analysis logic
    }
};

// Used anywhere as:
DPR_Analysis.analyzeWord("dhamma");
```

### Feature Modules (ES6 Modules)

Modern features use ES6 import/export:

```javascript
// In features/search/index.js
export function initSearch() {
    // Search initialization
}

// In entry.js
import { initSearch } from './features/search/index.js';
initSearch();
```

## Data Flow Example: Dictionary Lookup

Here's what happens when a user looks up a word:

```
1. User clicks on a Pali word
        │
        ▼
2. Event handler captures click
   (legacy/dict.js)
        │
        ▼
3. Word is extracted and normalized
   (legacy/translit.js for transliteration)
        │
        ▼
4. Dictionary XML is loaded/searched
   (legacy/dict_xml.js)
   Files: /sa/dict/A-41.xml, etc.
        │
        ▼
5. Inflection analysis runs
   (legacy/inflections.js)
   What form of the word is this?
        │
        ▼
6. Results formatted for display
   (legacy/format.js)
        │
        ▼
7. ViewModel updated
   (dprviewmodel.js)
        │
        ▼
8. UI automatically refreshes
   (Knockout bindings)
```

## Key Global Objects

These objects are available throughout the application:

| Object | Purpose | Defined In |
|--------|---------|------------|
| `DPR_G` | Global state and configuration | `dpr_globals.js` |
| `DPR_PAL` | Pali language utilities | Legacy modules |
| `DPR_Chrome` | UI chrome/frame management | Legacy modules |
| `DPR_Navigation` | Text navigation | `legacy/navigation.js` |
| `DPR_Search` | Search functionality | `legacy/search.js` |
| `DPR_Dict` | Dictionary lookup | `legacy/dict.js` |

## Component Communication

Components communicate through:

### 1. Global Objects
```javascript
// Set a value
DPR_G.currentText = "sutta1";

// Read it elsewhere
console.log(DPR_G.currentText);
```

### 2. Knockout Observables
```javascript
// In ViewModel
viewModel.currentTab("search");

// UI automatically updates
```

### 3. Direct Function Calls
```javascript
// Call another module's function
DPR_Navigation.goToSection("dn", 1, 1);
```

### 4. Custom Events (newer code)
```javascript
// Dispatch event
document.dispatchEvent(new CustomEvent('dpr:wordSelected', {
    detail: { word: 'dhamma' }
}));

// Listen for event
document.addEventListener('dpr:wordSelected', function(e) {
    console.log('Word selected:', e.detail.word);
});
```

## File Dependencies

Understanding dependencies helps when making changes:

```
entry.js
    │
    ├── deps.js (jQuery, Knockout)
    │       └── Used by ALL other modules
    │
    ├── legacy/*.js
    │       └── Often depend on each other
    │       └── Order matters in entry.js!
    │
    └── features/*.js
            └── Can import from legacy via window.*
```

## The Service Worker

`_dprhtml/sw.js` enables offline functionality:

```
Service Worker
    │
    ├── Caches static assets
    │   ├── HTML, CSS, JavaScript
    │   └── Images, fonts
    │
    ├── Caches dictionary data
    │   └── /sa/dict/*.xml
    │
    └── Serves from cache when offline
```

## Architecture Decisions to Know

1. **Hybrid Legacy/Modern** - Old XUL code works alongside new ES6 modules
2. **Global State** - Many modules share state through `DPR_G`
3. **XML Data Format** - Texts and dictionaries use XML, not JSON
4. **Client-Side Only** - No backend server; everything runs in browser
5. **Progressive Web App** - Works offline, installable on devices
