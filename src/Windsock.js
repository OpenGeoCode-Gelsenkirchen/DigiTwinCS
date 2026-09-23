import {
    Cartesian3,
    Math as CesiumMath,
    Matrix3,
    createGuid,
} from '@cesium/engine';
import {ModelWrapper} from './Core/ModelWrapper.js';

/**
 * A 3D windsock visualization class, extending ModelWrapper, for displaying animated wind direction and speed in the Cesium scene.
 * Dynamically updates its orientation and animation state in response to custom wind events tied to its ID.
 *
 * - On instantiation, creates a unique custom event listener (with name `${id}-wind`).
 * - When wind event is received, updates windsock properties ("Windrichtung (in °)", "Windgeschwindigkeit (in km/h)"),
 *   sets physical orientation according to wind direction, and changes animation to match wind speed.
 *   Wind direction is visually represented by rotation about the Z axis (compensating for model's axis).
 *   Animation is selected based on speed thresholds (animation 0 for low wind, 3 for highest).
 *
 * @export
 * @class Windsock
 * @extends ModelWrapper
 * @param {Object} app - The main Cesium app context.
 * @param {Object} options - Windsock configuration options.
 * @param {string} [options.id=createGuid()] - Unique windsock identifier.
 * @param {string} options.url - URL/path to the windsock model (e.g., .glb).
 * @param {Cartesian3} [options.position=Cartesian3.ZERO] - Position of the windsock.
 * @param {Matrix3} [options.rotation=Matrix3.IDENTITY] - Initial rotation matrix for the windsock.
 * @param {Cartesian3} [options.scale=Cartesian3.ONE] - Model scale vector.
 * @param {number} [options.minimumPixelSize] - Minimum pixel size for rendering.
 * @param {any} [options.distanceDisplayCondition] - Cesium DistanceDisplayCondition.
 * @param {Object} [options.properties={}] - Additional key-value properties for display/inspection.
 *
 * @example
 *   const sock = new Windsock(app, {
 *     url: 'assets/windsock.glb',
 *     position: Cartesian3.fromDegrees(8.5, 51.2, 20),
 *   });
 */
export class Windsock extends ModelWrapper {
    constructor(
        app,
        {
            id = createGuid(),
            url,
            position = Cartesian3.ZERO,
            rotation = Matrix3.IDENTITY,
            scale = Cartesian3.ONE,
            minimumPixelSize,
            distanceDisplayCondition,
            properties = {},
        },
    ) {
        super(app, {
            id,
            url,
            position,
            rotation,
            scale,
            minimumPixelSize,
            distanceDisplayCondition,
            properties,
        });

        /**
         * The custom event name to listen for wind updates.
         * @type {string}
         */
        this.eventName = `${id}-wind`;

        addEventListener(this.eventName, e => {
            // Update properties for info/inspection display
            this.properties = {
                'Windrichtung (in °)': CesiumMath.toDegrees(
                    e.detail.angle,
                ).toFixed(2),
                'Windgeschwindigkeit (in km/h)': e.detail.speed.toFixed(2),
            };

            const {angle, speed} = e.detail;

            // Orient the windsock to point into the wind (Z rotation, compensating with Math.PI)
            this.rotation = new Matrix3.fromRotationZ(
                Math.PI - angle,
                new Matrix3(),
            );

            // Animate windsock based on speed, with coarser animation transitions
            switch (true) {
                case speed < 10:
                    this.playAnimation(0);
                    break;
                case speed < 20:
                    this.playAnimation(1);
                    break;
                case speed < 30:
                    this.playAnimation(2);
                    break;
                case speed < 40:
                    this.playAnimation(3);
                    break;
            }
        });
    }
}
