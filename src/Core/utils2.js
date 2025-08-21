import {
    Cartesian3,
    Color,
    Ellipsoid,
    Matrix3,
    Matrix4,
    Transforms,
} from '@cesium/engine';
import CesiumMath from '@cesium/engine/Source/Core/Math.js';
import proj4 from 'proj4';
import {Flags} from '../Flags.js';
import {FirstPersonState} from '../States/FirstPersonState.js';
import {Temporary} from '../Temporary.js';
import {VIS_OFF, VIS_ON, ZOOM_STEPSIZE} from '../constants.js';
import {enterGizmoEditMode, exitGizmoEditMode, gizmoLoop} from '../gizmo.js';
import {i18next} from '../i18n.js';
import {movePlayer} from '../pedestrian.js';
import {switchStyling} from '../styling.js';
import {app} from './Application.js';
import {layerCollection} from './LayerCollection.js';

/**
 * Prepares the application for object edit mode by showing the model UI window, entering gizmo mode, and starting the gizmo loop.
 * @param {Matrix4} modelMatrix - The transformation matrix of the object to edit.
 * @param {number} [index] - Optional index of the object being edited.
 */
export function enterObjectEditMode(modelMatrix, index = undefined) {
    const winbox = document.getElementById('win-model-container').winbox;
    winbox.hide(false);
    winbox.hidden = false;
    enterGizmoEditMode(index);
    gizmoLoop(modelMatrix);
}

/**
 * Exits object edit mode, hiding the model UI window and ending gizmo editing if not still active.
 */
export function exitObjectEditMode() {
    if (Flags.gizmoActive) {
        return;
    }
    exitGizmoEditMode();
    const winbox = document.getElementById('win-model-container').winbox;
    winbox.hide(true);
    winbox.hidden = true;
}

/**
 * Returns a compact, sortable timestamp string in format "YYYYMMDD-HHMMSS".
 * @returns {string}
 */
export function getFormattedDatetime() {
    const now = new Date(Date.now());

    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    return `${year}${month}${day}-${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}${seconds.toString().padStart(2, '0')}`;
}

/**
 * Toggles 3D buildings/mesh mode, updates scene and UI button states, and manages layer visibilities based on mesh mode.
 * @param {any} app - Application instance.
 * @param {object} hideIDs - Object of IDs to hide by type.
 * @param {boolean} [showMesh=false] - Whether mesh/3D replacement mode is active.
 */
function swap3DandMesh(app, hideIDs, showMesh = false) {
    document.getElementById('mesh_btn').active = showMesh;

    showMesh = Array.from(
        app.layerCollection.getLayersByType('mesh').content,
    ).some(([key, value]) => value.show);
    app.viewer.scene.globe.show = !showMesh;
    app.showMesh = showMesh;

    app.urlManager.update({mesh: Number(showMesh)});

    let cb = document.getElementById('pedestrian_btn');
    if (cb) cb.disabled = showMesh;
    cb = document.getElementById('texture-btn');
    if (cb) cb.disabled = showMesh;
    cb = document.getElementById('opacity-btn');
    if (cb) cb.disabled = showMesh;

    app.removeState(new FirstPersonState());

    const except = Object.keys(hideIDs).reduce((agg, key) => {
        agg.push(...Array.from(hideIDs[key]));
        return agg;
    }, []);

    app.layerCollection
        .getLayersByType('B3DM')
        .toggleAllVisibilityExcept(!showMesh, except);
    app.layerCollection
        .getLayersByType('geojson3d')
        .toggleAllVisibilityExcept(!showMesh, except);
    app.layerCollection
        .getLayersByType('POINTS')
        .toggleAllVisibilityExcept(!showMesh, except);

    app.layerCollection.getLayersByTags('mixed').show = !showMesh;
    app.handler.selectionActive = !showMesh;

    document.querySelectorAll('#D3Table input').forEach(e => {
        e.checked = !showMesh;
    });

    //cb.classList.replace("bar_btn", "disabled_btn");
    cb = document.getElementById('cb_Geplante Gebäude');
    if (cb !== null) cb.checked = !showMesh;
}
/**
 * Handles show/hide checkbox changes, synchronizes layer/mesh state, and ensures exclusivity for mesh layers.
 * @param {any} app - Application instance.
 * @param {object} hideIDs - IDs to hide by type.
 * @param {HTMLInputElement} checkbox - HTML checkbox element controlling layer/feature visibility.
 * @param {any} obj - Layer or object being shown/hidden.
 * @param {string} [id] - Optional ID reference.
 * @param {boolean} [mesh=false] - Whether this is for a mesh layer.
 */
export function switchCheckbox(
    app,
    hideIDs,
    checkbox,
    obj,
    id = undefined,
    mesh = false,
) {
    const meshes = layerCollection.getContentByType('mesh');
    obj.show = checkbox.checked;

    if (mesh) {
        if (Flags.walking) {
            //exitView();
            app.removeState(new FirstPersonState());
        }
        swap3DandMesh(app, hideIDs, checkbox.checked);
    } else if (
        meshes.length > 0 &&
        meshes.some(t => t.show) &&
        obj.type !== 'GLTF'
    ) {
        document.querySelectorAll('.mesh').forEach(cb => {
            if (cb.checked) cb.click();
        });
        swap3DandMesh(app, hideIDs, false);
        app.urlManager.update({mesh: Number(app.showMesh)});
        document.querySelectorAll('#MeshTable input').forEach(e => {
            e.checked = false;
        });
    }

    if (id && Temporary.picked.id === id) {
        exitObjectEditMode();
    }

    switchStyling();
}
/**
 * Sets the checked state and updates the parent class for a checkbox, using "VIS_ON" or "VIS_OFF" classes.
 * @param {HTMLInputElement} checkbox
 * @param {boolean} [show=true]
 */
export function checkCheckbox(checkbox, show = true) {
    if (show) {
        checkbox.checked = true;
        checkbox.parentNode.classList.add(VIS_ON);
    } else {
        checkbox.checked = false;
        checkbox.parentNode.classList.add(VIS_OFF);
    }
}

/**
 * Utility to add a new row with visibility and delete controls to a given HTML table body.
 * @param {string} tableId - Selector for the table (e.g., "#mytable").
 * @param {string} name - Row label.
 * @param {string} id - Unique identifier for this row.
 * @param {function} btnFunc - Callback to run on row/bin delete.
 * @param {boolean} [ableToDelete=true] - Whether to allow delete control.
 * @param {boolean} [mesh=false] - Whether this entry is for a mesh.
 */
export function addEntryToTable(
    tableId,
    name,
    id,
    btnFunc,
    ableToDelete = true,
    mesh = false,
) {
    //https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template?retiredLocale=de

    id = id || name;
    const table = document.querySelector(`${tableId} tbody`);
    if (!table) return;

    const row = table.insertRow(-1);
    row.classList.add('table-row');

    const cell1 = row.insertCell(0);
    cell1.innerHTML = name;
    cell1.classList.add('table-cell1');

    const label_vis = document.createElement('label');
    label_vis.classList.add('label-vis');

    const cb_vis = document.createElement('input');
    cb_vis.id = `cb_${id}`;
    cb_vis.type = 'checkbox';

    if (mesh) {
        cb_vis.classList.add('mesh');
    }

    label_vis.appendChild(cb_vis);

    const cell2 = row.insertCell(1);
    cell2.appendChild(label_vis);
    cell2.classList.add('table-cell2');

    const cell3 = row.insertCell(2);
    cell3.classList.add('table-cell3');

    if (ableToDelete) {
        const span = document.createElement('span');
        span.classList.add('bin-span', 'highlight');
        span.tableId = `btn${name}`;

        span.addEventListener('click', function () {
            document.querySelector(`${tableId} tbody`)?.removeChild(row);
            exitGizmoEditMode();
            btnFunc();
        });

        cell3.appendChild(span);
    }
}

/**
 * Removes a special imagery layer from the Cesium viewer and deregisters it from the layer collection.
 * @param {string} id - Layer ID.
 */
export function removeSpecialImagery(id) {
    app.viewer.imageryLayers.remove(layerCollection.getContent(id));
    layerCollection.remove(id);
}

export function boundingBoxProjectCoordsToWGS(bb) {
    const bb1 = proj4('COORD', 'WGS84', [bb[0], bb[1]]);
    const bb2 = proj4('COORD', 'WGS84', [bb[2], bb[3]]);
    return [bb1[0], bb1[1], bb2[0], bb2[1]];
}

/**
 * Converts a 2D bounding box from custom coordinates (COORD) to [minLon, minLat, maxLon, maxLat] in WGS84.
 * @param {number[]} bb - [minX, minY, maxX, maxY]
 * @returns {number[]} [minLon, minLat, maxLon, maxLat]
 */
export function getMinimumZPosition(positions) {
    //We want to find the coordinate pair with the lowest z-value
    let min = positions[0];
    for (let i = 1; i < positions.length; i++) {
        const pos = positions[i];
        min = pos['z'] < min['z'] ? pos : min;
    }
    return min;
}

/**
 * Returns the azimuth angle (heading in degrees) between two surface points (using east-north-up frame).
 * @param {Cartesian3} pointA
 * @param {Cartesian3} pointB
 * @returns {number} Heading angle in degrees.
 */
export function getHeading(pointA, pointB) {
    const transform = Transforms.eastNorthUpToFixedFrame(pointA);
    const positionvector = Cartesian3.subtract(
        pointB,
        pointA,
        new Cartesian3(),
    );
    const vector = Matrix4.multiplyByPointAsVector(
        Matrix4.inverse(transform, new Matrix4()),
        positionvector,
        new Cartesian3(),
    );
    const direction = Cartesian3.normalize(vector, new Cartesian3());
    const heading =
        Math.atan2(direction.y, direction.x) - CesiumMath.PI_OVER_TWO;
    return CesiumMath.toDegrees(
        CesiumMath.TWO_PI - CesiumMath.zeroToTwoPi(heading),
    );
}
/**
 * Returns the pitch angle (degrees) between two cartesian points.
 * @param {Cartesian3} pointA
 * @param {Cartesian3} pointB
 * @returns {number} Pitch angle in degrees.
 */
export function getPitch(pointA, pointB) {
    const offset = Cartesian3.subtract(pointB, pointA, new Cartesian3());
    const num = Cartesian3.dot(pointA, offset);
    const squareA =
        Math.pow(pointA.x, 2) + Math.pow(pointA.y, 2) + Math.pow(pointA.z, 2);
    const squareOffset =
        Math.pow(offset.x, 2) + Math.pow(offset.y, 2) + Math.pow(offset.z, 2);
    const denom = Math.sqrt(squareA * squareOffset);
    const cos = num / denom;
    return CesiumMath.toDegrees(CesiumMath.PI_OVER_TWO - Math.acos(cos));
}

/**
 * Given a KQ code, computes the ENU frame center cartesian and angle offset.
 * Used for region-of-interest alignment in mapping.
 * @param {string} kq - Four-digit string code ("6012", etc).
 * @returns {[Cartesian3, number]} Center as Cartesian3, and rotation angle (degrees).
 */
export function getCenterAndAngleFromKQ(kq) {
    let center_cartesian = new Cartesian3(
        parseFloat(`3${kq[0]}${kq[1]}500`),
        parseFloat(`57${kq[2]}${kq[3]}500`),
    );
    const center_wgs = proj4('COORD', 'WGS84', center_cartesian);
    center_cartesian = Cartesian3.fromDegrees(center_wgs.x, center_wgs.y);

    const enu = Transforms.eastNorthUpToFixedFrame(
        center_cartesian,
        Ellipsoid.WGS84,
    );

    const bottom_left_local = new Cartesian3(-500, -500);
    const bottom_left_local_cartesian = Matrix4.multiplyByPoint(
        enu,
        bottom_left_local,
        new Cartesian3(),
    );
    const bottom_left_local_azimuth = getHeading(
        center_cartesian,
        bottom_left_local_cartesian,
    );

    const bottom_left_global = new Cartesian3(
        parseFloat(`3${kq[0]}${kq[1]}000`),
        parseFloat(`57${kq[2]}${kq[3]}000`),
    );
    const bottom_left_global_wgs = proj4('COORD', 'WGS84', bottom_left_global);
    const bottom_left_global_cartesian = Cartesian3.fromDegrees(
        bottom_left_global_wgs.x,
        bottom_left_global_wgs.y,
    );
    const bottom_left_global_azimuth = getHeading(
        center_cartesian,
        bottom_left_global_cartesian,
    );

    return [
        center_cartesian,
        bottom_left_local_azimuth - bottom_left_global_azimuth,
    ];
}

/**
 * Generate and return an east-north-up transformation for a given center and angle.
 * @param {Cartesian3} center - Center point.
 * @param {number} angle - Angle (degrees).
 * @returns {Matrix4} Transformed ENU frame.
 */
export function rotateENU(center, angle) {
    let enu = Transforms.eastNorthUpToFixedFrame(center, Ellipsoid.WGS84);
    const rot = Matrix3.fromRotationZ(
        CesiumMath.toRadians(angle),
        new Matrix3(),
    );
    const rot4 = Matrix4.fromRotation(rot, new Matrix4());
    enu = Matrix4.multiply(enu, rot4, new Matrix4());
    return enu;
}

/**
 * Ensures that a color value is a Cesium Color object. Converts strings, falls back to white if invalid.
 * @param {Color|string} color
 * @returns {Color}
 */
export function verifyColorValue(color) {
    if (!(color instanceof Color)) {
        if (typeof color !== 'string') {
            color = Color.fromCssColorString('white');
        } else {
            color = Color.fromCssColorString(color);
        }
    }
    return color;
}

/**
 * Command to move the camera/player backward (takes walking mode into account).
 * @param {any} app
 */
export function moveBackward(app) {
    if (Flags.walking === true) {
        movePlayer(app, -10);
    } else {
        app.viewer.scene.camera.moveBackward(ZOOM_STEPSIZE);
    }
}

/**
 * Command to move the camera/player forward (with walking mode support).
 * @param {any} app
 */
export function moveForward(app) {
    if (Flags.walking === true) {
        movePlayer(app, 10);
    } else {
        app.viewer.scene.camera.moveForward(ZOOM_STEPSIZE);
    }
}

/**
 * Recursively deep-translates all string values in an object using i18next.t, optionally translating property keys as well.
 * @param {object} object - The object to translate.
 * @param {boolean} [translateKeys=false] - Whether to translate keys as well as values.
 * @returns {object} The deep-translated object.
 */
export function translateObject(object, translateKeys = false) {
    const translatedObject = {};
    for (const [key, value] of Object.entries(object)) {
        let translatedKey = key;
        if (translateKeys) i18next.t(key);
        if (typeof value === 'object') {
            translatedObject[translatedKey] = translateObject(value);
        } else if (typeof value === 'string') {
            translatedObject[translatedKey] = i18next.t(value);
        } else {
            translatedObject[translatedKey] = value;
        }
    }
    return translatedObject;
}
