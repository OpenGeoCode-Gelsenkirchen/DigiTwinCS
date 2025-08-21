// js-script to define everything for walking simulation

import {
    Cartesian2,
    Cartesian3,
    Cartographic,
    Math as CesiumMath,
    Ellipsoid,
    HeadingPitchRoll,
    Matrix3,
    Ray,
    Transforms,
} from '@cesium/engine';
import {Flags} from './Flags.js';

/**
 * Maps keyboard key codes to movement/interaction flag names used by the app to control navigation.
 * Disables input if blockPedestrianControl is set.
 *
 * @param {number} keyCode - JavaScript keyCode of the pressed key.
 * @returns {string|undefined} The name of the corresponding movement flag, if any.
 */
function getFlagForKeyCode(keyCode) {
    if (Flags.blockPedestrianControl) {
        return;
    }
    switch (keyCode) {
        case 87: // W
        case 38:
            //case 38: // UP
            return 'forwards';
        case 83: // S
        case 40:
            //case 40: // DOWN
            return 'backwards';
        case 65: // A
        case 37:
            //case 37: // LEFT
            return 'left';
        case 68: // D
        case 39:
            //case 39: // RIGHT
            return 'right';
        case 32: //SPACE, because SHIFT, CTRL & ALT already in use
            return 'sprint';
        default:
            return undefined;
    }
}

/**
 * Gets the destination world Cartesian coordinate for entering pedestrian mode.
 * Calculates the globe-intersected position at the screen center,
 * or 2 meters above terrain under camera if close enough.
 *
 * @param {object} app - Application context.
 * @returns {Cartesian3} The calculated start destination.
 */
function getStartPosition(app) {
    // Cameraflight to screencenter or 2m above terrain
    const ray = app.viewer.camera.getPickRay(
        new Cartesian2(window.innerWidth / 2, window.innerHeight / 2),
    );
    const position = app.viewer.scene.globe.pick(ray, app.viewer.scene);

    const distance = Cartesian3.distance(position, app.viewer.camera.position);
    const carto = new Cartographic.fromCartesian(position);

    const destination =
        distance >= 100
            ? Cartesian3.fromRadians(
                  carto.longitude,
                  carto.latitude,
                  app.viewer.scene.globe.getHeight(carto) + 2,
              )
            : Cartesian3.fromRadians(
                  app.viewer.camera.positionCartographic.longitude,
                  app.viewer.camera.positionCartographic.latitude,
                  app.viewer.scene.globe.getHeight(
                      app.viewer.camera.positionCartographic,
                  ) + 2,
              );
    return destination;
}

/**
 * Computes the exit position for pedestrian mode: 200 units forward from the camera,
 * looking forward at -45 deg pitch. Used for smooth exit from first-person mode.
 *
 * @param {object} app - Application context.
 * @returns {Cartesian3} The computed destination position.
 */
function getEndPosition(app) {
    const hpr = new HeadingPitchRoll(
        app.viewer.camera.heading,
        CesiumMath.toRadians(-45),
        app.viewer.camera.roll,
    );
    const orientation = Transforms.headingPitchRollQuaternion(
        app.viewer.camera.position,
        hpr,
        Ellipsoid.WGS84,
        Transforms.northWestUpToFixedFrame,
    );
    const matrix3 = Matrix3.fromQuaternion(orientation);
    const direction = Matrix3.multiplyByVector(
        matrix3,
        Cartesian3.UNIT_X,
        new Cartesian3(),
    );
    const ray = new Ray(
        app.viewer.camera.position,
        Cartesian3.negate(direction, new Cartesian3()),
    );
    const destination = Ray.getPoint(ray, 200);
    return destination;
}

/**
 * Animates the camera into pedestrian mode by flying to the
 * calculated start position at screen center or in front of user.
 * Adjusts maximum screen space error for optimal pedestrian detail.
 *
 * @async
 * @export
 * @param {object} app - Application context.
 * @returns {Promise<void>}
 */
export async function enterView(app) {
    const destination = getStartPosition(app);
    app.viewer.camera.flyTo({
        destination: destination,
        orientation: {heading: app.viewer.camera.heading, pitch: 0, roll: 0},
        duration: 1,
        complete: () => {
            app.settingsManager.layerMaximumScreenSpaceError =
                app.settingsManager.pedestrianMaximumScreenSpaceError;
        },
    });
}

/**
 * Animates the camera back to external/overview mode (exit from pedestrian mode).
 * Flies the camera to a location in front of the current viewpoint, using -45° pitch.
 * Resets the screen space error setting to the default profile value.
 *
 * @async
 * @export
 * @param {object} app - Application context.
 * @returns {Promise<void>}
 */
export async function exitView(app) {
    const destination = getEndPosition(app);
    app.viewer.camera.flyTo({
        destination: destination,
        orientation: {
            heading: app.viewer.camera.heading,
            pitch: CesiumMath.toRadians(-45),
            roll: app.viewer.camera.roll,
        },
        duration: 1,
        complete: () => {
            app.settingsManager.layerMaximumScreenSpaceError =
                app.settingsManager.profile.layerMaximumScreenSpaceError;
        },
    });
}

/**
 * Handles keydown events to activate navigation/interaction flags (forwards, backwards, etc)
 * depending on the pressed key. Should be attached to the window or main canvas.
 *
 * @export
 * @param {KeyboardEvent} e
 * @returns {void}
 */
export function keyDown(e) {
    const flagName = getFlagForKeyCode(e.keyCode);
    if (typeof flagName !== 'undefined') {
        Flags[flagName] = true;
    }
}

/**
 * Handles keyup events to deactivate navigation/interaction flags ("forwards", etc)
 * when the corresponding key is released. Should be attached to the window or main canvas.
 *
 * @export
 * @param {KeyboardEvent} e
 * @returns {void}
 */
export function keyUp(e) {
    const flagName = getFlagForKeyCode(e.keyCode);
    if (typeof flagName !== 'undefined') {
        Flags[flagName] = false;
    }
}

/**
 * Moves the Cesium camera forward (or backward if stepSize < 0) by a standard step.
 * When sprinting, moves faster. Keeps the camera 2 meters above the terrain.
 *
 * @export
 * @param {object} app - Application context.
 * @param {number} [stepSize=1] - The distance to move forward (negative for backward).
 * @returns {void}
 */
export function movePlayer(app, stepSize = 1) {
    if (Flags.sprint) {
        app.viewer.camera.moveForward(stepSize * 3);
    } else {
        app.viewer.camera.moveForward(stepSize);
    }
    app.viewer.camera.position = Cartesian3.fromRadians(
        app.viewer.camera.positionCartographic.longitude,
        app.viewer.camera.positionCartographic.latitude,
        app.viewer.scene.globe.getHeight(
            Cartographic.fromCartesian(app.viewer.camera.position),
        ) + 2,
    );
}
