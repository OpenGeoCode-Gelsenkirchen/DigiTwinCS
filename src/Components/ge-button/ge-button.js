import {uuidv4} from '../../Core/utilities.js';
import styles from './ge-button.css?raw';
import template from './ge-button.html?raw';

/**
 * `<ge-button>` - A customizable, styled button Web Component.
 *
 * The button supports:
 * - Icons (via `src`)
 * - Optional text label
 * - Different shapes (`circle`, `square`, `rounded`) and sizes (`small`, `medium`, `large`)
 * - Toggle behavior (using the `toggle` attribute)
 * - Active/disabled state and border visibility
 *
 * It dispatches the standard `click` event (with optional toggle state).
 *
 * @summary
 * Custom button component with optional image, text, toggle support,
 * and styling through attributes.
 *
 * @example
 * ```
 * <ge-button
 *   id="save-button"
 *   src="./icons/save.svg"
 *   size="medium"
 *   shape="square"
 *   title="Save File"
 *   toggle
 *   showborder
 * >
 *   Save
 * </ge-button>
 * ```
 *
 * @fires [id]-ready - Fired once the button is initialized and ready.
 *
 */

export class GeButton extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        /** @private stores attached event listeners for cleanup */
        this.eventListeners = new Map();

        // Default click behavior (toggle support)
        super.addEventListener('click', this.onClick);

        this.html = {
            div: this.shadow.querySelector('div'),
            span: this.shadow.querySelector('span'),
            img: this.shadow.querySelector('img'),
        };
        this.html.img.setAttribute('draggable', 'false');
    }

    /**
     * Lifecycle: connected to DOM.
     * Initializes text, image, id, and dispatches `[id]-ready` event.
     */
    async connectedCallback() {
        if (this.innerHTML) {
            this.text = this.innerHTML;
        }

        setTimeout(() => {
            if (this.hasAttribute('src')) {
                this.src = this.getAttribute('src');
            }
        });

        this.shadow.appendChild(this.html.div);

        if (!this.id) {
            this.id = uuidv4();
        }

        if (this.hasAttribute('src')) this.src = this.getAttribute('src');
        this.dispatchEvent(
            new CustomEvent(`${this.id}-ready`, {
                bubbles: true,
                composed: true,
            }),
        );
    }

    /** @type {string} icon URL */
    get src() {
        return this.html.img.src;
    }

    set src(value) {
        this.loadImage(value);
        if (this.text) this.setAttribute('text-overlay', true);
    }

    /** @type {("small"|"medium"|"large"|null)} button size */
    get size() {
        return this.getAttribute('size');
    }

    set size(value) {
        if (value) {
            this.setAttribute('size', value);
        } else {
            this.removeAttribute('size');
        }
    }

    /** @type {("circle"|"square"|"rounded"|null)} button shape */
    get shape() {
        return this.getAttribute('shape');
    }

    set shape(value) {
        if (value) {
            this.setAttribute('shape', value);
        } else {
            this.removeAttribute('shape');
        }
    }

    /** @type {boolean} whether button is active */
    get active() {
        return this.hasAttribute('active');
    }

    set active(value) {
        if (value) {
            this.setAttribute('active', '');
        } else {
            this.removeAttribute('active');
        }
    }

    /** @type {boolean} whether button is disabled */
    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(value) {
        if (value) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    /** @type {boolean} border visibility */
    get showborder() {
        return this.hasAttribute('showborder');
    }

    set showborder(value) {
        if (value) {
            this.setAttribute('showborder', '');
        } else {
            this.removeAttribute('showborder');
        }
    }

    /** @type {string} unique identifier */
    get id() {
        return this.getAttribute('id');
    }

    set id(value) {
        if (value) {
            this.setAttribute('id', value);
        } else {
            this.removeAttribute('id');
        }
    }

    /** @type {string} tooltip text */
    get title() {
        return this.getAttribute('title');
    }

    set title(value) {
        if (value) {
            this.setAttribute('title', value);
        } else {
            this.removeAttribute('title');
        }
    }

    /** @type {string} button label text */
    get text() {
        return this.html.span.textContent;
    }

    set text(value) {
        if (value) {
            this.html.span.textContent = value;
            this.setAttribute('contains-text', true);
        } else {
            this.html.span.textContent = '';
            this.removeAttribute('contains-text');
        }
    }

    /**
     * Load an image into the button.
     * @param {string} src - The image url
     */
    loadImage(src) {
        if (src) {
            this.html.img.src = src;
            this.html.img.onload = () => this.html.img.classList.add('loaded');
        }
    }

    /**
     * Default click handler. Toggles `active` state if `[toggle]` attr is set.
     */
    onClick = () => {
        if (this.hasAttribute('toggle')) {
            this.active = !this.active;
        }
    };

    /**
     * Override `addEventListener` to keep track of listeners for cleanup.
     */
    addEventListener(type, listener, option) {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, []);
        }
        this.eventListeners.get(type).push({
            listener: listener,
            option: option,
        });

        super.addEventListener(type, listener, option);
    }

    /**
     * Remove all registered listeners of a given type.
     * @param {string} type - event type
     */
    removeEventListeners(type) {
        if (this.eventListeners.has(type)) {
            this.eventListeners.get(type).forEach(el => {
                super.removeEventListener(type, el.listener);
            });
            this.eventListeners.delete(type);
        }
    }
}

if (!customElements.get('ge-button'))
    customElements.define('ge-button', GeButton);
