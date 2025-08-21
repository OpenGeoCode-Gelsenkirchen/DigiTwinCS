import {
    Cartesian3,
    Math as CesiumMath,
    Matrix3,
    Matrix4,
    Quaternion,
    TranslationRotationScale,
} from '@cesium/engine';
import {MIN_SCALE} from './constants.js';
import {Gizmo, dropOnTerrain, gizmoLoop, setGizmoMode} from './gizmo.js';
import {clipValue} from './global.js';
import {
    move_down,
    move_east,
    move_north,
    move_south,
    move_up,
    move_west,
    resetRotation,
    resetScale,
    resetTranslation,
    rotate_clockwise,
    rotate_counterclockwise,
    start_hold,
} from './singlemodels.js';

import proj4 from 'proj4';

/**
 * Initializes the 3D inspector panel and associated UI controls for manipulating 3D objects or models interactively.
 * Binds input fields (translation, rotation, scaling) and widget controls (arrows, rotation buttons)
 * to real-time update handlers, snap settings, and "apply"/"reset" buttons.
 * Supports advanced features like position/rotation/scale snapping, clamping to terrain, and uniform scaling.
 *
 * The inspector enables users to modify object transforms either via numeric input or by using
 * dedicated on-screen widget controls ("move north/south/east/west/up/down", "rotate", "drop", etc.).
 *
 * @function
 * @returns {void}
 */
export function initializeInspector() {
    const rw = document.getElementById('rw-inp');
    const hw = document.getElementById('hw-inp');
    const height = document.getElementById('height-inp');

    const xrot = document.getElementById('x-rot-inp');
    const yrot = document.getElementById('y-rot-inp');
    const zrot = document.getElementById('z-rot-inp');

    const xsca = document.getElementById('x-scale-inp');
    const ysca = document.getElementById('y-scale-inp');
    const zsca = document.getElementById('z-scale-inp');
    const elem = [rw, hw, height, xrot, yrot, zrot, xsca, ysca, zsca];

    // Enter key triggers immediate inspector update for all numeric controls
    elem.forEach(ele => {
        ele.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                const matrix = readInspector(
                    rw,
                    hw,
                    height,
                    xrot,
                    yrot,
                    zrot,
                    xsca,
                    ysca,
                    zsca,
                );

                gizmoLoop(matrix);
            }
        });
    });

    // Snap increment controls for translation, rotation, scale
    document.getElementById('pos-snap-inp').addEventListener('change', e => {
        Gizmo.translationSnap =
            Number(e.target.value) > 0 ? Number(e.target.value) : undefined;
    });
    document.getElementById('rot-snap-inp').addEventListener('change', e => {
        Gizmo.rotationSnap =
            Number(e.target.value) > 0 ? Number(e.target.value) : undefined;
    });
    document.getElementById('scale-snap-inp').addEventListener('change', e => {
        Gizmo.scaleSnap =
            Number(e.target.value) > 0 ? Number(e.target.value) : undefined;
    });

    // "Apply" button applies current inspector values to the selected object/gizmo
    document.getElementById('apply-btn').addEventListener('click', () => {
        const matrix = readInspector(
            rw,
            hw,
            height,
            xrot,
            yrot,
            zrot,
            xsca,
            ysca,
            zsca,
        );

        gizmoLoop(matrix);
    });

    // Clamping and uniform scaling toggles
    document.getElementById('ground-clamp').addEventListener('change', e => {
        if (e.target.checked) {
            Gizmo.clampToGround = true;
            dropOnTerrain();
        } else {
            Gizmo.clampToGround = false;
        }
    });

    document.getElementById('uni-scale').addEventListener('change', e => {
        if (e.target.checked) {
            Gizmo.uniformScaling = true;
        } else {
            Gizmo.uniformScaling = false;
        }
    });

    // Set initial state from checkboxes
    Gizmo.clampToGround = document.getElementById('ground-clamp-cb').checked;
    Gizmo.uniformScaling = document.getElementById('uni-scale-cb').checked;

    // Reset buttons for translation, rotation, and scale
    document
        .getElementById('reset-translation')
        .addEventListener('click', resetTranslation);
    document
        .getElementById('reset-rotation')
        .addEventListener('click', resetRotation);

    document
        .getElementById('reset-scale')
        .addEventListener('click', resetScale);

    // Widget mode buttons (translation/rotation/scale)
    document
        .getElementById('translation-widget')
        .addEventListener('click', () => {
            setGizmoMode('translation');
        });

    document.getElementById('rotation-widget').addEventListener('click', () => {
        setGizmoMode('rotation');
    });

    document.getElementById('scale-widget').addEventListener('click', () => {
        setGizmoMode('scale');
    });

    // Directional movement widgets (N/S/E/W/U/D), plus rotation (clockwise, counterclockwise)
    const northWidget = document.getElementById('north-widget');
    northWidget.addEventListener('click', move_north);
    northWidget.addEventListener('onmousedown', () => {
        start_hold(move_north);
    });

    const southWidget = document.getElementById('south-widget');
    southWidget.addEventListener('click', move_south);
    southWidget.addEventListener('onmousedown', () => {
        start_hold(move_south);
    });

    const eastWidget = document.getElementById('east-widget');
    eastWidget.addEventListener('click', move_east);
    eastWidget.addEventListener('onmousedown', () => {
        start_hold(move_east);
    });

    const westWidget = document.getElementById('west-widget');
    westWidget.addEventListener('click', move_west);
    westWidget.addEventListener('onmousedown', () => {
        start_hold(move_west);
    });

    const upWidget = document.getElementById('up-widget');
    upWidget.addEventListener('click', move_up);
    upWidget.addEventListener('onmousedown', () => {
        start_hold(move_up);
    });

    const downWidget = document.getElementById('down-widget');
    downWidget.addEventListener('click', move_down);
    downWidget.addEventListener('onmousedown', () => {
        start_hold(move_down);
    });

    const clockWidget = document.getElementById('clock-widget');
    clockWidget.addEventListener('click', rotate_clockwise);
    clockWidget.addEventListener('onmousedown', () => {
        start_hold(rotate_clockwise);
    });

    const counterWidget = document.getElementById('counter-widget');
    counterWidget.addEventListener('click', rotate_counterclockwise);
    counterWidget.addEventListener('onmousedown', () => {
        start_hold(rotate_counterclockwise);
    });

    document
        .getElementById('drop-widget')
        .addEventListener('click', dropOnTerrain);
}

/**
 * Reads all the inspector UI fields for translation (rw/hw/height), rotation (x/y/z rot), and scaling (x/y/z scale)
 * and composes a full 4x4 transformation matrix suitable for application to a 3D object or gizmo.
 * Applies clamping to input values; performs coordinate transformation and applies both global and inspector-derived rotations.
 *
 * @param {HTMLInputElement} rw - Input element for "rw" translation value.
 * @param {HTMLInputElement} hw - Input element for "hw" translation value.
 * @param {HTMLInputElement} height - Input for "height" (z-translation).
 * @param {HTMLInputElement} xrot - Input for rotation about X axis (degrees).
 * @param {HTMLInputElement} yrot - Input for rotation about Y axis (degrees).
 * @param {HTMLInputElement} zrot - Input for rotation about Z axis (degrees).
 * @param {HTMLInputElement} xsca - Input for X-scale.
 * @param {HTMLInputElement} ysca - Input for Y-scale.
 * @param {HTMLInputElement} zsca - Input for Z-scale.
 * @returns {Matrix4} The composed transformation matrix suitable for Cesium primitives.
 */
export function readInspector(
    rw,
    hw,
    height,
    xrot,
    yrot,
    zrot,
    xsca,
    ysca,
    zsca,
) {
    let _rw = rw.value;
    let _hw = hw.value;

    if (app.config.boundaries) {
        if (app.config.boundaries.x) {
            _rw = clipValue(
                Number(rw.value),
                app.config.boundaries.x?.min,
                app.config.boundaries.x?.max,
            );
        }
        if (app.config.boundaries.y) {
            _hw = clipValue(
                Number(hw.value),
                app.config.boundaries.y?.min,
                app.config.boundaries.y?.max,
            );
        }
    }

    let translation = new Cartesian3(_rw, _hw, Number(height.value));

    translation = proj4('COORD', 'WGS84', [
        translation.x,
        translation.y,
        translation.z,
    ]);

    translation = new Cartesian3.fromDegrees(
        translation[0],
        translation[1],
        translation[2],
    );

    const xrotmat = Matrix3.fromRotationX(
        CesiumMath.toRadians(Number(xrot.value)),
    );
    const yrotmat = Matrix3.fromRotationY(
        CesiumMath.toRadians(Number(yrot.value)),
    );
    const zrotmat = Matrix3.fromRotationZ(
        CesiumMath.toRadians(Number(zrot.value)),
    );

    const rot = Matrix3.multiply(
        zrotmat,
        Matrix3.multiply(yrotmat, xrotmat, new Matrix3()),
        new Matrix3(),
    );
    const ori_rot = Matrix4.getRotation(Gizmo.globalMatrix, new Matrix3());

    Matrix3.multiply(ori_rot, rot, rot);
    const rotate = Quaternion.fromRotationMatrix(rot, new Quaternion());

    const xScale = clipValue(Number(xsca.value), MIN_SCALE);
    const yScale = clipValue(Number(ysca.value), MIN_SCALE);
    const zScale = clipValue(Number(zsca.value), MIN_SCALE);

    let trs = new TranslationRotationScale(
        translation,
        rotate,
        new Cartesian3(xScale, yScale, zScale),
    );
    trs = Matrix4.fromTranslationRotationScale(trs, new Matrix4());
    return trs;
}

// Immediately initialize the inspector panel and UI at load time.
initializeInspector();
