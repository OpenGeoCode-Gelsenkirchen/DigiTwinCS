import styles from './ge-link-list.css?raw';
import template from './ge-link-list.html?raw';

/**
 * `<ge-link-list>` - A container component for rendering a list of links.
 *
 * It wraps a simple list (`.link-list`) that you can populate using
 * the `elements` property. Accepts either a single element or an array of elements.
 *
 * Typical use case: navigation menus, footer link collections, quick link panels.
 *
 * @summary
 * Wrapper for a set of link elements.
 *
 * @example
 * ```
 * <ge-link-list></ge-link-list>
 *
 * <script>
 *   const linkList = document.querySelector("ge-link-list");
 *
 *   const link1 = document.createElement("a");
 *   link1.href = "/about";
 *   link1.textContent = "About";
 *
 *   const link2 = document.createElement("a");
 *   link2.href = "/contact";
 *   link2.textContent = "Contact";
 *
 *   linkList.elements = [link1, link2];
 * </script>
 * ```
 *
 * @property {HTMLElement[]} elements - An array of anchor-like elements (<a>, <button>, etc.)
 *                                      managed inside the component. Setting it replaces content.
 *
 * @slot - Default slot is not used directly; instead `elements` property controls content.
 */
export class GeLinkList extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            /** @type {HTMLElement} inner <div> or list container */
            linkList: this.shadowRoot.querySelector('.link-list'),
        };
    }

    /**
     * Set the elements of the link list.
     * Accepts single element or array; normalizes into array.
     * Appends elements into shadow content.
     *
     * @param {HTMLElement|HTMLElement[]} list - One or multiple link elements
     */
    set elements(list) {
        this._elements = Array.isArray(list) ? list : [list];
        this._elements.forEach(e => {
            this.html.linkList.appendChild(e);
        });
    }

    /**
     * Get currently managed link elements.
     * @returns {HTMLElement[]} array of link elements
     */
    get elements() {
        return this._elements;
    }
}

customElements.define('ge-link-list', GeLinkList);
