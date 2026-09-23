import type {ModelInspector, Transform} from './GeInspector';

import {
    Cartesian3,
    Math as CesiumMath,
    HeadingPitchRoll,
    Matrix3,
    Matrix4,
    Quaternion,
    TranslationRotationScale,
} from '@cesium/engine';
import {
    cartesianToProjectCoord,
    projectCoordToCartesian,
} from '../../Core/utilities';
import {Gizmo, dropOnTerrain, gizmoLoop, setGizmoMode} from '../../gizmo';
import {clipValue} from '../../global';
import {
    deleteSingleModel,
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
} from '../../singlemodels';

/**
 * Optional minimum and maximum limits for values along each transform axis.
 */
type Boundary = {
    /**
     * Limits for the X component.
     */
    x: {
        /** Inclusive lower limit. */
        min?: number;
        /** Inclusive upper limit. */
        max?: number;
    };
    /**
     * Limits for the Y component.
     */
    y: {
        /** Inclusive lower limit. */
        min?: number;
        /** Inclusive upper limit. */
        max?: number;
    };
    /**
     * Limits for the Z component.
     */
    z: {
        /** Inclusive lower limit. */
        min?: number;
        /** Inclusive upper limit. */
        max?: number;
    };
};

/**
 * Connects a {@link ModelInspector} UI to Cesium transformation state and the
 * application's model-editing gizmo.
 *
 * @remarks
 * The controller has two responsibilities:
 *
 * - Convert transform values emitted by the inspector into a Cesium model matrix
 *   and submit that matrix to {@link gizmoLoop}.
 * - Convert changed gizmo matrices back to projected coordinates, UI rotation
 *   angles, and display scale values for the inspector.
 *
 * The component and renderer use different axis conventions. In particular,
 * the controller applies a fixed \(-90^\circ\) rotation around Z and swaps the
 * displayed X and Y scale axes when synchronizing with the inspector.
 */
export class InspectorController {
    /**
     * Signal used to remove every inspector event listener during disposal.
     */
    private abort = new AbortController();

    /**
     * Reusable Cesium translation, rotation, and scale representation used to
     * construct the current local model matrix.
     */
    private transform = new TranslationRotationScale();

    /**
     * Reusable heading, pitch, and roll instance used to extract UI rotations.
     */
    private hpr = new HeadingPitchRoll();

    /**
     * Reusable quaternion used while converting rotation matrices.
     */
    private quat = new Quaternion();

    /**
     * Reusable matrix containing the local transform submitted to the gizmo.
     */
    private mat = new Matrix4();

    /**
     * Fixed model-axis conversion rotation.
     *
     * @remarks
     * Initialized to a \(-90^\circ\) rotation around the Z axis.
     */
    private modelMatrix = new Matrix3();

    /**
     * Inverse of {@link modelMatrix}, used when converting gizmo rotations back
     * into inspector coordinates.
     */
    private inverseModelMatrix = new Matrix3();

    /**
     * Reusable Cartesian translation extracted from model matrices.
     */
    private tmpTranslation = new Cartesian3();

    /**
     * Reusable projected-coordinate translation for inspector display and input.
     */
    private tmpProjectTranslation: number[] = [];

    /**
     * Reusable local rotation matrix extracted from the gizmo matrix.
     */
    private tmpRotation = new Matrix3();

    /**
     * Reusable scale vector extracted from the gizmo matrix.
     */
    private tmpScale = new Cartesian3();

    /**
     * Global transform associated with the selected model.
     */
    private globalMatrix = new Matrix4();

    /**
     * Reusable temporary matrix for global-to-local transform conversion.
     */
    private tmpGlobalMatrix = new Matrix4();

    /**
     * Optional limits applied to projected translation values committed from the
     * inspector.
     */
    private translationBoundary: Boundary | null = null;

    /**
     * Optional limits applied to scale values committed from the inspector.
     */
    private scaleBoundary: Boundary | null = null;

    /**
     * Subscribes to inspector events and initializes gizmo settings from the UI.
     *
     * @param inspector - Inspector component to control.
     */
    constructor(private inspector: ModelInspector) {
        Matrix3.fromRotationZ(-Math.PI / 2, this.modelMatrix);
        Matrix3.inverse(this.modelMatrix, this.inverseModelMatrix);

        inspector.addEventListener(
            'delete',
            () => {
                deleteSingleModel();
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener(
            'inspector-commit',
            (event: Event) => {
                const transform: Transform = (event as CustomEvent).detail;
                this.applyTransform(transform);
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener(
            'translation-snap-change',
            (event: Event) => {
                Gizmo.translationSnap = (event as CustomEvent).detail;
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener(
            'rotation-snap-change',
            (event: Event) => {
                Gizmo.rotationSnap = (event as CustomEvent).detail;
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener(
            'scale-snap-change',
            (event: Event) => {
                Gizmo.scaleSnap = (event as CustomEvent).detail;
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener(
            'ground-clamp-change',
            (event: Event) => {
                Gizmo.clampToGround = (event as CustomEvent).detail;
                if (Gizmo.clampToGround) {
                    dropOnTerrain();
                }
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener(
            'uniform-scale-change',
            (event: Event) => {
                Gizmo.uniformScaling = (event as CustomEvent).detail;
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener('reset-translation', resetTranslation, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('reset-rotation', resetRotation, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('reset-scale', resetScale, {
            signal: this.abort.signal,
        });

        inspector.addEventListener(
            'mode-translation',
            () => {
                setGizmoMode('translation');
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener(
            'mode-rotation',
            () => {
                setGizmoMode('rotation');
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener(
            'mode-scale',
            () => {
                setGizmoMode('scale');
            },
            {
                signal: this.abort.signal,
            },
        );

        inspector.addEventListener('move-north', move_north, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('move-east', move_east, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('move-south', move_south, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('move-west', move_west, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('move-up', move_up, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('move-down', move_down, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('rotate-cw', rotate_clockwise, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('rotate-ccw', rotate_counterclockwise, {
            signal: this.abort.signal,
        });

        inspector.addEventListener('drop-on-terrain', dropOnTerrain, {
            signal: this.abort.signal,
        });

        //@ts-ignore
        Gizmo.uniformScaling = inspector.uniformScaling;
        //@ts-ignore
        Gizmo.clampToGround = inspector.clampToGround;
        //@ts-ignore
        Gizmo.translationSnap =
            inspector.translationSnap <= 0
                ? undefined
                : inspector.translationSnap;
        //@ts-ignore
        Gizmo.rotationSnap =
            inspector.rotationSnap <= 0 ? undefined : inspector.rotationSnap;
        //@ts-ignore
        Gizmo.scaleSnap =
            inspector.scaleSnap <= 0 ? undefined : inspector.scaleSnap;
    }

    /**
     * Removes all listeners registered by this controller.
     *
     * @remarks
     * Calling this method aborts the shared event-listener signal. The controller
     * should not be reused after disposal.
     */
    dispose() {
        this.abort.abort();
    }

    /**
     * Converts inspector values to a Cesium model matrix and applies the result to
     * the active transformation gizmo.
     *
     * @param transform - UI transform containing projected translation, rotation
     * in degrees, and per-axis scale.
     *
     * @remarks
     * Translation and scale values are clipped to configured boundaries before
     * being applied. Rotation composition is:
     *
     * \[
     * R = R_\text{global} \cdot R_z \cdot R_y \cdot R_x \cdot R_\text{model}
     * \]
     *
     * where \(R_\text{model}\) is the fixed \(-90^\circ\) model-axis correction.
     */
    private applyTransform(transform: Transform) {
        this.tmpProjectTranslation = [
            clipValue(
                transform.position.x,
                this.translationBoundary?.x.min,
                this.translationBoundary?.x.max,
            ),
            clipValue(
                transform.position.y,
                this.translationBoundary?.y.min,
                this.translationBoundary?.y.max,
            ),
            clipValue(
                transform.position.z,
                this.translationBoundary?.z.min,
                this.translationBoundary?.z.max,
            ),
        ];

        //@ts-ignore
        this.tmpTranslation = projectCoordToCartesian(
            //@ts-ignore
            this.tmpProjectTranslation,
        );

        this.transform.translation.x = this.tmpTranslation.x;
        this.transform.translation.y = this.tmpTranslation.y;
        this.transform.translation.z = this.tmpTranslation.z;

        const xrotmat = Matrix3.fromRotationX(
            CesiumMath.toRadians(transform.rotation.x),
        );

        const yrotmat = Matrix3.fromRotationY(
            CesiumMath.toRadians(transform.rotation.y),
        );

        const zrotmat = Matrix3.fromRotationZ(
            CesiumMath.toRadians(transform.rotation.z),
        );

        const rot = Matrix3.multiply(
            zrotmat,
            Matrix3.multiply(yrotmat, xrotmat, new Matrix3()),
            new Matrix3(),
        );

        const ori_rot = Matrix4.getRotation(this.globalMatrix, new Matrix3());

        Matrix3.multiply(rot, this.modelMatrix, rot);
        Matrix3.multiply(ori_rot, rot, rot);
        Quaternion.fromRotationMatrix(rot, this.quat);

        this.transform.rotation.w = this.quat.w;
        this.transform.rotation.x = this.quat.x;
        this.transform.rotation.y = this.quat.y;
        this.transform.rotation.z = this.quat.z;

        this.transform.scale.x = clipValue(
            transform.scale.x,
            this.scaleBoundary?.x.min,
            this.scaleBoundary?.x.max,
        );

        this.transform.scale.y = clipValue(
            transform.scale.y,
            this.scaleBoundary?.y.min,
            this.scaleBoundary?.y.max,
        );

        this.transform.scale.z = clipValue(
            transform.scale.z,
            this.scaleBoundary?.z.min,
            this.scaleBoundary?.z.max,
        );

        Matrix4.fromTranslationRotationScale(this.transform, this.mat);

        gizmoLoop(this.mat);
    }

    /**
     * Whether the controller has completed its initial gizmo synchronization.
     *
     * @remarks
     * This field is declared for external lifecycle coordination but is not
     * currently read or written elsewhere in this class.
     */
    public init = false;

    /**
     * Synchronizes inspector inputs from a changed gizmo transformation matrix.
     *
     * @param matrix - Current gizmo/model transformation matrix.
     * @param globalMatrix - Global matrix that establishes the model's parent or
     * world orientation.
     *
     * @remarks
     * This converts the matrix translation to projected coordinates, removes the
     * global and fixed model-axis rotations, extracts heading/pitch/roll values,
     * and updates the inspector display.
     *
     * X and Y scale values are deliberately swapped before displaying them because
     * the inspector's axis convention differs from the Cesium model convention.
     */
    public onGizmoMatrixChanged(matrix: Matrix4, globalMatrix: Matrix4) {
        Matrix4.clone(matrix, this.mat);
        Matrix4.getTranslation(matrix, this.tmpTranslation);

        this.transform.translation.x = this.tmpTranslation.x;
        this.transform.translation.y = this.tmpTranslation.y;
        this.transform.translation.z = this.tmpTranslation.z;

        //@ts-ignore
        this.tmpProjectTranslation = cartesianToProjectCoord(
            this.tmpTranslation,
        );

        this.globalMatrix = globalMatrix;

        Matrix4.inverse(this.globalMatrix, this.tmpGlobalMatrix);
        Matrix4.multiply(this.tmpGlobalMatrix, matrix, this.tmpGlobalMatrix);
        Matrix4.getRotation(this.tmpGlobalMatrix, this.tmpRotation);

        Matrix3.multiply(
            this.tmpRotation,
            this.inverseModelMatrix,
            this.tmpRotation,
        );
        Quaternion.fromRotationMatrix(this.tmpRotation, this.quat);
        HeadingPitchRoll.fromQuaternion(this.quat, this.hpr);

        this.transform.rotation.w = this.quat.w;
        this.transform.rotation.x = this.quat.x;
        this.transform.rotation.y = this.quat.y;
        this.transform.rotation.z = this.quat.z;

        Matrix4.getScale(matrix, this.tmpScale);
        this.transform.scale.x = this.tmpScale.x;
        this.transform.scale.y = this.tmpScale.y;
        this.transform.scale.z = this.tmpScale.z;

        //important! swap scale and rotation x/y axis
        this.inspector.applyTransform({
            position: {
                x: this.tmpProjectTranslation[0],
                y: this.tmpProjectTranslation[1],
                z: this.tmpProjectTranslation[2],
            },
            rotation: {
                x: CesiumMath.toDegrees(this.hpr.roll),
                y: CesiumMath.toDegrees(-this.hpr.pitch),
                z: CesiumMath.toDegrees(-this.hpr.heading),
            },
            scale: {
                x: this.transform.scale.y,
                y: this.transform.scale.x,
                z: this.transform.scale.z,
            },
        });
    }
}
