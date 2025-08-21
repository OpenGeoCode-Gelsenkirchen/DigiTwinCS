import {
    ErrorGeWindow,
    InformationGeWindow,
} from '../Components/ge-window/ge-window.js';
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
 * @method createInformationGeWindow(config) - Instantiates an InformationGeWindow with the given configuration.
 * @method createErrorGeWindow(config)      - Instantiates an ErrorGeWindow with the given configuration.
 * @method createBasicMeasurementWindow({id}) - Returns a standard basic measurement InformationGeWindow.
 * @method createHeightMeasurementWindow()    - Returns a height measurement InformationGeWindow.
 * @method createAreaWindow()                 - Returns an area measurement InformationGeWindow.
 * @method createLengthWindow()               - Returns a length measurement InformationGeWindow.
 * @method createViewshedWindow()             - Returns a viewshed InformationGeWindow.
 *
 * @example
 * // Show a basic measurement window:
 * const win = WindowFactory.createBasicMeasurementWindow({ id: "bmw-001" });
 * // win is an InformationGeWindow with translated title/content.
 *
 * // For areas:
 * const areaWin = WindowFactory.createAreaWindow();
 */
export class WindowFactory {
    /**
     * Creates an InformationGeWindow with the given config.
     * @param {object} config - Window config (title, content, etc).
     * @returns {InformationGeWindow}
     */
    static createInformationGeWindow(config) {
        return new InformationGeWindow(config);
    }

    /**
     * Creates an ErrorGeWindow with the given config.
     * @param {object} config - Error window config (title, message, etc).
     * @returns {ErrorGeWindow}
     */
    static createErrorGeWindow(config) {
        return new ErrorGeWindow(config);
    }

    /**
     * Creates a basic measurement information window with translation for title/content.
     * @param {object} options
     * @param {string} options.id - Unique window ID.
     * @returns {InformationGeWindow}
     */
    static createBasicMeasurementWindow({id}) {
        return new InformationGeWindow({
            id: id,
            title: i18next.t('common:body.basic-measurement.title'),
            content: i18next.t('common:body.basic-measurement.content'),
        });
    }

    /**
     * Creates a height measurement information window.
     * @returns {InformationGeWindow}
     */
    static createHeightMeasurementWindow() {
        return new InformationGeWindow({
            id: 'heightMeasurementWindow',
            title: i18next.t('common:body.height-measurement.title'),
            content: i18next.t('common:body.height-measurement.content'),
        });
    }

    /**
     * Creates a building area measurement information window.
     * @returns {InformationGeWindow}
     */
    static createAreaWindow() {
        return new InformationGeWindow({
            id: 'areaWindow',
            title: i18next.t('common:body.building-area-measurement.title'),
            content: i18next.t('common:body.building-area-measurement.content'),
        });
    }

    /**
     * Creates a building length measurement information window.
     * @returns {InformationGeWindow}
     */
    static createLengthWindow() {
        return new InformationGeWindow({
            id: 'lengthWindow',
            title: i18next.t('common:body.building-length-measurement.title'),
            content: i18next.t(
                'common:body.building-length-measurement.content',
            ),
        });
    }

    /**
     * Creates a viewshed information window.
     * @returns {InformationGeWindow}
     */
    static createViewshedWindow() {
        return new InformationGeWindow({
            id: 'viewshedWindow',
            title: i18next.t('common:body.viewshed.title'),
            content: i18next.t('common:body.viewshed.content'),
        });
    }
}
