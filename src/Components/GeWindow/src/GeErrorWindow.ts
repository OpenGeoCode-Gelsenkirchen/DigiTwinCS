import {uuidv4} from '../../../Core/utilities';
import {GeWindow, type GeWindowOptions} from './GeWindow';

/**
 * A {@link GeWindow} variant for error messages.
 *
 * @remarks
 * Error, warning, and information windows currently use separate custom
 * element classes even though their behavior is largely identical.
 *
 * They may be consolidated into a `variant`-based `GeWindow` implementation
 * if future requirements require dynamic window variants or reduce repeated
 * maintenance.
 */
export class GeErrorWindow extends GeWindow {
    /**
     * Creates a configured error window without appending it to the document.
     *
     * @param id - DOM ID assigned to the error window.
     * @param options - Initial title, subtitle, message, and close callback.
     * @returns A configured `ge-error-window` element.
     *
     * @remarks
     * Call {@link show} on the returned element to display it.
     */
    static override create(
        id: string = uuidv4(),
        options: GeWindowOptions = {},
    ): GeErrorWindow {
        const el = document.createElement('ge-error-window') as GeErrorWindow;
        el.id = id;
        el.configure(options);
        return el;
    }

    constructor() {
        super();
    }

    /**
     * Installs the error icon and applies error-specific styling.
     */
    connectedCallback(): void {
        super.connectedCallback?.();
        const img = document.createElement('img');
        img.src = './images/common/warning.svg';

        this._refs.imgPlaceholder.replaceWith(img);

        this._refs.window.classList.add('window-error');
        this._refs.windowHeader.classList.add('window__header-error');
        this._refs.message.classList.add('window__message-error');
    }
}

if (!customElements.get('ge-error-window'))
    window.customElements.define('ge-error-window', GeErrorWindow);
