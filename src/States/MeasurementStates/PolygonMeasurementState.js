import {GeListItem} from '../../Components/ge-list-item/ge-list-item.js';
import {PolygonMeasurement} from '../../Core/Measurement/PolygonMeasurement.js';
import {WindowFactory} from '../../Core/WindowFactory.js';
import {setMeasurementBtnCallback} from '../../measurement.js';
import {MeasurementState} from './MeasurementState.js';

/**
 * PolygonMeasurementState – Manages the application UI state for interactive polygon (area) measurements in a Cesium viewer.
 *
 * Implements singleton logic: only one polygon measurement state can exist at a time.
 * Handles UI events, tool lifecycle, modal window integration, and event handler setup/teardown.
 * Ensures clean state removal, measurement cancellation/cleanup, and adds entries to a measurement result list when finished.
 *
 * @class
 * @extends MeasurementState
 *
 * @param {HTMLButtonElement} button - UI button for toggling/activating this measurement.
 * @static {PolygonMeasurementState} instance - Singleton state instance.
 *
 * @example
 * const state = new PolygonMeasurementState(areaBtn);
 * state.apply(app);
 */
export class PolygonMeasurementState extends MeasurementState {
    /**
     * Singleton constructor. Returns the active instance if already set.
     * @param {HTMLButtonElement} button
     * @returns {PolygonMeasurementState}
     */
    constructor(button) {
        if (PolygonMeasurementState.instance) {
            return PolygonMeasurementState.instance;
        } else {
            super(
                'polygon',
                button,
                [
                    'excavation',
                    'line',
                    'height',
                    'dimension',
                    'viewshed',
                    'waterLevel',
                    'information',
                    'pedestrian',
                ],
                ['information'],
            );
            PolygonMeasurementState.instance = this;
        }
    }

    /**
     * Activates polygon measure mode, initializes a new PolygonMeasurement,
     * cancels unfinished measurements, binds cancel/cursor/UI events, and shows info window.
     * @param {any} app
     */
    apply(app) {
        app.handler.activeSelection = false;
        const measurement = new PolygonMeasurement(app, {render: true});
        app.measurements.forEach(m => {
            if (!m.finished && !m.destroyed) {
                m.destroy();
            }
        });
        app.measurements.push(measurement);
        this.initialize(app, measurement);
        this.setEventHandlers(app);
        WindowFactory.createBasicMeasurementWindow({
            id: 'polyMeasureWindow',
        }).apply();
    }

    /**
     * Ends polygon measure mode, finalizes/cancels measurement, updates button/UI/events,
     * adds to measurement list if completed, and closes the info window.
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
                    obj: measurement,
                    src: 'images/common/area.svg',
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
            setMeasurementBtnCallback(
                app,
                PolygonMeasurementState,
                this.button,
            );
        });
        this.button.active = false;

        this.removeEventHandlers(app);
        WindowFactory.createBasicMeasurementWindow({
            id: 'polyMeasureWindow',
        }).close();
        document.documentElement.style.cursor = 'default';
        return true;
    }

    /**
     * Installs right-click handler to terminate measurement when user clicks the right mouse button.
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
     * Removes the right-click event handler for this state.
     * @param {any} app
     */
    removeEventHandlers(app) {
        window.removeEventListener('viewer-right-click', this.rightClickHandle);
    }
}
