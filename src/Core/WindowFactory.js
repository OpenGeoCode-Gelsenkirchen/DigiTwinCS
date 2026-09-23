import {GeErrorWindow} from '../Components/GeWindow/src/GeErrorWindow.js';
import {GeInformationWindow} from '../Components/GeWindow/src/GeInformationWindow.js';
import {GeLoadingWindow} from '../Components/GeWindow/src/GeLoadingWindow.js';
import {GeWarningWindow} from '../Components/GeWindow/src/GeWarningWindow.js';
import {i18next} from '../i18n.js';

/**
 * WindowFactory – Static factory class to create various types of informational and error windows for the application UI.
 *
 * Provides unified helpers for modal/information window creation, including measurement, area, and context-specific windows,
 * using i18next translations for titles and content.
 *
 * @class
 *
 * @static
 * @method createGeInformationWindow(config) - Instantiates an GeInformationWindow with the given configuration.
 * @method createGeErrorWindow(config)      - Instantiates an GeErrorWindow with the given configuration.
 * @method createBasicMeasurementWindow({id}) - Returns a standard basic measurement GeInformationWindow.
 * @method createHeightMeasurementWindow()    - Returns a height measurement GeInformationWindow.
 * @method createAreaWindow()                 - Returns an area measurement GeInformationWindow.
 * @method createLengthWindow()               - Returns a length measurement GeInformationWindow.
 * @method createViewshedWindow()             - Returns a viewshed GeInformationWindow.
 *
 * @example
 * // Show a basic measurement window:
 * const win = WindowFactory.createBasicMeasurementWindow({ id: "bmw-001" });
 * // win is an GeInformationWindow with translated title/content.
 *
 * // For areas:
 * const areaWin = WindowFactory.createAreaWindow();
 */
export class WindowFactory {
    /**
     * Creates an GeInformationWindow with the given config.
     * @param {object} config - Window config (title, content, etc).
     * @returns {GeInformationWindow}
     */
    static createGeInformationWindow(config) {
        return GeInformationWindow.create(config.id, config);
    }

    /**
     * Creates a GeWarningWindow with the given config.
     * @param {object} config - Warning window config (title, message, etc).
     * @returns {GeWarningWindow}
     */
    static createGeWarningWindow(config) {
        return GeWarningWindow.create(config.id, config);
    }

    /**
     * Creates an GeErrorWindow with the given config.
     * @param {object} config - Error window config (title, message, etc).
     * @returns {GeErrorWindow}
     */
    static createGeErrorWindow(config) {
        return GeErrorWindow.create(config.id, config);
    }

    /**
     * Creates a basic measurement information window with translation for title/content.
     * @param {object} options
     * @param {string} options.id - Unique window ID.
     * @returns {GeInformationWindow}
     */
    static createBasicMeasurementWindow() {
        return GeInformationWindow.create('basicMeasurementWindow', {
            title: i18next.t('common:body.basic-measurement.title'),
            message: i18next.t('common:body.basic-measurement.content'),
        });
    }

    /**
     * Creates a height measurement information window.
     * @returns {GeInformationWindow}
     */
    static createHeightMeasurementWindow() {
        return GeInformationWindow.create('heightMeasurementWindow', {
            title: i18next.t('common:body.height-measurement.title'),
            message: i18next.t('common:body.height-measurement.content'),
        });
    }

    /**
     * Creates a point measurement information window.
     * @returns {GeInformationWindow}
     */
    static createPointMeasurementWindow() {
        return GeInformationWindow.create('pointMeasurementWindow', {
            title: i18next.t('common:body.point-measurement.title'),
            message: i18next.t('common:body.point-measurement.content'),
        });
    }

    /**
     * Creates a building area measurement information window.
     * @returns {GeInformationWindow}
     */
    static createAreaWindow() {
        return GeInformationWindow.create('areaWindow', {
            title: i18next.t('common:body.building-area-measurement.title'),
            message: i18next.t('common:body.building-area-measurement.content'),
        });
    }

    /**
     * Creates a building length measurement information window.
     * @returns {GeInformationWindow}
     */
    static createLengthWindow() {
        return GeInformationWindow.create('lengthWindow', {
            title: i18next.t('common:body.building-length-measurement.title'),
            message: i18next.t(
                'common:body.building-length-measurement.content',
            ),
        });
    }

    /**
     * Creates a viewshed information window.
     * @returns {GeInformationWindow}
     */
    static createViewshedWindow() {
        return GeInformationWindow.create('viewshedWindow', {
            title: i18next.t('common:body.viewshed.title'),
            message: i18next.t('common:body.viewshed.content'),
        });
    }

    /**
     * Creates a loading window.
     * @returns {GeLoadingWindow}
     */
    static createLoadingWindow() {
        return GeLoadingWindow.create('loadingWindow', {
            title: 'Lädt Daten...',
        });
    }
}
