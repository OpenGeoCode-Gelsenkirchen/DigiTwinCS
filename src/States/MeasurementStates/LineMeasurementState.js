import {GeListItem} from '../../Components/ge-list-item/ge-list-item.js';
import {PolylineMeasurement} from '../../Core/Measurement/PolylineMeasurement.js';
import {WindowFactory} from '../../Core/WindowFactory.js';
import {setMeasurementBtnCallback} from '../../measurement.js';
import {MeasurementState} from './MeasurementState.js';

/**
 * LineMeasurementState – App UI state for interactive polyline (distance) measurements in a Cesium viewer.
 *
 * Ensures singleton behavior: only one active at a time.
 * Manages lifecycle of PolylineMeasurement tools, button handlers, info window display, event listeners, and measurement cleanup.
 * Integrates with the measurement list for UI result management.
 *
 * @class
 * @extends MeasurementState
 *
 * @param {HTMLButtonElement} button - UI button that activates this state.
 * @static {LineMeasurementState} instance - Singleton reference.
 *
 * @example
 * const state = new LineMeasurementState(myLineBtn);
 * state.apply(app);
 */
export class LineMeasurementState extends MeasurementState {
    /**
     * Singleton constructor. Returns existing instance if already created.
     * @param {HTMLButtonElement} button
     * @returns {LineMeasurementState}
     */
    constructor(button) {
        if (LineMeasurementState.instance) {
            return LineMeasurementState.instance;
        } else {
            super(
                'line',
                button,
                [
                    'excavation',
                    'polygon',
                    'height',
                    'dimension',
                    'viewshed',
                    'information',
                    'pedestrian',
                ],
                ['information'],
            );

            LineMeasurementState.instance = this;
        }
    }

    /**
     * Activates line measurement mode: disables selection, starts new measurement,
     * removes unfinished measurements, binds events, and opens the info window.
     * @param {any} app - The main application object.
     */
    apply(app) {
        app.handler.activeSelection = false;
        const measurement = new PolylineMeasurement(app, {render: true});
        app.measurements.forEach(m => {
            if (!m.finished && !m.destroyed) {
                m.destroy();
            }
        });
        app.measurements.push(measurement);
        this.initialize(app, measurement);
        this.setEventHandlers(app);
        WindowFactory.createBasicMeasurementWindow({
            id: 'lineMeasureWindow',
        }).apply();
    }

    /**
     * Deactivates line measurement mode: restores selection, finalizes/cancels measurement,
     * cleans up button state, closes window, and removes event listeners.
     * @param {any} app
     * @returns {boolean} Always true.
     */
    remove(app) {
        app.handler.activeSelection = true;
        const index = app.measurements.length - 1;
        const measurement = app.measurements[index];

        if (measurement.finished) {
            const measurementList = document.querySelector('#measurementList');
            if (measurementList) {
                const item = new GeListItem({
                    name: `Messung ${measurementList.html.list.childElementCount + 1}`,
                    src: 'images/common/line.svg',
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
            setMeasurementBtnCallback(app, LineMeasurementState, this.button);
        });
        this.button.active = false;

        this.removeEventHandlers(app);
        WindowFactory.createBasicMeasurementWindow({
            id: 'lineMeasureWindow',
        }).close();
        document.documentElement.style.cursor = 'default';
        return true;
    }

    /**
     * Installs a right-click event handler to terminate measurement mode when the user right-clicks the viewer.
     * @param {any} app
     */
    setEventHandlers(app) {
        this.rightClickHandle = () => {
            if (app.measurements[app.measurements.length - 1].terminate()) {
                app.removeState(this);
            }
        };
        window.addEventListener('viewer-right-click', this.rightClickHandle);
    }

    /**
     * Removes the right-click event handler set for this state.
     * @param {any} app
     */
    removeEventHandlers(app) {
        window.removeEventListener('viewer-right-click', this.rightClickHandle);
    }
}
