# Digital Pali Reader - Developer Documentation

Welcome to the Digital Pali Reader (DPR) codebase! This documentation will help you understand how the project works and how to contribute.

## What is the Digital Pali Reader?

The Digital Pali Reader is a web-based tool for studying:
- **Pali Canon** - Ancient Buddhist scriptures written in the Pali language
- **Pali Language** - Through integrated dictionaries and grammar analysis

Think of it as a digital "language reader" that helps scholars, monks, and students study Buddhist texts with built-in dictionary lookups, grammar analysis, and text navigation.

## Quick Links

| Document | Description |
|----------|-------------|
| [Project Structure](./project-structure.md) | What each folder and file does |
| [Architecture](./architecture.md) | How the code is organized and flows |
| [Development Setup](./development-setup.md) | Getting your environment ready |
| [Key Concepts](./key-concepts.md) | Important patterns and technologies |
| [Working with Code](./working-with-code.md) | Practical guide to making changes |
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |

## Technologies at a Glance

If you're new to web development, here's what you'll encounter:

| Technology | What It Does | Where to Learn |
|------------|--------------|----------------|
| **JavaScript (ES6+)** | The programming language | [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) |
| **HTML5** | Page structure | [MDN HTML Basics](https://developer.mozilla.org/en-US/docs/Learn/HTML) |
| **CSS3** | Styling and layout | [MDN CSS Basics](https://developer.mozilla.org/en-US/docs/Learn/CSS) |
| **jQuery** | DOM manipulation | [jQuery Learning Center](https://learn.jquery.com/) |
| **Bootstrap 4** | Responsive CSS framework | [Bootstrap Documentation](https://getbootstrap.com/docs/4.4/) |
| **Vite** | Build tool & dev server | [Vite Guide](https://vitejs.dev/guide/) |
| **pnpm** | Package manager | [pnpm Documentation](https://pnpm.io/) |

## Project History

- **July 2010** - Originally created as a Firefox XUL extension
- **2020** - Modernization began, converting to a web application
- **2020-2022** - Volunteer development
- **December 2024** - Development resumed by Sirimangalo International

This history explains why you'll see both "legacy" code (from the XUL era) and modern ES6 modules in the codebase.

## License

This project is licensed under **CC BY-NC-SA 4.0** (Creative Commons Attribution-NonCommercial-ShareAlike). This means:
- You can share and adapt the code
- You must give appropriate credit
- You cannot use it for commercial purposes
- Derivatives must use the same license

## Getting Help

- Check the [Troubleshooting Guide](./troubleshooting.md)
- Review existing code patterns before implementing new features
- Look at the coding conventions in `/coding-conventions/es6.md`
