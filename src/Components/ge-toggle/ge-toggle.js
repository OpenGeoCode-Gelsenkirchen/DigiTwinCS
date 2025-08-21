import styles from './ge-toggle.css?raw';
import template from './ge-toggle.html?raw';

/**
 * `<ge-toggle>` – A UI toggle switch (checkbox) web component.
 *
 * This component wraps a styled `<input type="checkbox">` and provides
 * a single `checked` property to control the toggle state.
 * All changes to the state (either user action or property set) are reflected
 * immediately in the UI.
 *
 * When toggled, the component emits a bubbling, composed `change` event
 * with the new checked state in the `detail` property.
 *
 * @summary
 * Accessible toggle switch component with programmatic and user interaction support.
 *
 * @example
 * ```
 * <ge-toggle></ge-toggle>
 *
 * <script>
 *   const toggle = document.querySelector('ge-toggle');
 *   toggle.addEventListener('change', e => {
 *     console.log('Toggle state:', e.detail.checked);
 *   });
 *   // Set state programmatically
 *   toggle.checked = true;
 * </script>
 * ```
 *
 * @fires change - Dispatched when the toggle state changes.
 * @property {object} detail
 * @property {boolean} detail.checked - The updated checked state.
 *
 * @property {boolean} checked - The component's checked state.
 *
 */
export class GeToggle extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});

        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
                <style>${styles}</style>
                ${template}
            `;
        }

        this.html = {
            toggle: this.shadowRoot?.querySelector('input'),
        };

        // Emit bubbling/composed change event with new state on user interaction
        this.html.toggle?.addEventListener('change', e => {
            this.dispatchEvent(
                new CustomEvent('change', {
                    detail: {
                        checked: e.target.checked,
                    },
                    bubbles: true,
                    composed: true,
                }),
            );
        });
    }

    /** Set the checked state (updates toggle position) */
    set checked(value) {
        if (this.html.toggle) this.html.toggle.checked = value;
    }

    get checked() {
        return this.html?.toggle?.checked;
    }
}

customElements.define('ge-toggle', GeToggle);
