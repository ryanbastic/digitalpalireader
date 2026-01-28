# Troubleshooting Guide

This guide helps you solve common problems when working with the Digital Pali Reader.

## Development Environment Issues

### "pnpm: command not found"

**Problem:** pnpm is not installed globally.

**Solution:**
```bash
# Install via npm
npm install -g pnpm

# Or enable corepack (Node.js 16.9+)
corepack enable
corepack prepare pnpm@latest --activate
```

### "node: command not found"

**Problem:** Node.js is not installed.

**Solution:** Download and install from https://nodejs.org/ (use LTS version)

### "EACCES: permission denied"

**Problem:** No permission to install global packages.

**Solutions:**
```bash
# Option 1: Use sudo (Linux/Mac)
sudo npm install -g pnpm

# Option 2: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add to ~/.bashrc or ~/.zshrc:
export PATH=~/.npm-global/bin:$PATH
```

### Dependencies Won't Install

**Problem:** `pnpm install` fails.

**Solutions:**
```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Check Node.js version (should be 18+)
node --version
```

### Port Already in Use

**Problem:** "Port 5173 is already in use"

**Solutions:**
```bash
# Find what's using the port
lsof -i :5173  # Mac/Linux
netstat -ano | findstr :5173  # Windows

# Kill the process
kill -9 <PID>  # Mac/Linux

# Or use a different port
pnpm vite --port 3000
```

## Build Issues

### Build Fails

**Problem:** `pnpm build` returns errors.

**Debug steps:**
1. Check the error message carefully
2. Look for the specific file/line mentioned
3. Common causes:
   - Syntax errors in JavaScript
   - Missing imports
   - Invalid file references

**Common fixes:**
```bash
# Check for syntax errors
pnpm lint

# Clear build cache
rm -rf dist
rm -rf node_modules/.vite
pnpm build
```

### Missing Assets in Build

**Problem:** Images/files missing after build.

**Check:**
1. Files should be in `public/` folder for static assets
2. Or imported in JavaScript for bundled assets
3. Check `vite.config.js` for asset configuration

## Runtime Issues

### Blank Page

**Problem:** Browser shows nothing.

**Debug steps:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Common causes:
   - JavaScript error stopping execution
   - Missing files (404 errors)
   - CORS issues

### JavaScript Errors

**Problem:** Red errors in browser console.

**Common errors and fixes:**

#### "ReferenceError: X is not defined"
```javascript
// Problem: Using variable before it's defined
console.log(myVar);  // Error!
var myVar = 5;

// Solution: Define before use
var myVar = 5;
console.log(myVar);
```

#### "TypeError: Cannot read property 'X' of undefined"
```javascript
// Problem: Object is undefined
var data = undefined;
data.property;  // Error!

// Solution: Check before accessing
if (data && data.property) {
    console.log(data.property);
}
```

#### "TypeError: X is not a function"
```javascript
// Problem: Trying to call something that's not a function
var myVar = "string";
myVar();  // Error!

// Debug: Check what the variable actually is
console.log(typeof myVar);  // "string"
```

### Knockout Binding Errors

**Problem:** "Unable to process binding" errors.

**Solutions:**
1. Check that the observable/function exists in ViewModel
2. Check for typos in data-bind attributes
3. Ensure ko.applyBindings() was called

```javascript
// Debug: Check what's in the ViewModel
console.log(ko.dataFor(document.body));
```

### AJAX/Fetch Errors

**Problem:** Data not loading from XML files.

**Debug:**
```javascript
// Check if file loads
fetch('/sa/dict/a-41.xml')
    .then(response => {
        console.log('Status:', response.status);
        return response.text();
    })
    .then(text => console.log('Content:', text.substring(0, 200)))
    .catch(err => console.error('Error:', err));
```

**Common causes:**
- File path is wrong
- File doesn't exist
- CORS policy blocking request (dev vs prod)

## UI/Display Issues

### Layout Broken

**Problem:** Elements overlapping or misaligned.

**Debug steps:**
1. Check Elements tab in DevTools
2. Look for CSS conflicts
3. Check for JavaScript errors affecting layout

**Quick checks:**
```css
/* Temporarily outline all elements */
* { outline: 1px solid red; }
```

### Styles Not Applying

**Problem:** CSS changes not visible.

**Solutions:**
1. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R`)
2. Check CSS specificity (more specific rules win)
3. Check for `!important` overrides
4. Verify CSS file is imported in entry.js

### Responsive Issues

**Problem:** Looks wrong on mobile/tablets.

**Debug:**
1. Use browser DevTools device emulation
2. Check Bootstrap responsive classes
3. Test with actual devices if possible

## Testing Issues

### Tests Fail

**Problem:** `pnpm test` shows failures.

**Debug steps:**
1. Read the error message - which test failed?
2. Look at the expected vs actual values
3. Run specific test to isolate:
   ```bash
   pnpm test -- --grep "test name"
   ```

### Test Environment Errors

**Problem:** Tests can't find modules or globals.

**Check:**
1. `vitest.setup.js` - Are required modules imported?
2. Is `jsdom` environment configured in `vite.config.js`?

```javascript
// vitest.setup.js should have:
import './deps.js';  // jQuery, Knockout
// Plus any required legacy modules
```

## Linting Issues

### Many Lint Errors

**Problem:** `pnpm lint` shows lots of errors.

**Solutions:**
1. For new code - fix all errors
2. For legacy code - check if file is in ignore list
3. Auto-fix some issues:
   ```bash
   pnpm biome check --apply .
   ```

### Lint Config Not Working

**Problem:** Biome ignoring configuration.

**Check:**
1. `biome.json` exists in project root
2. Correct JSON syntax (no trailing commas)
3. Restart editor after config changes

## Docker Issues

### Build Fails

**Problem:** `make build` or `docker build` fails.

**Debug:**
```bash
# Build with full output
docker build --progress=plain -t dpr .

# Check available disk space
df -h
```

**Common causes:**
- Not enough disk space
- Network issues downloading images
- Syntax errors in Dockerfile

### Container Won't Start

**Problem:** Container starts and immediately exits.

**Debug:**
```bash
# Check container logs
docker logs <container-id>

# Run interactively
docker run -it digitalpalireader sh
```

## Performance Issues

### Slow Development Server

**Problem:** Vite taking too long.

**Solutions:**
1. Check for large files being processed
2. Exclude unnecessary folders in config
3. Check available system memory

### Slow in Browser

**Problem:** Application runs slowly.

**Debug steps:**
1. Open DevTools Performance tab
2. Record while performing slow action
3. Look for long-running functions

**Common causes:**
- Loading large XML files synchronously
- Too many DOM updates
- Memory leaks (check DevTools Memory tab)

## Getting More Help

### Useful Debug Commands

```bash
# Check Node.js version
node --version

# Check pnpm version
pnpm --version

# List installed packages
pnpm list

# Check for outdated packages
pnpm outdated

# Verify project structure
ls -la
ls -la _dprhtml/js/
```

### Browser Console Commands

```javascript
// Check Knockout viewmodel
ko.dataFor(document.body)

// Check jQuery version
$.fn.jquery

// Check if variable exists
typeof DPR_G !== 'undefined'

// List all DPR objects
Object.keys(window).filter(k => k.startsWith('DPR'))
```

### Where to Look for Answers

1. **Error message** - Read it carefully, often contains the answer
2. **Browser DevTools** - Console, Network, Sources tabs
3. **Project documentation** - This docs/code folder
4. **Coding conventions** - `/coding-conventions/es6.md`
5. **Similar code** - How do existing features do it?

### When You're Really Stuck

1. Take a break - Fresh eyes help
2. Explain the problem out loud (rubber duck debugging)
3. Simplify - Remove code until it works, then add back
4. Binary search - Comment out half the code to find the problem
5. Start fresh - Sometimes a clean clone helps
