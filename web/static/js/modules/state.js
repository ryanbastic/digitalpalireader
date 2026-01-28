/**
 * Application state management
 */

const STORAGE_KEYS = {
    HISTORY: 'dpr_nav_history',
    BOOKMARKS: 'dpr_bookmarks',
    PREFERENCES: 'dpr_preferences'
};

/**
 * Simple event emitter for state changes
 */
class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => callback(data));
    }
}

/**
 * Application state
 */
export class AppState extends EventEmitter {
    constructor() {
        super();

        // Navigation state
        this.hierarchy = null;
        this.currentSet = null;
        this.currentBook = null;
        this.currentPlace = null;

        // UI state
        this.activeTab = 'navigate';
        this.sidebarOpen = true;

        // History and bookmarks
        this.history = this.loadFromStorage(STORAGE_KEYS.HISTORY, []);
        this.bookmarks = this.loadFromStorage(STORAGE_KEYS.BOOKMARKS, []);

        // User preferences
        this.preferences = this.loadFromStorage(STORAGE_KEYS.PREFERENCES, {
            script: 'my',
            hier: 'm',
            fontSize: 'normal'
        });
    }

    /**
     * Load data from localStorage
     */
    loadFromStorage(key, defaultValue) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * Save data to localStorage
     */
    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    /**
     * Set the navigation hierarchy
     */
    setHierarchy(hierarchy) {
        this.hierarchy = hierarchy;
        this.emit('hierarchy:loaded', hierarchy);
    }

    /**
     * Set the current set (nikāya)
     */
    setCurrentSet(setCode) {
        this.currentSet = setCode;
        this.currentBook = null;
        this.emit('set:changed', setCode);
    }

    /**
     * Set the current book
     */
    setCurrentBook(bookIndex) {
        this.currentBook = bookIndex;
        this.emit('book:changed', bookIndex);
    }

    /**
     * Navigate to a specific place
     */
    navigateTo(place) {
        this.currentPlace = place;
        this.addToHistory(place);
        this.emit('navigate', place);
    }

    /**
     * Parse a location string into a place object
     */
    parseLocation(loc) {
        const parts = loc.split('.');
        return {
            set: parts[0] || 'd',
            book: parseInt(parts[1]) || 0,
            meta: parseInt(parts[2]) || 0,
            volume: parseInt(parts[3]) || 0,
            vagga: parseInt(parts[4]) || 0,
            sutta: parseInt(parts[5]) || 0,
            section: parseInt(parts[6]) || 0,
            hier: parts[7] || 'm',
            script: this.preferences.script
        };
    }

    /**
     * Convert a place object to a location string
     */
    placeToString(place) {
        return `${place.set}.${place.book}.${place.meta}.${place.volume}.${place.vagga}.${place.sutta}.${place.section}.${place.hier}`;
    }

    /**
     * Add a place to navigation history
     */
    addToHistory(place) {
        const entry = {
            place,
            timestamp: Date.now()
        };

        // Remove duplicates
        this.history = this.history.filter(h =>
            this.placeToString(h.place) !== this.placeToString(place)
        );

        // Add to beginning
        this.history.unshift(entry);

        // Limit history size
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }

        this.saveToStorage(STORAGE_KEYS.HISTORY, this.history);
        this.emit('history:updated', this.history);
    }

    /**
     * Add a bookmark
     */
    addBookmark(place, title) {
        const bookmark = {
            place,
            title,
            timestamp: Date.now()
        };

        // Check if already bookmarked
        const exists = this.bookmarks.some(b =>
            this.placeToString(b.place) === this.placeToString(place)
        );

        if (!exists) {
            this.bookmarks.push(bookmark);
            this.saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
            this.emit('bookmarks:updated', this.bookmarks);
        }

        return !exists;
    }

    /**
     * Remove a bookmark
     */
    removeBookmark(place) {
        this.bookmarks = this.bookmarks.filter(b =>
            this.placeToString(b.place) !== this.placeToString(place)
        );
        this.saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
        this.emit('bookmarks:updated', this.bookmarks);
    }

    /**
     * Check if a place is bookmarked
     */
    isBookmarked(place) {
        return this.bookmarks.some(b =>
            this.placeToString(b.place) === this.placeToString(place)
        );
    }

    /**
     * Update user preferences
     */
    setPreference(key, value) {
        this.preferences[key] = value;
        this.saveToStorage(STORAGE_KEYS.PREFERENCES, this.preferences);
        this.emit('preferences:updated', { key, value });
    }

    /**
     * Set the active tab
     */
    setActiveTab(tab) {
        this.activeTab = tab;
        this.emit('tab:changed', tab);
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        this.emit('sidebar:toggled', this.sidebarOpen);
    }
}

// Create and export singleton instance
export const state = new AppState();
