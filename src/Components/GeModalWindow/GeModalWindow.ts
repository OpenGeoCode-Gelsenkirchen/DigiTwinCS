import {default as createDOMPurify} from 'dompurify';
import styles from './GeModalWindow.css?raw';
import html from './GeModalWindow.html?raw';

/**
 * DOMPurify instance bound to the browser window.
 *
 * @remarks
 * This instance sanitizes HTML assigned to {@link GeModalWindow.html} before
 * the content is inserted into the component's shadow DOM.
 */
const purify = createDOMPurify(window);

/**
 * DOMPurify policy for modal body content.
 *
 * @remarks
 * The policy intentionally permits a restricted set of structural, text-format,
 * list, link, and image elements. The sanitizer returns a `DocumentFragment`,
 * which can be inserted directly via `replaceChildren`.
 *
 * Allowing inline `style` attributes may be necessary for trusted formatting
 * requirements, but it expands the supported HTML surface. Remove `style` from
 * `ALLOWED_ATTR` if inline presentation is not required.
 */
const CFG = {
    ALLOWED_TAGS: [
        'h1',
        'h2',
        'p',
        'br',
        'strong',
        'em',
        'ul',
        'ol',
        'li',
        'a',
        'img',
        'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style'],
    RETURN_DOM_FRAGMENT: true,
};

/**
 * Retrieves a required descendant element from a DOM root.
 *
 * @typeParam T - Expected type of the matched element.
 * @param root - DOM root to search.
 * @param selector - CSS selector that identifies the required element.
 * @returns The matching element.
 * @throws {Error} Thrown when no element matches `selector`.
 */
function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`Missing element: ${selector}`);
    return el as T;
}

/**
 * Shared shadow-DOM template for {@link GeModalWindow} instances.
 */
const template = document.createElement('template');
template.innerHTML = `<style>${styles}</style>${html}`;

/**
 * A shadow-DOM custom element that displays sanitized HTML within a modal
 * window layout.
 *
 * @remarks
 * Assigning {@link html} removes all existing modal body nodes and replaces
 * them with a DOMPurify-sanitized document fragment. This prevents arbitrary
 * input markup from being inserted directly into the DOM.
 *
 * This component provides the modal content container only. Opening, closing,
 * positioning, focus management, Escape-key handling, and focus trapping must
 * be implemented by the surrounding modal controller or component markup.
 *
 * @example
 * ```ts
 * const modal = document.querySelector('modal-window') as GeModalWindow;
 *
 * modal.html = `
 *   <h2>Import completed</h2>
 *   <p>The model has been added to the scene.</p>
 * `;
 * ```
 */
export class GeModalWindow extends HTMLElement {
    /**
     * Shadow-DOM container that receives sanitized modal content.
     */
    private _html: HTMLElement;

    /**
     * Replaces the modal body with sanitized HTML.
     *
     * @param value - Potentially untrusted HTML markup to display.
     *
     * @remarks
     * DOMPurify removes markup, attributes, and URI values that do not comply
     * with {@link CFG}. The resulting `DocumentFragment` is inserted as DOM
     * nodes rather than assigned through `innerHTML`.
     */
    set html(value: string) {
        const frag = purify.sanitize(value, CFG) as unknown as DocumentFragment;
        this._html.replaceChildren(frag);
    }

    /**
     * Creates the shadow DOM and retrieves the modal content container.
     */
    constructor() {
        super();

        const root = this.attachShadow({mode: 'open'});
        root.appendChild(template.content.cloneNode(true));

        this._html = mustQuery<HTMLElement>(root, '.html');
    }
}

customElements.define('modal-window', GeModalWindow);
