import {uuidv4} from '../../../Core/utilities';
import {GeWindow, type GeWindowOptions} from './GeWindow';

/**
 * A shared loading overlay that remains visible while one or more registered
 * operations are active.
 *
 * @remarks
 * Unlike the base window factory, {@link create} reuses an existing loading
 * window with the same ID. Use {@link register} before an asynchronous process
 * starts, and call {@link unregister} once it completes or fails.
 *
 * The active set uses object identity. Registering the same object more than
 * once does not increase the number of active operations.
 *
 * @example
 * ```ts
 *
 * const win = GeLoadingWindow.create('loadingWindow', {
 *      title: i18next.t('common:loadingMessage'),
 * });
 * 
 * //we need to append the loading window, otherwise singleton won't work
 * win.show(0);

 * tileset.loadProgress.addEventListener(
 *  (numberOfPendingRequests, numberOfTilesProcessing) => {
 *  if (
 *      numberOfPendingRequests > 0 ||
 *      numberOfTilesProcessing > 0
 *  ) {
 *      win.register(tileset); 
 * } else {
 *      win.unregister(tileset);
 * }},
 * ); 
 * ```
 */
export class GeLoadingWindow extends GeWindow {
    /**
     * Objects representing currently active loading operations.
     */
    private active = new Set<object>();

    /**
     * Retrieves or creates a reusable loading window.
     *
     * @param id - DOM ID used to find or create the loading window.
     * @param options - Configuration applied to the returned window.
     * @returns A configured loading-window element.
     *
     * @remarks
     * An existing `ge-loading-window` with the requested ID is reused. Its
     * configuration is updated before it is returned.
     */
    static override create(
        id: string = uuidv4(),
        options: GeWindowOptions = {},
    ): GeLoadingWindow {
        let el = GeLoadingWindow.getInstance(id) as GeLoadingWindow;

        if (!el) {
            el = document.createElement('ge-loading-window') as GeLoadingWindow;
            el.id = id;
        }
        el.configure(options);
        return el;
    }

    /**
     * Visible opacity of the loading overlay.
     *
     * @defaultValue 0.75
     */
    public override opacity: number = 0.75;

    /**
     * Whether at least one loading operation is currently registered.
     */
    get isLoading() {
        return this.active.size > 0;
    }

    constructor() {
        super();
    }

    /**
     * Applies loading-specific styling after the element is attached.
     */
    connectedCallback(): void {
        super.connectedCallback?.();

        //const img = document.createElement('img');
        //img.src = './images/common/loading.svg';

        this.classList.add('host-loading');
        this._refs.window.classList.add('window-loading');
        this._refs.titleRow.classList.add('window__title-row-loading');

        this._refs.title.classList.add('window__title-loading');
        this._refs.windowHeader.classList.add('window__header-loading');
        this._refs.closeBtn.classList.add('window__close-btn-loading');
        this._refs.messageDiv.remove();
    }

    /**
     * Registers an active asynchronous operation or object.
     *
     * @param operation - Object used as the operation's identity token.
     *
     * @remarks
     * The window is shown when this is the first registered operation.
     */
    register(obj: object) {
        this.active.add(obj);
        this.evaluate();
    }

    /**
     * Removes a previously registered asynchronous operation or object.
     *
     * @param operation - Identity token that was passed to {@link register}.
     *
     * @remarks
     * The window closes when no active operations remain.
     */
    unregister(obj: object) {
        this.active.delete(obj);
        this.evaluate();
    }

    /**
     * Synchronizes overlay visibility with the active-operation set.
     */
    evaluate() {
        if (this.isLoading) {
            this.show();
        } else {
            this.close();
        }
    }
}

if (!customElements.get('ge-loading-window'))
    window.customElements.define('ge-loading-window', GeLoadingWindow);
