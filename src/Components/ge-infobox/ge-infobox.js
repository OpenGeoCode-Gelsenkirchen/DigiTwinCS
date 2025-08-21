import styles from './ge-infobox.css?raw';
import template from './ge-infobox.html?raw';

/**
 * `<ge-infobox>` - A contextual information box component.
 *
 * Provides a titled container with a table of key-value data pairs
 * and a close button. Useful for showing metadata or details about
 * a selected object in a UI (e.g. when clicking on a map item).
 *
 * The box can be shown/hidden by toggling the `show` property
 * (which reflects via the `visible` attribute).
 *
 * @summary
 * Information container with title, details table, and close action.
 *
 * @example
 * ```
 * <ge-infobox></ge-infobox>
 *
 * <script>
 *   const infobox = document.querySelector("ge-infobox");
 *   infobox.title = "Satellite Info";
 *   infobox.table = [
 *     ["Name", "Sentinel-2A"],
 *     ["Orbit", "Sun-synchronous"],
 *     ["Launch", "2015"]
 *   ];
 *   infobox.show = true;
 * </script>
 * ```
 *
 * @property {string} title - Title text rendered at the top of the box.
 * @property {[string,string][]} table - Key/value rows rendered in a table (array of tuples).
 * @property {boolean} show - Flag controlling visibility (`true` adds `visible` attr).
 *
 * @method clear() - Clears the infobox by resetting the title and table.
 *
 */
export class GeInfobox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
          <style>${styles}</style>
          ${template}
        `;

        this.html = {
            wrapper: this.shadowRoot?.querySelector('.wrapper'),
            title: this.shadowRoot?.querySelector('.title'),
            close: this.shadowRoot?.querySelector('.close'),
            tableWrapper: this.shadowRoot?.querySelector('.table-wrapper'),
        };

        // Close button behavior
        this.html.close?.addEventListener('click', () => {
            this.show = false;
        });
    }

    /** @type {string} Title text displayed above table */
    set title(value) {
        if (this.html.title) this.html.title.innerText = value;
    }

    /**
     * Populate the table from a set of key/value pairs.
     * Replaces any existing table.
     *
     * @type {[string, string][]}
     */
    set table(object) {
        const oldTable = this.html.wrapper?.querySelector('table');
        oldTable?.remove();

        const newTable = document.createElement('table');

        for (const [key, value] of object) {
            const row = document.createElement('tr');

            const header = document.createElement('th');
            header.innerText = key;

            const data = document.createElement('td');
            data.innerText = value;

            row.append(header, data);
            newTable.appendChild(row);
        }

        this.html.tableWrapper?.appendChild(newTable);
    }

    /**
     * Display / hide the infobox.
     * When true, sets the `visible` attribute.
     */
    set show(value) {
        if (value) {
            this.setAttribute('visible', true);
        } else {
            this.removeAttribute('visible');
        }
    }

    /**
     * Reset infobox content (clears title and table).
     */
    clear() {
        this.title = '';
        this.table = [];
    }
}

customElements.define('ge-infobox', GeInfobox);
