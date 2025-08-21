//js-script to dynamicly load gltf-modells
import {Layer} from './Core/Layer.js';

import {
    BoundingSphere,
    Cartesian2,
    Cartesian3,
    Cartographic,
    Math as CesiumMath,
    CustomShader,
    HeadingPitchRoll,
    Matrix3,
    Matrix4,
    Model,
    Quaternion,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    Transforms,
    TranslationRotationScale,
    createGuid,
    defined,
} from '@cesium/engine';
import proj4 from 'proj4';
import {app} from './Core/Application.js';
import {layerCollection} from './Core/LayerCollection.js';
import {
    checkCheckbox,
    enterObjectEditMode,
    exitObjectEditMode,
    switchCheckbox,
} from './Core/utils2.js';
import {Flags} from './Flags.js';
import {STATES} from './States/states.js';
import {Temporary} from './Temporary.js';
import {
    Handlers,
    Layers,
    MOVE_STEPSIZE,
    ROTATION_STEPSIZE,
} from './constants.js';
import {
    Gizmo,
    dropOnTerrain,
    exitGizmoEditMode,
    gizmoLoop,
    scaleGizmo,
} from './gizmo.js';
import {Variables} from './global.js';
import {viewer} from './viewer.js';

/**
 * Creates the table body for loaded glTF/GLB models.
 * Displays the table with italic and bold styling for identification.
 */
function createTable_singlemodel() {
    const singletable = document.getElementById('singlemodelTable');
    const tbody = singletable.createTBody();
    tbody.style =
        'display: block; font-size: 14px; font-style: italic; font-weight: bold;';
}
createTable_singlemodel();

/**
 * Structure for tracking loaded glTF models, their meta info and states.
 *   - obj: Array of Model instances.
 *   - filename: Array of loaded file names.
 *   - winkel: Array of heading/rotation for each.
 *   - stat: Array of booleans, active state for each model.
 *   - id: Array of unique model IDs.
 */
Layers.gltf = {
    obj: new Array(),
    filename: new Array(),
    winkel: new Array(),
    stat: new Array(),
    id: new Array(),
};

import './Components/FileUpload/FileUpload.js';
import {i18next} from './i18n.js';

/**
 * Displays a modal overlay for uploading glTF/glb models using a custom file-upload web component.
 * On confirm, loads the chosen model and closes the dialog; on cancel, simply closes.
 * Texts/buttons are properly translated.
 */
export function showmodelmenu() {
    const fileUpload = document.createElement('file-upload');
    fileUpload.accept = '.glb,.gltf';
    fileUpload.title = i18next.t('common:upload.gltf.title');
    fileUpload.text = i18next.t('common:upload.gltf.text');
    fileUpload.confirmText = i18next.t('common:upload.gltf.confirm');
    fileUpload.cancelText = i18next.t('common:upload.gltf.cancel');

    const PADDING = 64;

    document.body.appendChild(fileUpload);

    requestAnimationFrame(() => {
        const bounds = fileUpload.getBoundingClientRect();
        fileUpload.remove();

        const win = new WinBox({
            modal: true,
            mount: fileUpload,
            width: bounds.width + PADDING,
            height: bounds.height + PADDING,
        });

        fileUpload.addEventListener('confirm', e => {
            const [file] = e.detail.files;
            if (file) {
                loadModels(e.detail.files[0]);
                win.close();
            }
        });

        fileUpload.addEventListener('cancel', () => {
            win.close();
        });
    });
}

/**
 * Removes the model overlay, if present.
 */
function closemenu() {
    const child = document.getElementById('overl');
    if (child) document.body.removeChild(child);
}

/**
 * Resets the translation (position) of the currently picked model to its initial value.
 * Re-applies the transformation matrix and notifies the gizmo.
 */
export function resetTranslation() {
    const index = Layers.gltf.id.indexOf(Temporary.pickedID);
    const ini = Layers.gltf.obj[index].initialMatrix;
    Matrix4.setTranslation(
        Gizmo.modelMatrix,
        Matrix4.getTranslation(ini, new Cartesian3()),
        Gizmo.modelMatrix,
    );
    gizmoLoop(Gizmo.modelMatrix);
}

/**
 * Resets the rotation of the currently picked model to its initial orientation.
 * Updates the transformation matrix and notifies the gizmo.
 */
export function resetRotation() {
    const index = Layers.gltf.id.indexOf(Temporary.pickedID);
    const ini = Layers.gltf.obj[index].initialMatrix;
    Matrix4.setRotation(
        Gizmo.modelMatrix,
        Matrix4.getRotation(ini, new Matrix3()),
        Gizmo.modelMatrix,
    );
    gizmoLoop(Gizmo.modelMatrix);
}

/**
 * Resets the scale of the currently picked model to its initial uniform scale.
 * Updates the transformation matrix and notifies the gizmo.
 */
export function resetScale() {
    const index = Layers.gltf.id.indexOf(Temporary.pickedID);
    const ini = Layers.gltf.obj[index].initialMatrix;
    const scale = Matrix4.getMaximumScale(ini);
    Matrix4.setUniformScale(Gizmo.modelMatrix, scale, Gizmo.modelMatrix);
    gizmoLoop(Gizmo.modelMatrix);
}

/**
 * Loads a single .glb/.gltf model file and inserts it into the Cesium scene and layerCollection,
 * handling placement, orientation, uniqueness, and editing initialization.
 * Initializes object edit mode, shows the model in the UI, and schedules camera fly-to.
 *
 * @async
 * @export
 * @param {File} file - The .gltf or .glb file to load.
 * @returns {Promise<void>}
 */
export async function loadModels(file) {
    Gizmo.set = false;
    if (Flags.gizmoEdit) {
        exitGizmoEditMode();
    }

    if (Flags.walking) {
        //exitView();
        app.removeState(STATES.pedestrian);
    }

    if (!defined(file) || file.length <= 0) {
        return;
    }

    const fileName = file.name;
    const path = URL.createObjectURL(file);
    const X = window.innerWidth / 2;
    const Y = window.innerHeight / 2;
    const ray = app.viewer.camera.getPickRay(new Cartesian2(X, Y));
    const position = app.viewer.scene.globe.pick(ray, app.viewer.scene); //Mittelpunkt des Veiwers
    const heading = CesiumMath.toRadians(90); //Standartmäßig um 90° drehen, da Cesium ab glTF 2.0 andere Grundausrichtung besitzt
    const pitch = 0;
    const roll = 0;
    const hpr = new HeadingPitchRoll(heading, pitch, roll);
    const orientation = Transforms.headingPitchRollQuaternion(position, hpr);
    const rotation = Matrix3.fromQuaternion(orientation);
    const matrix = Matrix4.fromRotationTranslation(
        rotation,
        position,
        new Matrix4(),
    );

    Flags.clippingPlaneSelected = false;

    const customShader = new CustomShader({
        fragmentShaderText: `
          void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
            material.roughness = 1.0;
          }
        `,
    });

    const model = await Model.fromGltfAsync({
        url: path,
        modelMatrix: Gizmo.modelMatrix,
        id: createGuid(),
        customShader,
    });

    model.environmentMapManager.enabled = false;

    model.imageBasedLighting.imageBasedLightingFactor.x = 2.0;
    model.imageBasedLighting.imageBasedLightingFactor.y = 0.0;

    app.viewer.scene.primitives.add(model);

    model.initialMatrix = matrix;
    Temporary.pickedID = model.id;
    Temporary.picked = model;

    model.readyEvent.addEventListener(() => {
        const bs = model.boundingSphere;
        app.viewer.scene.camera.safeFlyToBoundingSphere(
            new BoundingSphere(bs.center, bs.radius * 3.5),
        );
    });

    const layer = new Layer(viewer, {
        id: model.id,
        content: model,
        name: fileName,
        type: Layer.LayerTypes.GLTF,
    });

    layerCollection.addContent(layer);

    Layers.gltf.obj.push(model);
    Layers.gltf.filename.push(fileName);
    Layers.gltf.winkel.push(heading);
    Layers.gltf.stat.push(true);
    Layers.gltf.id.push(model.id);

    const index = Layers.gltf.id.indexOf(model.id);
    //enterGizmoEditMode(index);
    enterObjectEditMode(matrix, index);

    fillTable_singlemodel();
    eventsinglemodel();
    eventsinglemodel2();
    closemenu();
    app.viewer.scene.requestRender();
    Temporary.pickedID = model.id;
    //document.getElementById("movemodeldiv").style.visibility = "visible";

    //gizmoLoop(matrix);
    Gizmo.set = true;
    dropOnTerrain();
}

/**
 * Fills the table with the currently loaded models, listing file name, visibility, and delete buttons.
 * Automatically rebuilds the rows and attaches proper styling.
 */
function fillTable_singlemodel() {
    const singletable = document.getElementById('singlemodelTable');
    singletable.innerHTML = '';
    createTable_singlemodel();
    const tbody = singletable.tBodies[0];
    for (let k = 0; k < Layers.gltf.obj.length; k++) {
        const brow = tbody.insertRow();
        brow.style = 'display: table';
        const bcell1 = brow.insertCell(0);
        const bcell2 = brow.insertCell(1);
        const bcell3 = brow.insertCell(2);

        bcell1.innerHTML = Layers.gltf.filename[k];
        bcell1.style = 'width: 290px;';
        bcell2.innerHTML = `<label style='cursor: pointer;'><input type='checkbox' id='cb_${Layers.gltf.id[k]}'/></label>`;
        //bcell2.style = "width: 20px; display: table-cell; text-align: center; cursor: pointer;"
        bcell2.className = 'table-cell2';
        bcell3.innerHTML = `<span id='btn_${Layers.gltf.id[k]}' style='height: 18px; width: 18px; position: relative; display: flex; left: 50%; transform: translateX(-50%); background-image: url("images/common/trash.svg"); background-size: contain; background-repeat: no-repeat; background-position: center'></span>`;
        bcell3.style = 'width: 20px;';
        bcell3.className = 'highlight';
    }
}

/**
 * Deletes a single loaded model from the collection and UI table,
 * removing it from the layerCollection and the scene as well.
 * If no argument is given, deletes the currently selected one.
 *
 * @export
 * @param {number} [l] - Index in Layers.gltf.id array of the model to delete.
 */
export function deleteSingleModel(l) {
    if (l === undefined) l = Layers.gltf.id.indexOf(Temporary.pickedID);
    const layer = layerCollection.getLayerById(Layers.gltf.id[l]);

    if (layer) {
        switchCheckbox(
            app,
            Variables.hideIDs,
            document.getElementById(`cb_${Layers.gltf.id[l]}`),
            layer,
            layer.id,
        );
        layerCollection.removeLayer(layer);
        Layers.gltf.id.splice(l, 1);
        Layers.gltf.obj.splice(l, 1);
        Layers.gltf.filename.splice(l, 1);
        Layers.gltf.stat.splice(l, 1);
        fillTable_singlemodel();
        eventsinglemodel();
        eventsinglemodel2();
    }
}

/**
 * Binds delete button event listeners for all model rows.
 */
function eventsinglemodel() {
    const btn = [];
    for (let l = 0; l < Layers.gltf.obj.length; l++) {
        btn.push(document.getElementById(`btn_${Layers.gltf.id[l]}`));
        btn[l].addEventListener(
            'click',
            () => {
                deleteSingleModel(l);
            },
            false,
        );
    }
}

/**
 * Binds visibility toggle (checkbox) event listeners for all model table rows.
 * Each will update corresponding layer visibility.
 */
function eventsinglemodel2() {
    const cb = [];
    for (let m = 0; m < Layers.gltf.obj.length; m++) {
        const id = `cb_${Layers.gltf.id[m]}`;
        const layer = layerCollection.getLayerById(Layers.gltf.id[m]);
        const checkbox = document.getElementById(id);
        cb.push(checkbox);
        checkCheckbox(checkbox);
        cb[m].addEventListener(
            'change',
            function (m) {
                switchCheckbox(app, Variables.hideIDs, cb[m], layer, layer.id);
            }.bind(null, m),
            false,
        );
    }
}

/**
 * Starts repeated execution of a function (typically model movement)
 * at 250ms intervals (for UI "hold" actions).
 *
 * @export
 * @param {Function} functionname - Function to execute repeatedly.
 */
Variables.hold;
export function start_hold(functionname) {
    Variables.hold = setInterval(function () {
        functionname();
    }, 250); //execute functions every 250 ms
}

/**
 * Clears interval set by start_hold(), stopping hold repetition.
 */
function end_hold() {
    clearInterval(Variables.hold);
}

/**
 * Rotates the model currently under manipulation (via the Gizmo)
 * about its Z axis by the step angle (snap or default), in the given direction.
 *
 * @param {'cw'|'ccw'} direction - Rotation direction ('cw' = clockwise, 'ccw' = counterclockwise).
 */
function rotateModel(direction) {
    const ii = Matrix4.inverse(Gizmo.globalMatrix, new Matrix4());
    const mm = Matrix4.multiply(ii, Gizmo.modelMatrix, new Matrix4());
    let stepsize = defined(Gizmo.rotationSnap)
        ? Gizmo.rotationSnap
        : ROTATION_STEPSIZE;
    if (direction === 'ccw') {
        stepsize *= -1.0;
    }

    const rot = new Matrix3.fromRotationZ(CesiumMath.toRadians(-stepsize));
    let rotate = Matrix4.getRotation(mm, new Matrix3());
    rotate = Matrix3.multiply(rot, rotate, new Matrix3());
    let s = Matrix4.getScale(Gizmo.modelMatrix, new Cartesian3());
    s = Matrix4.fromScale(s, new Matrix4());
    let change = Matrix4.fromRotation(rotate);
    change = Matrix4.multiply(change, s, new Matrix4());
    const modelMatrix = Matrix4.multiply(
        Gizmo.globalMatrix,
        change,
        new Matrix4(),
    );
    gizmoLoop(modelMatrix);
}

/**
 * Rotates currently edited model clockwise about its Z axis.
 * @export
 */
export function rotate_clockwise() {
    rotateModel('cw');
}

/**
 * Rotates currently edited model counterclockwise about its Z axis.
 * @export
 */
export function rotate_counterclockwise() {
    rotateModel('ccw');
}
/**
 * Converts ECEF (Earth-Centered, Earth-Fixed) Cartesian3 position to projected (local) Cartesian3.
 *
 * @param {Cartesian3} position - ECEF position to convert.
 * @returns {Cartesian3} Projected (local) coordinate.
 */
function ECEFtoProjectCoord(position) {
    const pos = Cartographic.fromCartesian(position);
    const lon = pos.longitude * CesiumMath.DEGREES_PER_RADIAN;
    const lat = pos.latitude * CesiumMath.DEGREES_PER_RADIAN;
    const height = pos.height;
    const coords = proj4('WGS84', 'COORD', [lon, lat]);
    return new Cartesian3(coords[0], coords[1], height);
}

/**
 * Converts projected Cartesian3 local coordinate to ECEF (WGS84) Cartesian3.
 *
 * @param {Cartesian3} coords - Projected/local coordinates to convert.
 * @returns {Cartesian3} ECEF position.
 */
function projectCoordtoECEF(coords) {
    const lonlat = proj4('COORD', 'WGS84', [coords.x, coords.y]);
    return Cartesian3.fromDegrees(lonlat[0], lonlat[1], coords.z);
}

/**
 * Moves the currently edited model in the specified direction,
 * applies snapping, updates Gizmo, and re-clamps to terrain if required.
 *
 * @async
 * @param {'north'|'south'|'west'|'east'|'up'|'down'} direction - The direction to move the model.
 */
async function moveDirection(direction) {
    if (!Gizmo.set) return;
    Gizmo.set = false;
    const index = Layers.gltf.id.indexOf(Temporary.pickedID);
    const position = Matrix4.getTranslation(Gizmo.modelMatrix, new Matrix4());
    const coords = ECEFtoProjectCoord(position);

    const stepsize = defined(Gizmo.translationSnap)
        ? Gizmo.translationSnap
        : MOVE_STEPSIZE;

    switch (direction) {
        case 'north':
            coords.y += stepsize;
            break;
        case 'south':
            coords.y -= stepsize;
            break;
        case 'west':
            coords.x -= stepsize;
            break;
        case 'east':
            coords.x += stepsize;
            break;
        case 'up':
            coords.z += stepsize;
            break;
        case 'down':
            coords.z -= stepsize;
            break;
    }

    const newpos = projectCoordtoECEF(coords);

    const rotation = Quaternion.fromRotationMatrix(
        Matrix4.getRotation(Gizmo.modelMatrix, new Matrix4()),
    );
    const scale = Matrix4.getScale(Gizmo.modelMatrix, new Cartesian3());
    const trs = new TranslationRotationScale(newpos, rotation, scale);
    const matrix = Matrix4.fromTranslationRotationScale(trs, new Matrix4());
    Layers.gltf.obj[index].modelMatrix = matrix;
    gizmoLoop(matrix);
    if (Gizmo.clampToGround) {
        await dropOnTerrain();
    }
    Gizmo.set = true;
}

/**
 * Model movement helpers (all directions), exported for UI controls.
 */
export async function move_north() {
    moveDirection('north');
}

// function to move model south
export async function move_south() {
    moveDirection('south');
}

// function to move model west
export async function move_west() {
    moveDirection('west');
}

// function to move model east
export async function move_east() {
    moveDirection('east');
}

// function to move model up
export async function move_up() {
    moveDirection('up');
}

// function to move model down
export async function move_down() {
    moveDirection('down');
}

/**
 * Closes a generic overlay panel with the ID 'coordsOver' (if present in the DOM).
 */
function close_Over() {
    const child = document.getElementById('coordsOver');
    document.body.removeChild(child);
}

/**
 * Allows the user to jump a model to precise coordinates entered in the menu inputs (#hw and #rw).
 * Updates its position, keeps the same rotation and scale, and closes the overlay UI.
 *
 * @export
 */
export function inputCoords() {
    const hw = parseFloat(document.getElementById('hw').value);
    const rw = parseFloat(document.getElementById('rw').value);
    const height = Cartographic.fromCartesian(
        Matrix4.getTranslation(Gizmo.modelMatrix, new Cartesian3()),
    ).height;
    const modelcoords = proj4('COORD', 'WGS84', [rw, hw]);
    const newpos = Cartesian3.fromDegrees(
        modelcoords[0],
        modelcoords[1],
        height,
    );

    const rotation = Quaternion.fromRotationMatrix(
        Matrix4.getRotation(Gizmo.modelMatrix, new Matrix4()),
    );
    const scale = Matrix4.getScale(Gizmo.modelMatrix, new Cartesian3());
    const trs = new TranslationRotationScale(newpos, rotation, scale);
    const matrix = Matrix4.fromTranslationRotationScale(trs, new Matrix4());
    gizmoLoop(matrix);
    close_Over();
}

// Create overlay container for the model move/rotate controls

Variables.movemodeldiv = document.createElement('div');
Variables.movemodeldiv.id = 'movemodeldiv';

document.body.appendChild(Variables.movemodeldiv);
document.body.addEventListener('mouseup', end_hold); // add to body in case mouse glitches away from button

// Fine-tuning the Cesium camera update rate in some environments
app.viewer.camera.percentageChanged = 0.05;

// Ensure Gizmo always updates if camera moves (delays to allow for loading)
setTimeout(() => {
    app.viewer.camera.changed.addEventListener(() => {
        scaleGizmo();
    });
}, 5000);

/**
 * Right-click handler for selecting and editing glTF models.
 */
Handlers.movemodel = new ScreenSpaceEventHandler(app.viewer.scene.canvas);
Handlers.movemodel.setInputAction(function onRightClick(movement) {
    if (Flags.walking) {
        return;
    }
    Temporary.picked = app.viewer.scene.pick(movement.position);

    if (
        Temporary.picked &&
        Temporary.picked.primitive &&
        Temporary.picked.primitive.type === 'GLTF'
    ) {
        Temporary.pickedID = Temporary.picked.id;
        const index = Layers.gltf.id.indexOf(Temporary.pickedID);
        enterObjectEditMode(Layers.gltf.obj[index].modelMatrix, index);
    }
}, ScreenSpaceEventType.RIGHT_CLICK);

/**
 * Left-click handler to exit object edit mode when clicking elsewhere on the canvas.
 */
Handlers.movemodel.setInputAction(function onLeftClick(click) {
    exitObjectEditMode();
}, ScreenSpaceEventType.LEFT_CLICK);
