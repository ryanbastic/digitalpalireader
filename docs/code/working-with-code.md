# Working with Code

This is a practical guide for making changes to the Digital Pali Reader codebase.

## Before You Start

1. **Read the code first** - Before changing anything, understand how it currently works
2. **Keep changes small** - Make one logical change at a time
3. **Test your changes** - Run `pnpm test` and manually verify in the browser
4. **Follow existing patterns** - Match the style of surrounding code

## Finding Code

### Where to Look for What

| To Find... | Look In... |
|------------|------------|
| UI layout/structure | `index.html` |
| Feature logic | `_dprhtml/js/features/` or `_dprhtml/js/legacy/` |
| Styles | `_dprhtml/css/` |
| Application state | `_dprhtml/js/dprviewmodel.js` |
| Global configuration | `_dprhtml/dpr_globals.js` |
| Text navigation | `_dprhtml/js/legacy/navigation.js` |
| Dictionary lookup | `_dprhtml/js/legacy/dict.js` |
| Search functionality | `_dprhtml/js/legacy/search.js` |
| Word analysis | `_dprhtml/js/legacy/analysis.js` |

### Using Search

Find text in files:
```bash
# Search for a function name
grep -r "functionName" _dprhtml/

# Search in JavaScript only
grep -r "functionName" _dprhtml/js/

# Case insensitive
grep -ri "searchterm" _dprhtml/
```

In VS Code: `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)

## Making Changes

### Workflow Overview

```
1. Understand current behavior
        ↓
2. Make your change
        ↓
3. Test in browser (pnpm start)
        ↓
4. Run linter (pnpm lint)
        ↓
5. Run tests (pnpm test)
        ↓
6. Commit your changes
```

### Adding a New Feature

1. **Decide where it belongs**
   - New major feature → `_dprhtml/js/features/yourfeature/`
   - Extension of existing → modify existing legacy file
   - New utility → `_dprhtml/js/legacy/` following patterns

2. **Create the feature folder**
   ```bash
   mkdir _dprhtml/js/features/my-feature
   ```

3. **Create the main file**
   ```javascript
   // _dprhtml/js/features/my-feature/index.js

   export function initMyFeature() {
       console.log("My feature initialized");
       // Your code here
   }
   ```

4. **Import in entry.js**
   ```javascript
   // In _dprhtml/js/entry.js
   import { initMyFeature } from './features/my-feature/index.js';
   ```

5. **Initialize (if needed)**
   ```javascript
   // Call during app startup
   initMyFeature();
   ```

### Modifying Existing Code

1. **Read the file completely** - Understand the full context

2. **Find related tests** - Look for `*.test.js` files

3. **Make minimal changes** - Don't refactor while fixing bugs

4. **Preserve behavior** - Unless you're intentionally changing it

### Example: Adding a Button

Let's add a button that shows an alert.

**Step 1: Add HTML**
```html
<!-- In index.html or feature HTML -->
<button id="myButton" class="btn btn-primary"
        data-bind="click: showMessage">
    Click Me
</button>
```

**Step 2: Add ViewModel Function**
```javascript
// In dprviewmodel.js or your feature
self.showMessage = function() {
    alert("Hello from DPR!");
};
```

**Step 3: Test It**
- Start dev server: `pnpm start`
- Open browser to `http://localhost:5173`
- Click the button

### Example: Adding a Configuration Option

**Step 1: Add to globals**
```javascript
// In _dprhtml/dpr_globals.js
DPR_G.myOption = true;  // default value
```

**Step 2: Use it in code**
```javascript
// Wherever you need it
if (DPR_G.myOption) {
    // Do something
}
```

**Step 3: (Optional) Add UI toggle**
```html
<input type="checkbox"
       data-bind="checked: myOption" />
<label>Enable my option</label>
```

```javascript
// In viewmodel
self.myOption = ko.observable(DPR_G.myOption);
self.myOption.subscribe(function(newValue) {
    DPR_G.myOption = newValue;
});
```

## Working with Legacy Code

### Understanding a Legacy File

When opening a legacy file, look for:

```javascript
// 1. Namespace definition at the top
window.DPR_FeatureName = window.DPR_FeatureName || {};

// 2. Main functions
DPR_FeatureName.mainFunction = function() { };

// 3. Helper functions
DPR_FeatureName._privateHelper = function() { };

// 4. Initialization
DPR_FeatureName.init = function() { };
```

### Common Legacy Patterns

**DOM manipulation with jQuery:**
```javascript
// Get element
var $el = $("#elementId");

// Set content
$el.html("<p>New content</p>");

// Show/hide
$el.show();
$el.hide();

// Events
$el.on("click", function() { });
```

**Loading XML data:**
```javascript
$.get("/sa/dict/a-41.xml", function(data) {
    var $xml = $(data);
    var entries = $xml.find("entry");
    // Process entries
});
```

**Cross-module calls:**
```javascript
// Call another module's function
DPR_PAL.transliterate(text);
DPR_Navigation.goTo(section);
DPR_Search.find(query);
```

### Modifying Legacy Code Safely

1. **Don't rename functions** - Other code may depend on them

2. **Don't change function signatures** - Add optional parameters instead
   ```javascript
   // Before
   function doThing(a, b) { }

   // After (backward compatible)
   function doThing(a, b, newOption) {
       newOption = newOption || defaultValue;
   }
   ```

3. **Test thoroughly** - Legacy code often has hidden dependencies

## Working with the ViewModel

### Adding New State

```javascript
// In dprviewmodel.js
function DPRViewModel() {
    var self = this;

    // Add your observable
    self.newFeatureEnabled = ko.observable(false);

    // Add computed if needed
    self.shouldShowFeature = ko.computed(function() {
        return self.newFeatureEnabled() && self.isLoggedIn();
    });
}
```

### Binding to HTML

```html
<!-- Show/hide based on observable -->
<div data-bind="visible: newFeatureEnabled">
    Feature content
</div>

<!-- Toggle button -->
<button data-bind="click: function() { newFeatureEnabled(!newFeatureEnabled()); }">
    Toggle Feature
</button>
```

## CSS Changes

### Adding Styles

1. **For global styles** - Edit `_dprhtml/css/styles.css`

2. **For component-specific** - Consider a new CSS file

3. **Use existing classes** - Bootstrap provides many utilities

### CSS Best Practices

```css
/* Use specific selectors */
.dpr-sidebar .nav-item { }

/* Avoid !important unless necessary */
.my-class {
    color: blue;  /* Good */
}
.my-class {
    color: red !important;  /* Avoid */
}

/* Use consistent naming */
.dpr-feature-name { }
.dpr-feature-name__element { }
.dpr-feature-name--modifier { }
```

## Debugging

### Browser Developer Tools

1. **Open DevTools** - F12 or right-click → Inspect

2. **Console tab** - See errors and log messages
   ```javascript
   console.log("Debug info:", variable);
   console.error("Something went wrong");
   ```

3. **Sources tab** - Set breakpoints, step through code

4. **Network tab** - See file loading, AJAX requests

5. **Elements tab** - Inspect/modify HTML and CSS

### Common Debug Techniques

**Add console.log:**
```javascript
function problemFunction() {
    console.log("Function called with:", arguments);
    // ... code ...
    console.log("Result:", result);
    return result;
}
```

**Use debugger statement:**
```javascript
function complexFunction() {
    // Code execution will pause here when DevTools is open
    debugger;
    // ... rest of code
}
```

**Check Knockout bindings:**
```javascript
// In browser console
ko.dataFor(document.querySelector("#element"));
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific file
pnpm test -- dprviewmodel

# Run with watch mode (re-runs on file changes)
pnpm test -- --watch
```

### Writing Tests

```javascript
// In *.test.js file
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
    it('should do something', () => {
        const result = myFunction();
        expect(result).toBe(expectedValue);
    });

    it('should handle edge case', () => {
        expect(() => myFunction(null)).toThrow();
    });
});
```

## Code Style

### Following Biome Rules

Check your code:
```bash
pnpm lint
```

Common issues:
- Missing semicolons
- Unused variables
- Inconsistent quotes
- Import order

### General Guidelines

1. **Use consistent indentation** - 2 or 4 spaces (match existing file)

2. **Name clearly**
   ```javascript
   // Good
   function calculateInflection(word) { }

   // Bad
   function calc(w) { }
   ```

3. **Keep functions focused** - One function, one job

4. **Add comments for complex logic**
   ```javascript
   // Complex algorithm explanation
   // Step 1: ...
   // Step 2: ...
   ```

5. **Don't comment obvious code**
   ```javascript
   // Bad: "Increment counter by 1"
   counter++;

   // Good: No comment needed
   counter++;
   ```

## Git Workflow

### Making Commits

```bash
# Check what changed
git status
git diff

# Stage specific files
git add _dprhtml/js/my-changes.js

# Commit with descriptive message
git commit -m "Add word highlight feature to dictionary lookup"
```

### Good Commit Messages

```
# Good
Add keyboard navigation to search results
Fix dictionary popup positioning on mobile
Update Bootstrap to version 4.6

# Bad
Fixed stuff
WIP
Changes
```

## Common Tasks

### Adding a New Tab

1. Add tab button in HTML
2. Add tab content container
3. Add observable for active state
4. Wire up click handler to switch tabs

### Adding a New Dialog

1. Create HTML for dialog
2. Add observable for visibility
3. Add open/close functions
4. Wire up trigger button

### Adding a New Dictionary

1. Place XML files in `/sa/dict/`
2. Update dictionary loading code
3. Add to dictionary selector UI

### Modifying Text Display

1. Find output handling in `legacy/output.js`
2. Modify formatting in `legacy/format.js`
3. Test with different text types
