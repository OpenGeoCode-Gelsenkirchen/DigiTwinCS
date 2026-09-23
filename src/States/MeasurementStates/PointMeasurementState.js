import {GeListItem} from '../../Components/GeListItem/GeListItem.js';
import {PointMeasurement} from '../../Core/Measurement/PointMeasurement.js';
import {WindowFactory} from '../../Core/WindowFactory.js';
import {setMeasurementBtnCallback} from '../../measurement.js';
import {MeasurementState} from './MeasurementState.js';

/**
 * PointMeasurementState – App UI state for interactive point measurements in a Cesium viewer.
 *
 * Ensures singleton behavior: only one active at a time.
 * Manages lifecycle of PointMeasurement tools, button handlers, info window display, event listeners, and measurement cleanup.
 * Integrates with the measurement list for UI result management.
 *
 * @class
 * @extends MeasurementState
 *
 * @param {HTMLButtonElement} button - UI button that activates this state.
 * @static {PointMeasurementState} instance - Singleton reference.
 *
 * @example
 * const state = new PointMeasurementState(myPointBtn);
 * state.apply(app);
 */
export class PointMeasurementState extends MeasurementState {
    /**
     * Singleton constructor. Returns existing instance if already created.
     * @param {HTMLButtonElement} button
     * @returns {LineMeasurementState}
     */
    constructor(button) {
        if (PointMeasurementState.instance) {
            return PointMeasurementState.instance;
        } else {
            super(
                'line',
                button,
                [
                    'excavation',
                    'polygon',
                    'height',
                    'line',
                    'dimension',
                    'viewshed',
                    'information',
                    'pedestrian',
                ],
                ['information'],
            );

            PointMeasurementState.instance = this;
        }
    }

    /**
     * Activates line measurement mode: disables selection, starts new measurement,
     * removes unfinished measurements, binds events, and opens the info window.
     * @param {any} app - The main application object.
     */
    apply(app) {
        app.handler.disableHighlighting();

        const measurement = new PointMeasurement(app, {render: true});
        app.measurements.forEach(m => {
            if (!m.finished && !m.destroyed) {
                m.destroy();
            }
        });
        app.measurements.push(measurement);
        this.initialize(app, measurement);
        this.setEventHandlers(app);
        this.window = WindowFactory.createPointMeasurementWindow({
            id: 'pointMeasureWindow',
        });
        this.window.show();
    }

    /**
     * Deactivates line measurement mode: restores selection, finalizes/cancels measurement,
     * cleans up button state, closes window, and removes event listeners.
     * @param {any} app
     * @returns {boolean} Always true.
     */
    remove(app) {
        const index = app.measurements.length - 1;
        const measurement = app.measurements[index];

        if (measurement.finished) {
            const measurementList = document.querySelector('#measurementList');
            if (measurementList) {
                const item = new GeListItem({
                    name: `Messung ${measurementList.nextId + 1}`,
                    src: 'images/common/point.svg',
                    obj: measurement,
                    checked: true,
                    onClickCallback: () => {
                        item.checked = !item.checked;
                    },
                    onCheckedCallback: checked => {
                        measurement.show = checked;
                    },
                    onDeleteCallback: () => {
                        measurement.destroy();
                        measurementList.remove(item);
                        app.measurements.splice(index, 1);
                    },
                });
                measurementList.push(item);
            }
        }
        if (!measurement.finished && !measurement.destroyed) {
            measurement.cancel();
            app.measurements.pop();
        }

        super.terminate();
        this.button.addEventListener('click', () => {
            setMeasurementBtnCallback(app, PointMeasurementState, this.button);
        });
        this.button.active = false;

        this.removeEventHandlers(app);
        this.window.close();
        document.documentElement.style.cursor = 'default';
        setTimeout(() => {
            app.handler.enableHighlighting();
        }, 150);

        return true;
    }

    /**
     * Installs a right-click event handler to terminate measurement mode when the user right-clicks the viewer.
     * @param {any} app
     */
    setEventHandlers(app) {
        this.leftClickHandle = () => {
            const measurement = app.measurements[app.measurements.length - 1];
            if (measurement.terminate()) {
                app.removeState(this);
            }
        };
        app.handler.events.addEventListener(
            'viewer-left-click',
            this.leftClickHandle,
        );
    }

    /**
     * Removes the right-click event handler set for this state.
     * @param {any} app
     */
    removeEventHandlers(app) {
        app.handler.events.removeEventListener(
            'viewer-left-click',
            this.leftClickHandle,
        );
    }
}
