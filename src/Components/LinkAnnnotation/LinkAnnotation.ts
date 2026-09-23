import type {LinkAnnotationData} from '../../Core/Annotations/AnnotationLoader';
import type {Annotation} from '../../Core/Annotations/ClusterAnnotation';
import {IconCache} from '../../Core/IconCache';
import {mustQuery} from '../utils';
import styles from './LinkAnnotation.css?raw';
import html from './LinkAnnotation.html?raw';

/**
 * Shared shadow-DOM template for {@link LinkAnnotation} instances.
 *
 * @remarks
 * The component stylesheet and markup are imported as raw strings. The
 * template content is cloned into each annotation instance during construction.
 */
const template = document.createElement('template');
template.innerHTML = `<style>${styles}</style>${html}`;

/**
 * A screen-space annotation that presents a name, a hyperlink, and a close
 * control.
 *
 * @remarks
 * This component implements {@link Annotation} for {@link LinkAnnotationData}.
 * Its positioning, visibility, clustering, and lifecycle are managed by the
 * surrounding annotation system. The component itself is responsible only for
 * rendering its link-specific content and emitting a `close` event.
 *
 * The `close` event bubbles and is composed, allowing a listener outside the
 * shadow root to remove or hide the corresponding annotation.
 *
 * @example
 * ```ts
 * const annotation = document.createElement(
 *   'link-annotation',
 * ) as LinkAnnotation;
 *
 * annotation.data = {
 *   name: 'Project documentation',
 *   url: 'https://example.com/docs',
 *   linkText: 'Open documentation',
 * };
 *
 * annotation.addEventListener('close', () => {
 *   annotation.remove();
 * });
 * ```
 */
export class LinkAnnotation
    extends HTMLElement
    implements Annotation<LinkAnnotationData>
{
    /**
     * Open shadow root containing the annotation's encapsulated markup and styles.
     */
    private _root = this.attachShadow({mode: 'open'});

    /**
     * Cached references to required elements in the component shadow DOM.
     */
    private _html: {
        close: HTMLButtonElement;
        closeImg: HTMLImageElement;
        name: HTMLHeadingElement;
        link: HTMLLinkElement;
    };

    /**
     * Shared icon cache used to retrieve the close-button icon.
     */
    private _iconCache = IconCache.shared;

    /**
     * Updates all visible annotation fields from link annotation data.
     *
     * @param data - Link annotation content to display.
     *
     * @remarks
     * When `linkText` is omitted, the URL itself is used as the visible link
     * label.
     */
    set data(data: LinkAnnotationData) {
        this.name = data.name;
        this.link = data.url;
        this.linkText = data.linkText ?? data.url;
    }

    set name(value: string) {
        this._html.name.textContent = value;
    }

    set link(value: string) {
        this._html.link.href = value;
    }

    set linkText(value: string) {
        this._html.link.textContent = value;
    }

    /**
     * Creates the annotation shadow DOM, resolves template elements, and installs
     * the close-button event handler.
     */
    constructor() {
        super();
        this._root.appendChild(template.content.cloneNode(true));
        this._html = {
            close: mustQuery<HTMLButtonElement>(this._root, '#close'),
            closeImg: mustQuery<HTMLImageElement>(this._root, '#close-img'),
            name: mustQuery<HTMLHeadingElement>(this._root, '#name'),
            link: mustQuery<HTMLLinkElement>(this._root, '#link'),
        };

        this._html.close.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('close', {
                    bubbles: true,
                    composed: true,
                }),
            );
        });
    }

    /**
     * Retrieves and installs the close-button icon from the shared icon cache.
     */
    private async _applyIcons() {
        const img = await this._iconCache.get('close');
        if (img) this._html.closeImg.replaceWith(img);
    }

    async connectedCallback() {
        this._applyIcons();
    }
}

customElements.define('link-annotation', LinkAnnotation);
