import {Cartesian3} from '@cesium/engine';
import {MEASUREMENT_POINT_COLOR} from '../constants.js';
import {PointEntity} from './Entity.js';
import {uuidv4} from './utilities.js';

/**
 * PointSet3D – Manages a mutable, interactive set of 3D points (Cartesian3) with live Cesium scene entities.
 *
 * Automatically creates and destroys PointEntity primitives in Cesium for each position in the set.
 * Supports iteration, `forEach`/`map` APIs, maximum point constraints, push/pop/remove, and
 * batch property changes (color, show, deletable, selectable, reactive).
 * Coordinates (`cartesians`) and PointEntity objects are automatically synchronized for editing by user/UI.
 *
 * @class
 *
 * @param {any} app - The Cesium app/viewer.
 * @param {object} [options]
 * @param {string} [options.id=uuidv4()] - Unique set ID.
 * @param {Cartesian3[]} [options.cartesians=[]] - Initial array of Cartesian3 points.
 * @param {number} [options.maxPoints] - Maximum number of points allowed.
 * @param {Color} [options.color=MEASUREMENT_POINT_COLOR] - Color applied to all points.
 * @param {boolean} [options.selectable=false] - If true, points can be interacted with by user.
 * @param {boolean} [options.reactive=false] - If true, points update/react adaptively.
 * @param {boolean} [options.deletable=false] - If true, points can be deleted.
 * @param {boolean} [options.hideWhileHolding=true] - If true, points hide when being moved.
 *
 * @property {string} id - Set ID.
 * @property {Cartesian3[]} cartesians - Raw Cartesian3 positions.
 * @property {PointEntity[]} points - Array of PointEntity objects (auto-managed).
 * @property {number} maxPoints - Limit for push/length.
 * @property {Color} color - Color for all PointEntity markers.
 * @property {boolean} show - Visibility toggle for all points.
 * @property {boolean} selectable - Editability for all points.
 * @property {boolean} reactive - Reactivity for all points.
 * @property {boolean} deletable - Deletability for all points.
 * @property {boolean} hideWhileHolding - Auto-hide while dragging.
 * @property {number} length - Number of points.
 *
 * @method forEach(callback) - Calls callback for every PointEntity in the set.
 * @method map(callback) - Maps every PointEntity to a new value.
 * @method onMove(callback) - Register callback for move events on any point.
 * @method push(PointEntity) - Adds a point if maxPoints constraint allows.
 * @method pop() - Removes the last point.
 * @method remove(PointEntity) - Removes a specific point.
 * @method destroy() - Removes and destroys all PointEntity objects and clears this set.
 *
 * @example
 * const points = new PointSet3D(app, {cartesians: [c1, c2]});
 * points.push(new PointEntity(app, {position: c3}));
 * points.forEach(pt => pt.color = Color.RED);
 * points.show = false;
 */
export class PointSet3D {
    /**
     * @param {any} app
     * @param {object} options
     */
    constructor(
        app,
        {
            id: id = uuidv4(),
            cartesians: cartesians = [],
            maxPoints: maxPoints,
            color: color = MEASUREMENT_POINT_COLOR,
            selectable: selectable = false,
            reactive: reactive = false,
            deletable: deletable = false,
            hideWhileHolding: hideWhileHolding = true,
        } = {},
    ) {
        this.app = app;
        this.id = id;

        this.maxPoints = maxPoints;
        this.cartesians = cartesians;

        this.color = color;
        this.selectable = selectable;
        this.reactive = reactive;
        this.deletable = deletable;
        this.hideWhileHolding = hideWhileHolding;
    }

    /**
     * Enable for-of iteration over PointEntity objects in the set.
     * @returns {Iterator<PointEntity>}
     */
    [Symbol.iterator]() {
        let index = 0;
        return {
            next: () => {
                if (index < this.points.length) {
                    return {value: this.points[index++], done: false};
                } else {
                    return {done: true};
                }
            },
        };
    }

    /**
     * Call a callback for every point in the set.
     * @param {function(PointEntity):void} callback
     */
    forEach(callback) {
        for (const point of this) {
            callback(point);
        }
    }

    /**
     * Map every point in the set through a callback.
     * @param {function(PointEntity):any} callback
     * @returns {any[]}
     */
    map(callback) {
        const result = [];
        this.forEach(point => result.push(callback(point)));
        return result;
    }

    /**
     * Hide all points while holding/dragging.
     * @type {boolean}
     */
    get hideWhileHolding() {
        return this._hideWhileHolding;
    }

    set hideWhileHolding(value) {
        this.points.forEach(point => (point.hideWhileHolding = value));
        this._hideWhileHolding = value;
    }

    /**
     * Controls PointEntity selection state for all points.
     * @type {boolean}
     */
    get selectable() {
        return this._selectable;
    }
    set selectable(value) {
        this.points.forEach(point => (point.selectable = value));
        this._selectable = value;
    }

    /**
     * Controls reactivity for all points.
     * @type {boolean}
     */
    get reactive() {
        return this._reactive;
    }
    set reactive(value) {
        this.points.forEach(point => (point.reactive = value));
        this._reactive = value;
    }

    /**
     * Controls deletability for all points.
     * @type {boolean}
     */
    get deletable() {
        return this._deletable;
    }
    set deletable(value) {
        this.points.forEach(point => (point.deletable = value));
        this._deletable = value;
    }

    /**
     * Array of underlying cartersian positions.
     * When set, replaces all managed points as well.
     * @type {Cartesian3[]}
     */
    get cartesians() {
        return this._cartesians;
    }
    set cartesians(cartesians) {
        if (!cartesians.every(c => c instanceof Cartesian3)) {
            throw new Error('Not all elements are cartesians');
        }
        this._cartesians = cartesians;
        this.points = cartesians;
    }

    /**
     * All managed PointEntity scene objects. (Auto-generated from this.cartesians).
     * @type {PointEntity[]}
     */
    get points() {
        return this._points;
    }
    set points(points) {
        if (this.points) this.points.forEach(point => point.destroy());
        this._points = points.map((point, idx) => {
            return new PointEntity(this.app, {
                position: point,
                color: this.color,
                selectable: this.selectable,
                reactive: this.reactive,
                hideWhileHolding: this.hideWhileHolding,
            }).onMove(p => {
                this.cartesians[idx] = p.position;
            });
        });
    }

    /**
     * Sets managed PointEntity color collectively.
     * @type {Color}
     */
    get color() {
        return this._color;
    }
    set color(value) {
        this.points?.forEach(point => (point.color = value));
        this._color = value;
    }

    /**
     * Controls show/hide for all managed PointEntity objects.
     * @type {boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        this.points?.forEach(point => (point.show = value));
        this._show = value;
    }

    /**
     * Return/set number of points (setter present for interface, does nothing).
     * @type {number}
     */
    set length(_) {}
    get length() {
        return this.points.length;
    }

    /**
     * Calls callback whenever any point is moved.
     * @param {function(PointSet3D):void} callback
     */
    onMove(callback) {
        this.points.forEach(point =>
            point.onMove(() => {
                callback(this);
            }),
        );
    }

    /**
     * Adds a PointEntity, if under maxPoints, and manages bidirectional linkage.
     * @param {PointEntity} point
     * @returns {boolean} True if added, false otherwise.
     */
    push(point) {
        if (!(point instanceof PointEntity)) return false;
        if (!this.maxPoints || this.length < this.maxPoints) {
            this.cartesians.push(point.position);
            const length = this.cartesians.length;
            point.onMove(p => {
                this.cartesians[length - 1] = p.position;
            });
            this.points.push(point);
            return true;
        }
        return false;
    }

    /**
     * Removes and destroys the last PointEntity.
     */
    pop() {
        this.cartesians.pop();
        const point = this.points.pop();
        point.destroy();
    }

    /**
     * Removes a specific point from the set and scene.
     * @param {PointEntity} point
     * @returns {boolean} True if removed, false otherwise.
     */
    remove(point) {
        const idx = this.points.indexOf(point);
        if (idx >= 0) {
            this.points[idx].destroy();
            this.cartesians = this.cartesians.splice(idx, 1);
            return true;
        }
        return false;
    }

    /**
     * Destroy all managed PointEntities and clear internal lists.
     * Use to remove from scene and clean up memory.
     * @returns {null}
     */
    destroy() {
        this.points.forEach(point => point.destroy());
        this._cartesians = null;
        this._points = null;
        return null;
    }
}
