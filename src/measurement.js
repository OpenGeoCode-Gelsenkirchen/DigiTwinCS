import {app} from './Core/Application.js';
import {DefaultState} from './States/DefaultState.js';
import {AreaMeasurementState} from './States/MeasurementStates/AreaMeasurementState.js';
import {HeightMeasurementState} from './States/MeasurementStates/HeightMeasurementState.js';
import {LineMeasurementState} from './States/MeasurementStates/LineMeasurementState.js';
import {PolygonMeasurementState} from './States/MeasurementStates/PolygonMeasurementState.js';

import {Flags} from './Flags.js';
import {LengthMeasurementState} from './States/MeasurementStates/LengthMeasurementState';
import {Temporary} from './Temporary.js';
import {viewer} from './viewer.js';

/**
 * Clears (removes highlight from) any currently highlighted or selected features in the Temporary object.
 * Restores their original colors and sets their references to undefined.
 * Call this before starting a new measurement or selection to prevent lingering highlights.
 *
 * @export
 * @function
 * @returns {void}
 */
export function clear() {
    if (Temporary.highlighted.feature) {
        Temporary.highlighted.feature.color =
            Temporary.highlighted.originalColor;
        Temporary.highlighted.feature = undefined;
    }

    if (Temporary.selected.feature) {
        Temporary.selected.feature.color = Temporary.selected.originalColor;
        Temporary.selected.feature = undefined;
    }
}

/**
 * Higher-order measurement button callback function: clears existing highlights/selections,
 * creates and activates a new measurement state handler for the chosen measurement type,
 * and updates the UI to reflect that the tool is active.
 *
 * @export
 * @param {Object} app - The application main context.
 * @param {Function} state - The State class to instantiate (e.g., PolygonMeasurementState).
 * @param {HTMLElement} button - The button that was pressed (for UI context/focus).
 * @returns {void}
 */
export function setMeasurementBtnCallback(app, state, button) {
    clear();
    const newState = new state(button);
    app.applyState(newState);
}

// Add event listeners on DOMContentLoaded for measurement mode buttons and the delete button
addEventListener('DOMContentLoaded', () => {
    const polyMeasureBtn = document.getElementById('polyMeasureBtn');
    polyMeasureBtn.addEventListener('click', () => {
        setMeasurementBtnCallback(app, PolygonMeasurementState, polyMeasureBtn);
    });

    const lineMeasureBtn = document.getElementById('lineMeasureBtn');
    lineMeasureBtn.addEventListener('click', () => {
        setMeasurementBtnCallback(app, LineMeasurementState, lineMeasureBtn);
    });

    const heightMeasureBtn = document.getElementById('heightMeasureBtn');
    heightMeasureBtn.addEventListener('click', () => {
        setMeasurementBtnCallback(
            app,
            HeightMeasurementState,
            heightMeasureBtn,
        );
    });

    const lengthMeasureBtn = document.getElementById('lengthMeasureBtn');
    lengthMeasureBtn.addEventListener('click', () => {
        setMeasurementBtnCallback(
            app,
            LengthMeasurementState,
            lengthMeasureBtn,
        );
    });

    const areaMeasureBtn = document.getElementById('areaMeasureBtn');
    areaMeasureBtn.addEventListener('click', () => {
        setMeasurementBtnCallback(app, AreaMeasurementState, areaMeasureBtn);
    });

    document
        .getElementById('deleteMeasurementsBtn')
        .addEventListener('click', () => {
            clearDrawingBoard();
        });
});

/**
 * Deletes all measurement primitives (lines/areas), resets the metrics flag,
 * and restores the application state to the default state. Use when clearing/resetting all measurements.
 *
 * @function
 * @returns {void}
 */
function clearDrawingBoard() {
    app.state = new DefaultState();

    if (Temporary.bemassungen.area !== 'undefined') {
        viewer.scene.primitives.remove(Temporary.bemassungen.area);
    }
    Temporary.bemassungen.area = undefined;
    if (Temporary.bemassungen.line !== 'undefined') {
        viewer.scene.primitives.remove(Temporary.bemassungen.line);
    }
    Temporary.bemassungen.line = undefined;
    Flags.metrics = false;
}
