import styles from './ge-list-item.css?raw';
import template from './ge-list-item.html?raw';

function uuidv4() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (
            +c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
        ).toString(16),
    );
}

/**
 * `<ge-list-item>` - A flexible list item component used together with `<ge-list>`.
 *
 * Each list item can display:
 * - An icon (via `src`)
 * - A text label (`name`)
 * - A checkbox (`checked`)
 * - An optional numeric input (`ge-input-field`)
 * - A delete button (shown by default)
 *
 * It also supports callback hooks for click, checkbox toggle, input change,
 * and delete actions. When clicked, the item toggles its `active` state.
 *
 * @summary
 * Interactive list item with icon, text, checkbox, optional input, and delete button.
 *
 * @example
 * ```
 * <ge-list-item></ge-list-item>
 *
 * <script>
 *   const item = document.querySelector("ge-list-item");
 *
 *   item.name = "Layer 1";
 *   item.src = "./icons/layer.svg";
 *   item.checked = true;
 *
 *   // Optional input example
 *   item.withInput = true;
 *   item.value = 2.5;
 *
 *   item.onClickCallback = () => console.log("Item clicked!");
 *   item.onCheckedCallback = checked => console.log("Checked:", checked);
 *   item.onDeleteCallback = () => console.log("Item deleted");
 *   item.onInputChangeCallback = val => console.log("Input changed:", val);
 * </script>
 * ```
 *
 * @property {string} id - Unique identifier (auto-generated if not provided).
 * @property {any} obj - Optional custom object reference stored in the item.
 * @property {string} name - Display label shown next to icon.
 * @property {string} src - URL for the icon displayed on the left.
 * @property {boolean} checked - Whether checkbox is on/off.
 * @property {boolean} active - Current active state (toggled on click).
 * @property {number|string} value - Value of the `<ge-input-field>` (if `with-input`).
 *
 * @property {Function} onClickCallback - Invoked when the item or icon/text is clicked.
 * @property {Function} onCheckedCallback - Invoked when the checkbox is toggled, called with `checked`.
 * @property {Function} onDeleteCallback - Invoked when the delete button is clicked.
 * @property {Function} onInputChangeCallback - Invoked when the embedded `<ge-input-field>` value changes.
 *
 */

export class GeListItem extends HTMLElement {
    #onCheckedCallback;
    #onClickCallback;
    #onDeleteCallback;

    /**
     * @param {object} [options]
     * @param {string} [options.id=uuidv4()] - Unique id (default auto-generated)
     * @param {any} [options.obj] - Arbitrary object payload to store with item
     * @param {string} [options.name=""] - Item label
     * @param {string} [options.src=""] - Icon URL
     * @param {boolean} [options.checked=false] - Initial checkbox state
     * @param {boolean} [options.withInput=false] - Whether to show an embedded `<ge-input-field>`
     * @param {number} [options.inputMin=0] - Min for input field
     * @param {number} [options.inputMax=100] - Max for input field
     * @param {number} [options.inputStep=0.1] - Step for input field
     * @param {number} [options.inputPrecision=2] - Precision for input field
     * @param {string} [options.inputStrategy="float"] - Validation strategy key
     * @param {string|number} [options.inputValue=""] - Initial value for `<ge-input-field>`
     * @param {string} [options.inputText=""] - Optional suffix label for `<ge-input-field>`
     * @param {function} [options.onClickCallback] - Callback invoked when row is clicked
     * @param {function} [options.onInputChangeCallback] - Callback when input changes
     * @param {function} [options.onCheckedCallback] - Callback on checkbox toggle
     * @param {function} [options.onDeleteCallback] - Callback on delete button click
     */
    constructor({
        id = uuidv4(),
        obj,
        name = '',
        src = '',
        checked = false,
        withInput = false,
        inputMin = 0,
        inputMax = 100,
        inputStep = 0.1,
        inputPrecision = 2,
        inputStrategy = 'float',
        inputValue = '',
        inputText = '',
        onClickCallback = () => {},
        onInputChangeCallback = () => {},
        onCheckedCallback = () => {},
        onDeleteCallback = () => {},
    } = {}) {
        super();

        this.withInput = withInput;

        this.inputMin = inputMin;
        this.inputMax = inputMax;
        this.inputStep = inputStep;
        this.inputPrecision = inputPrecision;
        this.inputStrategy = inputStrategy;

        this.inputValue = inputValue;
        this.inputText = inputText;
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            listItem: this.shadow.querySelector('.list-item'),

            iconContainer: this.shadow.querySelector('.icon-container'),
            icon: this.shadow.querySelector('#icon'),

            spanContainer: this.shadow.querySelector('.span-container'),
            span: this.shadow.querySelector('#span'),

            checkboxContainer: this.shadow.querySelector('.checkbox-container'),
            checkbox: this.shadow.querySelector('#checkbox'),

            deleteButton: this.shadow.querySelector('.delete-button'),
        };

        if (!this.withInput) {
            this.shadow.querySelector('ge-input-field').remove();
        } else {
            this.html.input = this.shadow.querySelector('ge-input-field');
            this.html.input.setAttribute('start-value', this.inputValue);
            this.html.input.setAttribute('min', this.inputMin);
            this.html.input.setAttribute('max', this.inputMax);
            this.html.input.setAttribute('step', this.inputStep);
            this.html.input.setAttribute('position', 'front');
            this.html.input.setAttribute('precision', this.inputPrecision);
            this.html.input.setAttribute('label-text', this.inputText);
            this.html.input.setAttribute(
                'validation-strategy',
                this.inputStrategy,
            );
            this.setAttribute('with-input', true);
            this.html.input.addEventListener('click', e => {
                e.stopPropagation();
            });

            this.html.input.addEventListener('value', e => {
                this.onInputChangeCallback(e.detail);
            });
        }

        this.id = id;
        this.obj = obj;
        this.name = name;
        this.src = src;
        this.onClickCallback = onClickCallback;
        this.onInputChangeCallback = onInputChangeCallback;
        this.onCheckedCallback = onCheckedCallback;
        this.onDeleteCallback = onDeleteCallback;
        this.checked = checked;
    }

    async connectedCallback() {
        this.style.display = 'none';

        requestAnimationFrame(() => {
            this.style.display = 'block';
        });

        this.active = false;

        this.html.checkboxContainer.addEventListener('click', e =>
            e.stopPropagation(),
        );
        this.html.checkbox.addEventListener('change', e => {
            this.checked = e.target.checked;
        });

        this.checked = this.checked;

        this.html.listItem.addEventListener('click', () => {
            this.onClickCallback();
        });
        this.html.iconContainer.addEventListener('click', e => {
            e.stopPropagation();
            this.onClickCallback();
        });
        this.html.spanContainer.addEventListener('click', e => {
            e.stopPropagation();
            this.onClickCallback();
        });
        this.html.deleteButton.addEventListener('click', e => {
            e.stopPropagation();
            this.onDeleteCallback();
        });

        this.value = this.inputValue;
    }

    /** @type {string|number} Current input field value (if with-input=true) */
    get value() {
        return this.html?.input?.value;
    }
    set value(value) {
        if (!this.html.input) return;
        if (value) {
            this.html.input.value = value;
        } else {
            this.html.input.value = null;
        }
    }

    /** @type {string} Label/name displayed in list item */
    get name() {
        return this.html.span.textContent;
    }
    set name(value) {
        if (value) {
            this.html.span.textContent = value;
        } else {
            this.html.span.textContent = '';
        }
    }

    /** @type {string} Icon URL */
    get src() {
        return this.html.icon.src;
    }

    set src(value) {
        if (value) {
            this.html.icon.src = value;
        } else {
            this.html.icon.src = '';
        }
    }

    /** @type {boolean} Whether item is active */
    get active() {
        return this.hasAttribute('active');
    }
    set active(value) {
        if (value) {
            this.setAttribute('active', true);
        } else {
            this.removeAttribute('active');
        }
    }

    /** @type {boolean} Current checkbox state */
    get checked() {
        return this.html.checkbox.checked;
    }

    set checked(value) {
        this.html.checkbox.checked = value;
        this.#onCheckedCallback();
    }

    /**
     * Callback invoked whenever the checkbox state changes.
     *
     * When assigned, it wraps the given callback, ensures `stopPropagation()`
     * on the checkbox event, and passes the new `checked` state as argument.
     *
     * @example
     * item.onCheckedCallback = (checked) => console.log("Checkbox toggled:", checked);
     *
     * @type {(checked: boolean) => void}
     */
    get onCheckedCallback() {
        return this.#onCheckedCallback;
    }
    set onCheckedCallback(callback) {
        this.#onCheckedCallback = e => {
            if (e) e.stopPropagation();
            callback(this.html.checkbox.checked);
        };
    }

    /**
     * Callback invoked when the list item (or its text/icon) is clicked.
     *
     * When triggered, it toggles the `active` state of the item before
     * invoking the provided callback.
     *
     * @example
     * item.onClickCallback = () => console.log("Item clicked (active toggled).");
     *
     * @type {() => void}
     */
    get onClickCallback() {
        return this.#onClickCallback;
    }
    set onClickCallback(callback) {
        this.#onClickCallback = () => {
            this.active = !this.active;
            callback();
        };
    }

    /**
     * Callback invoked when the delete button is clicked.
     *
     * Does **not** toggle state or stop propagation — just calls the callback directly.
     *
     * @example
     * item.onDeleteCallback = () => console.log("Delete clicked!");
     *
     * @type {() => void}
     */
    get onDeleteCallback() {
        return this.#onDeleteCallback;
    }
    set onDeleteCallback(callback) {
        this.#onDeleteCallback = () => {
            callback();
        };
    }
}

if (!customElements.get('ge-list-item'))
    customElements.define('ge-list-item', GeListItem);
