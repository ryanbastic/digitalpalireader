/**
 * API client for Digital Pali Reader
 */

const API_BASE = '/api/v1';

/**
 * Fetch JSON from an API endpoint
 * @param {string} endpoint - API endpoint path
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>}
 */
async function fetchJSON(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Navigation API endpoints
 */
export const NavigationAPI = {
    /**
     * Get all sets (nikāyas)
     * @returns {Promise<{sets: Array}>}
     */
    getHierarchy: () => fetchJSON('/hierarchy'),

    /**
     * Get books for a specific set
     * @param {string} set - Set code (d, m, s, etc.)
     * @returns {Promise<{set: string, name: string, books: Array}>}
     */
    getSetBooks: (set) => fetchJSON(`/hierarchy/${set}`),

    /**
     * Get detailed hierarchy for a book
     * @param {string} set - Set code
     * @param {number} book - Book index
     * @param {string} hier - Hierarchy type (m, a, t)
     * @returns {Promise<{vaggas: Array, suttas: Array}>}
     */
    getBookHierarchy: (set, book, hier = 'm') =>
        fetchJSON(`/hierarchy/${set}/${book}?mat=${hier}`)
};

/**
 * Text API endpoints
 */
export const TextAPI = {
    /**
     * Get text content for a specific section
     * @param {Object} place - Location object
     * @returns {Promise<{content: string, title: string, titles: Object, nav: Object}>}
     */
    getSection: (place) => {
        const { set, book, meta, volume, vagga, sutta, section, hier, script } = place;
        const url = `/text/${set}/${book}/${meta}/${volume}/${vagga}/${sutta}/${section}` +
            `?mat=${hier || 'm'}&script=${script || 'my'}`;
        return fetchJSON(url);
    },

    /**
     * Get HTML content for a location string
     * @param {string} loc - Location string (e.g., "d.0.0.0.0.0.0.m")
     * @param {string} script - Script type (my, th)
     * @returns {Promise<string>}
     */
    getTextHTML: async (loc, script = 'my') => {
        const response = await fetch(`${API_BASE}/text?loc=${encodeURIComponent(loc)}&script=${script}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        return response.text();
    }
};

/**
 * Dictionary API endpoints (Phase 2)
 */
export const DictionaryAPI = {
    /**
     * Look up a word in the dictionary
     * @param {string} query - Word to look up
     * @param {string} dict - Dictionary type (PED, DPPN, MULTI)
     * @param {Object} options - Additional options
     * @returns {Promise<{query: string, results: Array}>}
     */
    lookup: (query, dict = 'PED', options = {}) =>
        fetchJSON(`/dictionary/lookup?q=${encodeURIComponent(query)}&dict=${dict}` +
            `&fuzzy=${options.fuzzy || false}&fulltext=${options.fulltext || false}`),

    /**
     * Get a specific dictionary entry
     * @param {string} dict - Dictionary type
     * @param {string} id - Entry ID
     * @returns {Promise<Object>}
     */
    getEntry: (dict, id) => fetchJSON(`/dictionary/entry/${dict}/${id}`)
};

/**
 * Search API endpoints (Phase 3)
 */
export const SearchAPI = {
    /**
     * Search for text
     * @param {Object} params - Search parameters
     * @returns {Promise<{totalResults: number, results: Array}>}
     */
    search: (params) => fetchJSON('/search', {
        method: 'POST',
        body: JSON.stringify(params)
    })
};

export { fetchJSON };
