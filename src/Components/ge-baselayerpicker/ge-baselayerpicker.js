import '../ge-button/ge-button.js';
import styles from './ge-baselayerpicker.css?raw';
import template from './ge-baselayerpicker.html?raw';

import {uuidv4} from '../../Core/utilities.js';

/**
 * `<ge-baselayerpicker>` - A custom Web Component that provides an interactive
 * UI for selecting and switching between different terrain, imagery base layers, stylings and so on.
 *
 * The component manages groups of selectable elements (typically basemap or terrain options)
 * and creates UI buttons (`<ge-button>`) with an image and tooltip for each.
 *
 * Each element in the picker is expected to include:
 * - `group {string}`: logical grouping (“basemaps”, “terrain”, etc.)
 * - `iconUrl {string}`: image used in the button
 * - `name {string}`: display label
 * - `tooltip {string}` (optional): hover text
 * - `callback {function}`: invoked when element is selected
 * - `index {string|number}`: unique id for tracking
 * - `switchable {boolean}`: if `true`, button toggles on/off
 * - `changeBackground {boolean}`: if `true`, makes picker button show this icon when active
 * - `active {boolean}`: initial active state
 *
 * @summary
 * Basemap/Terrain picker with grouped buttons and toggle behavior.
 *
 * @example
 * ```
 * <ge-baselayerpicker id="basemap-control">Basemaps</ge-baselayerpicker>
 * ```
 *
 * @fires terrain-change - Fired when a user selects or toggles a layer element
 * @property {object} detail - the element object passed into `addElement`
 *
 * @fires [id]-ready - A custom event fired after the component has initialized and rendered.
 * @property {string} id - The instance id of the component (auto-generated if no id is set).
 *
 */
export class GeBaseLayerPicker extends HTMLElement {
    constructor() {
        super();
        /** @type {Record<string, any>} currently active elements keyed by their index */
        this.activeElements = {};

        /** @type {Record<string, any[]>} grouped elements added via addElement */
        this.elements = {};

        /** @type {any[]} list of currently applied imagery layers (if synchronizing with Cesium) */
        this.currentImageryLayers = [];

        this.addEventListener('click', this.bubbleClick);

        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            button: this.shadow.querySelector('#main-btn'),
            div: this.shadow.querySelector('#items'),
            content: document.createElement('div'),
        };

        /** @type {boolean} collapsed state */
        this.collapsed = true;

        this.html.button.addEventListener('click', () => {
            this.collapsed = !this.collapsed;
        });
        this.html.content.id = 'content';

        /** @type {number} ms delay for collapse animations */
        this.delay = 250;

        /** @type {number} spacing (rem → px converted) */
        this.gap = this.remToPixels(0.4);

        this._onOutSideClick = e => {
            if (!this.contains(e.target)) {
                this.collapsed = true;
            }
        };
    }

    /**
     * Lifecycle callback → called when the element is connected to the DOM.
     * Sets up the label, assigns default id, attaches listeners and dispatches `-ready` event.
     */
    async connectedCallback() {
        this.title = this.textContent;
        this.html.button.text = this.textContent;

        if (!this.collapsed) {
            this.html.button.active = true;
            this.html.div.append(this.html.content);
        }

        if (!this.id) {
            this.id = uuidv4();
        }

        setTimeout(() => {
            this.shadow.host.setAttribute('loaded', '');
            if (!this.collapsed) {
                this.addContent();
            }
            this.dispatchEvent(new CustomEvent(`${this.id}-ready`, {}));
        }, 250);

        document.addEventListener('click', this._onOutSideClick);
    }

    /**
     * Lifecycle cleanup: remove event listeners when disconnected.
     */
    disconnectedCallback() {
        document.removeEventListener('click', this._onOutSideClick);
    }

    /** @type {string} The text label shown on the main button */
    get text() {
        return this.html.button.text;
    }

    set text(value) {
        if (this.html.button) {
            this.html.button.text = value;
        }
    }

    /** @type {string} The component title stored as attribute */
    get title() {
        return this.title;
    }

    set title(value) {
        this.setAttribute('title', value);
    }

    get src() {
        return this.html.button ? this.html.button.src : null;
    }

    /** @type {string|null} Image source (icon) of main button */
    set src(value) {
        this.html.button.src = value;
    }

    /** @type {boolean} Whether the dropdown is collapsed */
    get collapsed() {
        return this.hasAttribute('collapsed');
    }

    set collapsed(value) {
        this.html.button.active = !value;
        if (value) {
            this.setAttribute('collapsed', '');
            setTimeout(() => {
                this.html.content.remove();
            }, this.delay);
        } else {
            this.addContent();
            this.removeAttribute('collapsed');
        }
    }

    /**
     * Add an element to the picker.
     * Each element must contain `group`, `iconUrl`, `name`, `callback` at minimum.
     *
     * @param {object} element - the element definition to add
     * @throws {Error} if element is invalid
     */
    addElement(element) {
        if (!element) throw new Error('Not a valid element');
        if (!(element.group in this.elements)) {
            this.elements[element.group] = [];
        }
        this.elements[element.group].push(element);
        this.compose();
    }

    /**
     * Compose DOM groups & buttons based on current elements.
     * Creates per-group `<div>` containers, ge-buttons, and titles.
     */
    compose() {
        if (this.html.content) {
            this.html.content.replaceChildren();
            for (const group of Object.keys(this.elements)) {
                const htmlGroup = document.createElement('div');
                htmlGroup.classList.add('group');

                const title = document.createElement('span');
                title.classList.add('title');
                title.innerText = group;
                htmlGroup.appendChild(title);
                const elementGroup = document.createElement('div');
                elementGroup.classList.add('elementGroup');
                htmlGroup.appendChild(elementGroup);

                for (const element of this.elements[group]) {
                    const eleDiv = document.createElement('div');
                    eleDiv.classList.add('elementDiv');
                    const button = document.createElement('ge-button');
                    button.src = element.iconUrl;
                    button.shape = 'square';
                    button.size = 'medium';
                    button.title = element.tooltip || '';
                    button.setAttribute('showborder', true);
                    button.setAttribute('border-hover', true);
                    button.setAttribute('img-size', 'full');
                    button.addEventListener('click', () => {
                        if (button.active) return;
                        const state = button.active;
                        htmlGroup
                            .querySelectorAll('ge-button')
                            .forEach(btn => (btn.active = false));
                        if (element.switchable) {
                            button.active = !state;
                        } else {
                            button.active = true;
                        }

                        if (button.active) {
                            this.activeElements[element.index] = element;
                        }

                        if (element.changeBackground) {
                            this.html.button.src = element.iconUrl;
                        }
                        element.callback();
                        this.dispatchEvent(
                            new CustomEvent('terrain-change', {
                                detail: element,
                            }),
                        );
                        this.collapsed = true;
                    });
                    if (element.active) button.click();

                    const eleTitle = document.createElement('span');
                    eleTitle.classList.add('elementTitle');
                    eleTitle.innerText = element.name;

                    eleDiv.appendChild(button);
                    eleDiv.appendChild(eleTitle);

                    elementGroup.appendChild(eleDiv);
                }
                this.html.content.appendChild(htmlGroup);
            }
        }
        return;
    }

    /**
     * Append dynamic content (groups & buttons) to dropdown body.
     */
    addContent() {
        if (this.html.content) {
            this.html.div.appendChild(this.html.content);
        }
    }

    /**
     * Convert rem to pixels.
     * @param {number} rem - relative unit
     * @returns {number} pixel value
     */
    remToPixels(rem) {
        const rootFontSize = parseFloat(
            getComputedStyle(document.documentElement).fontSize,
        );
        return rem * rootFontSize;
    }
}

customElements.define('ge-baselayerpicker', GeBaseLayerPicker);
