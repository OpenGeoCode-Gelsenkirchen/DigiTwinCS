import styles from './ge-bar.css?raw';
import template from './ge-bar.html?raw';

/**
 * `<ge-bar>` - A flexible, stylable bar/container Web Component for layouting toolbars, sidebars etc.
 *
 *
 * @summary
 * A reusable, stylable bar element (e.g., for toolbars) based on Shadow DOM, with support for horizontal/vertical orientation
 * driven by the "direction" attribute.
 *
 * @example
 * <ge-bar direction="horizontal">
 *      <button>Save</button>
 *      <button>Open</button>
 * </ge-bar>
 *
 * @slot - Default slot for bar content.
 *
 * @attr {string} direction - Layout orientation ("horizontal", "vertical"). Reflects the bar direction
 */

export class GeBar extends HTMLElement {
    /**
     * Creates a new GeBar custom element with Shadow DOM and loaded styles/template.
     */
    constructor() {
        super();

        /**
         * @private
         * @type {ShadowRoot}
         */
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        /**
         * References to key elements inside the shadow DOM.
         * @private
         * @type {{div: HTMLDivElement, slot: HTMLSlotElement}}
         */
        this.html = {
            div: this.shadowRoot.querySelector('div'),
            slot: this.shadowRoot.querySelector('slot'),
        };
    }

    /**
     * Gets the bar's direction ("horizontal", "vertical").
     * @returns {string|null}
     */
    get direction() {
        return this.getAttribute('direction');
    }

    /**
     * Sets the bar's direction ("horizontal", "vertical").
     * @param {string} value
     */
    set direction(value) {
        if (value) {
            this.setAttribute('direction', value);
        } else {
            this.removeAttribute('direction');
        }
    }
}

if (!customElements.get('ge-bar')) customElements.define('ge-bar', GeBar);
