import {mustQuery} from '../../utils.js';
import template from '../html/GeWindow.html?raw';
import styles from '../style/GeWindow.css?raw';
import {uuidv4} from './../../../Core/utilities';

/**
 * Duration, in milliseconds, of the fade-out transition before a window is
 * removed from the document.
 */
const TRANSITION_TIME = 500;

/**
 * Cached references to required elements in a {@link GeWindow} shadow root.
 */
type Refs = {
    window: HTMLDivElement;
    windowHeader: HTMLDivElement;
    titleRow: HTMLDivElement;
    imgPlaceholder: HTMLDivElement;
    title: HTMLHeadingElement;
    closeBtn: HTMLButtonElement;
    subtitle: HTMLSpanElement;
    messageDiv: HTMLDivElement;
    message: HTMLSpanElement;
};

/**
 * Optional content and behavior supplied while creating or configuring a
 * {@link GeWindow}.
 */
export interface GeWindowOptions {
    title?: string;
    subtitle?: string;
    message?: string;
    closeCallback?: () => void;
}

/**
 * Base custom element for temporary application windows and dialogs.
 *
 * @remarks
 * The element is appended to `document.body` by {@link show} and fades in by
 * changing the opacity of its internal `.window` element. Calling {@link close}
 * starts the fade-out transition; {@link destroy} removes the custom element
 * after {@link TRANSITION_TIME}.
 *
 * Specialized variants, such as `GeErrorWindow` and `GeLoadingWindow`, extend
 * this class to replace the icon placeholder and apply semantic styling.
 *
 * @example
 * ```ts
 * const window = GeWindow.create(undefined, {
 *   title: 'Export complete',
 *   message: 'The 3D Tileset was exported successfully.',
 * });
 *
 * window.show(5);
 * ```
 */
export class GeWindow extends HTMLElement {
    /**
     * Retrieves an existing base-window instance by DOM ID.
     *
     * @param id - DOM ID of the window element.
     * @returns The matching {@link GeWindow}, or `null` if no matching
     * `ge-window` element exists.
     */
    static getInstance(id: string = '') {
        const instance = document.getElementById(id) as GeWindow;
        return instance instanceof GeWindow ? instance : null;
    }

    /**
     * Creates and configures a base window without appending it to the document.
     *
     * @param id - DOM ID assigned to the newly created window.
     * @param options - Initial text content and close behavior.
     * @returns A configured, detached `ge-window` element.
     *
     * @remarks
     * Call {@link show} to append the returned element to `document.body`.
     */
    static create(
        id: string = uuidv4(),
        options: GeWindowOptions = {},
    ): GeWindow {
        const el = document.createElement('ge-window') as GeWindow;
        el.id = id;
        el.configure(options);
        return el;
    }

    /**
     * Whether the window has been shown and has not yet been destroyed.
     *
     * @defaultValue false
     */
    public isShown: boolean = false;

    /**
     * Callback invoked when the built-in close button is clicked.
     */
    public closeCallback: () => void = () => {};

    /**
     * Opacity applied while the window is visible.
     *
     * @defaultValue 1
     *
     * @remarks
     * Subclasses can override this value, for example to render a loading overlay
     * with partial transparency.
     */
    public opacity: number = 1.0;

    /**
     * Timer used for automatic closing and deferred destruction.
     */
    private _timeout?: ReturnType<typeof setTimeout>;

    /**
     * Cached shadow-DOM references shared with specialized window subclasses.
     */
    protected _refs: Refs;

    /**
     * Creates the shadow DOM and resolves all required template elements.
     */
    constructor() {
        super();

        const root = this.attachShadow({mode: 'open'});

        root.innerHTML = `
            <style>${styles}</style>
            ${template}
        `;

        this._refs = {
            window: mustQuery<HTMLDivElement>(root, '.window'),
            windowHeader: mustQuery<HTMLDivElement>(root, '.window__header'),
            titleRow: mustQuery<HTMLDivElement>(root, '.window__title-row'),
            imgPlaceholder: mustQuery<HTMLDivElement>(
                root,
                '.window__img-placeholder',
            ),
            title: mustQuery<HTMLHeadingElement>(root, '.window__title'),
            closeBtn: mustQuery<HTMLButtonElement>(root, '.window__close-btn'),
            subtitle: mustQuery<HTMLSpanElement>(root, '.window__subtitle'),
            messageDiv: mustQuery<HTMLDivElement>(root, '.window__message-div'),
            message: mustQuery<HTMLSpanElement>(root, '.window__message'),
        };
    }

    /**
     * Updates text content and close behavior for this window.
     *
     * @param options - New window configuration.
     *
     * @remarks
     * Each call attaches another close-button listener. In normal usage,
     * `configure` should be called once immediately after creation, if `create` is not used. If repeated
     * configuration is required, bind the close listener once in the constructor
     * and let it read the current {@link closeCallback} property.
     */
    configure({
        title = '',
        subtitle = '',
        message = '',
        closeCallback = () => {},
    }: GeWindowOptions = {}) {
        this.closeCallback = closeCallback;
        this._refs.closeBtn.addEventListener('click', () => {
            this.closeCallback();
            this.close();
        });

        this.title = title;
        this.subtitle = subtitle;
        this.message = message;
    }

    /** Sets ARIA role if not set when attached */
    connectedCallback() {
        if (!this.hasAttribute('role')) this.setAttribute('role', 'dialog');
    }

    /**
     * Clears a pending auto-close or destruction timer when detached.
     */
    disconnectedCallback() {
        clearTimeout(this._timeout);
    }

    /**
     * Primary title displayed in the window header.
     */
    get title() {
        return this._refs.title.textContent ?? '';
    }

    set title(t: string) {
        if (this._refs.title) {
            this._refs.title.textContent = t;
        }
    }

    /**
     * Secondary title or explanatory text displayed by the window.
     */
    get subtitle() {
        return this._refs.subtitle.textContent ?? '';
    }

    set subtitle(st) {
        if (this._refs.subtitle) {
            this._refs.subtitle.textContent = st;
        }
    }

    /**
     * Main textual message displayed in the window body.
     */
    get message() {
        return this._refs.message.textContent ?? '';
    }

    set message(m) {
        if (this._refs.message) {
            this._refs.message.textContent = m;
        }
    }

    /**
     * Appends the window to the document and starts its fade-in transition.
     *
     * @param duration - Optional number of seconds before automatic closing.
     *
     * @remarks
     * Calling this method while the window is already shown has no effect.
     * Two nested animation frames allow the browser to render the initial opacity
     * before the visible opacity is applied, enabling CSS transitions.
     */
    show(duration?: number) {
        if (this.isShown) return;
        this.isShown = true;

        document.body.appendChild(this);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this._refs.window.style.opacity = `${this.opacity}`;
            });
        });

        if (duration) {
            this.setTimer(duration);
        }
    }

    /**
     * Schedules automatic closing after a duration in seconds.
     *
     * @param duration - Delay before {@link close} is called, in seconds.
     */
    setTimer(duration: number) {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            this.close();
        }, duration * 1000);
    }

    /**
     * Starts the fade-out transition and schedules element removal.
     *
     * @remarks
     * The window remains in the document until the transition delay expires.
     */
    close() {
        this._refs.window.style.opacity = '0';
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            this.destroy();
        }, TRANSITION_TIME);
    }

    /**
     * Cancels pending timers and removes the window from the document.
     */
    destroy() {
        clearTimeout(this._timeout);
        this.isShown = false;
        this.remove();
    }
}

if (!customElements.get('ge-window'))
    window.customElements.define('ge-window', GeWindow);
