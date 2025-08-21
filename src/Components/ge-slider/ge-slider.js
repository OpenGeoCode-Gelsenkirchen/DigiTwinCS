import '../ge-input-field/ge-input-field.js';
import styles from './ge-slider.css?raw';
import template from './ge-slider.html?raw';

function uuidv4() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (
            +c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
        ).toString(16),
    );
}

/**
 * `<ge-slider>` – A range slider UI component with optional numeric input and suffix label.
 *
 * This component wraps:
 * - A native `<input type="range">` element
 * - An attached `<ge-input-field>` for precise numeric entry
 * - A label/description and optional unit (suffix)
 *
 * Updates from the slider and input field are kept in sync, and any change emits a `value` event containing the numeric value.
 *
 * @summary
 * Range slider component with live-synced numeric input and suffix.
 *
 * @example
 * ```
 * <ge-slider
 *   min="0"
 *   max="100"
 *   step="0.5"
 *   precision="2"
 *   description="Brightness"
 *   suffix="%"
 *   start-value="40"
 * ></ge-slider>
 *
 * <script>
 *   const slider = document.querySelector('ge-slider');
 *   slider.addEventListener('value', e => {
 *     console.log('Slider changed:', e.detail);
 *   });
 *   // set value programmatically:
 *   slider.value = 55.5;
 * </script>
 * ```
 *
 * @fires value - Fired on user change or programmatic value update.
 * @property {number} detail - The new value as a number.
 *
 * @property {number|string} value - The slider's current numeric value.
 * @property {number|string} max - Maximum value.
 * @property {number|string} min - Minimum value.
 * @property {number|string} step - Step size.
 * @property {number|string} precision - Rounding precision for displayed value.
 * @property {string} description - Label/description for the slider.
 * @property {string} inputText - Suffix/unit label text shown in the input field.
 * @property {string} id - Component's unique HTML id.
 * @property {string} name - Alternative label, mapped to the slider label text.
 *
 */
export class GeSlider extends HTMLElement {
    static observedAttributes = ['description', 'suffix'];

    constructor() {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            label: this.shadow.querySelector('label'),
            input: this.shadow.querySelector('input'),
            inputField: this.shadow.querySelector('ge-input-field'),
        };

        // Ensure id is always set
        this.id = this.id || uuidv4();
        this.eventName = this.id + '_event';

        // Keep slider (input) and input field in sync
        this.html.input.addEventListener('input', e => {
            this.value = e.target.value;
        });
        this.propagate = true;

        this.html.inputField.addEventListener('value', e => {
            this.propagate = false;
            this.value = e.detail;
            e.stopPropagation();
        });
    }

    async connectedCallback() {
        this.html.input.max = this.getAttribute('max');
        this.html.input.min = this.getAttribute('min');
        this.html.input.value =
            this.getAttribute('start-value') || this.html.input.min;
        this.html.input.step = this.getAttribute('step');

        // Ensure inputField constraints mirror slider
        this.html.inputField.max = this.html.input.max;
        this.html.inputField.min = this.html.input.min;
        this.html.inputField.step = this.html.input.step;
        this.html.inputField.precision = this.getAttribute('precision');
        this.html.inputField.value = this.html.input.value;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'description': {
                this.html.label.textContent = newValue;
                break;
            }
            case 'suffix': {
                this.html.inputField.setAttribute('suffix', newValue);
                break;
            }
        }
    }

    /** @type {number|string} Maximum allowed value */
    get max() {
        return this.html.input.max;
    }

    set max(value) {
        this.html.input.max = value;
        this.html.inputField.max = value;
    }

    /** @type {number|string} Minimum allowed value */
    get min() {
        return this.html.input.min;
    }

    set min(value) {
        this.html.input.min = value;
        this.html.inputField.min = value;
    }

    /** @type {number|string} Step size for the slider */
    get step() {
        return this.html.input.step;
    }

    set step(value) {
        this.html.input.min = value;
        this.html.inputField.min = value;
    }

    /** @type {number|string} Decimal precision for the input */
    get precision() {
        return this.html.inputField.precision;
    }

    set precision(value) {
        this.html.inputField.precision = value;
    }

    /** @type {string} Suffix/unit label at the end of the input field */
    get inputText() {
        return this.html.inputField.inputText;
    }

    set inputText(value) {
        this.html.inputField.inputText = value;
    }

    /** @type {string} Unique component id */
    get id() {
        return this.getAttribute('id');
    }

    set id(value) {
        if (value) {
            this.setAttribute('id', value);
            this.html.input.id = String(value) + '-input-range';
            this.html.label.setAttribute('for', this.html.input.id);
        } else {
            this.removeAttribute('id');
        }
    }

    /** @type {string} The label or description above the slider */
    get name() {
        return this.html.label.textContent;
    }

    set name(value) {
        this.html.label.textContent = value;
    }

    /** @type {number|string} The slider's value */
    get value() {
        return this.html.input.value;
    }

    set value(value) {
        const newValue = Number(String(value).replace(',', '.'));

        this.html.input.value = newValue;
        if (this.propagate) this.html.inputField.value = newValue;
        this.propagate = true;

        this.dispatchEvent(
            new CustomEvent('value', {
                detail: Number(value),
                bubbles: true,
            }),
        );
    }
}

if (!customElements.get('ge-slider'))
    customElements.define('ge-slider', GeSlider);
