import {
    CallbackProperty,
    Cartesian3,
    DistanceDisplayCondition,
    HeadingPitchRoll,
    Matrix3,
    Matrix4,
    Model,
    ModelAnimationLoop,
    Transforms,
    createGuid,
} from '@cesium/engine';

/**
 * ModelWrapper – Encapsulates a 3D glTF model (Cesium.Model) for placement, animation, and property management in a Cesium scene.
 *
 * Provides API for positioning, rotation, scaling, model property/appearance settings, live updates, and animation control.
 * Connects a model's lifecycle to a parent Cesium app/viewer and fully supports pooled reuse and property-driven UI.
 *
 * @class
 *
 * @param {any} app - Application or Cesium Viewer reference.
 * @param {object} options
 * @param {string} [options.id=createGuid()] - Unique identifier for this model.
 * @param {string} options.url - glTF or model URL.
 * @param {Cartesian3} [options.position=Cartesian3.ZERO] - Model world position.
 * @param {Matrix3} [options.rotation=Matrix3.IDENTITY] - 3D model rotation (as Matrix3).
 * @param {Cartesian3} [options.scale=Cartesian3.ONE] - Uniform or per-axis scaling.
 * @param {number} [options.minimumPixelSize] - Auto-resize threshold (optional).
 * @param {DistanceDisplayCondition} [options.distanceDisplayCondition] - Visibility range (optional).
 * @param {object} [options.properties={}] - Arbitrary user or model metadata.
 *
 * @property {string} id
 * @property {string} url
 * @property {boolean} loaded - True once model and animations are available.
 * @property {object} properties - Dictionary of model attributes.
 * @property {Cartesian3} position - The model's real-world translation.
 * @property {Matrix3} rotation - Model rotation matrix (settable with HPR or Matrix3).
 * @property {Cartesian3} scale - Model scale vector.
 * @property {number} minimumPixelSize - Minimum screen size (px, optional).
 * @property {DistanceDisplayCondition} distanceDisplayCondition - Visible range condition (optional).
 * @property {Matrix4} modelMatrix - Current computed model 4x4 transform.
 *
 * @method computeModelMatrix() - Build the internal model transformation (Matrix4) from position/rotation/scale.
 * @method loadModel() - Loads or reloads the underlying Cesium.Model, adds to scene, and sets properties.
 * @method playAnimation(index, [loop], [multiplier], [exclusive]) - Play a model animation by index.
 * @method prepareDescription() - Prepares a Cesium infoBox table description from .properties.
 *
 * @example
 * const wrapper = new ModelWrapper(app, { url: 'model.gltf', position: Cesium.Cartesian3.fromDegrees(8, 50, 10) });
 * wrapper.scale = new Cesium.Cartesian3(2, 2, 2);
 * await wrapper.loadModel();
 * wrapper.playAnimation(0, Cesium.ModelAnimationLoop.REPEAT);
 */
export class ModelWrapper {
    #url;
    #position;
    #rotation;
    #scale;
    #minimumPixelSize;
    #distanceDisplayCondition;
    #properties;

    /**
     * Construct a model wrapper and start loading the model immediately.
     * @param {any} app
     * @param {object} options - see above
     */
    constructor(
        app,
        {
            id: id = createGuid(),
            url,
            position: position = Cartesian3.ZERO,
            rotation: rotation = Matrix3.IDENTITY,
            scale: scale = Cartesian3.ONE,
            minimumPixelSize,
            distanceDisplayCondition,
            properties = {},
        },
    ) {
        this.app = app;
        this.id = id;
        this.url = url;
        this.#position = position;
        this.#rotation = rotation;
        this.#scale = scale;
        this.#minimumPixelSize = minimumPixelSize;
        this.#distanceDisplayCondition = distanceDisplayCondition;
        this.loaded = false;

        this.loadModel(app);
        this.properties = properties;
    }

    /**
     * Computes the 4x4 Cesium model matrix from position, rotation (as Matrix3), and scale.
     * Used for initializing or updating the Cesium Model.
     * @returns {Matrix4}
     */
    computeModelMatrix() {
        if (this.position && this.rotation && this.scale) {
            const rot4 = Matrix4.fromRotation(this.rotation, new Matrix4());
            const sca4 = Matrix4.fromScale(this.scale);
            const enu = Transforms.eastNorthUpToFixedFrame(this.position);
            Matrix4.multiply(rot4, sca4, rot4);
            Matrix4.multiply(enu, rot4, enu);
            return enu;
        }
    }

    /**
     * Loads (or reloads) the underlying Cesium Model (gltf).
     * Handles removal of any existing instance, assigns properties/animation, and adds to scene.
     * Sets loaded to true once the model and animations are available.
     * @async
     */
    async loadModel() {
        try {
            if (this.model) {
                this.app.viewer.scene.primitives.remove(this.model);
            }

            this.model = await Model.fromGltfAsync({
                url: this.url,
                id: this.id,
                modelMatrix: this.computeModelMatrix(),
                minimumPixelSize: this.#minimumPixelSize,
                distanceDisplayCondition: this.#distanceDisplayCondition,
                gltfCallback: gltf => {
                    this.animations = gltf.animations;
                    this.loaded = true;
                },
            });
            this.model.properties = this.properties;
            this.app.viewer.scene.primitives.add(this.model);
        } catch (error) {
            console.error('Error loading wrapped model: ', error);
        }
    }

    /**
     * Plays a model animation, optionally exclusive (removes previous), with loop and multiplier.
     * @param {number} index - Animation index (0-based).
     * @param {ModelAnimationLoop} [loop=ModelAnimationLoop.REPEAT] - Animation loop mode.
     * @param {number} [multiplier=1] - Speed multiplier.
     * @param {boolean} [exclusive=true] - Remove all other animations first.
     * @throws {Error} If model not loaded or index out of range.
     */
    playAnimation(
        index,
        loop = ModelAnimationLoop.REPEAT,
        multiplier = 1,
        exclusive = true,
    ) {
        if (this.loaded) {
            if (index < 0 || index > this.animations.length) {
                throw new Error(
                    'Invalid index. Either too large or smaller than 0',
                );
            }
            if (exclusive) this.model.activeAnimations.removeAll();
            this.model.activeAnimations.add({
                index: index,
                loop: loop,
                multiplier: multiplier,
            });
            return;
        }
        throw new Error('Model not loaded yet.');
    }

    /**
     * Assigns property map (and infoBox table description) to the model.
     * @param {object} value - Model properties.
     */
    set properties(value) {
        if (this.model) this.model.properties = value;
        this.#properties = value;
        this.prepareDescription();
    }

    get properties() {
        return this.#properties;
    }

    /**
     * Prepares the infoBox HTML description for the Cesium Model based on this.properties.
     */
    prepareDescription() {
        if (this.model) {
            this.model.description = new CallbackProperty(() => {
                let tableTemplate = `<table class="cesium-infoBox-defaultTable"><tbody>`;
                for (const [key, value] of Object.entries(this.properties)) {
                    tableTemplate += `<tr><th>${key}</th><td>${value}</td></tr>`;
                }
                tableTemplate += `</tbody></table>`;
                return tableTemplate;
            });
        }
    }

    /**
     * Update the model's glTF URL, reloading the model if needed.
     * @param {string} value
     */
    set url(value) {
        if (this.url !== value) {
            this.#url = value;
            this.loadModel();
        }
    }

    get url() {
        return this.#url;
    }

    /**
     * Unique identifier for the model.
     * @type {string}
     */
    set id(value) {
        if (this.model) this.model.id = value;
        this._id = value;
    }

    get id() {
        return this._id;
    }

    /**
     * Minimum pixel size setting for the Cesium model.
     * @type {number}
     */
    set minimumPixelSize(value) {
        if (typeof value === 'number') {
            if (this.model) {
                this.model.minimumPixelSize = value;
            }
            this.#minimumPixelSize = value;
        }
    }

    get minimumPixelSize() {
        return this.#minimumPixelSize;
    }

    /**
     * DistanceDisplayCondition for this model (controls when it is shown).
     * @type {DistanceDisplayCondition}
     */
    set distanceDisplayCondition(value) {
        if (value instanceof DistanceDisplayCondition) {
            if (this.model) {
                this.model.distanceDisplayCondition = value;
            }
            this.#distanceDisplayCondition = value;
        }
    }

    get distanceDisplayCondition() {
        return this.#distanceDisplayCondition;
    }

    /**
     * ModelMatrix for model pose (Matrix4).
     * @type {Matrix4}
     */
    set modelMatrix(value) {
        if (this.model) {
            if (value instanceof Matrix4) {
                this.model.modelMatrix = value;
            } else {
                throw new Error(
                    'Invalid type for modelMatrix. Expected Matrix4',
                );
            }
        }
    }

    get modelMatrix() {
        return this?.model?.modelMatrix;
    }

    /**
     * 3D translation (Cartesian3) of model.
     * @type {Cartesian3}
     */
    get position() {
        if (this.model) {
            return Matrix4.getTranslation(
                this.model.modelMatrix,
                new Cartesian3(),
            );
        }
        return this.#position;
    }

    set position(value) {
        if (value instanceof Cartesian3) {
            this.#position = value;
            this.modelMatrix = this.computeModelMatrix();
        } else {
            throw new Error(
                'Invalid type for translation. Expected Cartesian3',
            );
        }
    }

    /**
     * 3x3 rotation matrix of the model, settable with Matrix3 or HeadingPitchRoll.
     * @type {Matrix3}
     */
    get rotation() {
        return this.#rotation;
    }

    set rotation(value) {
        if (value instanceof HeadingPitchRoll) {
            this.#rotation = Matrix3.fromHeadingPitchRoll(value);
        } else if (value instanceof Matrix3) {
            this.#rotation = value;
        } else {
            throw new Error(
                'Invalid type for rotation. Expected either Matrix3 or HeadingPitchRoll',
            );
        }
        this.modelMatrix = this.computeModelMatrix();
    }

    /**
     * Per-axis scaling vector.
     * @type {Cartesian3}
     */
    get scale() {
        if (this.model) {
            return Matrix4.getScale(this.model.modelMatrix, new Cartesian3());
        }
        return this.#scale;
    }

    set scale(value) {
        if (value instanceof Cartesian3) {
            this.#scale = value;
        } else {
            throw new Error('Invalid type for scale. Expected Cartesian3');
        }
        this.modelMatrix = this.computeModelMatrix();
    }
}
