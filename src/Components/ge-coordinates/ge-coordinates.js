import styles from './ge-coordinates.css?raw';
import template from './ge-coordinates.html?raw';

/**
 * `<ge-coordinates>` - A lightweight display component for showing
 * three numeric coordinates (x, y, z) together with an optional label.
 *
 * Each coordinate is shown in its own span element.
 * If no numeric value is provided, the placeholder string (`#####`) is shown.
 *
 * @summary
 * UI component for displaying coordinates with a label.
 *
 * @example
 * ```
 * <ge-coordinates label="Position"></ge-coordinates>
 *
 * <script>
 *   const coords = document.querySelector('ge-coordinates');
 *   coords.x = 123.456;
 *   coords.y = 78.9;
 *   coords.z = -45.67;
 *   coords.label = "Camera Target";
 * </script>
 * ```
 *
 * @property {number|null} x - X coordinate (numeric) or `null` if not set.
 * @property {number|null} y - Y coordinate (numeric) or `null` if not set.
 * @property {number|null} z - Z coordinate (numeric) or `null` if not set.
 * @property {string} label - Descriptive label displayed next to the coordinates.
 *
 */
export class GeCoordinates extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            x: this.shadowRoot.querySelector('.x'),
            y: this.shadowRoot.querySelector('.y'),
            z: this.shadowRoot.querySelector('.z'),
            label: this.shadowRoot.querySelector('.label'),
        };

        /** @private placeholder string used when value is unset */
        this.placeholder = '#####';

        this.x = this.placeholder;
        this.y = this.placeholder;
        this.z = this.placeholder;
    }

    /** @type {number|string} X coordinate */
    set x(value) {
        if (this.html.x) {
            const n = Number(value);
            this.html.x.innerText = n ? n : this.placeholder;
        }
    }

    get x() {
        return this.html.x ? Number(this.html.x.innerText) : null;
    }

    /** @type {number|string} Y coordinate */
    set y(value) {
        if (this.html.y) {
            const n = Number(value);
            this.html.y.innerText = n ? n : this.placeholder;
        }
    }

    get y() {
        return this.html.y ? Number(this.html.y.innerText) : null;
    }

    /** @type {number|string} Z coordinate */
    set z(value) {
        if (this.html.z) {
            const n = Number(value);
            this.html.z.innerText = n ? n : this.placeholder;
        }
    }

    get z() {
        return this.html.z ? Number(this.html.z.innerText) : null;
    }

    /** @type {string} Display label text */
    set label(value) {
        if (this.html.label) {
            this.html.label.innerText = value;
        }
    }

    get label() {
        return this.html.label ? this.html.label.innerText : '';
    }
}

customElements.define('ge-coordinates', GeCoordinates);
