/**
 * GUIManager – Central manager for registering, showing/hiding, and managing sets of GUI HTML elements in the application.
 *
 * Allows for collective show/hide toggling, batch registration from a document/parent node,
 * and easy clearing and query of managed elements.
 *
 * @class
 *
 * @property {boolean} show - Controls global visibility of all registered GUI elements. Gets/sets all at once.
 * @property {Set<HTMLElement>} elements - The internal set of tracked GUI elements (HTMLElements).
 *
 * @example
 * const gui = new GUIManager();
 * gui.register(document.getElementById('sidebar'));
 * gui.show = false; // hides all registered elements
 * gui.clear();      // unregisters all elements
 */

export class GUIManager {
    /** @private */
    private _show: boolean = false;

    /** @private */
    private elements: Set<HTMLElement> = new Set();

    /**
     * Scans the given document or DOM parent for all elements with `data-gui-element`
     * attribute and registers them automatically.
     *
     * @param {Document|ParentNode} doc - The source document or parent node for the scan.
     */
    initializeFromDocument(doc: Document | ParentNode) {
        const elements = doc.querySelectorAll('[data-gui-element]');
        for (const element of elements) {
            this.register(element as HTMLElement);
        }
    }

    /**
     * Registers a single HTML element to this manager.
     * After registration, the element will respond to GUIManager's collective show/hide state.
     *
     * @param {HTMLElement} element - The element to register.
     */
    register(element: HTMLElement) {
        this.elements.add(element);
    }

    /**
     * Unregisters (removes) a given element from the manager.
     *
     * @param {HTMLElement} element - The element to remove.
     */
    unregister(element: HTMLElement) {
        this.elements.delete(element);
    }

    /**
     * Sets the show/hide state for all registered elements.
     * Passing `true` will show all elements (restores their original display),
     * passing `false` will hide (display: none) all.
     *
     * @param {boolean} value
     */
    set show(value: boolean) {
        for (const el of this.elements) {
            el.style.display = value ? '' : 'none';
        }
        this._show = value;
    }

    /**
     * Returns the current show/hide state.
     * @returns {boolean}
     */
    get show() {
        return this._show;
    }

    /**
     * Unregisters all currently tracked elements from the manager.
     */
    clear() {
        this.getElements().map(element => this.unregister(element));
    }

    /**
     * Returns an array of all currently registered elements.
     * @returns {HTMLElement[]}
     */
    getElements(): HTMLElement[] {
        return Array.from(this.elements);
    }
}
