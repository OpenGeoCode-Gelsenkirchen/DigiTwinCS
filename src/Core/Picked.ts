import {Cesium3DTileFeature, Color, Entity, JulianDate} from '@cesium/engine';
import {i18next} from '../i18n';
import type {Feature} from './Handler';
import {isObject} from './utilities';

/**
 * Raw Cesium pick result supported by {@link Picked}.
 *
 * @remarks
 * A pick may represent either a `Cesium3DTileFeature`, an entity-backed
 * Cesium pick object, or no result at all.
 */
export type RawType = Feature | undefined;

/**
 * Normalized type of Cesium object currently wrapped by {@link Picked}.
 */
export type PickedType = 'tiles' | 'entity';

/**
 * A displayable property row for a picked 3D Tiles feature.
 *
 * @remarks
 * The first item is the localized property label and the second item is its
 * stringified value with line breaks removed.
 */
export type PropertyTableRow = [label: string, value: string];

/**
 * Wraps a raw Cesium pick result and exposes a uniform API for common feature
 * and entity operations.
 *
 * @remarks
 * `Picked` supports two kinds of selected content:
 *
 * - A {@link Cesium3DTileFeature} from a 3D Tileset.
 * - An {@link Entity} referenced through the raw pick result's `id` property.
 *
 * It provides normalized access to the selected content, selection color,
 * semantic type, localized title, and property data for an inspector UI.
 *
 * @example
 * ```ts
 * const picked = new Picked().set(scene.pick(windowPosition));
 *
 * if (picked.type === 'tiles') {
 *   picked.color = Color.YELLOW;
 *   console.log(picked.title, picked.propertyTable);
 * }
 * ```
 */
export class Picked {
    /**
     * Current raw Cesium pick result.
     */
    private _raw: RawType = undefined;

    /**
     * Stores a raw Cesium pick result and returns this wrapper for chaining.
     *
     * @param raw - Picked Cesium feature, entity pick object, or `undefined`.
     * @returns This {@link Picked} instance.
     */
    set(raw: RawType) {
        this._raw = raw;
        return this;
    }

    /**
     * Returns the unmodified raw Cesium pick result.
     *
     * @returns The wrapped pick result, or `undefined` when nothing is selected.
     */
    get() {
        return this._raw;
    }

    /**
     * Underlying Cesium content supported by this wrapper.
     *
     * @returns A 3D Tiles feature, an entity, or `undefined` when the raw pick is
     * unsupported or absent.
     */
    get content() {
        if (this._raw === undefined) return undefined;
        if (this._raw instanceof Cesium3DTileFeature) {
            return this._raw;
            //@ts-ignore
        } else if (this._raw.id instanceof Entity) {
            return this._raw.id;
        }
        return undefined;
    }

    /**
     * Current visual color of the selected feature or entity shape.
     *
     * @returns Feature color, polygon/polyline material color, or `undefined`
     * when the pick has no supported color representation.
     *
     * @remarks
     * Entity color retrieval assumes that polygon or polyline material resolves
     * to a material value object with a `color` property. Complex material types,
     * non-color materials, or time-dependent material values may not satisfy
     * that assumption.
     */
    get color(): Color | undefined {
        if (this._raw === undefined) return;
        if (this._raw instanceof Cesium3DTileFeature) {
            return this._raw.color;

            //@ts-ignore
        } else if (this._raw?.id instanceof Entity) {
            const shape = this._raw.id.polygon || this._raw.id.polyline;
            if (shape) return shape.material.getValue(JulianDate.now()).color;
        }
        return;
    }

    /**
     * Sets the visual color of the selected 3D Tiles feature or entity shape.
     *
     * @param color - Cesium color assigned to the selected content.
     *
     * @remarks
     * For 3D Tiles features, this directly assigns {@link Cesium3DTileFeature.color}.
     * For entities, it assigns the color property of the polygon or polyline
     * graphics object when available.
     */
    set color(color: Color) {
        if (this._raw === undefined) return;
        if (this._raw instanceof Cesium3DTileFeature) {
            this._raw.color = color;

            //@ts-ignore
        } else if (this._raw.id instanceof Entity) {
            const shape = this._raw.id.polygon || this._raw.id.polyline;
            if (shape) {
                //shape.material = new ColorMaterialProperty(color);
                //@ts-ignore
                shape.color = color;
            }
        }
    }

    get type() {
        if (this._raw === undefined) return;
        if (this._raw instanceof Cesium3DTileFeature) {
            return 'tiles';
        }
        //@ts-ignore
        if (this._raw.id instanceof Entity) {
            return 'entity';
        }
        return;
    }

    /**
     * Localized title suitable for a selection inspector.
     *
     * @returns Localized tileset title for 3D Tiles content, entity name for
     * entity content, or an empty string when no title exists.
     *
     * @remarks
     * The raw title is treated as an i18next translation key. If no translation
     * exists, i18next returns the raw value through `defaultValue`.
     */
    get title() {
        let title = '';

        switch (this.type) {
            case 'tiles': {
                //@ts-ignore
                title = (this.content as Cesium3DTileFeature).tileset.format
                    ?.title;
                break;
            }
            case 'entity': {
                //@ts-ignore
                title = (this.content as Entity).name;
                break;
            }
        }
        return i18next.t(title, {defaultValue: title});
    }

    /**
     * Property information suitable for rendering a feature inspector.
     *
     * @returns An array of localized key/value rows for 3D Tiles content, an
     * evaluated entity description for entity content, or `undefined` for an
     * unsupported pick.
     *
     * @remarks
     * For 3D Tiles features, attributes are read from
     * `tileset.format.attributes` when configured. Otherwise, all property IDs
     * returned by Cesium are used as both the key and display label.
     *
     * Property values equal to `undefined` are omitted. Values such as `0`,
     * `false`, an empty string, and `null` are retained because they can be valid
     * feature data.
     *
     * Entity descriptions are returned exactly as evaluated by Cesium and may be
     * a string or another value accepted by the entity description property.
     */
    get propertyTable() {
        switch (this.type) {
            case 'tiles': {
                const feature = this.content as Cesium3DTileFeature;
                const attributes =
                    //@ts-ignore
                    feature.tileset.format?.attributes ||
                    feature.getPropertyIds().map(v => {
                        return {key: v, label: v};
                    });

                const x = attributes
                    //check if translation exists
                    //@ts-ignore
                    .map(entry => {
                        if (isObject(entry)) {
                            const {key, label} = entry;
                            const tLabel = i18next.exists(label)
                                ? i18next.t(label)
                                : label;
                            return [
                                tLabel || key,
                                //@ts-ignore
                                this.content?.getProperty(key),
                            ];
                        }
                        const result = [
                            entry,
                            //@ts-ignore
                            this.content?.getProperty(entry),
                        ];
                        return result;
                    })
                    //filter undefined attributes
                    //@ts-ignore
                    .filter(([_, value]) => {
                        if (value !== undefined) return value;
                    })
                    //@ts-ignore
                    //remove line breaks
                    .map(([key, value]) => {
                        return [
                            key.replace(/\n/g, ''),
                            String(value).replace(/\n/g, ''),
                        ];
                    });
                return x;
            }
            case 'entity':
                return (this.content as Entity).description?.getValue(
                    JulianDate.now(),
                );
        }
    }
}
