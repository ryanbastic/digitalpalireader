# Key Concepts

This document explains the important patterns, technologies, and concepts you need to understand to work on the Digital Pali Reader.

## JavaScript Concepts

### ES6 Modules vs. Legacy Scripts

The codebase uses two JavaScript styles:

#### ES6 Modules (Modern)
```javascript
// Importing
import { functionName } from './module.js';
import * as utils from './utils.js';

// Exporting
export function myFunction() { }
export const myVariable = 42;
export default MainClass;
```

Found in: `_dprhtml/js/features/`, `_dprhtml/js/entry.js`

#### Global Scripts (Legacy)
```javascript
// Attaching to window
window.DPR_Analysis = {
    analyze: function(text) { }
};

// Using globally
DPR_Analysis.analyze("dhamma");
```

Found in: `_dprhtml/js/legacy/`

### Why Both Styles?

The legacy code was written for Firefox XUL extensions (2010-2020), which used global scope. The modernization effort adds ES6 modules while keeping legacy code working.

## Knockout.js (MVVM Framework)

Knockout.js is the heart of the UI. Understanding it is essential.

### What is MVVM?

- **Model** - Your data (texts, dictionary entries)
- **View** - HTML templates the user sees
- **ViewModel** - JavaScript that connects data to UI

### Observables

Observables are special values that Knockout watches for changes:

```javascript
// Create an observable
var name = ko.observable("John");

// Read the value (call it like a function)
console.log(name());  // "John"

// Write a new value
name("Jane");  // UI automatically updates!
```

### Computed Observables

Values that depend on other observables:

```javascript
var firstName = ko.observable("John");
var lastName = ko.observable("Doe");

var fullName = ko.computed(function() {
    return firstName() + " " + lastName();
});

console.log(fullName());  // "John Doe"
firstName("Jane");
console.log(fullName());  // "Jane Doe" (auto-updated!)
```

### Data Bindings

Bindings connect HTML to the ViewModel:

```html
<!-- Text binding: displays the value -->
<span data-bind="text: userName"></span>

<!-- Visible binding: shows/hides element -->
<div data-bind="visible: isLoggedIn"></div>

<!-- Click binding: calls function on click -->
<button data-bind="click: doSomething">Click Me</button>

<!-- Value binding: two-way form input binding -->
<input data-bind="value: searchQuery" />

<!-- CSS binding: applies CSS class conditionally -->
<div data-bind="css: { active: isActive }"></div>

<!-- Foreach binding: loops over array -->
<ul data-bind="foreach: items">
    <li data-bind="text: $data"></li>
</ul>
```

### The DPR ViewModel

Located in `_dprhtml/js/dprviewmodel.js`:

```javascript
function DPRViewModel() {
    var self = this;

    // UI state
    self.showSidebar = ko.observable(true);
    self.activeTab = ko.observable("navigation");

    // Feature visibility
    self.showNavigation = ko.observable(true);
    self.showSearch = ko.observable(false);
    self.showDictionary = ko.observable(false);

    // Actions
    self.switchTab = function(tabName) {
        self.activeTab(tabName);
    };
}
```

## jQuery Basics

jQuery simplifies DOM manipulation. DPR uses it extensively.

### Selecting Elements

```javascript
// By ID
$("#myElement")

// By class
$(".myClass")

// By tag
$("div")

// Combined
$("div.myClass")
$("#container .item")
```

### Common Operations

```javascript
// Get/set text content
$("#title").text();           // Get
$("#title").text("New Title"); // Set

// Get/set HTML content
$("#content").html();
$("#content").html("<b>Bold</b>");

// Show/hide
$("#panel").show();
$("#panel").hide();
$("#panel").toggle();

// Add/remove classes
$(".item").addClass("selected");
$(".item").removeClass("selected");

// Event handling
$("#button").click(function() {
    alert("Clicked!");
});

// AJAX requests
$.get("/data/file.xml", function(data) {
    console.log(data);
});
```

## The DPR Global Objects

These objects hold shared state and functionality:

### DPR_G (Globals)

Holds application-wide state:

```javascript
DPR_G = {
    currentText: null,      // Currently displayed text
    currentBook: null,      // Current book reference
    searchResults: [],      // Latest search results
    preferences: { }        // User settings
};
```

### DPR_PAL (Pali Utilities)

Pali language processing:

```javascript
DPR_PAL = {
    transliterate: function(text) { },
    normalize: function(word) { },
    romanize: function(paliText) { }
};
```

### DPR_Chrome (UI Chrome)

UI frame management:

```javascript
DPR_Chrome = {
    openSidebar: function() { },
    closeSidebar: function() { },
    showDialog: function(dialogId) { }
};
```

## XML Data Format

DPR stores texts and dictionaries in XML format.

### Dictionary Entry Example

```xml
<entry>
    <word>dhamma</word>
    <grammar>m.</grammar>
    <definition>
        doctrine, teaching, truth, nature,
        righteousness, phenomenon
    </definition>
    <examples>
        <example>dhammam deseti - teaches the doctrine</example>
    </examples>
</entry>
```

### Parsing XML in JavaScript

```javascript
// Load XML file
$.get("/sa/dict/d-41.xml", function(xmlData) {
    // Parse and use
    var entries = $(xmlData).find("entry");
    entries.each(function() {
        var word = $(this).find("word").text();
        console.log(word);
    });
});
```

## Progressive Web App (PWA)

DPR works offline and can be installed on devices.

### Key Components

1. **Service Worker** (`_dprhtml/sw.js`)
   - Caches files for offline use
   - Intercepts network requests

2. **Web Manifest** (`manifest.webmanifest`)
   - App name, icons, colors
   - Install behavior

3. **HTTPS Requirement**
   - PWAs require secure connections
   - localhost works for development

### How Caching Works

```javascript
// In service worker (sw.js)
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});
```

## The Bootstrap Grid System

DPR uses Bootstrap 4 for layout.

### Grid Basics

```html
<div class="container">
    <div class="row">
        <div class="col-md-6">Half width on medium+ screens</div>
        <div class="col-md-6">Half width on medium+ screens</div>
    </div>
</div>
```

### Common Classes

| Class | Purpose |
|-------|---------|
| `.container` | Centered content wrapper |
| `.row` | Horizontal group of columns |
| `.col-*` | Column widths (1-12) |
| `.d-none` | Hide element |
| `.d-flex` | Flexbox container |
| `.mt-3` | Margin top (spacing) |
| `.p-2` | Padding (spacing) |

## Vite Build Tool

Vite handles development and production builds.

### Development Mode

```bash
pnpm start
```

- Serves files directly (no bundling)
- Hot Module Replacement (instant updates)
- Fast startup

### Production Build

```bash
pnpm build
```

- Bundles all JavaScript
- Minifies code
- Optimizes assets
- Output to `dist/` folder

### Import Syntax

Vite understands modern imports:

```javascript
// JavaScript modules
import { func } from './module.js';

// CSS files
import './styles.css';

// Assets
import iconUrl from './icon.png';
```

## Common Patterns in the Codebase

### Immediately Invoked Function Expression (IIFE)

Wraps code to avoid polluting global scope:

```javascript
(function() {
    // Private code here
    var secret = "hidden";

    // Expose only what's needed
    window.PublicAPI = {
        doSomething: function() { }
    };
})();
```

### Namespace Pattern

Groups related functions:

```javascript
window.DPR_Search = window.DPR_Search || {};

DPR_Search.find = function(query) { };
DPR_Search.highlight = function(text) { };
DPR_Search.clear = function() { };
```

### Callback Pattern

Handling asynchronous operations:

```javascript
function loadData(url, callback) {
    $.get(url, function(data) {
        callback(data);
    });
}

// Usage
loadData("/data/text.xml", function(data) {
    console.log("Data loaded:", data);
});
```

### Module Pattern with Dependencies

```javascript
(function($, ko) {
    // $ is jQuery, ko is Knockout
    // Safe even if global names change

    window.MyModule = {
        init: function() {
            $(".element").show();
            ko.applyBindings(new ViewModel());
        }
    };
})(jQuery, ko);
```

## Understanding the Legacy Code

When reading legacy files, look for:

1. **Global object definitions** at the top
2. **Function assignments** to those objects
3. **Dependencies** on other `DPR_*` objects
4. **jQuery usage** for DOM manipulation

Example legacy file structure:

```javascript
// Define or extend the namespace
window.DPR_Feature = window.DPR_Feature || {};

// Add functions
DPR_Feature.doThing = function(param) {
    // Often uses other DPR objects
    var result = DPR_PAL.process(param);

    // And jQuery for DOM
    $("#output").html(result);
};

// Initialization
DPR_Feature.init = function() {
    // Setup code
};
```
