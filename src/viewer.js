import {
    CesiumWidget,
    DataSourceCollection,
    DataSourceDisplay,
    ShadowMode,
} from '@cesium/engine';

import 'winbox/dist/css/winbox.min.css';
import './i18n.js';

import {Clock, ClockRange, ClockStep, JulianDate} from '@cesium/engine';

/**
 * Sets a default historical date. Not directly used in this file, but can be
 * reused elsewhere for defaults or timeline initialization.
 *
 * @type {Date}
 */
const start = new Date();
start.setFullYear(1900);

/**
 * Main animation clock for the Cesium viewer, customized for real-time system ticking.
 * - Starts with the current system time.
 * - Uses SYSTEM_CLOCK_MULTIPLIER for smooth real-time progression.
 * - UNBOUNDED allows time to move beyond start/end limits.
 * - Animation is enabled by default (canAnimate, shouldAnimate).
 *
 * @type {Clock}
 */
const clock = new Clock({
    currentTime: JulianDate.fromDate(new Date(Date.now())),
    multiplier: 1.0,
    clockStep: ClockStep.SYSTEM_CLOCK_MULTIPLIER,
    clockRange: ClockRange.UNBOUNDED,
    canAnimate: true,
    shouldAnimate: true,
});

/**
 * The main Cesium viewer for the application, rendered in the #cesium-container element.
 * - Disables Cesium's default render loop (control is handled manually).
 * - Starts with no base layer imagery, enables only 3D.
 * - Shadows and terrain shadows are disabled/enabled as desired.
 * - Uses the custom clock above for temporal playback.
 *
 * @export
 * @type {CesiumWidget}
 */
export const viewer = new CesiumWidget('cesium-container', {
    useDefaultRenderLoop: false,
    baseLayer: false,
    scene3DOnly: true,
    shadows: false,
    terrainShadows: ShadowMode.ENABLED,
    msaaSamples: 1,
    clock: clock,
});

/**
 * Collection for managing all dynamic Cesium DataSources (e.g., GeoJSON, CZML).
 * Used as the main data manager for entities overlaid on the scene.
 *
 * @type {DataSourceCollection}
 */
const dataSourceCollection = new DataSourceCollection();

/**
 * Binds the DataSourceDisplay (renderer) to the viewer scene and the data source collection.
 * Handles visualizing dynamic entity data (overlays, geometries, billboards).
 *
 * @type {DataSourceDisplay}
 */
const dataSourceDisplay = new DataSourceDisplay({
    scene: viewer.scene,
    dataSourceCollection: dataSourceCollection,
});

// Assign the DataSourceDisplay to the scene for external access/manipulation.
viewer.scene.dataSourceDisplay = dataSourceDisplay;

/**
 * Keeps the DataSourceDisplay up-to-date with the simulation clock.
 * Synchronizes dynamic data updates for overlays and entity timelines.
 */
viewer.clock.onTick.addEventListener(clock => {
    dataSourceDisplay.update(clock.currentTime);
});

/**
 * The manual render loop for the Cesium viewer.
 * Handles resizing, scene frame initialization, rendering, and clock progression.
 * Uses requestAnimationFrame for smooth, efficient updates.
 */
function renderLoop() {
    viewer.resize();
    viewer.scene.initializeFrame();
    viewer.scene.render(clock.currentTime);
    clock.tick();
    requestAnimationFrame(renderLoop);
}

// Kick off manual rendering.
renderLoop();

// Expose Cesium globals for debugging and interactive console use.
window.viewer = viewer;
window.JulianDate = JulianDate;
