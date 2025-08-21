import WinBox from 'winbox/src/js/winbox.js';
import styles from './theme.module.css';

/**
 * Initializes dynamic UI features on DOM ready, including jQuery UI accordion menus and the app menu.
 * Sets up event listeners for menu buttons, sidebar toggles, translations, and responsive layout handling.
 *
 * Should be called at application startup to enable panel/accordion behavior, sliding menus, and widget-based windows.
 *
 * @global
 * @fires initialized - Custom event fired after all dynamic UI windows/menus are registered.
 *
 * @example
 * // Call at the start of your main script:
 * initDynamicUI();
 */
export function initDynamicUI() {
    addEventListener('DOMContentLoaded', () => {
        $('#content, #tools, .widget-l3, .menu-submenu').accordion({
            animate: 200,
            active: 0,
            collapsible: true,
            heightStyle: 'content',
        });
        $('#menu').menu();
    });
}

/**
 * Applies or removes highlight effect on a menu element by toggling its background color.
 * @param {string} id - DOM element ID of the menu item.
 */
function highlightMenu(id) {
    const menu = document.getElementById(id);
    if (!menu) return;
    menu.style.background =
        menu.style.background === styles.primaryHighlightColor
            ? ''
            : styles.primaryHighlightColor;
}

// Sidebar toggle on side-menu button click
document.getElementById('menubutton')?.addEventListener('click', () => {
    $('#sidebar').toggle('slide');
});

// Sidebar close button (hides sidebar)
document
    .getElementById('sidebar-button-close')
    ?.addEventListener('click', () => {
        $('#sidebar').toggle('slide');
    });

// Model menu button event
import {showmodelmenu} from './singlemodels.js';
document
    .getElementById('model-menu-button-start')
    ?.addEventListener('click', showmodelmenu);

// Hide sidebar when viewer is clicked
addEventListener('viewer-left-click', () => {
    $('#sidebar').hide('slide');
});

/**
 * Calculates 1% of the viewport height and updates the '--vh' CSS variable.
 * Used for responsive design especially on mobile devices.
 */
function calculateVH() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

/**
 * Enforces window size bounds and moves/resizes the overview map and other windows for responsive/adaptive UI.
 * Applies max/min width/height based on viewport and positions window overlays.
 * Called on resize events or after translation/DOM change.
 */
function limitWinbox(wb) {
    if (wb.width > wb.maxwidth) wb.width = wb.maxwidth;
    if (wb.height > wb.maxheight) wb.height = wb.maxheight;

    if (wb.width < wb.minwidth) wb.width = wb.minwidth;
    if (wb.height < wb.minheight) wb.height = wb.minheight;
}

/**
 * Resizes and repositions the overview map window and other UI windows responsively.
 */
function resizeOverviewMap() {
    const wb = document.getElementById('win-overview-map')?.winbox;
    if (!wb) return;
    const vh = Math.min(window.innerHeight * 0.01, window.innerWidth * 0.01);

    const maxFactor = 50;
    const minFactor = 20;

    wb.maxheight = vh * maxFactor;
    wb.maxwidth = vh * maxFactor;

    wb.minheight = vh * minFactor;
    wb.minwidth = vh * minFactor;

    limitWinbox(wb);

    wb.resize();

    wb.x = window.innerWidth - wb.width - 5 * vh;
    wb.y = window.innerHeight - wb.height - 5 * vh;
    wb.move();

    // Update other visible winbox windows (centering, bounds)
    const wbs = document.querySelectorAll(
        '.winbox:not(#win-overview-map):not(#win-model-container)',
    );

    wbs.forEach(wb => {
        wb.winbox.maxwidth = window.innerWidth;
        wb.winbox.maxheight = window.innerHeight;
        limitWinbox(wb.winbox);
        wb.winbox.resize();
        wb.winbox.move('center', 'center');
    });
}

/**
 * Updates layout: recalculates vh unit and resizes windowed widgets.
 */
function resize() {
    calculateVH();
    resizeOverviewMap();
}

// — Dynamic WinBox window recreation on translation event —
addEventListener('translated', () => {
    // Auto-create/recreate all WinBox UI elements (marked with 'winbox' attribute)
    const elements = document.querySelectorAll('[winbox]');
    elements.forEach((element, x) => {
        const windowId = `win-${element.id}`;

        const win = new WinBox(element.title, {
            mount: element,
            id: windowId,
            class: ['no-full', 'no-min', 'no-max', 'hide', 'winbox'],
            width: element.getAttribute('width'),
            height: element.getAttribute('height'),
            minwidth: element.getAttribute('minwidth'),
            minheight: element.getAttribute('minheight'),
            x: element.getAttribute('x'),
            y: element.getAttribute('y'),
            border: '0.5rem',
            onclose: () => {
                win.toggleClass('hide');
                win.dom.dispatchEvent(new CustomEvent('close', {}));
                return true;
            },
            oncreate: () => {
                element.setAttribute('loaded', true);
            },
        });
        win.hidden = true;

        // Mark as GUI element window if appropriate
        if (element.getAttribute('data-gui-element') !== null) {
            const win = document.getElementById(windowId);
            if (win) win.winbox.dom.setAttribute('data-gui-element', '');
        }
    });

    // Show overview map by default and position it
    const win = document.getElementById('win-overview-map');
    win.classList.remove('hide');
    const winbox = win?.winbox;
    const clientWidth = window.innerWidth;
    const clientHeight = window.innerHeight;
    winbox.x = clientWidth - winbox.width - clientWidth * 0.02;
    winbox.y = clientHeight - winbox.height - clientHeight * 0.05;
    winbox.move();

    // Tie close of map window to map button state
    const mapBtn = document.getElementById('map_btn');
    win.addEventListener('close', () => {
        mapBtn.active = false;
    });

    // Panel/window highlight toggle and menu integration
    [
        ['contentMenu', 'win-content'],
        ['wms-menu-switch', 'win-theme-menu'],
        ['settings', 'win-settingsContainer'],
        ['toolsMenu', 'win-toolsContainer'],
        ['information', 'win-information-window'],
        ['contact', 'win-contact-window'],
        ['themeMap-div', 'win-themeMapContainer'],
    ].forEach(([ui, win]) => {
        document
            .getElementById(win)
            ?.winbox.dom.addEventListener('close', () => {
                highlightMenu(ui);
            });

        document.getElementById(ui)?.addEventListener('click', () => {
            document.getElementById(win)?.winbox.toggleClass('hide');
            highlightMenu(ui);
        });
    });

    // Attach resize observer to maintain responsive UI on layout/orientation/size changes
    const obs = new ResizeObserver(resize);
    obs.observe(document.body);

    dispatchEvent(new CustomEvent('initialized'));
});
