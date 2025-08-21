import '@cesium/engine/Source/Widget/CesiumWidget.css';
import '@cesium/widgets/Source/InfoBox/InfoBox.css';
import path from 'path-browserify';
import {app} from './Core/Application.js';
import {parseConfigFromUrl} from './Core/ConfigParser.js';
import {flyHome} from './main.js';

import {
    createMeshTable,
    createTable_3dm,
    createTable_localdata,
} from './Core/utilities.js';
import {createRemoveUI, createTable_hidden} from './hide.js';

import WinBox from 'winbox/src/js/winbox.js';
import {i18next, initI18n} from './i18n.js';
import styles from './theme.module.css';

/**
 * Initializes all application data tables and associated UI for hidden models, remove controls,
 * external 3D model management, local data, and mesh layers.
 * This is typically called at application startup after necessary services and data have loaded.
 *
 * @function
 * @returns {void}
 */
function initializeTables() {
    createTable_hidden();
    createRemoveUI();
    createTable_3dm();
    createTable_localdata();
    createMeshTable();
}

/**
 * Loads the project configuration asynchronously, resolving the active project file name
 * from the URL manager (or defaults), constructs the resolved file path, and merges
 * the parsed config file with defaults (uses "./locales" for the locales path by default).
 *
 * @async
 * @returns {Promise<Object>} Resolves to the merged configuration object for the application.
 */
async function loadConfig() {
    const projectName = app.urlManager.get(
        'project',
        'string',
        import.meta.env.VITE_DEFAULT_PROJECT_FILE,
    );

    const projectFile = projectName.endsWith('.json')
        ? projectName
        : `${projectName}.json`;

    const defaultConfig = {
        locales: './locales',
    };

    const PROJECT_LOCAL_FILE_PATH = './projectFiles/local/';
    const configPath = path.join(PROJECT_LOCAL_FILE_PATH, projectFile);

    return {...defaultConfig, ...(await parseConfigFromUrl(configPath))};
}

/**
 * A promise that resolves to the application's configuration object, used
 * throughout startup and initializations. Should be awaited before accessing app.config.
 *
 * @type {Promise<Object>}
 * @see loadConfig
 */
export const configReady = loadConfig();

import * as Cesium from '@cesium/engine';
import {loadFromConfig} from './loadLayer.js';

if (import.meta.env.VITE_DEBUG) {
    window.Cesium = Cesium;
    window.WinBox = WinBox;
}

/**
 * Bootstraps the full application: loads config, initializes i18n, theming,
 * tables, the WMS service system, main viewer layers, translation, and GUI manager.
 * Handles mobile quirks, debug globals, loading overlay, and fires layer/translation
 * completion events.
 *
 * This function is awaited at startup. All features and UI are only available after
 * successful initialization.
 *
 * @async
 * @function
 * @returns {Promise<void>}
 */
async function initializeApp() {
    app.theme = styles;

    let start = performance.now();
    const config = await configReady;

    app.config = config;
    console.log(performance.now() - start);

    start = performance.now();
    const ns = import.meta.env.VITE_I18N_NAMESPACES.split(',');

    await initI18n(config.locales, ns);

    initializeTables();

    // Expose i18next globally in debug mode
    if (import.meta.env.VITE_DEBUG) window.i18next = i18next;

    // Remove pedestrian mode button in coarse pointer/mobile environments
    if (window.matchMedia('(pointer: coarse)').matches) {
        document.getElementById('pedestrian_btn')?.remove();
    }

    await loadFromConfig(config);
    console.log(performance.now() - start);

    start = performance.now();
    dispatchEvent(new CustomEvent('layers-loaded'));
    await app.translator.translateDocument(document);
    dispatchEvent(new CustomEvent('translated'));

    app.guiManager.initializeFromDocument(document);
    app.guiManager.show = Boolean(app.urlManager.get('gui', 'boolean', true));
    console.log(performance.now() - start);

    flyHome(0);
    const LOADING_OVERLAY_DELAY = 100;

    setTimeout(() => {
        document.querySelector('.loader-overlay')?.setAttribute('hidden', true);
    }, LOADING_OVERLAY_DELAY);

    initializeWMServices();
}

// Application startup: triggers the primary initialization routine on load/entry.
await initializeApp();

import './Components/ge-coordinates/ge-coordinates.js';
import './Components/ge-footer/ge-footer.js';
import './Components/ge-header/ge-header.js';
import './Components/ge-infobox/ge-infobox.js';
import './Components/ge-link-list/ge-link-list.js';
import {initializeWMServices} from './WMS.js';
