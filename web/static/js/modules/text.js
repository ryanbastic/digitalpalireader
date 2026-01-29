/**
 * Text display module
 */

import { TextAPI } from './api.js';
import { state } from './state.js';
import { lookupWord as dictionaryLookup } from './dictionary.js';

// DOM elements
let textTitle;
let textContent;
let breadcrumb;

/**
 * Initialize text module
 */
export function initText() {
    // Get DOM elements
    textTitle = document.getElementById('text-title');
    textContent = document.getElementById('text-content');
    breadcrumb = document.getElementById('breadcrumb');

    if (!textContent) {
        console.error('Text content element not found');
        return;
    }

    // Listen for navigation events
    state.on('navigate', loadText);
}

/**
 * Load and display text for a place
 */
async function loadText(place) {
    // Show loading state
    textContent.innerHTML = '<div class="loading">Loading text...</div>';
    textTitle.textContent = 'Loading...';

    try {
        const section = await TextAPI.getSection(place);
        renderText(section);
        updateBreadcrumb(section.nav?.breadcrumb || []);

        // Update URL
        const loc = state.placeToString(place);
        window.history.pushState({ loc }, '', `?loc=${loc}`);

    } catch (error) {
        console.error('Failed to load text:', error);
        textContent.innerHTML = `
            <div class="empty-state">
                <h2>Error Loading Text</h2>
                <p>${error.message}</p>
            </div>
        `;
        textTitle.textContent = 'Error';
    }
}

/**
 * Render text section
 */
function renderText(section) {
    // Update title
    textTitle.textContent = section.title || 'Untitled';

    // Render content with clickable words
    let content = section.content || '';

    // Make words clickable for dictionary lookup (Phase 2)
    content = makeWordsClickable(content);

    textContent.innerHTML = content;

    // Add navigation buttons
    addNavButtons(section.nav);

    // Add click handlers for dictionary lookup
    textContent.querySelectorAll('.pali-word').forEach(word => {
        word.addEventListener('click', (e) => {
            const text = e.target.textContent;
            const rect = e.target.getBoundingClientRect();
            dictionaryLookup(text, rect.left, rect.bottom);
        });
    });
}

/**
 * Make Pali words clickable for dictionary lookup
 */
function makeWordsClickable(html) {
    // Pali character pattern including diacritics
    const paliWordPattern = /^[a-zA-ZāīūṭḍṅñṇṃḷĀĪŪṬḌṄÑṆṂḶ]+$/;

    /**
     * Wrap individual words in a text string with clickable spans
     */
    function wrapWordsInText(text) {
        return text.split(/(\s+)/).map(token => {
            // Preserve whitespace tokens as-is
            if (/^\s+$/.test(token)) {
                return token;
            }
            // Check if this is a Pali word (may have trailing punctuation)
            const match = token.match(/^([a-zA-ZāīūṭḍṅñṇṃḷĀĪŪṬḌṄÑṆṂḶ]+)(.*)$/);
            if (match) {
                const word = match[1];
                const suffix = match[2]; // punctuation like , . ; etc.
                return `<span class="pali-word">${word}</span>${suffix}`;
            }
            return token;
        }).join('');
    }

    // Process each paragraph with class="pali"
    return html.replace(/<p class="pali">([\s\S]*?)<\/p>/g, (match, innerContent) => {
        // Process text content, preserving HTML tags
        // This regex matches either HTML tags (to preserve) or text content (to process)
        const processed = innerContent.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, text) => {
            if (tag) {
                // Preserve HTML tags as-is
                return tag;
            }
            if (text) {
                // Process text content - wrap Pali words
                return wrapWordsInText(text);
            }
            return m;
        });
        return `<p class="pali">${processed}</p>`;
    });
}

/**
 * Update breadcrumb navigation
 */
function updateBreadcrumb(items) {
    if (!breadcrumb) return;

    if (!items || items.length === 0) {
        breadcrumb.innerHTML = '';
        return;
    }

    breadcrumb.innerHTML = items.map((item, i) => {
        if (i === items.length - 1) {
            return `<span class="current">${item}</span>`;
        }
        return `<span>${item}</span>`;
    }).join('');
}

/**
 * Add prev/next navigation buttons
 */
function addNavButtons(nav) {
    if (!nav) return;

    const navHtml = `
        <div class="text-nav">
            ${nav.prev ? `
                <a href="#" class="text-nav-btn prev" data-loc="${state.placeToString(nav.prev)}">
                    Previous
                </a>
            ` : '<span></span>'}
            ${nav.next ? `
                <a href="#" class="text-nav-btn next" data-loc="${state.placeToString(nav.next)}">
                    Next
                </a>
            ` : '<span></span>'}
        </div>
    `;

    textContent.insertAdjacentHTML('beforeend', navHtml);

    // Add click handlers
    textContent.querySelectorAll('.text-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const loc = btn.dataset.loc;
            const place = state.parseLocation(loc);
            state.navigateTo(place);
        });
    });
}

/**
 * Handle browser back/forward navigation
 */
export function handlePopState() {
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.loc) {
            const place = state.parseLocation(e.state.loc);
            state.navigateTo(place);
        }
    });
}

/**
 * Load text from URL parameter
 */
export function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('loc');

    if (loc) {
        const place = state.parseLocation(loc);
        state.navigateTo(place);
    }
}
