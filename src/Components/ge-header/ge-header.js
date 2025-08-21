import DOMPurify from 'dompurify';
import styles from './ge-header.css?raw';
import template from './ge-header.html?raw';

// Security hook: Ensures sanitized external links always open securely
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    // set all elements owning target to target=_blank
    if ('target' in node) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener');
    }
});

/**
 * `<ge-header>` - A top-bar style header component with optional icon,
 * title, navigation link, and an extra slot for sanitized HTML content.
 *
 * The `extra` area can contain arbitrary HTML (social icons, links, status info),
 * but is sanitized via **DOMPurify** before being injected into the DOM.
 * All links in this area are rewritten to open in a new tab (`target="_blank" rel="noopener"`),
 * ensuring safety against reverse tabnabbing.
 *
 * @summary
 * Application header with optional logo/icon, clickable title link, text,
 * and a right-aligned "extra" content area.
 *
 * @example
 * ```
 * <ge-header></ge-header>
 *
 * <script>
 *   const header = document.querySelector("ge-header");
 *   header.url = "/home";
 *   header.icon = "/assets/logo.svg";
 *   header.text = "Geospatial App";
 *   header.extra = `
 *     <a href="https://example.com">Docs</a>
 *     <span>Status: Online</span>
 *   `;
 * </script>
 * ```
 */
export class GeHeader extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            url: this.shadowRoot?.querySelector('.url'),
            icon: this.shadowRoot?.querySelector('.icon'),
            title: this.shadowRoot?.querySelector('.title'),
            extra: this.shadowRoot?.querySelector('.extra'),
        };

        // hide the icon by default
        this.html.icon.style.display = 'none';
    }

    /** @type {string} sets the navigation URL for the header title link */
    set url(url) {
        if (this.html.url) {
            this.html.url.href = url;
        }
    }

    /** @type {string} source for the icon image (shown when set) */
    set icon(src) {
        if (this.html.icon) {
            this.html.icon.src = src;
            this.html.icon.style.display = 'block';
        }
    }

    get icon() {
        return this.html.icon ? this.html.icon.src : '';
    }

    /** @type {string} header title string */
    set text(value) {
        this.html.title.textContent = value;
    }

    get text() {
        return this.html.title ? this.html.title.textContent : '';
    }

    /**
     * Add sanitized HTML content (links, spans, icons…) into the "extra" section.
     * Uses DOMPurify to remove any unsafe elements/attributes.
     *
     * @type {string}
     */
    set extra(content) {
        if (this.html.extra) {
            this.html.extra.innerHTML = DOMPurify.sanitize(content);
        }
    }

    get extra() {
        this.html.extra ? this.html.extra.innerHTML : '';
    }
}

customElements.define('ge-header', GeHeader);
