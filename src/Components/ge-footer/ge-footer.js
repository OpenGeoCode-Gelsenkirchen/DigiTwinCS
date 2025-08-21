import styles from './ge-footer.css?raw';
import template from './ge-footer.html?raw';

/**
 * `<ge-footer>` - A layout container for a page/application footer,
 * divided into three sections: left, middle, and right.
 *
 * Content for each section can be provided by targeting the slots
 * or by directly manipulating the `.left`, `.mid`, `.right` elements.
 *
 * @summary
 * Simple footer layout with three alignable regions.
 *
 * @example
 * ```
 * <ge-footer>
 *   <div slot="left">© 2025 My Company</div>
 *   <div slot="mid">Status: Connected</div>
 *   <div slot="right">
 *     <a href="/impressum">Impressum</a>
 *   </div>
 * </ge-footer>
 * ```
 *
 *
 * @slot left - Slot for content placed in the left side of the footer.
 * @slot mid - Slot for content placed in the middle of the footer.
 * @slot right - Slot for content placed in the right side of the footer.
 */
export class GeFooter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
          <style>${styles}</style>
          ${template}
        `;

        this.html = {
            /** Left area of footer */
            left: this.shadowRoot.querySelector('.left'),
            /** Mid area of footer */
            mid: this.shadowRoot.querySelector('.mid'),
            /** Right area of footer */
            right: this.shadowRoot.querySelector('.right'),
        };
    }
}

customElements.define('ge-footer', GeFooter);
