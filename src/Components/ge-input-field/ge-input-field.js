import styles from './ge-input-field.css?raw';
import template from './ge-input-field.html?raw';

/**
 * `<ge-inputfield>` - A numeric input field with flexible validation strategies,
 * suffix/label support, and configurable constraints (`min`, `max`, `step`, `precision`).
 *
 * The component wraps a native `<input>` element and extends it with:
 * - Custom **validation strategies**
 * - Automatic enforcement of `min`, `max`, `step`, and `precision`
 * - Custom suffix labels
 * - Event emission of input value updates
 *
 * @summary
 * Custom numeric input field with validation strategies.
 *
 * @example
 * ```
 * <ge-inputfield
 *   min="0"
 *   max="100"
 *   step="0.5"
 *   precision="2"
 *   validation-strategy="positive-float"
 *   suffix="m"
 * ></ge-inputfield>
 *
 * <script>
 *   const field = document.querySelector("ge-inputfield");
 *   field.addEventListener("value", e => {
 *     console.log("New value:", e.detail);
 *   });
 *   field.value = 42.5;
 * </script>
 * ```
 *
 * @fires value - Fired whenever the validated value changes.
 * @property {number|string} detail - The new numeric value.
 *
 */
class ValidationStrategy {
    /** @abstract Force overrides to implement */
    validate(value) {
        throw new Error('You must implement this method.');
    }
}

/** Dummy validator (always true) */
class DummyValidationStrategy extends ValidationStrategy {
    validate(value) {
        return true;
    }
}

/** Matches general number (integer or float, signed/unsigned) */
class NumberValidationStrategy extends ValidationStrategy {
    validate(value) {
        return /^\-?\d*\.?\d*$/.test(value);
    }
}

/** Matches strictly positive floats */
class PositiveFloatingPointValidationStrategy extends ValidationStrategy {
    validate(value) {
        return /^[0-9]+(?:\.[0-9]*)?$/.test(value);
    }
}

/** Matches signed floats */
class FloatingPointValidationStrategy extends ValidationStrategy {
    validate(value) {
        return /^-?[0-9]+(?:\.[0-9]*)?$/.test(value);
    }
}

export class GeInputField extends HTMLElement {
    /** Observe suffix attribute to update label */
    static observedAttributes = ['suffix'];

    /** Available validation strategies */
    static ValidationStrategies = {
        'positive-float': PositiveFloatingPointValidationStrategy,
        float: FloatingPointValidationStrategy,
    };

    constructor() {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        /** Last accepted input value (string form) */
        this.lastValidInput = '';

        this.html = {
            flex: this.shadow.querySelector('div'),
            input: this.shadow.querySelector('input'),
            label: this.shadow.querySelector('label'),
        };
    }

    async connectedCallback() {
        // place label correctly if not "front"
        if (this.position !== 'front') {
            this.html.flex.appendChild(this.html.label);
        }

        this.precision = this.getAttribute('precision') || 0;
        this.validationStrategy = 'float';

        if (!this.value) {
            this.value =
                this.getAttribute('start-value') || this.html.input.min;
        }

        this.labelText = this.getAttribute('suffix');
        this.shadow.appendChild(this.html.flex);
        this.setInputHandlers();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'suffix': {
                this.html.label.textContent = newValue;
                break;
            }
        }
    }

    /** @type {string} The display text of the suffix label */
    get labelText() {
        return this.html.label.textContent;
    }

    set labelText(value) {
        if (value) {
            this.html.label.textContent = value;
        } else {
            this.html.label.textContent = '';
        }
    }

    /** @type {number|null} maximum allowed value */
    get max() {
        return this.getAttribute('max')
            ? Number(this.getAttribute('max'))
            : null;
    }

    set max(value) {
        if (value) {
            this.setAttribute('max', value);
        } else {
            this.removeAttribute('max');
        }
    }

    /** @type {number|null} minimum allowed value */
    get min() {
        return this.getAttribute('min')
            ? Number(this.getAttribute('min'))
            : null;
    }

    set min(value) {
        if (value) {
            this.setAttribute('min', value);
        } else {
            this.removeAttribute('min');
        }
    }

    /** @type {number|null} step size */
    get step() {
        return Number(this.getAttribute('step'));
    }

    set step(value) {
        if (value) {
            this.setAttribute('step', value);
        } else {
            this.removeAttribute('step');
        }
    }

    /** @type {number|null} precision (decimal places) */
    get precision() {
        return Number(this.getAttribute('precision'));
    }

    set precision(value) {
        if (value) {
            this.setAttribute('precision', value);
        } else {
            this.removeAttribute('precision');
        }
    }

    /** @type {string} Label position relative to input ("front" = before input) */
    get position() {
        return this.getAttribute('position');
    }

    set position(value) {
        if (value !== 'front') {
            this.html.flex.appendChild(this.html.label);
        } else {
            this.html.flex.insertBefore(this.html.input, this.html.label);
        }
    }

    /** @type {string} current validation strategy key */
    get validationStrategy() {
        return this.getAttribute('validation-strategy');
    }

    set validationStrategy(value) {
        if (value) {
            this.setAttribute('validation-strategy', value);
        } else {
            this.removeAttribute('validation-strategy');
        }
    }

    /** @type {number|string} The current numeric value */
    get value() {
        return this.html.input.value;
    }

    set value(value) {
        value = Number(value);
        if (typeof this.max === 'number' && value > this.max) value = this.max;
        if (typeof this.min === 'number' && value < this.min) value = this.min;
        if (typeof this.step === 'number')
            value = Math.round(value / this.step) * this.step;
        if (typeof this.precision === 'number')
            value = value.toFixed(this.precision);
        this.html.input.value = value;

        this.dispatchEvent(
            new CustomEvent('value', {
                detail: value,
                bubbles: true,
            }),
        );
    }

    /**
     * Undo the last character input.
     * @param {string} value
     * @returns {string} value with last char removed
     */
    undoLastChar(value) {
        return value.substring(0, value.length - 1);
    }

    /** Attach all input listeners for validation & commit */
    setInputHandlers() {
        this.html.input.addEventListener('input', e => {
            let newValue = e.target.value.replace(',', '.');

            if (!new NumberValidationStrategy().validate(newValue))
                newValue = this.lastValidInput;

            this.lastValidInput = newValue;
            this.html.input.value = newValue;
        });

        this.html.input.addEventListener('keyup', e => {
            if (e.key === 'Enter') {
                this.react(e);
            }
        });

        this.html.input.addEventListener('blur', e => this.react(e));
    }

    /**
     * Apply validation strategy and commit value.
     */
    react(e) {
        let newValue = e.target.value.replace(',', '.');
        if (newValue === '-') newValue = 0;

        const func =
            this.validationStrategy in GeInputField.ValidationStrategies
                ? new GeInputField.ValidationStrategies[
                      this.validationStrategy
                  ]()
                : new GeInputField.DummyValidationStrategy();
        if (!func.validate(newValue)) {
            newValue = newValue.length === 1 ? '' : this.value;
        }

        this.value = newValue;
        this.lastValidInput = newValue;
    }
}

if (!customElements.get('ge-input-field'))
    customElements.define('ge-input-field', GeInputField);
