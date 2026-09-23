import styles from './GeRange.css?raw';
import template from './GeRange.html?raw';

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
    static get observedAttributes() {
        return ['min', 'max', 'step', 'value', 'id'];
    }

    constructor() {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `<style>${styles}</style>${template}`;
        this.html = {input: this.shadow.querySelector('input')};

        this.id = this.id || uuidv4();
        this.eventName = this.id + '_event';

        this.html.input.addEventListener('change', e => {
            this.value = e.target.value; // triggert Setter unten
        });
    }

    connectedCallback() {
        // initiale Synchronisation aus Attributen
        ['min', 'max', 'step', 'value'].forEach(name => {
            const attr = this.getAttribute(name);
            if (attr != null) this.html.input[name] = attr;
        });
    }

    attributeChangedCallback(name, _oldVal, newVal) {
        if (!this.html?.input) return;
        if (['min', 'max', 'step', 'value'].includes(name)) {
            this.html.input[name] = newVal;
        }
        if (name === 'id' && newVal) {
            this.html.input.id = String(newVal) + '-input-range';
        }
    }

    get value() {
        return this.html.input.value;
    }
    set value(v) {
        const newValue = String(v).replace(',', '.');
        this.html.input.value = newValue;
        this.setAttribute('value', newValue); // wichtig!
        this.dispatchEvent(
            new CustomEvent('value', {
                detail: Number(newValue),
                bubbles: true,
            }),
        );
    }

    get min() {
        return this.html.input.min;
    }
    set min(v) {
        this.html.input.min = v;
        this.setAttribute('min', v);
    }

    get max() {
        return this.html.input.max;
    }
    set max(v) {
        this.html.input.max = v;
        this.setAttribute('max', v);
    }

    get step() {
        return this.html.input.step;
    }
    set step(v) {
        this.html.input.step = v;
        this.setAttribute('step', v);
    }

    get id() {
        return this.getAttribute('id');
    }
    set id(v) {
        if (v) {
            this.setAttribute('id', v);
            if (this.html?.input) this.html.input.id = `${v}-input-range`;
        } else {
            this.removeAttribute('id');
        }
    }
}
if (!customElements.get('ge-range')) customElements.define('ge-range', GeRange);
