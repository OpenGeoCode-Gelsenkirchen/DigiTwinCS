import {Cartesian3, Color, LabelStyle} from '@cesium/engine';
import {uuidv4} from './utilities.js';

/**
 * Label – Utility class for rendering a text label at a 3D position in a Cesium scene.
 *
 * Encapsulates a Cesium entity (with a label), providing easy access to label content, number/unit formatting,
 * show/hide, and position, as well as destruction/cleanup logic.
 *
 * @class
 *
 * @param {any} app - Parent application or Cesium Viewer reference.
 * @param {object} [options]
 * @param {string} [options.id=uuidv4()] - Unique label id.
 * @param {Cartesian3|Array<number>} [options.position=Cartesian3.ZERO] - Label position in 3D.
 * @param {string|number} [options.value=''] - Initial text/numeric value.
 * @param {string} [options.font='Helvetica'] - Label font family.
 * @param {number} [options.size=24] - Label font size (pixels).
 * @param {string} [options.unit=''] - Unit string to be appended to numeric values.
 * @param {string} [options.prefix=''] - Prefix string for label text.
 * @param {boolean} [options.show=true] - Initial visibility.
 *
 * @property {string} id - UUID for this label.
 * @property {number} size - Font size (px).
 * @property {string} unit - Unit suffix for values.
 * @property {string} prefix - Prefix shown before values.
 * @property {string} font - Font family.
 * @property {boolean} show - Show/hide label in scene.
 * @property {string|number} value - The displayed value (text or numeric).
 * @property {Cartesian3|Array<number>} position - Current world position.
 * @property {any} entity - The underlying Cesium entity.
 *
 * @method destroy() - Removes the label entity from the scene and disables reference.
 *
 * @example
 * const label = new Label(viewer, {position: [1,2,3], value: 99, unit: 'm'});
 * label.position = [4,5,6];
 * label.value = 123.456;
 * label.show = false;
 * label.destroy();
 */
export class Label {
    /**
     * Create a new label entity.
     * @param {any} app - App or Cesium Viewer.
     * @param {object} [options]
     */
    constructor(
        app,
        {
            id: id = uuidv4(),
            position: position = Cartesian3.ZERO,
            value: value = '',
            font: font = 'Helvetica',
            size: size = 24,
            unit: unit = '',
            prefix: prefix = '',
            show: show = true,
        } = {},
    ) {
        this.app = app;
        this.id = id;

        this.size = size;
        this.unit = unit;
        this.prefix = prefix;

        this.font = font;

        this.entity = this.app.viewer.entities.add({
            position: position,
            label: {
                style: LabelStyle.FILL_AND_OUTLINE,
                text: value,
                font: `${this.size}px ${this.font}`,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                outlineColor: Color.BLACK,
                fillColor: Color.WHITE,
                outlineWidth: 2.5,
            },
            properties: {
                reactive: false,
                deletable: false,
            },
        });

        (this.value = value), (this.show = show);
        this.position = position;
    }

    /**
     * Show/hide this label in the scene.
     * @type {boolean}
     */
    get show() {
        return this.entity.show;
    }

    set show(value) {
        this.entity.show = value;
    }

    /**
     * Set label content (formats numeric to 2 decimal places + prefix + unit).
     * Accepts either a string or a number.
     * @type {string|number}
     */
    get value() {
        return this._value;
    }

    set value(value) {
        let content = Number(value).toFixed(2);

        // Use value as string if not a valid number
        content = isNaN(content) ? value : content;

        this.entity.label.text = `${this.prefix}${content}${this.unit}`;
        this._value = value;
    }

    /**
     * Set or get label 3D position.
     * Accepts either a Cesium Cartesian3 or an array [x, y, z].
     * @type {Cartesian3|Array<number>}
     */
    get position() {
        return this.entity.position;
    }

    set position(value) {
        this.entity.position = new Cartesian3(value[0], value[1], value[2]);
    }

    /**
     * Remove the label's Cesium entity from the viewer.
     */
    destroy() {
        this.app.viewer.entities.remove(this.entity);
        this.entity = null;
    }
}
