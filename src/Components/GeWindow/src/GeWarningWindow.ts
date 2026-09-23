import {uuidv4} from '../../../Core/utilities';
import {GeWindow, type GeWindowOptions} from './GeWindow';

/**
 * A {@link GeWindow} variant for warning messages.
 *
 * @remarks
 * Error, warning, and information windows currently use separate custom
 * element classes even though their behavior is largely identical.
 *
 * They may be consolidated into a `variant`-based `GeWindow` implementation
 * if future requirements require dynamic window variants or reduce repeated
 * maintenance.
 */
export class GeWarningWindow extends GeWindow {
    /**
     * Creates a configured warning window without appending it to the document.
     *
     * @param id - DOM ID assigned to the warning window.
     * @param options - Initial title, subtitle, message, and close callback.
     * @returns A configured `ge-warning-window` element.
     *
     * @remarks
     * Call {@link show} on the returned element to display it.
     */
    static override create(
        id: string = uuidv4(),
        options: GeWindowOptions = {},
    ): GeWarningWindow {
        const el = document.createElement(
            'ge-warning-window',
        ) as GeWarningWindow;
        el.id = id;
        el.configure(options);
        return el;
    }

    constructor() {
        super();
    }

    /**
     * Installs the warning icon and applies warning-specific styling.
     */
    connectedCallback(): void {
        super.connectedCallback?.();
        const img = document.createElement('img');
        img.src = './images/common/warning.svg';

        this._refs.imgPlaceholder.replaceWith(img);

        this._refs.window.classList.add('window-warning');
        this._refs.windowHeader.classList.add('window__header-warning');
        this._refs.message.classList.add('window__message-warning');
    }
}

if (!customElements.get('ge-warning-window'))
    window.customElements.define('ge-warning-window', GeWarningWindow);
