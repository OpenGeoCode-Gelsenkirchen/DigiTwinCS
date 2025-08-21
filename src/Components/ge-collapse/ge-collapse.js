import {uuidv4} from '../../Core/utilities.js';
import '../ge-button/ge-button.js';
import content from './ge-collapse-content.html?raw';
import styles from './ge-collapse.css?raw';
import template from './ge-collapse.html?raw';

/**
 * `<ge-collapse>` - A collapsible/toggleable container with a trigger button.
 *
 * Provides a button (internally rendered as `<ge-button>`) that toggles
 * a collapsible content area.
 * Content is parsed from the `content` HTML fragment provided, and
 * positioned dynamically relative to the button based on `position` and `direction`.
 *
 * @summary
 * Collapsible container with toggle button, animated collapse/expand,
 * and configurable orientation/position.
 *
 * @example
 * ```
 * <ge-collapse
 *   src="./icons/settings.svg"
 *   position="front"
 *   direction="column"
 * >
 *   <!-- optional slot content -->
 * </ge-collapse>
 * ```
 *
 * @fires [id]-ready - Fired after component initialization and rendering is complete.
 *
 * @slot - One slot-like content area is provided, populated from the `content` HTML fragment.
 */
export class GeCollapse extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        /** @type {number} delay in ms for collapse/expand animations */
        this.delay = 250;

        /** @type {number} spacing in pixels converted from rem */
        this.gap = this.remToPixels(0.4);

        this.html = {
            /** @type {GeButton} toggle button */
            button: this.shadow.querySelector('ge-button'),

            /** @type {HTMLDivElement} container for expandable content */
            div: this.shadow.querySelector('#items'),
        };

        // parse provided "content" HTML (assumes template var or injected string)
        this.html.content = new DOMParser()
            .parseFromString(content, 'text/html')
            .querySelector('div');

        this.html.button.id = uuidv4();
        this.html.button.addEventListener('click', () => {
            this.collapsed = !this.collapsed;
        });

        // collapse on outside clicks bubbling up
        this.addEventListener('click', this.bubbleClick);
    }

    /**
     * Lifecycle method invoked when component is added to DOM.
     * Initializes button attributes, sets up listeners, ensures ID,
     * and dispatches `[id]-ready` event.
     */
    async connectedCallback() {
        this.src = this.getAttribute('src');

        this.shadow.appendChild(this.html.button);
        this.shadow.append(this.html.div);

        this.html.button.addEventListener(
            `${this.html.button.id}-ready`,
            () => {
                this.html.button.shape = 'square';
                this.html.button.size = 'small';
            },
        );

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
    }

    /** @type {string} icon source URL for trigger button */
    get src() {
        return this.getAttribute('src');
    }
    set src(value) {
        if (value) {
            this.setAttribute('src', value);
            this.html.button.setAttribute('src', value);
        } else {
            this.removeAttribute('src');
            this.html.button.removeAttribute('src');
        }
    }

    /** @type {string} expansion position relative to button */
    get position() {
        return this.getAttribute('position');
    }
    set position(value) {
        if (value) {
            this.setAttribute('position', value);
        } else {
            this.removeAttribute('position');
        }
    }

    /** @type {string} expansion direction: 'row' or 'column' */
    get direction() {
        return this.getAttribute('direction');
    }

    set direction(value) {
        if (value) {
            this.setAttribute('direction', value);
        } else {
            this.removeAttribute('direction');
        }
    }

    /** @type {boolean} collapsed state */
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
     * Handle outside clicks that bubble up; collapses if click
     * was not on this element.
     */
    bubbleClick(event) {
        let target = event.target.parentElement;
        while (target !== this && target !== null) {
            target = target.parentElement;
        }
        if (target !== this) {
            return;
        }
        this.collapsed = true;
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

    /**
     * Get relative x/y position of an element.
     * @param {HTMLElement} element
     * @returns {{x:number,y:number}} pixel offsets
     */
    getElementRelativePosition(element) {
        return {
            x: element.offsetLeft,
            y: element.offsetTop,
        };
    }

    /**
     * Add content DOM into expandable container.
     */
    addContent() {
        if (!this.html.div.contains(this.html.content)) {
            this.html.div.append(this.html.content);
        }
        this.updateSlotPosition();
    }

    /**
     * Compute updated slot position based on button + content bounding boxes.
     */
    updateSlotPosition() {
        const pos = this.getElementRelativePosition(this.html.button);
        const btnRect = this.html.button.getBoundingClientRect();
        const divRect = this.html.content.getBoundingClientRect();

        if (this.position === 'front') {
            if (this.direction === 'row') {
                pos.x += btnRect.width + this.gap;
            } else {
                pos.y += btnRect.height + this.gap;
            }
        } else {
            if (this.direction === 'row') {
                pos.x -= divRect.width + this.gap;
            } else {
                pos.y -= divRect.height + this.gap;
            }
        }

        this.html.div.style.top = `${pos.y}px`;
        this.html.div.style.left = `${pos.x}px`;
    }
}

if (!customElements.get('ge-collapse'))
    customElements.define('ge-collapse', GeCollapse);
