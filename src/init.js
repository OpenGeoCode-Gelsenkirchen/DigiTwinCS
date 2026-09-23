import {ClippingPolygonCollection} from '@cesium/engine';
import '@cesium/engine/Source/Widget/CesiumWidget.css';
import '@cesium/widgets/Source/InfoBox/InfoBox.css';
import path from 'path-browserify';
import WinBox from 'winbox/src/js/winbox.js';
import '../styles/backup.css';
import styles from '../styles/theme.module.css';
import {InspectorController} from './Components/GeInspector/GeInspectorController.js';
import {app} from './Core/Application.js';
import {parseConfigFromUrl} from './Core/ConfigParser.js';
import {IconCache} from './Core/IconCache.js';
import {
    createMeshTable,
    createTable_3dm,
    createTable_localdata,
} from './Core/utilities.js';
import {initializeWMServices} from './WMS.js';
import {createRemoveUI, createTable_hidden} from './hide.js';
import {i18next, initI18n} from './i18n.js';
import {flyHome} from './main.js';

function setupCompass(compass, camera) {
    if (compass) {
        compass.camera = camera;
    }
}

function setupInspector(inspector, app) {
    if (inspector) {
        const inspectorController = new InspectorController(inspector);
        inspector.translator = app.translator;
        app.inspectorController = inspectorController;
    }
}

async function setupIconCache() {
    const iconCache = IconCache.shared;

    await iconCache.preloadAll({
        close: './images/common/close.svg',
    });

    return iconCache;
}

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
    //createTable_label();
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

async function bootI18n(locales, namespaces) {
    await initI18n(locales, namespaces);

    // Expose i18next globally in debug mode
    if (import.meta.env.VITE_DEBUG) window.i18next = i18next;
}

async function setupDocument(i18n) {
    document.documentElement.lang = i18n.language;

    // Remove pedestrian mode button in coarse pointer/mobile environments
    if (window.matchMedia('(pointer: coarse)').matches) {
        document.getElementById('pedestrian_btn')?.remove();
    }

    await app.translator.translateDocument(document);
    dispatchEvent(new CustomEvent('translated'));
}

async function setupApp(styles, config) {
    app.theme = styles;
    app.config = config;

    const globe = app.viewer.scene.globe;

    // Ensure clippingPolygons exist globally
    if (!globe.clippingPolygons)
        globe.clippingPolygons = new ClippingPolygonCollection();
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
    const namespaces = import.meta.env.VITE_I18N_NAMESPACES.split(',');
    const rawConfig = await configReady;

    await bootI18n(rawConfig.locales, namespaces);

    console.log(rawConfig);

    const translatedConfig = app.translator.translateConfig(rawConfig);
    setupApp(styles, translatedConfig);
    initializeTables();

    const iconCache = await setupIconCache();

    await loadFromConfig(app.config, iconCache);
    dispatchEvent(new CustomEvent('layers-loaded'));

    await setupDocument(i18next);

    app.guiManager.initializeFromDocument(document);
    app.guiManager.show = Boolean(app.urlManager.get('gui', 'boolean', true));

    flyHome(0);

    document.querySelector('.loader-overlay')?.setAttribute('hidden', true);

    initializeWMServices();

    setupInspector(document.querySelector('model-inspector'), app);
    setupCompass(document.querySelector('ge-compass'), app.viewer.scene.camera);
}

// Application startup: triggers the primary initialization routine on load/entry.
await initializeApp();

import './Components/GeCAnnotation/GeCAnnotation.ts';
import './Components/GeCompass/GeCompass.ts';
import './Components/GeCoordinates/GeCoordinates.js';
import './Components/GeFooter/GeFooter.js';
import './Components/GeHeader/GeHeader.js';
import './Components/GeInfobox/GeInfobox.js';
import './Components/GeInspector/GeInspector.ts';
import './Components/GeLinkList/GeLinkList.js';
import './Components/GeModalWindow/GeModalWindow.ts';
import './Components/GeTree/GeTree.ts';
import './Components/LinkAnnnotation/LinkAnnotation';
import './Components/SensorAnnotation/SensorAnnotation';
