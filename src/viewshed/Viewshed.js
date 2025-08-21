import {
    Camera,
    Cartesian3,
    Math as CesiumMath,
    Color,
    EllipsoidTerrainProvider,
    PerspectiveFrustum,
    PerspectiveOffCenterFrustum,
    PostProcessStage,
    Primitive,
    ShadowMap,
} from '@cesium/engine';
import {PointEntity} from '../Core/Entity.js';
//Modified by Johannes Neis on 02/2024

/**
 * Computes the horizontal (fovX) and vertical (fovY) field of view angles (in degrees)
 * for a given frustum based on near-plane edge distances.
 *
 * @param {number} distanceToLeft    - Near plane left edge distance (negative).
 * @param {number} distanceToRight   - Near plane right edge distance (positive).
 * @param {number} distanceToTop     - Near plane top edge distance (positive).
 * @param {number} distanceToBottom  - Near plane bottom edge distance (negative).
 * @param {number} distanceToNear    - Near clipping plane distance (> 0).
 * @returns {{fovX: number, fovY: number}} Field of view angles in degrees (fovX, fovY).
 */
function calculateFOV(
    distanceToLeft,
    distanceToRight,
    distanceToTop,
    distanceToBottom,
    distanceToNear,
) {
    const fovX =
        2 *
        Math.atan((distanceToRight - distanceToLeft) / (2 * distanceToNear));
    const fovY =
        2 *
        Math.atan((distanceToTop - distanceToBottom) / (2 * distanceToNear));

    return {
        fovX: CesiumMath.toDegrees(fovX),
        fovY: CesiumMath.toDegrees(fovY),
    };
}

/**
 * Given a field-of-view angle (in radians) and the near-plane distance,
 * returns the corresponding positive and negative edge distances for placement on the near plane.
 *
 * @param {number} fov             - Field of view angle in radians.
 * @param {number} distanceToNear  - Near clipping plane distance (> 0).
 * @returns {[number, number]}     - [positive distance, negative distance] for the plane.
 *
 * @example
 * // For fov=π/2 and near=1: returns [0.414..., -0.414...]
 */
function distancesFromFOV(fov, distanceToNear) {
    const halfTan = Math.tan(fov / 2);
    const neg = -(distanceToNear * halfTan) / 2;
    const pos = -neg;
    return [pos, neg];
}

/**
 * Viewshed – Encapsulates viewshed/visibility analysis as a dynamic shadow map using Cesium post-processing.
 *
 * Handles shadow map/camera creation, shader uniform management, FOV/frustum math, and in-scene interactive placement.
 * Supports dynamic reconfiguration for colors, blending, size, field-of-view, depth bias, etc.
 * Ties to two draggable PointEntity markers—"camera" and "target"—and auto-recomputes when they move.
 *
 * @class
 * @extends Primitive
 *
 * @param {any} app                   - Application/viewer instance.
 * @param {string} viewshedFS         - Fragment shader code (GLSL).
 * @param {object} [options]
 * @param {Color}   [options.lightColor=Color.WHITE]     - Overlay color for visible area.
 * @param {Color}   [options.shadowColor=Color.BLACK]    - Overlay color for occluded area.
 * @param {number}  [options.alpha=0.5]                  - Blend value for overlays.
 * @param {number|function} [options.size=256]           - Shadow map size (resolution).
 * @param {number}  [options.maxDistance=3000.0]         - Max draw distance.
 * @param {number}  [options.depthBias=0.000081]         - Bias for shadow computation.
 * @param {number}  [options.fov=90]                     - Camera field of view (degrees).
 * @param {number}  [options.aspectRatio=1.9]            - Camera aspect ratio.
 * @param {number}  [options.heightOffset=2.0]           - Camera height above surface.
 * @param {object}  [options.frustum]                    - Initial frustum definition.
 *
 * @property {Color} lightColor      - RGBA color for visible region in the viewshed.
 * @property {Color} shadowColor     - RGBA color for non-visible region in the viewshed.
 * @property {number} alpha          - Blend value for region coloring.
 * @property {function} size         - Function returning the shadow map resolution.
 * @property {number} maxDistance    - Viewshed computation limit.
 * @property {number} depthBias      - Bias value for shadow map precision.
 * @property {number} fov            - Camera field of view in degrees.
 * @property {number} aspectRatio    - Camera aspect ratio.
 * @property {PointEntity} camera    - Movable entity marking the viewshed origin.
 * @property {PointEntity} target    - Movable entity marking the viewshed focal point.
 * @property {boolean} finished      - Set true once a camera/target have been positioned.
 * @property {boolean} destroyed     - True once resources are released.
 * @property {function} onSetCallback- Invoked when camera/target are placed and shadow/post-process are built.
 *
 * @method onSet(callback)                             - Register a callback for when the viewshed is positioned.
 * @method cancel()                                    - Cancel and destroy if not finalized/placed.
 * @method destroy()                                   - Remove shadow maps, scene primitives, and mark destroyed.
 * @method _createShadowMap()                          - Build/refresh shadow map state for internal use.
 * @method _addPostProcess()                           - Attach post-process/shader to the Cesium scene.
 * @method _initUpdateListener()                       - Poll for shadow map readiness and manage shader activation.
 * @method _updateShadowMap()                          - Updates the light camera and map according to view geometry.
 * @method update(frameState)                          - Cesium update hook (pushed shadow map to frame state).
 *
 * @example
 * const vs = new Viewshed(app, fsCode, { alpha: 0.7, maxDistance: 2500 });
 * vs.onSet(() => { console.log("Viewshed ready!"); });
 * // Interactively move vs.camera and vs.target in the scene.
 */
export class Viewshed extends Primitive {
    constructor(
        app,
        viewshedFS,
        {
            lightColor: lightColor = Color.WHITE,
            shadowColor: shadowColor = Color.BLACK,
            alpha: alpha = 0.5,
            size: size = 256,
            maxDistance: maxDistance = 3000.0,
            depthBias: depthBias = 0.000081,
            fov: fov = 90,
            aspectRatio: aspectRatio = 1.9,
            heightOffset: heightOffset = 2.0,
            frustum: frustum = {
                left: -1.0,
                right: 1.0,
                top: 1.0,
                bottom: -1.0,
                far: 100,
                near: 1.0,
            },
        } = {},
    ) {
        super(...arguments);
        this.app = app;
        this.viewshedFS = viewshedFS;

        this.lightColor = lightColor;
        this.shadowColor = shadowColor;
        this.alpha = alpha;

        this.size = size;
        this.maxDistance = maxDistance;

        this.depthBias = depthBias;
        this.fov = fov;
        this.aspectRatio = aspectRatio;

        this.preUpdateListener = null;
        this.frustum = frustum;

        const {fovX, fovY} = calculateFOV(
            frustum.left,
            frustum.right,
            frustum.top,
            frustum.bottom,
            frustum.near,
        );
        this._fovX = fovX;
        this._fovY = fovY;
        this.onSetCallback = () => {};
        this.finished = false;
        this.destroyed = false;

        this.camera = new PointEntity(app, {
            heightOffset: heightOffset,
            hideWhileHolding: false,
            highlightColor: Color.AQUA,
        }).onSet(() => {
            this.target = new PointEntity(app, {
                color: Color.YELLOW,
                hideWhileHolding: false,
                highlightColor: Color.AQUA,
            }).onSet(() => {
                this.finished = true;
                this.onSetCallback();
            });

            this._createShadowMap();
            this._addPostProcess();
            this._initUpdateListener();
            this.app.viewer.scene.primitives.add(this);
        });
    }

    /**
     * Register a callback to be invoked when both camera and target points are set/placed.
     * @param {function} callback
     */
    onSet(callback) {
        this.onSetCallback = () => {
            callback(this);
        };
    }

    /** maxDistance property with getter/setter. */
    set maxDistance(value) {
        this._maxDistance = Number(value);
    }

    get maxDistance() {
        return this._maxDistance;
    }

    /** Shadow map resolution size property; can be number or function for live lookup. */
    set size(value) {
        if (typeof value !== 'function') {
            this._size = () => {
                return value;
            };
        } else {
            this._size = value;
        }
    }

    get size() {
        return this._size();
    }

    /** Field of view X in degrees. Updates internal frustum as well. */
    get fovX() {
        return this.fovX;
    }

    set fovX(value) {
        this._fovX = value;
        const [right, left] = distancesFromFOV(
            CesiumMath.toRadians(value),
            this.frustum.near,
        );
        this.frustum.right = right;
        this.frustum.left = left;
    }

    /** Field of view Y in degrees. Updates internal frustum. */
    get fovY() {
        return this.fovY;
    }

    set fovY(value) {
        this._fovY = value;
        const [top, bottom] = distancesFromFOV(
            CesiumMath.toRadians(value),
            this.frustum.near,
        );
        this.frustum.top = top;
        this.frustum.bottom = bottom;
    }

    /** Camera height offset property helper (for interactive placement). */
    get heightOffset() {
        return this.camera.heightOffset;
    }

    set heightOffset(value) {
        this.camera.heightOffset = value;
    }

    /**
     * Internal utility: Create/refresh Cesium shadow map for this viewshed, using interactive camera/target.
     * Uses PerspectiveFrustum for the field-of-view and placement.
     */
    _createShadowMap() {
        const scene = this.app.viewer.scene;
        const camera = new Camera(scene);

        camera.position = this.camera.position;
        camera.direction = Cartesian3.subtract(
            this.target.position,
            this.camera.position,
            new Cartesian3(),
        );

        camera.up = Cartesian3.normalize(
            this.camera.position,
            new Cartesian3(),
        );
        camera.frustum = new PerspectiveFrustum({
            fov: CesiumMath.toRadians(this.fov),
            aspectRatio: this.aspectRatio,
            near: 10,
            far: this.maxDistance,
        });

        this.shadowMap = new ShadowMap({
            lightCamera: camera,
            enable: true,
            isPointLight: false,
            cascadesEnabled: false,
            context: scene.context,
            size: this.size,
            textureSize: (this.size, this.size),
            pointLightRadius: this.maxDistance,
            fromLightSource: true,
            softShadows: true,
            normalOffset: true,
        });
    }

    /**
     * Internal: Attaches/shares the post-process viewshed shader and recipe to the scene.
     */
    _addPostProcess() {
        this.postProcess = this.app.viewer.scene.postProcessStages.add(
            new PostProcessStage({
                fragmentShader: this.viewshedFS,
                uniforms: {
                    depthBias: () => {
                        return this.depthBias;
                    },
                    maxDistance: () => {
                        return this.maxDistance;
                    },

                    lightColor: () => {
                        return this.lightColor;
                    },
                    shadowColor: () => {
                        return this.shadowColor;
                    },
                    alpha: () => {
                        return this.alpha;
                    },

                    shadowMapTexture: () => {
                        return this.shadowMap._shadowMapTexture;
                    },
                    shadowMapMatrix: () => {
                        return this.shadowMap._shadowMapMatrix;
                    },
                    shadowMapPositionEC: () => {
                        return this.shadowMap._lightPositionEC;
                    },

                    ellipsoidInverseRadii: () => {
                        const radii =
                            this.app.viewer.scene.globe.ellipsoid.radii;
                        return new Cartesian3(
                            1 / radii.x,
                            1 / radii.y,
                            1 / radii.z,
                        );
                    },
                    excludeTerrain: () => {
                        return (
                            this.app.viewer.terrainProvider instanceof
                            EllipsoidTerrainProvider
                        );
                    },
                },
            }),
        );
    }

    /**
     * Internal: Initializes event listener to enable post-processing only after the
     * shadow map texture becomes available.
     */
    _initUpdateListener() {
        if (this.preUpdateListener) {
            this.app.viewer.scene.preUpdate.removeEventListener(
                this.preUpdateListener,
            );
        }

        this.preUpdateListener = () => {
            if (!this.shadowMap._shadowMapTexture) {
                this.postProcess.enabled = false;
            } else {
                this.postProcess.enabled = true;
                this.app.viewer.scene.preUpdate.removeEventListener(
                    this.preUpdateListener,
                );
            }
        };
        this.app.viewer.scene.preUpdate.addEventListener(
            this.preUpdateListener,
        );
    }

    /**
     * Cesium per-frame update hook. Updates the shadow map state.
     * @param {FrameState} frameState
     */
    update(frameState) {
        this._updateShadowMap();
        frameState.shadowMaps.push(this.shadowMap);
    }

    /**
     * Internal helper: Updates shadow map/camera/focus geometry as required (for movement/scale changes).
     */
    _updateShadowMap() {
        this.shadowMap._lightCamera.position = this.camera.position;

        if (
            Cartesian3.equals(this.target.position, this.camera.position) ||
            Cartesian3.equals(this.target.position, Cartesian3.ZERO)
        ) {
            this.target.position = this.camera.position;
            this.shadowMap._lightCamera.direction = new Cartesian3(1, 0, 0);
        } else {
            this.shadowMap._lightCamera.direction = Cartesian3.subtract(
                this.target.position,
                this.camera.position,
                new Cartesian3(),
            );
        }

        this.shadowMap._lightCamera.frustum = new PerspectiveOffCenterFrustum({
            left: this.frustum.left,
            right: this.frustum.right,
            top: this.frustum.top,
            bottom: this.frustum.bottom,
            near: this.frustum.near,
            far: this.maxDistance,
        });

        const update = this.size != this.shadowMap.size;

        this.shadowMap.size = this.size;
        this.shadowMap.textureSize = (this.size, this.size);

        if (update) {
            setTimeout(() => {
                this.camera.updatePosition();
                this.target.updatePosition();
            }, 150);
        }
    }

    /**
     * Cancels and destroys the viewshed tool if not yet finalized.
     * @returns {boolean} True if cancelled (destroyed), false otherwise.
     */
    cancel() {
        if (!this.finished) {
            this.destroy();
            return true;
        }
        return false;
    }

    /**
     * Cleans up and releases all resources: drops shadow maps, event listeners, camera/target markers, and scene entries.
     */
    destroy() {
        this.app.viewer.scene.postProcessStages.remove(this.postProcess);
        this.camera?.destroy();
        this.target?.destroy();
        this.app.viewer.scene.primitives.remove(this);

        for (const property in this) {
            if (this.hasOwnProperty(property)) {
                this[property] = null;
            }
        }

        this.destroyed = true;
    }
}
