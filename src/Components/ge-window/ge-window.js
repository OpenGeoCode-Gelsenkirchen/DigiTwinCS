import {uuidv4} from '../../Core/utilities.js';
import styles from './ge-window.css?raw';
import template from './ge-window.html?raw';

/**
 * `<ge-window>` – Floating window/dialog component for messages, notifications, or pop-up content.
 *
 * Provides a consistent modal window layout with customizable title, subtitle, content,
 * and a close button. Can be programmatically appended, timed, and closed/destroyed.
 *
 * Specialized windows can be created by extending this class (see below).
 *
 * @summary
 * Modal dialog/window component with slots for title, subtitle, and content.
 *
 * @example
 * ```
 * // Create and show an info window for 5 seconds
 * const win = new GeWindow({
 *   id: 'info',
 *   title: 'Information',
 *   subtitle: 'Did you know?',
 *   content: 'You can use <ge-window> anywhere!'
 * });
 * win.apply(5); // show for 5 seconds
 * ```
 *
 * @param {object} [options]
 * @param {string} [options.id] - Unique id for this window element (used for singleton logic)
 * @param {string} [options.title] - HTML for window title
 * @param {string} [options.subtitle] - HTML for window subtitle, below the title
 * @param {string} [options.content] - HTML/text for window content area
 *
 *
 * @property {string} title - Current HTML for window title
 * @property {string} subtitle - Subtitle text/HTML shown below the title
 * @property {string} content - Content HTML/text string inside the window body
 *
 * @method apply(duration?: number) - Appends window to body (visible), optional auto-close duration in seconds.
 * @method close() - Animate out and destroy the window.
 * @method setTimer(duration: number) - Internal: triggers close after duration seconds.
 * @method destroy() - Removes window from DOM.
 *
 * @slot title - Optional slot for custom title
 * @slot subtitle - Optional slot for subtitle
 * @slot content - Optional main content slot
 */
class GeWindow extends HTMLElement {
    /**
     * Construct a new window (or return existing instance if id is already present in DOM).
     * @param {object} [options]
     * @param {string} [options.id]
     * @param {string} [options.title]
     * @param {string} [options.subtitle]
     * @param {string} [options.content]
     */
    constructor({
        id: id = '',
        title: title = '',
        subtitle: subtitle = '',
        content: content = '',
    } = {}) {
        super();
        // Singleton: if one already present by ID, return it
        const instance = document.getElementById(id);
        if (instance) {
            return instance;
        }

        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.closeButton = this.shadow.querySelector('.close-btn');
        this.closeButton.addEventListener('click', () => this.close());
        this.id = 'init';

        this.html = {
            window: this.shadow.querySelector('.window'),
            windowTitle: this.shadow.querySelector('.window-title'),
            windowTitleWrapper: this.shadow.querySelector(
                '.window-title-wrapper',
            ),
            windowSubtitle: this.shadow.querySelector('.window-subtitle'),
            windowContent: this.shadow.querySelector('.window-content'),
        };

        this.id = id;
        this.title = title;
        this.subtitle = subtitle;
        this.content = content;
    }

    /** Sets ARIA role if not set when attached */
    async connectedCallback() {
        if (!this.hasAttribute('role')) this.setAttribute('role', 'dialog');
    }

    /**
     * Appends the window to the body and shows it.
     * If `duration` is provided, window auto-closes after X seconds.
     * @param {number} [duration] - Auto-close duration in seconds
     */
    apply(duration) {
        document.body.appendChild(this);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.html.window.style.opacity = 1;
            });
        });
        if (duration) {
            this.setTimer(duration);
        }
    }

    /** Internal: Set timer to close the window in N seconds */
    setTimer(duration) {
        setTimeout(() => {
            this.close();
        }, duration * 1000);
    }

    /** Animate out, then destroy the window */
    close() {
        this.html.window.style.opacity = 0;
        setTimeout(() => {
            this.destroy();
        }, 500);
    }

    /** @type {string} */
    get id() {
        return this.getAttribute('id');
    }
    set id(id) {
        this.setAttribute('id', id);
    }

    /** @type {string} */
    get title() {
        return this._title;
    }

    set title(t) {
        if (this.title) {
            this._title.innerHTML = t;
        } else {
            const title = document.createElement('span');
            title.slot = 'title';
            title.innerHTML = t;
            this.html.windowTitle.insertBefore(title, this.closeButton);
            this._title = title;
        }
    }

    /** @type {string} */
    get subtitle() {
        return this._subtitle;
    }

    set subtitle(st) {
        if (this.subtitle) {
            this._subtitle.innerHTML = st;
        } else {
            const subtitle = document.createElement('span');
            subtitle.slot = 'subtitle';
            subtitle.innerHTML = st;
            this.html.windowSubtitle.appendChild(subtitle);
            this._subtitle = subtitle;
        }
    }

    /** @type {string} */
    get content() {
        return this._content;
    }

    set content(c) {
        if (this.content) {
            this._content.innerHTML = c;
        } else {
            const content = document.createElement('div');
            content.slot = 'content';
            content.innerText = c;
            this.html.windowContent.appendChild(content);
            this._content = content;
        }
    }

    /** Removes the window from the DOM */
    destroy() {
        this.remove();
    }
}

if (!customElements.get('ge-window'))
    window.customElements.define('ge-window', GeWindow);

/**
 * `<error-ge-window>` – Modal window with error styling for error messages.
 *
 * Extends `<ge-window>` and applies dedicated CSS classes.
 *
 * @summary
 * Specialized error variant of `<ge-window>`.
 */
export class ErrorGeWindow extends GeWindow {
    constructor({id = '', title = '', subtitle = '', content = ''} = {}) {
        super({id, title, subtitle, content});

        this.shadow.querySelector('.window').classList.add('error-window');
        this.shadow
            .querySelector('.window-header')
            .classList.add('error-window-header');
        this.shadow
            .querySelector('.window-content')
            .classList.add('error-window-content');
    }
}

if (!customElements.get('error-ge-window'))
    window.customElements.define('error-ge-window', ErrorGeWindow);

/**
 * `<warning-ge-window>` – Modal window with warning styling and an SVG icon.
 *
 * Extends `<ge-window>` and uses dedicated warning CSS classes
 * and an inline warning image.
 *
 * @summary
 * Specialized warning variant of `<ge-window>`.
 */
export class WarningGeWindow extends GeWindow {
    constructor({id = '', title = '', subtitle = '', content = ''} = {}) {
        super({id, title, subtitle, content});

        this.img = document.createElement('img');
        this.img.src = './images/common/warning.svg';
        this.shadow.getElementById('img-placeholder').replaceWith(this.img);
        this.shadow.querySelector('.window').classList.add('warning-window');
        this.shadow
            .querySelector('.window-header')
            .classList.add('warning-window-header');
        this.shadow
            .querySelector('.window-content')
            .classList.add('warning-window-content');
    }
}

if (!customElements.get('warning-ge-window'))
    window.customElements.define('warning-ge-window', WarningGeWindow);

/**
 * `<information-ge-window>` – Modal window with info styling and info SVG icon.
 *
 * Extends `<ge-window>` with info styling and an information icon.
 *
 * @summary
 * Specialized info variant of `<ge-window>`.
 */
export class InformationGeWindow extends GeWindow {
    constructor({
        id: id = uuidv4(),
        title: title,
        subtitle: subtitle,
        content: content,
    } = {}) {
        super({id, title, subtitle, content});

        this.img = document.createElement('img');
        this.img.src = './images/common/information.svg';
        this.img.id = 'img-placeholder';
        this.shadow.getElementById('img-placeholder').replaceWith(this.img);

        this.shadow
            .querySelector('.window')
            .classList.add('information-window');
        this.shadow
            .querySelector('.window-header')
            .classList.add('information-window-header');
        this.shadow
            .querySelector('.window-content')
            .classList.add('information-window-content');
    }
}

if (!customElements.get('information-ge-window'))
    window.customElements.define('information-ge-window', InformationGeWindow);
