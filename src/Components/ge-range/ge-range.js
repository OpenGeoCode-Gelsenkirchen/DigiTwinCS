import styles from './ge-range.css?raw';
import template from './ge-range.html?raw';

function uuidv4() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (
            +c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
        ).toString(16),
    );
}

/**
 * `<ge-range>` - A slider/range input Web Component.
 *
 * Wraps an `<input type="range">` element with standardized attributes & events.
 * Synchronizes `min`, `max`, `step`, and `value` with properties and attributes.
 *
 * Dispatches a `value` event whenever the slider value is changed.
 *
 * @summary
 * Slider input component with typed value updates and unique event source id.
 *
 * @example
 * ```
 * <ge-range min="0" max="100" step="5" value="20"></ge-range>
 *
 * <script>
 *   const slider = document.querySelector("ge-range");
 *   slider.addEventListener("value", e => {
 *     console.log("New range value:", e.detail);
 *   });
 *
 *   slider.value = 42; // sets slider position programmatically
 * </script>
 * ```
 *
 * @fires value - Fired when slider value is updated (on user change or programmatic set).
 * @property {number} detail - The new numeric value of the slider.
 *
 */

export class GeRange extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            input: this.shadow.querySelector('input'),
        };

        this.id = this.id || uuidv4();
        this.eventName = this.id + '_event';

        this.html.input.addEventListener('change', e => {
            this.value = e.target.value;
        });
    }

    async connectedCallback() {
        this.html.input.max = this.getAttribute('max');
        this.html.input.min = this.getAttribute('min');
        if (!this.html.input.value)
            this.html.input.value =
                this.getAttribute('value') || this.html.input.min;
        this.html.input.step = this.getAttribute('step');
    }

    /** @type {number|string} maximum value of the slider */
    get max() {
        return this.html.input.max;
    }
    set max(value) {
        this.html.input.max = value;
        this.html.inputField.max = value;
    }

    /** @type {number|string} minimum value of the slider */
    get min() {
        return this.html.input.min;
    }
    set min(value) {
        this.html.input.min = value;
        this.html.inputField.min = value;
    }

    /** @type {number|string} step size for the slider */
    get step() {
        return this.html.input.step;
    }
    set step(value) {
        this.html.input.min = value;
        this.html.inputField.min = value;
    }

    /** @type {string} component id */
    get id() {
        return this.getAttribute('id');
    }
    set id(value) {
        if (value) {
            this.setAttribute('id', value);
            this.html.input.id = String(value) + '-input-range';
        } else {
            this.removeAttribute('id');
        }
    }

    /** @type {string} name/label associated with this range */
    get name() {
        return this.html.label.textContent;
    }
    set name(value) {
        this.html.label.textContent = value;
    }

    /** @type {number|string} current slider value */
    get value() {
        return this.html.input.value;
    }
    set value(value) {
        const newValue = Number(String(value).replace(',', '.'));

        this.html.input.value = newValue;

        this.dispatchEvent(
            new CustomEvent('value', {
                detail: Number(value),
                bubbles: true,
            }),
        );
    }
}

if (!customElements.get('ge-range')) customElements.define('ge-range', GeRange);
