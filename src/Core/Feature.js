import {
    Cesium3DTileFeature,
    Color,
    Entity,
    JulianDate,
    Primitive,
} from '@cesium/engine';

/**
 * Feature – Abstracts and normalizes access to various Cesium/Scene feature types (Cesium3DTileFeature, Primitive, Entity).
 *
 * Provides unified API for identifier, type, color, show/hide, selectability,
 * and dynamic property handling. Supports colorizing and clearing highlights for all supported entity types.
 * Useful for consistent layer, selection, or property editing logic regardless of underlying Cesium/scene primitive type.
 *
 * @class
 *
 * @param {object} obj - The underlying Cesium or custom feature object (entity, primitive, or 3D tile feature).
 * @param {string} [id_key="UUID"] - The property name used as primary identifier.
 *
 * @property {object} obj - Raw input object (feature/entity/primitive).
 * @property {string|null} originalColor - Stores previous color before highlighting.
 * @property {boolean} selectable - Is the feature interactively selectable.
 * @property {object} locked - Tracks locked state (custom).

 * @property {boolean} picked - Feature marked as currently picked.
 *
 * @property {string} uuid - Unique ID for this feature (from 'UUID' property or fallback).
 * @property {any} id - Unique numeric or string ID for the entity/primitive (object.id.id for Entity, or self for others).
 * @property {Function|undefined} type - The feature type (Entity, Cesium3DTileFeature, Primitive, or null).
 * @property {object} content - The actual renderable or data-bearing subobject for interaction.
 * @property {boolean} reactive - (For Entity) Is the feature marked as reactive at present?
 * @property {any|null} entity - Underlying Cesium entity (point, polyline, polygon) if present.
 * @property {Color|undefined} color - Main (current) visual color (getter/setter).
 * @property {boolean|undefined} show - Show/hide the feature in scene.
 *
 * @method getProperty(property) - Gets a dynamic property value, abstraction over Cesium feature types.
 * @method colorize(color, keep=true) - Temporarily set feature highlight color, optionally keeping previous.
 * @method clearColor() - Restore to the previous color.
 *
 * @example
 * const feat = new Feature(tileFeature);
 * feat.colorize(new Color(0,1,0), false);
 * feat.show = false;
 * console.log(feat.getProperty("HEIGHT"));
 */
export class Feature {
    /**
     * @param {object} obj
     * @param {string} [id_key='UUID']
     */
    constructor(obj, id_key = 'UUID') {
        this.obj = obj;
        this.originalColor = null;
        this.selectable = !(this.content.selectable === false);
        this.locked = {};
        this.picked = false;
    }

    /**
     * Retrieve a dynamic property from the underlying object.
     * @param {string} property
     * @returns {any}
     */
    getProperty(property) {
        switch (this.type) {
            case Cesium3DTileFeature:
            case Primitive:
                return this.content.getProperty(property);
            case Entity:
                if (this.content?.properties.hasProperty(property)) {
                    return this.content.properties[property].getValue();
                }
                break;
            default:
                return null;
        }
    }

    /**
     * Universal feature UUID getter (from property or fallback).
     * @type {string}
     */
    get uuid() {
        switch (this.type) {
            case Cesium3DTileFeature:
            case Primitive: {
                const uuid = this.obj.getProperty('UUID');
                if (uuid) return uuid;
                return this.obj.featureId;
            }
            case Entity:
                return this.obj.properties['UUID'].getValue();
            default:
                return this.obj.featureId;
        }
    }

    /**
     * Main identifier for the feature (object or ID).
     * @type {any}
     */
    get id() {
        switch (this.type) {
            case Cesium3DTileFeature:
            case Primitive:
                return this.obj;
            case Entity:
                return this.obj.id.id;
            default:
                return null;
        }
    }

    /**
     * Detect the feature type for Cesium/scene abstraction.
     * @type {Function|undefined}
     */
    get type() {
        if (this.obj.id instanceof Entity) {
            this.picked = true;
            return Entity;
        } else if (this.obj instanceof Entity) {
            return Entity;
        } else if (this.obj instanceof Cesium3DTileFeature) {
            return Cesium3DTileFeature;
        } else if (this.obj.primitive) {
            return Primitive;
        }
        return null;
    }

    /**
     * Access the main Cesium/scene content portion for this feature.
     * @type {object|null}
     */
    get content() {
        switch (this.type) {
            case Cesium3DTileFeature:
                return this.obj;
            case Entity:
                if (this.picked) return this.obj.id;
                return this.obj;
            case Primitive:
                return this.obj.primitive;
        }
        return null;
    }

    /**
     * Status of 'reactive' for this feature (if present).
     * @type {boolean}
     */
    get reactive() {
        switch (this.type) {
            case Entity:
                if (
                    this.obj.id &&
                    this.obj.id.properties &&
                    this.obj.id.properties.reactive
                ) {
                    return this.obj.id.properties.reactive.getValue(
                        JulianDate.now(),
                    );
                }
        }
        return true;
    }

    /**
     * For Entities, access the low-level primitive (polygon, polyline, point).
     * @type {any|null}
     */
    get entity() {
        if (this.type === Entity) {
            if (this.obj.polygon) {
                return this.obj.polygon;
            } else if (this.obj.polyline) {
                return this.obj.polyline;
            } else if (this.obj.point) {
                return this.obj.point;
            }
        }
        return null;
    }

    /**
     * Main visual color of the feature.
     * @type {Color|undefined}
     */
    get color() {
        switch (this.type) {
            case Cesium3DTileFeature:
                return this.obj?.color.clone();
            case Primitive:
                return this.obj.primitive?.color?.clone();
            case Entity: {
                const entity = this.entity;
                return entity?.material
                    ? entity.material?.color.getValue().clone()
                    : entity?.color.clone();
            }
            default:
                return undefined;
        }
    }

    /**
     * Set the current color (for highlight or visual change).
     * @param {Color} color
     */
    set color(color) {
        let originalColor;

        switch (this.type) {
            case Cesium3DTileFeature:
                originalColor = this.color || new Color(0, 0, 0, 1.0);
                this.obj.color = new Color(
                    color.red,
                    color.green,
                    color.blue,
                    originalColor.alpha,
                );
                break;
            case Primitive:
                originalColor = this.color || new Color(1, 1, 1, 1.0);
                this.obj.primitive.color = new Color(
                    color.red,
                    color.green,
                    color.blue,
                    originalColor.alpha,
                );
                break;
            case Entity:
                originalColor = this.color || new Color(0, 0, 0, 1.0);
                this.obj.id.color = new Color(
                    color.red,
                    color.green,
                    color.blue,
                    originalColor.alpha,
                );
                break;
        }

        this.originalColor = this.keep ? originalColor : this.originalColor;
    }

    /**
     * Show or hide the visual feature (all supported types).
     * @type {boolean|undefined}
     */
    get show() {
        switch (this.type) {
            case Cesium3DTileFeature:
                return this.obj?.show;
            case Primitive:
                return this.obj.primitive?.show;
            case Entity:
                if (
                    typeof this.entity.show === 'object' &&
                    this.entity.show !== null
                )
                    return this.entity.show.getValue(JulianDate.now());
                return this.entity.show;
            default:
                return undefined;
        }
    }

    /**
     * Set show/hide state of the feature.
     * @param {boolean} show
     */
    set show(show) {
        switch (this.type) {
            case Cesium3DTileFeature:
                this.obj.show = show;
                break;
            case Primitive:
                this.obj.primitive.show = show;
                break;
            case Entity:
                this.entity.show = show;
                break;
        }
    }

    /**
     * Colorize the feature (temporary highlight).
     * @param {Color} color - Color to apply.
     * @param {boolean} [keep=true] - Keep the original color for restoring.
     */
    colorize(color, keep = true) {
        if (color && !(color instanceof Color)) {
            throw new Error(
                'Invalid argument. Expected argument of type Color',
            );
        }
        this.keep = keep;
        this.color = color;
    }

    /**
     * Revert to the previous (stored) color, if available.
     */
    clearColor() {
        this.colorize(this.originalColor, false);
    }
}
