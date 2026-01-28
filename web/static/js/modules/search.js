/**
 * Search module
 */

import { SearchAPI } from './api.js';
import { state } from './state.js';

// DOM elements
let queryInput;
let setSelect;
let hierSelect;
let regexCheckbox;
let searchBtn;
let resultsContainer;

// Search state
let currentQuery = '';
let currentResults = [];
let hasMore = false;
let currentOffset = 0;

// History
const HISTORY_KEY = 'dpr_search_history';
let searchHistory = [];

/**
 * Initialize search module
 */
export function initSearch() {
    // Get DOM elements
    queryInput = document.getElementById('search-query');
    setSelect = document.getElementById('search-set');
    hierSelect = document.getElementById('search-hier');
    regexCheckbox = document.getElementById('search-regex');
    searchBtn = document.getElementById('search-btn');
    resultsContainer = document.getElementById('search-results');

    if (!queryInput || !resultsContainer) {
        console.error('Search elements not found');
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
            performSearch(query, true);
        }
    });

    // Enter key in search input
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = queryInput.value.trim();
            if (query) {
                performSearch(query, true);
            }
        }
    });

    // Scope/type changes trigger new search if query exists
    [setSelect, hierSelect].forEach(select => {
        select.addEventListener('change', () => {
            const query = queryInput.value.trim();
            if (query && currentQuery === query) {
                performSearch(query, true);
            }
        });
    });
}

/**
 * Perform search
 */
async function performSearch(query, reset = true) {
    if (reset) {
        currentOffset = 0;
        currentResults = [];
    }

    currentQuery = query;

    // Show loading state
    if (reset) {
        resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
    }

    try {
        const request = {
            query: query,
            type: setSelect.value ? 1 : 0, // 0 = all, 1 = specific set
            set: setSelect.value || undefined,
            hier: hierSelect.value,
            regex: regexCheckbox.checked,
            limit: 50,
            offset: currentOffset
        };

        const response = await SearchAPI.search(request);

        currentResults = reset ? response.results : [...currentResults, ...response.results];
        hasMore = response.hasMore;

        renderResults(response, reset);

        // Add to history
        if (reset) {
            addToHistory(query);
        }

    } catch (error) {
        console.error('Search failed:', error);
        resultsContainer.innerHTML = `
            <div class="search-error">
                <h3>Search Error</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render search results
 */
function renderResults(response, reset) {
    if (response.results.length === 0 && reset) {
        resultsContainer.innerHTML = `
            <div class="search-no-results">
                <h3>No results found</h3>
                <p>Try different search terms or expand the scope.</p>
            </div>
        `;
        return;
    }

    let html = '';

    if (reset) {
        html = `<div class="search-result-count">Found ${response.totalResults} result(s) for "${escapeHtml(response.query)}"</div>`;
    }

    for (const result of response.results) {
        const setName = getSetName(result.set);
        html += `
            <div class="search-result" data-location="${result.location}">
                <div class="search-result-header">
                    <span class="search-result-title">
                        <span class="search-result-set">${setName}</span>
                        ${escapeHtml(result.title)}
                    </span>
                </div>
                <div class="search-result-snippet">${result.snippet}</div>
            </div>
        `;
    }

    if (hasMore) {
        html += `<button class="search-load-more">Load more results</button>`;
    }

    if (reset) {
        resultsContainer.innerHTML = html;
    } else {
        // Remove old load more button and append new results
        const oldBtn = resultsContainer.querySelector('.search-load-more');
        if (oldBtn) oldBtn.remove();
        resultsContainer.insertAdjacentHTML('beforeend', html);
    }

    // Add click handlers
    resultsContainer.querySelectorAll('.search-result').forEach(result => {
        result.addEventListener('click', () => {
            const location = result.dataset.location;
            navigateToResult(location);
        });
    });

    // Load more button handler
    const loadMoreBtn = resultsContainer.querySelector('.search-load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentOffset += 50;
            performSearch(currentQuery, false);
        });
    }
}

/**
 * Navigate to a search result
 */
function navigateToResult(location) {
    const place = state.parseLocation(location);
    state.navigateTo(place);

    // Switch to navigate tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="navigate"]').classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('navigate-panel').classList.add('active');

    state.setActiveTab('navigate');
}

/**
 * Get display name for a set
 */
function getSetName(setCode) {
    const names = {
        'v': 'Vin',
        'd': 'DN',
        'm': 'MN',
        's': 'SN',
        'a': 'AN',
        'k': 'KN',
        'y': 'Abhi'
    };
    return names[setCode] || setCode.toUpperCase();
}

/**
 * Add to search history
 */
function addToHistory(query) {
    // Remove if already exists
    searchHistory = searchHistory.filter(h => h !== query);

    // Add to beginning
    searchHistory.unshift(query);

    // Limit size
    if (searchHistory.length > 20) {
        searchHistory = searchHistory.slice(0, 20);
    }

    // Save
    saveHistory();
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
        console.warn('Failed to save search history:', e);
    }
}

/**
 * Render search history
 */
function renderHistory() {
    if (!resultsContainer || searchHistory.length === 0) return;

    let html = '<div class="search-history"><h4>Recent searches</h4><ul class="search-history-list">';

    for (const query of searchHistory.slice(0, 10)) {
        html += `<li class="search-history-item" data-query="${escapeHtml(query)}">${escapeHtml(query)}</li>`;
    }

    html += '</ul></div>';

    resultsContainer.innerHTML = html;

    // Add click handlers
    resultsContainer.querySelectorAll('.search-history-item').forEach(item => {
        item.addEventListener('click', () => {
            const query = item.dataset.query;
            queryInput.value = query;
            performSearch(query, true);
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
 * Switch to search tab and perform search
 */
export function switchToSearchAndQuery(query) {
    // Switch to search tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="search"]').classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('search-panel').classList.add('active');

    state.setActiveTab('search');

    // Set the query and search
    if (queryInput && query) {
        queryInput.value = query;
        performSearch(query, true);
    }
}
