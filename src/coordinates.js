// js-script to show coordinates on lower right corner
import {
    Cartographic,
    EllipsoidTerrainProvider,
    sampleTerrainMostDetailed,
} from '@cesium/engine';
import {app} from './Core/Application.js';
import {cartesianToProjectCoord} from './Core/utilities.js';

/**
 * Global mouse-move handler for interactive coordinate display in a Cesium/3D viewer.
 *
 * On each mouse move over the 3D scene ("viewer-mouse-move-3d" event), the handler:
 *   - Checks if a global coordinate display UI/widget (`window.coordinateDisplay`) exists.
 *   - Converts the picked 3D position (Cartesian) to map/project coordinates (RW/HW).
 *   - Queries the terrain provider for the accurate ground height at the picked position when available.
 *   - Updates the coordinate display's `x`, `y`, and `z` (RW, HW, Height) values in real-time.
 *
 * @event viewer-mouse-move-3d
 * @param {CustomEvent} e - CustomEvent with detail: { pickedPosition: Cartesian3 }
 *
 * @global {object} window.coordinateDisplay - UI widget (object with `.x`, `.y`, `.z` properties for coordinate updates).
 * @global {object} app.viewer.terrainProvider - The Cesium terrain provider.
 * @global {object} app.baseLayerPicker.activeElements.terrain - Current base terrain layer (for ellipsoid detection).
 *
 * @example
 * // Assumes a coordinate display UI exists:
 * <div id="coordinateDisplay"></div>
 * window.coordinateDisplay = {};
 * addEventListener('viewer-mouse-move-3d', ...); // (Handler below)
 */
addEventListener('viewer-mouse-move-3d', async e => {
    if (!window.coordinateDisplay) {
        return;
    }
    const cartesian = e.detail.pickedPosition;
    let rw, hw, h;

    //only execute if cursor is on globe and not atmosphere/space
    if (cartesian) {
        const cartographic = Cartographic.fromCartesian(cartesian);
        cartographic.height = 0;

        // Convert to projected/project system coordinates and round
        const coord = cartesianToProjectCoord(cartesian).map(x =>
            Math.round(x, 2),
        );

        rw = coord[0];
        hw = coord[1];

        // Fetch accurate ground/terrain height if available and enabled
        if (
            app.viewer.terrainProvider.availability &&
            !(
                app?.baseLayerPicker?.activeElements.terrain instanceof
                EllipsoidTerrainProvider
            )
        ) {
            h = (
                await sampleTerrainMostDetailed(app.viewer.terrainProvider, [
                    cartographic,
                ])
            )[0].height;
            h = Math.round(h, 2);
        }
    }

    // Update coordinate display UI (RW: x, HW: y, h: z)
    window.coordinateDisplay.x = rw;
    window.coordinateDisplay.y = hw;
    window.coordinateDisplay.z = h;
});
