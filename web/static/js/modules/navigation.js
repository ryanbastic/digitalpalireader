/**
 * Navigation module
 */

import { NavigationAPI } from './api.js';
import { state } from './state.js';

// DOM elements
let setSelect;
let bookSelect;
let hierSelect;
let goButton;
let navTree;

/**
 * Initialize navigation module
 */
export async function initNavigation() {
    // Get DOM elements
    setSelect = document.getElementById('nav-set');
    bookSelect = document.getElementById('nav-book');
    hierSelect = document.getElementById('nav-hier');
    goButton = document.getElementById('nav-go');
    navTree = document.getElementById('nav-tree');

    if (!setSelect || !bookSelect) {
        console.error('Navigation elements not found');
        return;
    }

    // Load hierarchy
    try {
        const hierarchy = await NavigationAPI.getHierarchy();
        state.setHierarchy(hierarchy);
        renderSetSelector(hierarchy.sets);
    } catch (error) {
        console.error('Failed to load hierarchy:', error);
        setSelect.innerHTML = '<option>Error loading sets</option>';
    }

    // Set up event listeners
    setupEventListeners();
}

/**
 * Render the set (nikāya) selector
 */
function renderSetSelector(sets) {
    setSelect.innerHTML = sets.map(s =>
        `<option value="${s.code}">${s.name} (${s.longName})</option>`
    ).join('');

    // Trigger initial book load
    if (sets.length > 0) {
        onSetChange(sets[0].code);
    }
}

/**
 * Handle set selection change
 */
async function onSetChange(setCode) {
    state.setCurrentSet(setCode);

    try {
        const data = await NavigationAPI.getSetBooks(setCode);
        renderBookSelector(data.books);
    } catch (error) {
        console.error('Failed to load books:', error);
        bookSelect.innerHTML = '<option>Error loading books</option>';
    }
}

/**
 * Render the book selector
 */
function renderBookSelector(books) {
    bookSelect.innerHTML = books.map((b, i) => {
        const badges = [];
        if (b.hasMula) badges.push('M');
        if (b.hasAtt) badges.push('A');
        if (b.hasTika) badges.push('T');
        const badgeStr = badges.length > 0 ? ` [${badges.join('')}]` : '';

        return `<option value="${i}">${b.name}${badgeStr}</option>`;
    }).join('');

    // Update available hier options based on first book
    if (books.length > 0) {
        updateHierOptions(books[0]);
        onBookChange(0);
    }
}

/**
 * Update hierarchy type options based on book availability
 */
function updateHierOptions(book) {
    const options = [];
    if (book.hasMula) options.push({ value: 'm', label: 'Mūla' });
    if (book.hasAtt) options.push({ value: 'a', label: 'Aṭṭhakathā' });
    if (book.hasTika) options.push({ value: 't', label: 'Ṭīkā' });

    hierSelect.innerHTML = options.map(o =>
        `<option value="${o.value}">${o.label}</option>`
    ).join('');
}

/**
 * Handle book selection change
 */
async function onBookChange(bookIndex) {
    state.setCurrentBook(bookIndex);

    const setCode = setSelect.value;
    const hier = hierSelect.value;

    try {
        const hierarchy = await NavigationAPI.getBookHierarchy(setCode, bookIndex, hier);
        renderNavTree(hierarchy);
    } catch (error) {
        console.error('Failed to load book hierarchy:', error);
        navTree.innerHTML = '<p class="error">Error loading sections</p>';
    }
}

/**
 * Render the navigation tree
 */
function renderNavTree(hierarchy) {
    if (!hierarchy.vaggas || hierarchy.vaggas.length === 0) {
        navTree.innerHTML = '<p class="empty">No sections found</p>';
        return;
    }

    let html = '<ul class="section-list">';

    // Render vaggas (h2 level)
    for (const vagga of hierarchy.vaggas) {
        html += `<li class="collapsible" data-vagga="${vagga.index}">
            ${vagga.name}
        </li>`;
    }

    html += '</ul>';

    // If we have suttas (h4 level), show them as a flat list for now
    if (hierarchy.suttas && hierarchy.suttas.length > 0) {
        html += '<h4>Sections</h4><ul class="section-list">';
        for (const sutta of hierarchy.suttas) {
            html += `<li class="nav-tree-item" data-section="${sutta.index}">
                ${sutta.name}
            </li>`;
        }
        html += '</ul>';
    }

    navTree.innerHTML = html;

    // Add click handlers for sections
    navTree.querySelectorAll('.nav-tree-item').forEach(item => {
        item.addEventListener('click', () => {
            const sectionIndex = parseInt(item.dataset.section);
            navigateToSection(sectionIndex);
        });
    });
}

/**
 * Navigate to a specific section
 */
function navigateToSection(sectionIndex) {
    const place = {
        set: setSelect.value,
        book: parseInt(bookSelect.value),
        meta: 0,
        volume: 0,
        vagga: 0,
        sutta: 0,
        section: sectionIndex,
        hier: hierSelect.value,
        script: state.preferences.script
    };

    state.navigateTo(place);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    setSelect.addEventListener('change', (e) => {
        onSetChange(e.target.value);
    });

    bookSelect.addEventListener('change', (e) => {
        onBookChange(parseInt(e.target.value));
    });

    hierSelect.addEventListener('change', () => {
        // Reload book hierarchy when hier changes
        onBookChange(parseInt(bookSelect.value));
    });

    goButton.addEventListener('click', () => {
        navigateToSection(0);
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            // Update button states
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update panel visibility
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`${tab}-panel`).classList.add('active');

            state.setActiveTab(tab);
        });
    });
}

/**
 * Navigate to a location from URL or state
 */
export function navigateToLocation(loc) {
    const place = state.parseLocation(loc);

    // Update selectors
    setSelect.value = place.set;
    onSetChange(place.set).then(() => {
        bookSelect.value = place.book.toString();
        hierSelect.value = place.hier;
        onBookChange(place.book);

        // Navigate to the place
        state.navigateTo(place);
    });
}
