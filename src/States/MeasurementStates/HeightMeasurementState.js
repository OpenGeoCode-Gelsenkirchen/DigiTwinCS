import {GeListItem} from '../../Components/ge-list-item/ge-list-item.js';
import {HeightMeasurement} from '../../Core/Measurement/HeightMeasurement.js';
import {WindowFactory} from '../../Core/WindowFactory.js';
import {setMeasurementBtnCallback} from '../../measurement.js';
import {MeasurementState} from './MeasurementState.js';

/**
 * HeightMeasurementState – Application UI state for interactive height measurements.
 *
 * Ensures only one instance active (singleton pattern). Integrates with Cesium/app infrastructure,
 * manages input tool activation, measurement instance lifecycle, custom event handlers, and UI updates.
 * Handles finalizing or canceling the active height measurement in response to user actions.
 *
 * @class
 * @extends MeasurementState
 *
 * @param {HTMLButtonElement} button - UI button used to activate this measure state.
 *
 * @property {HeightMeasurementState} instance - Singleton instance reference.
 *
 * @example
 * const state = new HeightMeasurementState(myButton);
 * state.apply(app); // Begin measuring height interactively.
 */
export class HeightMeasurementState extends MeasurementState {
    /**
     * Singleton constructor. If already instantiated, returns the same instance.
     * @param {HTMLButtonElement} button
     * @returns {HeightMeasurementState}
     */
    constructor(button) {
        if (HeightMeasurement.instance) {
            return HeightMeasurementState.instance;
        } else {
            super(
                'height',
                button,
                [
                    'excavation',
                    'polygon',
                    'line',
                    'dimension',
                    'viewshed',
                    'information',
                    'pedestrian',
                ],
                ['information'],
            );
            HeightMeasurementState.instance = this;
        }
    }

    /**
     * Activates height measurement mode, initializes a HeightMeasurement,
     * cleans up unfinished measurements, sets up state and event handlers, and opens info window.
     * @param {any} app - Application instance.
     */
    apply(app) {
        app.handler.activeSelection = false;
        const measurement = new HeightMeasurement(app, {
            render: true,
            onFinishCallback: () => {
                app.removeState(this);
            },
        });
        app.measurements.forEach(m => {
            if (!m.finished && !m.destroyed) {
                m.destroy();
            }
        });
        app.measurements.push(measurement);
        this.initialize(app, measurement);
        this.setEventHandlers(app);
        WindowFactory.createHeightMeasurementWindow().apply();
    }

    /**
     * Ends this height measurement mode, finalizes and lists the measurement if finished,
     * or cancels and deletes if not. Unbinds UI/button and closes window.
     * @param {any} app - Application instance.
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
                    src: 'images/common/height.svg',
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
            setMeasurementBtnCallback(app, HeightMeasurementState, this.button);
        });
        this.button.active = false;

        this.removeEventHandlers(app);
        WindowFactory.createHeightMeasurementWindow().close();
        document.documentElement.style.cursor = 'default';
        return true;
    }

    /**
     * (Customizable) Set up any custom event handlers for this state.
     * @param {any} app
     */
    setEventHandlers(app) {}

    /**
     * (Customizable) Remove event handlers set up for this state.
     * @param {any} app
     */
    removeEventHandlers(app) {}
}
