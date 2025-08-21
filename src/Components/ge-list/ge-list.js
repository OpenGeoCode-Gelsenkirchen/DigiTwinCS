import styles from './ge-list.css?raw';
import template from './ge-list.html?raw';

/**
 * `<ge-list>` - A dynamic list container for managing child elements programmatically.
 *
 * Provides methods for **adding**, **removing** and **clearing** items.
 * Fires optional hooks (`onFirstItemAdded`, `onLastItemRemoved`) when list transitions from empty/non-empty states.
 *
 * @summary
 * Programmatic list UI container with lifecycle hooks.
 *
 * @example
 * ```
 * <ge-list id="messages"></ge-list>
 *
 * <script>
 *   const list = document.querySelector('#messages');
 *
 *   const item = document.createElement('div');
 *   item.textContent = 'Hello world!';
 *
 *   list.onFirstItemAdded = () => console.log("First item added!");
 *   list.onLastItemRemoved = () => console.log("List is now empty.");
 *
 *   list.push(item); // adds item
 *   list.remove(item); // removes item
 *   list.clear(); // clears entire list
 * </script>
 * ```
 *
 * @property {HTMLElement[]} items - Current array of elements in the list.
 * @property {Function} onFirstItemAdded - Callback invoked when first item is added.
 * @property {Function} onLastItemRemoved - Callback invoked when the last item is removed.
 *
 * @method push(item: HTMLElement) - Append an `item` to the list.
 * @method remove(item: HTMLElement) - Remove a specific `item` from the list.
 * @method clear() - Remove all items and reset list.
 */
export class GeList extends HTMLElement {
    constructor() {
        super();

        // ensure unique id
        if (!this.hasAttribute('id')) {
            this.setAttribute('id', uuidv());
        }

        this.id = this.getAttribute('id');

        /** @private items queued before connectedCallback */
        this.queue = [];

        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            /** Container <div> for list items */
            list: this.shadow.querySelector('div'),
        };

        /** @callback when list transitions to non-empty */
        this.onFirstItemAdded = () => {};

        /** @callback when list becomes empty */
        this.onLastItemRemoved = () => {};
    }

    /** Lifecycle hook: attach queued items to DOM */
    async connectedCallback() {
        this.queue.forEach(item => this.push(item));
        this.queue = [];

        /** @type {HTMLElement[]} tracked child items */
        this.items = [];
    }

    /**
     * Add a new item to the list.
     * If not yet connected, item is queued.
     * Calls `onFirstItemAdded` if first entry.
     * @param {HTMLElement} item - element to add
     */
    push(item) {
        if (this.html.list) {
            this.items.push(item);
            this.html.list.appendChild(item);
        } else {
            this.queue.push(item);
        }
        if (this.queue.length == 1 || this.html.list.childElementCount == 1)
            this.onFirstItemAdded();
    }

    /**
     * Remove a previously added item.
     * @param {HTMLElement} item - element to remove
     */
    remove(item) {
        if (this.html.list) {
            this.items.splice(this.items.indexOf(item), 1);
            this.html.list.removeChild(item);
            if (this.html.list.childElementCount == 0) this.onLastItemRemoved();
        }
    }

    /**
     * Clear the list completely.
     * Invokes `onLastItemRemoved`.
     */
    clear() {
        this.items = [];
        this.html.list.replaceChildren();
        this.onLastItemRemoved();
    }
}

if (!customElements.get('ge-list')) customElements.define('ge-list', GeList);
