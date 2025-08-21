import styles from './ge-grid.css?raw';
import template from './ge-grid.html?raw';

/**
 * `<ge-grid>` - A simple CSS grid container component.
 *
 * Provides a styled grid layout by encapsulating a `<div>` inside shadow DOM.
 * Consumers can append elements directly (imperatively) via `appendChild`,
 * or declaratively place children inside `<ge-grid>`.
 *
 * @summary
 * Basic grid layout component with slot/appendChild support.
 *
 * @example
 * ```
 * <ge-grid>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </ge-grid>
 * ```
 */
export class GeGrid extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;
        this.html = {
            grid: this.shadow.querySelector('div'),
        };
    }

    /**
     * Append a child node into the grid container.
     * @param {Node} node - DOM Node to be appended
     * @returns {Node|undefined} The appended node (if grid exists)
     */
    appendChild(node) {
        if (this.html.grid) {
            this.html.grid.appendChild(node);
        }
    }
}

if (!customElements.get('ge-grid')) customElements.define('ge-grid', GeGrid);
