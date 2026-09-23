import {uuidv4} from '../../../Core/utilities';
import {GeWindow, type GeWindowOptions} from './GeWindow';

/**
 * A {@link GeWindow} variant for informational messages.
 *
 * @remarks
 * Error, warning, and information windows currently use separate custom
 * element classes even though their behavior is largely identical.
 *
 * They may be consolidated into a `variant`-based `GeWindow` implementation
 * if future requirements require dynamic window variants or reduce repeated
 * maintenance.
 */
export class GeInformationWindow extends GeWindow {
    /**
     * Creates a configured information window without appending it to the
     * document.
     *
     * @param id - DOM ID assigned to the information window.
     * @param options - Initial title, subtitle, message, and close callback.
     * @returns A configured `ge-information-window` element.
     *
     * @remarks
     * Call {@link show} on the returned element to display it.
     */
    static override create(
        id: string = uuidv4(),
        options: GeWindowOptions = {},
    ): GeInformationWindow {
        const el = document.createElement(
            'ge-information-window',
        ) as GeInformationWindow;
        el.id = id;
        el.configure(options);
        return el;
    }

    constructor() {
        super();
    }

    /**
     * Installs the information icon and applies information-specific styling.
     *
     * @remarks
     * The `window__message` class is already expected on the base template's
     * message element. Adding it again is harmless but redundant unless the base
     * markup does not provide that class.
     */
    connectedCallback(): void {
        super.connectedCallback?.();
        const img = document.createElement('img');
        img.src = './images/common/information.svg';

        this._refs.imgPlaceholder.replaceWith(img);

        this._refs.window.classList.add('window-information');
        this._refs.windowHeader.classList.add('window__header-information');
        this._refs.message.classList.add('window__message');
    }
}

if (!customElements.get('ge-information-window'))
    window.customElements.define('ge-information-window', GeInformationWindow);
