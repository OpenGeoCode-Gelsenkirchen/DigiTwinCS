import {
    Cartesian3,
    Cartesian4,
    Cartographic,
    Math as CesiumMath,
    Color,
    ColorGeometryInstanceAttribute,
    HeadingPitchRoll,
    IntersectionTests,
    Matrix3,
    Matrix4,
    Plane,
    PrimitiveCollection,
    Quaternion,
    Ray,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    Transforms,
    TranslationRotationScale,
    defined,
} from '@cesium/engine';
import proj4 from 'proj4';
import {app} from './Core/Application.js';
import {Flags} from './Flags.js';
import {Temporary} from './Temporary.js';
import {Handlers, Layers} from './constants.js';
import {
    createCirclePrimitive,
    createConePrimitive,
    createCubePrimitive,
    createLinePrimitive,
} from './gizmoPrimitive.js';
import {clipValue} from './global.js';

/**
 * Stores state and objects relating to the coordinate-system manipulation "Gizmo" and its display.
 * Used for axis, cone, cube, and circle primitives, as well as transformation and visualization settings.
 *
 * @namespace Gizmo
 * @property {*} localLinePrimitive - Primitive showing the local coordinate axes.
 * @property {*} globalLinePrimitive - Primitive showing the global coordinate axes.
 * @property {*} conePrimitive - Primitive for direction cones.
 * @property {*} cubePrimitive - Cube primitive handle.
 * @property {*} circlePrimitive - Circle primitive visualization.
 * @property {Object} primitive - Primitive group object; has a `show` property for toggling.
 * @property {*} modelMatrix - Current local transformation matrix.
 * @property {*} globalMatrix - Reference matrix for global transformations.
 * @property {*} mode - Gizmo operation mode (e.g., translate/rotate/scale).
 * @property {number} scale - Scaling factor.
 * @property {*} translationSnap - Snap increment for translation.
 * @property {*} rotationSnap - Snap increment for rotation.
 * @property {*} scaleSnap - Snap increment for scaling.
 * @property {*} clampToGround - Flag or value for ground clamping.
 * @property {*} uniformScaling - Flag/value for uniform scaling.
 */

export const Gizmo = {
    localLinePrimitive: undefined,
    globalLinePrimitive: undefined,
    conePrimitive: undefined,
    cubePrimitive: undefined,
    circlePrimitive: undefined,
    primitive: undefined,
    modelMatrix: undefined,
    globalMatrix: undefined,
    mode: undefined,
    scale: 1.0,
    translationSnap: undefined,
    rotationSnap: undefined,
    scaleSnap: undefined,
    clampToGround: undefined,
    uniformScaling: undefined,
};

const WIDTH = 5;
const LENGTH = 10;
const RADIUS = 0.2;
const MINIMUM_CONE = 87;
const MAXIMUM_CONE = 92;
const RADII = LENGTH / 2;
const INNER_RADII = RADII - 0.2;
const Y_RADII_OFFSET = 0.2;
const Z_RADII_OFFSET = 0.4;
const yRADII = RADII - Y_RADII_OFFSET;
const yINNER_RADII = INNER_RADII - Y_RADII_OFFSET;
const zRADII = RADII - Z_RADII_OFFSET;
const zINNER_RADII = INNER_RADII - Z_RADII_OFFSET;

export function updateInspector() {
    const rw = document.getElementById('rw-inp');
    const hw = document.getElementById('hw-inp');
    const height = document.getElementById('height-inp');

    const xrot = document.getElementById('x-rot-inp');
    const yrot = document.getElementById('y-rot-inp');
    const zrot = document.getElementById('z-rot-inp');

    const xsca = document.getElementById('x-scale-inp');
    const ysca = document.getElementById('y-scale-inp');
    const zsca = document.getElementById('z-scale-inp');

    let translation = Matrix4.getTranslation(
        Gizmo.globalMatrix,
        new Cartesian3(),
    );
    let rotation = Matrix4.getRotation(Gizmo.modelMatrix, new Matrix3());
    const scale = Matrix4.getScale(Gizmo.modelMatrix, new Cartesian4());

    translation = Cartographic.fromCartesian(translation);
    translation = proj4('WGS84', 'COORD', [
        CesiumMath.toDegrees(translation.longitude),
        CesiumMath.toDegrees(translation.latitude),
        translation.height,
    ]);

    rw.value = translation[0].toFixed(2);
    hw.value = translation[1].toFixed(2);
    height.value = translation[2].toFixed(2);
    const inverseGlobal = Matrix4.inverse(Gizmo.globalMatrix, new Matrix4());
    const local = Matrix4.multiply(
        inverseGlobal,
        Gizmo.modelMatrix,
        new Matrix4(),
    );
    rotation = Matrix4.getRotation(local, new Matrix3());
    const quat = Quaternion.fromRotationMatrix(rotation);
    rotation = HeadingPitchRoll.fromQuaternion(quat, new HeadingPitchRoll());
    xrot.value = CesiumMath.toDegrees(rotation.roll).toFixed(2);
    yrot.value = CesiumMath.toDegrees(-rotation.pitch).toFixed(2);
    zrot.value = CesiumMath.toDegrees(-rotation.heading).toFixed(2);

    xsca.value = scale.x.toFixed(2);
    ysca.value = scale.y.toFixed(2);
    zsca.value = scale.z.toFixed(2);
}
// function to drop/lift model on terrain
export async function dropOnTerrain() {
    const index = Layers.gltf.id.indexOf(Temporary.pickedID);
    const initialPosition = Matrix4.getTranslation(
        Gizmo.modelMatrix,
        new Matrix4(),
    );

    const direction = Cartesian3.normalize(initialPosition, new Cartesian3());
    const distance = Cartesian3.multiplyByScalar(
        direction,
        1000,
        new Cartesian3(),
    );
    const position = Cartesian3.add(
        initialPosition,
        distance,
        new Cartesian3(),
    );

    const ray = new Ray(
        position,
        Cartesian3.negate(direction, new Cartesian3()),
    );
    const result = await app.viewer.scene.drillPickFromRayMostDetailed(ray);

    for (const obj of result) {
        if (
            obj?.object?.id?.properties?.terrain?.getValue() ||
            obj?.object?.primitive?.terrain ||
            obj.object === undefined
        ) {
            const newpos = obj.position;
            if (index >= 0) {
                Matrix4.setTranslation(
                    Layers.gltf.obj[index].modelMatrix,
                    newpos,
                    Layers.gltf.obj[index].modelMatrix,
                );
            }
            const rotation = Quaternion.fromRotationMatrix(
                Matrix4.getRotation(Gizmo.modelMatrix, new Matrix4()),
            );
            const scale = Matrix4.getScale(Gizmo.modelMatrix, new Cartesian3());
            const trs = new TranslationRotationScale(newpos, rotation, scale);
            const matrix = Matrix4.fromTranslationRotationScale(
                trs,
                new Matrix4(),
            );
            gizmoLoop(matrix);
            break;
        }
    }
}
let NORMAL = {
    x: Cartesian3.UNIT_Z,
    y: Cartesian3.UNIT_Z,
    z: Cartesian3.UNIT_X,
};

const MODE = {
    translation: 0,
    rotation: 1,
    scale: 2,
};

function gizmoSetColor(id, color) {
    Gizmo.globalLinePrimitive.getGeometryInstanceAttributes(id).color = color;
    Gizmo.localLinePrimitive.getGeometryInstanceAttributes(id).color = color;
    Gizmo.conePrimitive.getGeometryInstanceAttributes(id).color = color;
    Gizmo.cubePrimitive.getGeometryInstanceAttributes(id).color = color;
    Gizmo.circlePrimitive.getGeometryInstanceAttributes(id).color = color;
}

function gizmoHighlight(id) {
    const line = Gizmo.globalLinePrimitive.getGeometryInstanceAttributes(id);
    const lineLocal =
        Gizmo.localLinePrimitive.getGeometryInstanceAttributes(id);
    const cone = Gizmo.conePrimitive.getGeometryInstanceAttributes(id);
    const cube = Gizmo.cubePrimitive.getGeometryInstanceAttributes(id);
    const circle = Gizmo.circlePrimitive.getGeometryInstanceAttributes(id);
    const originalColor = line.color;

    line.color = ColorGeometryInstanceAttribute.toValue(Color.YELLOW);
    lineLocal.color = ColorGeometryInstanceAttribute.toValue(Color.YELLOW);
    cone.color = ColorGeometryInstanceAttribute.toValue(Color.YELLOW);
    cube.color = ColorGeometryInstanceAttribute.toValue(Color.YELLOW);
    circle.color = ColorGeometryInstanceAttribute.toValue(Color.YELLOW);
    return originalColor;
}

export function setGizmoMode(mode) {
    Gizmo.mode = MODE[mode];

    switch (Gizmo.mode) {
        case 0:
            Gizmo.globalLinePrimitive.show = true;
            Gizmo.localLinePrimitive.show = false;
            Gizmo.conePrimitive.show = true;
            Gizmo.circlePrimitive.show = false;
            Gizmo.cubePrimitive.show = false;
            break;
        case 1:
            Gizmo.globalLinePrimitive.show = false;
            Gizmo.localLinePrimitive.show = false;
            Gizmo.conePrimitive.show = false;
            Gizmo.circlePrimitive.show = true;
            Gizmo.cubePrimitive.show = false;
            break;
        case 2:
            Gizmo.globalLinePrimitive.show = false;
            Gizmo.localLinePrimitive.show = true;
            Gizmo.conePrimitive.show = false;
            Gizmo.circlePrimitive.show = false;
            Gizmo.cubePrimitive.show = true;
            break;
    }
}

export function scaleGizmo() {
    if (defined(Gizmo.globalMatrix)) {
        const distance = Cartesian3.distance(
            app.viewer.camera.positionWC,
            Matrix4.getTranslation(Gizmo.globalMatrix, new Cartesian3()),
            new Cartesian3(),
        );
        Gizmo.scale = distance / 100;
        Gizmo.globalLinePrimitive.modelMatrix = Matrix4.setUniformScale(
            Gizmo.globalMatrix,
            Gizmo.scale,
            new Matrix4(),
        );
        Gizmo.localLinePrimitive.modelMatrix = Matrix4.setUniformScale(
            Gizmo.adjustedModelMatrix,
            Gizmo.scale,
            new Matrix4(),
        );
        Gizmo.conePrimitive.modelMatrix = Matrix4.setUniformScale(
            Gizmo.globalMatrix,
            Gizmo.scale,
            new Matrix4(),
        );
        Gizmo.cubePrimitive.modelMatrix = Matrix4.setUniformScale(
            Gizmo.adjustedModelMatrix,
            Gizmo.scale,
            new Matrix4(),
        );
        Gizmo.circlePrimitive.modelMatrix = Matrix4.setUniformScale(
            Gizmo.globalMatrix,
            Gizmo.scale,
            new Matrix4(),
        );
    }
}

function updateGizmoMatrix(matrix) {
    Gizmo.modelMatrix = matrix;
    const rot3 = Matrix3.fromRotationZ(CesiumMath.toRadians(90), new Matrix3());
    const rot4 = Matrix4.fromRotation(rot3, new Matrix4());
    Gizmo.adjustedModelMatrix = Matrix4.multiply(matrix, rot4, new Matrix4());
    Gizmo.globalMatrix = Transforms.eastNorthUpToFixedFrame(
        Matrix4.getTranslation(matrix, new Cartesian3()),
    );
}

function updatePickMatrix(matrix) {
    if (defined(Temporary.picked)) {
        const index = Layers.gltf.id.indexOf(Temporary.pickedID);
        if (index >= 0) {
            Layers.gltf.obj[index].modelMatrix = matrix;
        }
    }
}

export function enterGizmoEditMode(index = undefined) {
    if (defined(index)) {
        Flags.clippingPlaneSelected = false;
        Gizmo.primitive.show = true;

        if (!Flags.gizmoEdit) {
            Handlers.gizmo.setInputAction(
                onMouseMove,
                ScreenSpaceEventType.MOUSE_MOVE,
            );
            Handlers.gizmo.setInputAction(
                onMouseClick,
                ScreenSpaceEventType.LEFT_DOWN,
            );
            Handlers.gizmo.setInputAction(
                onMouseUp,
                ScreenSpaceEventType.LEFT_UP,
            );
            Gizmo.tickCallback =
                app.viewer.clock.onTick.addEventListener(gizmoTick);
        }

        Flags.gizmoEdit = true;
    } else {
        Flags.clippingPlaneSelected = true;
    }
}

export function exitGizmoEditMode() {
    if (Flags.gizmoEdit) {
        Gizmo.primitive.show = false;
        Flags.clippingPlaneSelected = false;
        Flags.gizmoEdit = false;

        Handlers.gizmo.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
        Handlers.gizmo.removeInputAction(ScreenSpaceEventType.LEFT_DOWN);
        Handlers.gizmo.removeInputAction(ScreenSpaceEventType.LEFT_UP);
        Gizmo?.tickCallback();
    }
}

function initiateGizmo() {
    Gizmo.modelMatrix = Matrix4.IDENTITY;

    Gizmo.globalLinePrimitive = createLinePrimitive(LENGTH, RADIUS, RADII);
    Gizmo.localLinePrimitive = createLinePrimitive(LENGTH, RADIUS, RADII);
    Gizmo.conePrimitive = createConePrimitive(LENGTH, RADII);
    Gizmo.cubePrimitive = createCubePrimitive(LENGTH, RADII);
    Gizmo.circlePrimitive = createCirclePrimitive(
        RADII,
        yRADII,
        zRADII,
        INNER_RADII,
        yINNER_RADII,
        zINNER_RADII,
        MINIMUM_CONE,
        MAXIMUM_CONE,
        RADII,
    );

    Gizmo.primitive = new PrimitiveCollection();
    Gizmo.primitive.add(Gizmo.globalLinePrimitive);
    Gizmo.primitive.add(Gizmo.localLinePrimitive);
    Gizmo.primitive.add(Gizmo.conePrimitive);
    Gizmo.primitive.add(Gizmo.cubePrimitive);
    Gizmo.primitive.add(Gizmo.circlePrimitive);

    setGizmoMode('translation');
    app.viewer.scene.primitives.add(Gizmo.primitive);
}

function clampCartesian3(car, min = undefined, max = undefined) {
    if (defined(min)) {
        if (car.x < min) {
            car.x = min;
        }
        if (car.y < min) {
            car.y = min;
        }
        if (car.z < min) {
            car.z = min;
        }
    }
    if (defined(max)) {
        if (car.x > max) {
            car.x = max;
        }
        if (car.y > max) {
            car.y = max;
        }
        if (car.z > max) {
            car.z = max;
        }
    }
    return car;
}

export function gizmoLoop(matrix) {
    updateGizmoMatrix(matrix);
    updatePickMatrix(matrix);
    scaleGizmo();
    updateInspector();
}

function getCenterChange(delta, TRANSLATION_SCALER, localModel, inverseGlobal) {
    let rotate;
    let snap = false;

    rotate = Matrix4.getRotation(localModel, new Matrix3());
    rotate = new Quaternion.fromRotationMatrix(rotate, new Quaternion());
    delta = new Cartesian3(
        delta.x * TRANSLATION_SCALER,
        delta.y * TRANSLATION_SCALER,
        0,
    );

    if (defined(Gizmo.translationSnap)) {
        delta.x =
            Math.round(delta.x / Gizmo.translationSnap) * Gizmo.translationSnap;
        delta.y =
            Math.round(delta.y / Gizmo.translationSnap) * Gizmo.translationSnap;
        if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
            snap = true;
        }
    } else {
        snap = true;
    }
    if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
        const pos = Matrix4.getTranslation(
            Gizmo.globalMatrix,
            new Cartesian3(),
        );
        const trans = Cartographic.fromCartesian(pos);
        const lon = trans.longitude * CesiumMath.DEGREES_PER_RADIAN;
        const lat = trans.latitude * CesiumMath.DEGREES_PER_RADIAN;
        const height = trans.height;

        const coords = proj4('WGS84', 'COORD', [lon, lat]);
        coords[0] += delta.x;
        coords[1] += delta.y;
        const lonlat = proj4('COORD', 'WGS84', coords);
        const newpos = Cartesian3.fromDegrees(lonlat[0], lonlat[1], height);
        delta = Cartesian3.subtract(newpos, pos, new Cartesian3());
        delta = Matrix4.multiplyByPointAsVector(
            inverseGlobal,
            delta,
            new Cartesian3(),
        );
    } else {
        delta = Cartesian3.ZERO;
    }

    const trs = new TranslationRotationScale(
        new Cartesian3(delta.x, delta.y, 0),
        rotate,
        Matrix4.getScale(Gizmo.modelMatrix, new Cartesian3()),
    );
    return [snap, Matrix4.fromTranslationRotationScale(trs, new Matrix4())];
}

function calcTranslation(delta, axis, localModel, inverseGlobal) {
    let snap = false;
    let rotate = Matrix4.getRotation(localModel, new Matrix3());
    rotate = new Quaternion.fromRotationMatrix(rotate, new Quaternion());
    Cartesian3.multiplyByScalar(delta, TRANSLATION_SCALER, delta);

    if (defined(Gizmo.translationSnap)) {
        switch (axis) {
            case 'x':
            case 'y':
            case 'z':
                delta[axis] =
                    Math.round(delta[axis] / Gizmo.translationSnap) *
                    Gizmo.translationSnap;
                if (Math.abs(delta[axis]) > 0) {
                    snap = true;
                }
                break;
            case 'center':
                delta.x =
                    Math.round(delta.x / Gizmo.translationSnap) *
                    Gizmo.translationSnap;
                delta.y =
                    Math.round(delta.y / Gizmo.translationSnap) *
                    Gizmo.translationSnap;
                if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
                    snap = true;
                }
                break;
        }
    } else {
        snap = true;
    }

    if (snap && axis !== 'z') {
        const pos = Matrix4.getTranslation(
            Gizmo.globalMatrix,
            new Cartesian3(),
        );
        const trans = Cartographic.fromCartesian(pos);
        const lon = trans.longitude * CesiumMath.DEGREES_PER_RADIAN;
        const lat = trans.latitude * CesiumMath.DEGREES_PER_RADIAN;
        const height = trans.height;
        const coords = proj4('WGS84', 'COORD', [lon, lat]);

        switch (axis) {
            case 'x':
                coords[0] += delta[axis];
                break;
            case 'y':
                coords[1] += delta[axis];
                break;
            case 'center':
                coords[0] += delta.x;
                coords[1] += delta.y;
                break;
        }

        if (app.config.boundaries) {
            if (app.config.boundaries.x) {
                coords[0] = clipValue(
                    coords[0],
                    app.config.boundaries.x?.min,
                    app.config.boundaries.x?.max,
                );
            }
            if (app.config.boundaries.y) {
                coords[1] = clipValue(
                    coords[1],
                    app.config.boundaries.y?.min,
                    app.config.boundaries.y?.max,
                );
            }
        }

        const lonlat = proj4('COORD', 'WGS84', coords);
        const newpos = Cartesian3.fromDegrees(lonlat[0], lonlat[1], height);
        delta = Cartesian3.subtract(newpos, pos, new Cartesian3());
        delta = Matrix4.multiplyByPointAsVector(
            inverseGlobal,
            delta,
            new Cartesian3(),
        );
    } else if (snap) {
        delta = new Cartesian3(0, 0, delta.z);
    } else {
        delta = Cartesian3.ZERO;
    }
    const trs = new TranslationRotationScale(
        new Cartesian3(delta.x, delta.y, delta.z),
        rotate,
        Matrix4.getScale(Gizmo.modelMatrix, new Cartesian3()),
    );
    const change = Matrix4.fromTranslationRotationScale(trs, new Matrix4());

    return [snap, change];
}

function getRotationMatrix(delta, axis) {
    switch (axis) {
        case 'x':
            return Matrix3.fromRotationX(CesiumMath.toRadians(delta));
        case 'y':
            return Matrix3.fromRotationY(CesiumMath.toRadians(delta));
        case 'z':
            return Matrix3.fromRotationZ(CesiumMath.toRadians(delta));
    }
}

function calcRotation(delta, axis, localModel, inverseGlobal) {
    let snap = false;
    let change;
    let rot;
    let rotate;
    let scale;
    let result;

    switch (axis) {
        case 'x':
        case 'y':
        case 'z':
            delta *= ROTATION_SCALER;
            if (defined(Gizmo.rotationSnap)) {
                delta =
                    Math.round(delta / Gizmo.rotationSnap) * Gizmo.rotationSnap;
                if (Math.abs(delta) > 0) {
                    snap = true;
                }
            } else {
                snap = true;
            }

            rot = getRotationMatrix(delta, axis);
            rotate = Matrix4.getRotation(localModel, new Matrix3());
            Matrix3.multiply(rot, rotate, rotate);
            scale = Matrix4.getScale(Gizmo.modelMatrix, new Cartesian3());
            Matrix4.fromScale(scale, scale);
            change = Matrix4.fromRotation(rotate);
            Matrix4.multiply(change, scale, change);
            break;
        case 'center':
            result = getCenterChange(
                delta,
                TRANSLATION_SCALER,
                localModel,
                inverseGlobal,
            );
            snap = result[0];
            change = result[1];
            break;
    }
    return [snap, change];
}

function getScalingVector(delta, axis) {
    let scale;
    switch (axis) {
        //x and y Cartesian swapped because of 90 degree rotation of gltf
        case 'x':
            scale = Gizmo.uniformScaling
                ? new Cartesian3(delta[axis], delta[axis], delta[axis])
                : new Cartesian3(0, delta.x, 0);
            break;
        case 'y':
            scale = Gizmo.uniformScaling
                ? new Cartesian3(delta[axis], delta[axis], delta[axis])
                : new Cartesian3(delta.y, 0, 0);
            break;
        case 'z':
            scale = Gizmo.uniformScaling
                ? new Cartesian3(delta[axis], delta[axis], delta[axis])
                : new Cartesian3(0, 0, delta.z);
            break;
    }
    return scale;
}

function calcScale(delta, axis, localModel, inverseGlobal) {
    let snap = false;
    let rotate;
    let scaleDiff;
    let scale;
    let trs;
    let change;
    let result;

    switch (axis) {
        case 'x':
        case 'y':
        case 'z':
            delta[axis] *= SCALE_SCALER;
            if (defined(Gizmo.scaleSnap)) {
                delta[axis] =
                    Math.round(delta[axis] / Gizmo.scaleSnap) * Gizmo.scaleSnap;
                if (Math.abs(delta[axis]) > 0) {
                    snap = true;
                }
            } else {
                snap = true;
            }
            rotate = Matrix4.getRotation(localModel, new Matrix3());
            scaleDiff = getScalingVector(delta, axis);
            scale = Matrix4.getScale(Gizmo.modelMatrix, new Matrix4());
            Cartesian3.add(scale, scaleDiff, scale);
            scale = clampCartesian3(scale, 0.01);
            rotate = Quaternion.fromRotationMatrix(rotate, new Quaternion());
            trs = new TranslationRotationScale(Cartesian3.ZERO, rotate, scale);
            change = Matrix4.fromTranslationRotationScale(trs, new Matrix4());
            break;
        case 'center':
            result = getCenterChange(
                delta,
                TRANSLATION_SCALER,
                localModel,
                inverseGlobal,
            );
            snap = result[0];
            change = result[1];
            break;
    }
    return [snap, change];
}

initiateGizmo();
Handlers.gizmo = new ScreenSpaceEventHandler(app.viewer.scene.canvas);

let picked;
let mousePosition;

let proj_point;
let last_proj_point;

let snap;
let center_mode;

const TRANSLATION_SCALER = 2.0;
const ROTATION_SCALER = 50;
const SCALE_SCALER = 1.0;

//Handlers.gizmo.setInputAction(

function onMouseMove(movement) {
    //if gizmo  is already active or no feature is selected --> return
    if (Flags.gizmoActive || !defined(Temporary.pickedID)) {
        return;
    }

    //if a feature is selected and it belongs to the gizmo --> reset color and set picked to undefined
    if (defined(picked) && ['x', 'y', 'z', 'center'].includes(picked.id)) {
        gizmoSetColor(picked.id, picked.originalColor);
    }

    picked = undefined;

    //drillpick at endPosition of movement with depth 2
    const drillPicked = app.viewer.scene.drillPick(movement.endPosition, 2);

    //if something was picked --> iterate over array --> check if valid gizmo component --> assign feature
    if (drillPicked.length > 0) {
        for (let i = 0; i < drillPicked.length; i++) {
            if (['x', 'y', 'z', 'center'].includes(drillPicked[i].id)) {
                picked = drillPicked[i];
            }
        }
    }

    //if nothing is picked --> return
    if (!defined(picked)) {
        return;
    }

    //set mousePosition to endPosition
    mousePosition = movement.endPosition;

    //highlight component
    picked.originalColor = gizmoHighlight(picked.id);
}

//ScreenSpaceEventType.MOUSE_MOVE);

//Handlers.gizmo.setInputAction();
function onMouseClick(click) {
    if (!defined(picked)) {
        return;
    }

    const ray = app.viewer.camera.getPickRay(click.position);

    //if mode = scale --> use localMatrix (model) not global
    const inv =
        Gizmo.mode < 2
            ? Matrix4.inverse(Gizmo.globalMatrix, new Matrix4())
            : Matrix4.inverse(Gizmo.modelMatrix, new Matrix4());

    //create plane normal based on ray and axis
    switch (picked.id) {
        case 'x':
            Matrix4.multiplyByPointAsVector(inv, ray.direction, ray.direction);
            NORMAL.x = Cartesian3.normalize(
                new Cartesian3(0.0, ray.direction.y, ray.direction.z),
                new Cartesian3(),
            );
            break;
        case 'y':
            Matrix4.multiplyByPointAsVector(inv, ray.direction, ray.direction);
            NORMAL.y = Cartesian3.normalize(
                new Cartesian3(ray.direction.x, 0.0, ray.direction.z),
                new Cartesian3(),
            );
            break;
        case 'z':
            Matrix4.multiplyByPointAsVector(inv, ray.direction, ray.direction);
            NORMAL.z = Cartesian3.normalize(
                new Cartesian3(ray.direction.x, ray.direction.y, 0.0),
                new Cartesian3(),
            );
            break;
        case 'center':
            NORMAL.z = Cartesian3.UNIT_Z;
            center_mode = true;
            break;
    }

    Flags.gizmoActive = true;
    snap = true;

    //disable camera features
    app.viewer.scene.screenSpaceCameraController.enableTranslate = false;
    app.viewer.scene.screenSpaceCameraController.enableLook = false;
    app.viewer.scene.screenSpaceCameraController.enableRotate = false;
    app.viewer.scene.screenSpaceCameraController.enableTilt = false;
    app.viewer.scene.screenSpaceCameraController.enableTranslate = false;
    app.viewer.scene.screenSpaceCameraController.enableZoom = false;
} //, ScreenSpaceEventType.LEFT_DOWN

//Handlers.gizmo.setInputAction(

function onMouseUp(click) {
    if (!Flags.gizmoActive) {
        return;
    }
    if (defined(picked) && ['x', 'y', 'z', 'center'].includes(picked.id)) {
        gizmoSetColor(picked.id, picked.originalColor);
        picked = undefined;
    }

    if (Gizmo.clampToGround) {
        dropOnTerrain();
        center_mode = false;
    }

    Flags.gizmoActive = false;
    snap = false;
    proj_point = undefined;
    last_proj_point = undefined;

    app.viewer.scene.screenSpaceCameraController.enableZoom = true;
    setTimeout(() => {
        app.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        app.viewer.scene.screenSpaceCameraController.enableLook = true;
        app.viewer.scene.screenSpaceCameraController.enableRotate = true;
        app.viewer.scene.screenSpaceCameraController.enableTilt = true;
        app.viewer.scene.screenSpaceCameraController.enableTranslate = true;
    }, 250);
}
//, ScreenSpaceEventType.LEFT_UP);

//app.viewer.clock.onTick.addEventListener(

function gizmoTick() {
    if (Flags.gizmoActive && defined(mousePosition)) {
        //delta = difference between two consecutive ticks;
        let delta;

        //plane = reference plane to measure difference in space between two consecutive ticks
        let plane;

        const inverseGlobal = Matrix4.inverse(
            Gizmo.globalMatrix,
            new Matrix4(),
        );
        const localModel = Matrix4.multiply(
            inverseGlobal,
            Gizmo.modelMatrix,
            new Matrix4(),
        );

        switch (Gizmo.mode) {
            case 0:
            case 2:
                switch (picked.id) {
                    case 'x':
                        plane = Plane.fromPointNormal(
                            Cartesian3.ZERO,
                            NORMAL.x,
                        );
                        break;
                    case 'y':
                        plane = Plane.fromPointNormal(
                            Cartesian3.ZERO,
                            NORMAL.y,
                        );
                        break;
                    case 'z':
                        plane = Plane.fromPointNormal(
                            Cartesian3.ZERO,
                            NORMAL.z,
                        );
                        break;
                    case 'center':
                        plane = Plane.fromPointNormal(
                            Cartesian3.ZERO,
                            Cartesian3.UNIT_Z,
                        );
                        break;
                }
                break;
            case 1:
                switch (picked.id) {
                    case 'x':
                        plane = Plane.fromPointNormal(
                            Cartesian3.ZERO,
                            Cartesian3.UNIT_X,
                        );
                        break;
                    case 'y':
                        plane = Plane.fromPointNormal(
                            Cartesian3.ZERO,
                            Cartesian3.UNIT_Y,
                        );
                        break;
                    case 'z':
                    case 'center':
                        plane = Plane.fromPointNormal(
                            Cartesian3.ZERO,
                            Cartesian3.UNIT_Z,
                        );
                        break;
                }
                break;
        }

        const ray = app.viewer.camera.getPickRay(mousePosition);

        //inverse is needed to transform ray from global space to local space
        const inv = Matrix4.inverse(Gizmo.globalMatrix, new Matrix4());

        //transform pick ray to local
        ray.origin = Matrix4.multiplyByPoint(inv, ray.origin, ray.origin);
        ray.direction = Matrix4.multiplyByPointAsVector(
            inv,
            ray.direction,
            ray.direction,
        );

        //instead of using axis aligned plane and angle; use simple plane
        let planar = false;

        //we have to measure the angle of incidence for the rotation gizmo in the special case of a sideways pick
        const angle_of_incidence = CesiumMath.toDegrees(
            CesiumMath.acosClamped(
                Cartesian3.dot(
                    plane.normal,
                    Cartesian3.normalize(ray.direction, new Cartesian3()),
                ),
            ),
        );

        //if angle is +/- 5 deg of 90; change plane
        if (angle_of_incidence >= 85.0 && angle_of_incidence <= 95.0) {
            planar = true;
            plane = new Plane.fromPointNormal(
                Cartesian3.ZERO,
                Cartesian3.multiplyByScalar(
                    Cartesian3.normalize(ray.direction, new Cartesian3()),
                    -1.0,
                    new Cartesian3(),
                ),
            );
        }

        //if snap or last point is not defined --> define last point; reset snap
        if (snap || !defined(last_proj_point)) {
            last_proj_point = proj_point;
            snap = false;
        }

        //test if ray intersects plane in local space
        proj_point = IntersectionTests.rayPlane(ray, plane, new Cartesian3());

        if (defined(last_proj_point) && defined(proj_point)) {
            if (Gizmo.mode === 0 || picked.id === 'center') {
                delta = Cartesian3.subtract(
                    proj_point,
                    last_proj_point,
                    new Cartesian3(),
                );
            } else if (Gizmo.mode === 2) {
                delta = Cartesian3.subtract(
                    proj_point,
                    last_proj_point,
                    new Cartesian3(),
                );
                //because scaling shows the gizmo in model space, we have to transform the scaling to the respective model space
                const modelRot = Matrix4.getRotation(
                    Gizmo.adjustedModelMatrix,
                    new Matrix3(),
                );
                const globalRot = Matrix4.getRotation(
                    Gizmo.globalMatrix,
                    new Matrix3(),
                );
                const invGlobalRot = Matrix3.inverse(globalRot, new Matrix3());
                Matrix3.multiply(invGlobalRot, modelRot, modelRot);
                Matrix3.inverse(modelRot, modelRot);
                Matrix3.multiplyByVector(modelRot, delta, delta);
            } else if (planar) {
                delta = Cartesian3.subtract(
                    proj_point,
                    last_proj_point,
                    new Cartesian3(),
                );
                Cartesian3.divideByScalar(delta, Gizmo.scale, delta);
                delta = picked.id === 'z' ? delta.x + delta.y : -delta.z;
            } else {
                const normalizedProjPoint = Cartesian3.normalize(
                    proj_point,
                    new Cartesian3(),
                );
                const normalizedPrevProjPoint = Cartesian3.normalize(
                    last_proj_point,
                    new Cartesian3(),
                );
                const angle = CesiumMath.acosClamped(
                    Cartesian3.dot(
                        normalizedProjPoint,
                        normalizedPrevProjPoint,
                    ),
                );
                const sign = Math.sign(
                    Cartesian3.dot(
                        plane.normal,
                        Cartesian3.cross(
                            normalizedPrevProjPoint,
                            normalizedProjPoint,
                            new Cartesian3(),
                        ),
                        new Cartesian3(),
                    ),
                );
                delta = sign * angle;
            }

            let result;

            switch (Gizmo.mode) {
                case 0:
                    result = calcTranslation(
                        delta,
                        picked.id,
                        localModel,
                        inverseGlobal,
                    );
                    break;
                case 1:
                    result = calcRotation(
                        delta,
                        picked.id,
                        localModel,
                        inverseGlobal,
                    );
                    break;
                case 2:
                    result = calcScale(
                        delta,
                        picked.id,
                        localModel,
                        inverseGlobal,
                    );
                    break;
            }

            snap = result[0];
            const change = result[1];

            const modelMatrix = Matrix4.multiply(
                Gizmo.globalMatrix,
                change,
                new Matrix4(),
            );
            gizmoLoop(modelMatrix);
            proj_point = undefined;
        }
    }
}
//}
