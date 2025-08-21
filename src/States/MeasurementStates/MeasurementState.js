import {Flags} from '../../Flags.js';
import {State} from '../State.js';

/**
 * MeasurementState – Abstract base class for UI states that manage interactive measurement tools (such as height, line, or area) in a Cesium application.
 *
 * Extends {@link State}, adding:
 * - automatic button event binding/cancellation,
 * - measurement object lifecycle management,
 * - global flag coordination.
 * Designed for composition: sub-classes implement the measurement (e.g., LineMeasurementState).
 *
 * @class
 * @extends State
 *
 * @param {string} name - Unique name of the state/tool ("line", "height", "dimension", etc.).
 * @param {HTMLButtonElement} button - DOM element to use for toggling/terminating the measurement state.
 * @param {string[]} [exclusiveStates=[]] - State names that should be deactivated when this activates.
 * @param {string[]} [restoreStates=[]] - States to restore after this state ends.
 * @param {string[]} [dependentStates=[]] - Other state dependencies.
 *
 * @property {HTMLButtonElement} button - The toggling/activation button for this measurement state.
 *
 * @method initialize(app, measurement) - Sets up the cancel/exit handler for the button and disables camera movement interruption.
 * @method terminate() - Tears down event listeners, disables global measurement flags, and resets camera change after delay.
 *
 * @example
 * class LineMeasurementState extends MeasurementState { ... }
 * const state = new LineMeasurementState(myBtn);
 * state.initialize(app, measurement);
 */
export class MeasurementState extends State {
    /**
     * @param {string} name
     * @param {HTMLButtonElement} button
     * @param {string[]} [exclusiveStates=[]]
     * @param {string[]} [restoreStates=[]]
     * @param {string[]} [dependentStates=[]]
     */
    constructor(
        name,
        button,
        exclusiveStates = [],
        restoreStates = [],
        dependentStates = [],
    ) {
        super(name, exclusiveStates, restoreStates, dependentStates);
        this.button = button;
    }

    /**
     * Sets up the main "cancel current measurement" event handler and disables camera change notifications.
     * @param {any} app - The main application instance.
     * @param {Measurement} measurement - The active measurement instance.
     */
    initialize(app, measurement) {
        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            measurement.cancel();
            app.removeState(this);
            app.measurements.pop();
        });
        //this.button.active = true;
        Flags.cameraChange = false;
    }

    /**
     * Ends the measurement state: removes button event listeners, clears global measurement flag,
     * and resets camera-change flag after 1 second.
     * @returns {boolean} Always true on proper termination.
     */
    terminate() {
        this.button.removeEventListeners('click');

        Flags.measurement = false;
        setTimeout(() => {
            Flags.cameraChange = true;
        }, 1000);
        return true;
    }
}
