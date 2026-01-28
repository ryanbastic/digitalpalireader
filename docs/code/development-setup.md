# Development Setup

This guide walks you through setting up your development environment for the Digital Pali Reader.

## Prerequisites

Before you begin, make sure you have:

### 1. Node.js (version 18 or higher)

Check if installed:
```bash
node --version
# Should show v18.x.x or higher
```

Install Node.js: https://nodejs.org/

### 2. pnpm (Package Manager)

Check if installed:
```bash
pnpm --version
# Should show 9.x.x or higher
```

Install pnpm:
```bash
# Using npm
npm install -g pnpm

# Or using corepack (built into Node.js)
corepack enable
corepack prepare pnpm@latest --activate
```

### 3. Git

Check if installed:
```bash
git --version
```

Install Git: https://git-scm.com/

### 4. A Code Editor

We recommend **Visual Studio Code** with these extensions:
- ESLint or Biome
- Prettier (optional, Biome handles formatting)
- Knockout.js snippets

## Getting the Code

### Clone the Repository

```bash
git clone https://github.com/ryanbastic/digitalpalireader.git
cd digitalpalireader
```

### Install Dependencies

```bash
pnpm install
```

This downloads all required packages listed in `package.json`.

## Running the Development Server

Start the local development server:

```bash
pnpm start
```

This will:
1. Start Vite's development server
2. Open the app at `http://localhost:5173`
3. Enable hot module replacement (changes appear instantly)

### What You Should See

```
  VITE v6.0.3  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

Open `http://localhost:5173` in your browser.

## Project Commands

Here are all the commands you can run:

| Command | What It Does |
|---------|--------------|
| `pnpm start` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test` | Run unit tests |
| `pnpm lint` | Check code style |

### Running Tests

```bash
pnpm test
```

Tests use Vitest and are located in files ending with `.test.js`.

### Checking Code Style

```bash
pnpm lint
```

This uses Biome to check for:
- Code formatting issues
- Potential bugs
- Style inconsistencies

## Understanding the Development Workflow

### 1. Make Changes

Edit files in `_dprhtml/js/` or `_dprhtml/css/`.

### 2. See Changes Instantly

With `pnpm start` running, changes appear in the browser automatically (Hot Module Replacement).

### 3. Test Your Changes

```bash
pnpm test
```

### 4. Check Code Style

```bash
pnpm lint
```

### 5. Build for Production

```bash
pnpm build
```

Output goes to the `dist/` folder.

## Project Configuration Files

### `package.json`

Lists project dependencies and scripts:

```json
{
  "scripts": {
    "start": "pnpm vite",
    "build": "pnpm vite build",
    "lint": "pnpm biome check .",
    "test": "pnpm vitest"
  },
  "dependencies": {
    "knockout": "^3.5.0",
    "jquery": "^3.4.1",
    // ... more
  },
  "devDependencies": {
    "vite": "^6.0.3",
    "vitest": "^2.1.8",
    // ... more
  }
}
```

### `vite.config.js`

Build tool configuration:

```javascript
export default {
  // Tells Vite to include HTML and XML as assets
  assetsInclude: ['**/*.html', '**/*.xml'],

  // Test configuration
  test: {
    environment: 'jsdom',
    setupFiles: ['vitest.setup.js'],
  },
};
```

### `biome.json`

Code linting rules:

```json
{
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true },
  "files": {
    "ignore": [
      "_dprhtml/js/legacy/*",  // Skip legacy code
      "node_modules/*",
      "dist/*"
    ]
  }
}
```

## Docker Development (Optional)

If you prefer using Docker:

### Build the Image

```bash
make build
# or
docker build -t digitalpalireader .
```

### Run the Container

```bash
docker run -p 8080:8080 digitalpalireader
```

Access at `http://localhost:8080`.

## Troubleshooting Setup

### "pnpm: command not found"

Install pnpm:
```bash
npm install -g pnpm
```

### "node: command not found"

Install Node.js from https://nodejs.org/

### Port 5173 Already in Use

Either stop the other process or use a different port:
```bash
pnpm vite --port 3000
```

### Dependencies Not Installing

Clear the cache and try again:
```bash
rm -rf node_modules
pnpm install
```

### Old Node.js Version

Update Node.js to version 18 or higher:
```bash
node --version  # Check current version
```

Use nvm (Node Version Manager) to manage versions:
```bash
nvm install 18
nvm use 18
```

## Editor Setup

### Visual Studio Code

Recommended `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "files.autoSave": "onFocusChange"
}
```

### Recommended Extensions

1. **Biome** - Linting and formatting
2. **GitLens** - Git history visualization
3. **Path Intellisense** - File path autocomplete

## Next Steps

Now that your environment is set up:

1. Read [Project Structure](./project-structure.md) to understand the codebase
2. Read [Architecture](./architecture.md) to understand how code flows
3. Read [Working with Code](./working-with-code.md) for practical tips
4. Try making a small change to see the workflow in action!
