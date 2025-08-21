import {Cartesian3, Matrix4, Transforms} from '@cesium/engine';
import {Layer} from './Layer.js';

/**
 * ParticleSystemLayer – Specialized Layer subclass for managing live Cesium particle systems, such as wind or fluid visualizations.
 *
 * Extends {@link Layer}, adding support for dynamic direction, force (wind speed), event-driven updates, and real-time rescaling.
 * Handles all spatial transforms and interactive updates to its underlying Cesium.ParticleSystem via content-based properties.
 *
 * @class
 * @extends Layer
 *
 * @param {any} app - The main application/controller with a .viewer property (Cesium Viewer).
 * @param {object} options
 * @param {string} [options.id] - Unique identifier for this layer.
 * @param {string} [options.targetId] - UUID or layer id of the target entity (e.g., for wind targets).
 * @param {string} [options.name=''] - Human-readable name for UI/legend.
 * @param {string[]|string} [options.tags=[]] - Tag array for filtering/grouping.
 * @param {ParticleSystem|any} [options.content=undefined] - Particle system Cesium primitive, assigned directly.
 * @param {boolean} [options.show=true] - Initial visible state.
 * @param {Layer|null} [options.parent=null] - Optional parent/group for organizational use.
 * @param {Cartesian3} [options.direction=new Cartesian3(1,0,0)] - Initial wind/particle direction vector.
 * @param {number} [options.forceFactor=1.0] - Particle force constant (e.g., wind speed).
 * @param {string} [options.eventName=''] - Name of external event to listen for changes to wind/direction/force.
 * @param {Cartesian3} [options.position=new Cartesian3(0,0,0)] - Position of particle emitter.
 * @param {number[]} [options.scale=[1,1]] - Start/end scale factors for particles.
 *
 * @property {string} targetId   - Associated entity or target layer ID.
 * @property {Cartesian3} direction - Current wind/particle emission direction.
 * @property {number} forceFactor   - Current force (e.g., wind speed/multiplier).
 * @property {string} eventName     - The wind/force update event's name.
 * @property {Cartesian3} position  - (WGS) global position of emitter frame.
 * @property {number[]} scale       - [start, end] scale factors for size of particles.
 * @property {number} distance      - Used for dynamic rescaling (updates scale).
 * @property {ParticleSystem|any} content - Underlying Cesium.ParticleSystem or compatible primitive.
 *
 * @method startEventListener() - Attach window event listeners for direction/force/distance updates.
 * @method stopEventListener() - Detach all event listeners.
 *
 * @example
 * const particles = new ParticleSystemLayer(app, {
 *   id: "wind",
 *   name: "Wind field",
 *   eventName: "weather-updated",
 *   direction: new Cesium.Cartesian3(1,0,0),
 *   position: new Cesium.Cartesian3(0,0,0),
 *   scale: [1,2],
 * });
 * particles.startEventListener();
 * particles.direction = new Cesium.Cartesian3(0,1,0);
 * particles.forceFactor = 2.0;
 */
export class ParticleSystemLayer extends Layer {
    /**
     * @param {any} app - Application/controller with Cesium.Viewer property.
     * @param {object} options - See class documentation.
     */

    constructor(
        app,
        {
            id,
            targetId,
            name = '',
            tags = [],
            content = undefined,
            show = true,
            parent = null,
            direction = new Cartesian3(1, 0, 0),
            forceFactor = 1.0,
            eventName = '',
            position = new Cartesian3(0, 0, 0),
            scale = [1, 1],
        },
    ) {
        super(app.viewer, {
            id: id,
            name: name,
            type: 'particlesystem',
            tags: tags,
            show: show,
            content: content,
            parent: parent,
        });
        this._targetId = targetId;
        this._direction = direction;
        this.forceFactor = forceFactor;
        this.eventName = eventName;
        this.position = position;
        this.origScale = scale;
        this.scale = scale;
        this.distance = 1;

        this.startEventListener();
    }

    /**
     * Sets scaled size for particle system (affects both start and end scale).
     * Updates Cesium.ParticleSystem content accordingly.
     * @param {number[]} s - [startScale, endScale]
     */
    set scale(s) {
        if (this.content) {
            this.content.startScale = s[0];
            this.content.endScale = s[1];
        }
        this._scale = s;
    }

    get scale() {
        return this._scale;
    }

    /**
     * Set or get the underlying Cesium.ParticleSystem/primitive.
     * @type {any}
     */
    set content(c) {
        this._content = c;
    }

    get content() {
        return this._content;
    }

    /**
     * Adjust particle scale inversely to distance.
     * @type {number}
     */
    set distance(d) {
        this.scale = [this.origScale[0] / d, this.origScale[1] / d];
        this._distance = d;
    }

    get distance() {
        return this._distance;
    }

    /**
     * Set or get direction (actively transforms relative to local frame).
     * @type {Cartesian3}
     */
    set direction(dir) {
        Matrix4.multiplyByPointAsVector(this.transform, dir, this._direction);
    }

    get direction() {
        return this._direction;
    }

    /**
     * Emits Cartesian3 position and updates Cesium particle system transform.
     * @type {Cartesian3}
     */
    get position() {
        return this._position;
    }

    set position(trans) {
        this.transform = Transforms.eastNorthUpToFixedFrame(trans);
        this._position = trans;
    }

    /**
     * Layer ID of the wind/target for this system.
     * @type {string}
     */
    get targetId() {
        return this._targetId;
    }

    set targetId(id) {
        this._targetId = id;
    }

    /**
     * Starts event listeners for real-time wind/force updates and external distance scale changes.
     * - Updates direction and forceFactor on main event.
     * - Updates distance and triggers scale update on id_distance event.
     */
    startEventListener() {
        this.handle = window.addEventListener(this.eventName, e => {
            this.direction = e.detail.windDirection;
            this.forceFactor = e.detail.windSpeed;
        });

        this.distanceHandle = window.addEventListener(
            `${this.id}_distance`,
            e => {
                this.distance = Number(e.detail);
            },
        );
    }

    /**
     * Stops (removes) all registered DOM event listeners.
     */
    stopEventListener() {
        removeEventListener(this.eventName, this.handle);
        removeEventListener(`${this.id}_distance`, this.distanceHandle);
    }
}
