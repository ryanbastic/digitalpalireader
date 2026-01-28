/**
 * Dictionary lookup module
 */

import { DictionaryAPI } from './api.js';
import { state } from './state.js';

// DOM elements
let queryInput;
let dictTypeSelect;
let searchBtn;
let resultsContainer;

// Search history
const HISTORY_KEY = 'dpr_dict_history';
let searchHistory = [];

/**
 * Initialize dictionary module
 */
export function initDictionary() {
    // Get DOM elements
    queryInput = document.getElementById('dict-query');
    dictTypeSelect = document.getElementById('dict-type');
    searchBtn = document.getElementById('dict-search-btn');
    resultsContainer = document.getElementById('dict-results');

    if (!queryInput || !resultsContainer) {
        console.error('Dictionary elements not found');
        return;
    }

    // Load search history
    loadHistory();

    // Set up event listeners
    setupEventListeners();

    // Render initial state
    renderHistory();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Search button click
    searchBtn.addEventListener('click', () => {
        const query = queryInput.value.trim();
        if (query) {
            performSearch(query);
        }
    });

    // Enter key in search input
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = queryInput.value.trim();
            if (query) {
                performSearch(query);
            }
        }
    });

    // Dictionary type change
    dictTypeSelect.addEventListener('change', () => {
        const query = queryInput.value.trim();
        if (query) {
            performSearch(query);
        }
    });
}

/**
 * Perform dictionary search
 */
async function performSearch(query) {
    const dictType = dictTypeSelect.value;

    // Show loading state
    resultsContainer.innerHTML = '<div class="dict-loading">Searching...</div>';

    try {
        const response = await DictionaryAPI.lookup(query, dictType);
        renderResults(response);

        // Add to history
        addToHistory(query, dictType);

    } catch (error) {
        console.error('Dictionary search failed:', error);
        resultsContainer.innerHTML = `
            <div class="dict-no-results">
                <h3>Search Error</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render search results
 */
function renderResults(response) {
    if (!response.results || response.results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="dict-no-results">
                <h3>No results found</h3>
                <p>Try a different spelling or dictionary.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="dict-result-count">Found ${response.results.length} result(s) for "${response.query}"</div>`;

    for (const entry of response.results) {
        html += `
            <div class="dict-entry" data-id="${entry.id}" data-source="${entry.source}">
                <div class="dict-entry-header">
                    <span class="dict-entry-word">${escapeHtml(entry.word)}</span>
                    <span class="dict-entry-source">${entry.source}</span>
                </div>
                <div class="dict-entry-definition">
                    ${entry.definition}
                </div>
            </div>
        `;
    }

    resultsContainer.innerHTML = html;
}

/**
 * Look up a word from text (called when clicking words)
 */
export async function lookupWord(word, x, y) {
    const dictType = dictTypeSelect?.value || 'PED';

    try {
        const response = await DictionaryAPI.lookup(word, dictType);

        if (response.results && response.results.length > 0) {
            showPopup(word, response.results[0], x, y);
        } else {
            showPopup(word, null, x, y);
        }

        // Update dictionary panel input
        if (queryInput) {
            queryInput.value = word;
        }

        // Add to history
        addToHistory(word, dictType);

    } catch (error) {
        console.error('Dictionary lookup failed:', error);
    }
}

/**
 * Show dictionary popup near the clicked word
 */
function showPopup(word, entry, x, y) {
    // Remove existing popup
    const existing = document.querySelector('.dict-popup');
    if (existing) {
        existing.remove();
    }

    const popup = document.createElement('div');
    popup.className = 'dict-popup';

    if (entry) {
        popup.innerHTML = `
            <button class="dict-popup-close">&times;</button>
            <div class="dict-popup-word">${escapeHtml(entry.word)}</div>
            <div class="dict-popup-definition">${truncateDefinition(entry.definition)}</div>
        `;
    } else {
        popup.innerHTML = `
            <button class="dict-popup-close">&times;</button>
            <div class="dict-popup-word">${escapeHtml(word)}</div>
            <div class="dict-popup-definition">No definition found.</div>
        `;
    }

    // Position popup
    popup.style.left = `${Math.min(x, window.innerWidth - 420)}px`;
    popup.style.top = `${Math.min(y + 20, window.innerHeight - 320)}px`;

    document.body.appendChild(popup);

    // Close button
    popup.querySelector('.dict-popup-close').addEventListener('click', () => {
        popup.remove();
    });

    // Click outside to close
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 100);
}

/**
 * Truncate definition for popup display
 */
function truncateDefinition(definition) {
    // Strip HTML and truncate
    const text = definition.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 300) {
        return text.substring(0, 300) + '...';
    }
    return definition;
}

/**
 * Add to search history
 */
function addToHistory(query, dictType) {
    // Remove if already exists
    searchHistory = searchHistory.filter(h => h.query !== query);

    // Add to beginning
    searchHistory.unshift({ query, dictType, timestamp: Date.now() });

    // Limit size
    if (searchHistory.length > 20) {
        searchHistory = searchHistory.slice(0, 20);
    }

    // Save
    saveHistory();

    // Re-render
    renderHistory();
}

/**
 * Load search history from localStorage
 */
function loadHistory() {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        searchHistory = stored ? JSON.parse(stored) : [];
    } catch {
        searchHistory = [];
    }
}

/**
 * Save search history to localStorage
 */
function saveHistory() {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
    } catch (e) {
        console.warn('Failed to save dictionary history:', e);
    }
}

/**
 * Render search history
 */
function renderHistory() {
    if (!resultsContainer || searchHistory.length === 0) return;

    // Only show history if no results are displayed
    if (resultsContainer.querySelector('.dict-entry')) return;

    let html = '<div class="dict-history"><h4>Recent searches</h4><ul class="dict-history-list">';

    for (const item of searchHistory.slice(0, 10)) {
        html += `<li class="dict-history-item" data-query="${escapeHtml(item.query)}">${escapeHtml(item.query)}</li>`;
    }

    html += '</ul></div>';

    resultsContainer.innerHTML = html;

    // Add click handlers
    resultsContainer.querySelectorAll('.dict-history-item').forEach(item => {
        item.addEventListener('click', () => {
            const query = item.dataset.query;
            queryInput.value = query;
            performSearch(query);
        });
    });
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Switch to dictionary tab and perform lookup
 */
export function switchToDictionaryAndLookup(word) {
    // Switch to dictionary tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="dictionary"]').classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('dictionary-panel').classList.add('active');

    state.setActiveTab('dictionary');

    // Set the query and search
    if (queryInput) {
        queryInput.value = word;
        performSearch(word);
    }
}
