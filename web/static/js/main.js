/**
 * Digital Pali Reader - Main Entry Point
 */

import { initNavigation, navigateToLocation } from './modules/navigation.js';
import { initText, handlePopState, loadFromURL } from './modules/text.js';
import { initDictionary, switchToDictionaryAndLookup } from './modules/dictionary.js';
import { initSearch, switchToSearchAndQuery } from './modules/search.js';
import { state } from './modules/state.js';

/**
 * Initialize the application
 */
async function init() {
    console.log('Digital Pāli Reader initializing...');

    try {
        // Initialize modules
        await initNavigation();
        initText();
        initDictionary();
        initSearch();

        // Handle browser history
        handlePopState();

        // Check for URL parameters
        loadFromURL();

        console.log('Digital Pāli Reader ready');

    } catch (error) {
        console.error('Failed to initialize:', error);
        document.getElementById('text-content').innerHTML = `
            <div class="empty-state">
                <h2>Error Starting Application</h2>
                <p>${error.message}</p>
                <p>Please check the browser console for details.</p>
            </div>
        `;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.DPR = {
    state,
    navigateToLocation,
    lookupWord: switchToDictionaryAndLookup,
    search: switchToSearchAndQuery
};
