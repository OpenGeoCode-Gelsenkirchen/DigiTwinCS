import '../GeButton/GeButton.js';
import type {GeButton} from '../GeButton/GeButton.js';
import {mustQuery} from '../utils.js';
import styles from './GeBaseLayerPicker.css?raw';
import template from './GeBaseLayerPicker.html?raw';

/**
 * Configuration for an individual selectable base-layer entry.
 */
export interface BaseLayerPickerItem {
    id: string;
    groupId: string;
    groupName: string;
    iconUrl: string;
    name: string;
    tooltip?: string;
    onSelect: () => void;
    switchable?: boolean;
    changeBackground?: boolean;
    initialActive?: boolean;
    active?: boolean;
}

/**
 * A named group of selectable base-layer picker items.
 */
export interface GroupPickerItem {
    groupName: string;
    items: Array<BaseLayerPickerItem>;
}

/**
 * A shadow-DOM web component for selecting imagery, terrain, or other grouped
 * base-layer options.
 *
 * @remarks
 * Items are added with {@link addElement}. Selecting an item clears the active
 * state of all other items in the same group, invokes the item's
 * {@link BaseLayerPickerItem.onSelect | onSelect} callback, and collapses the
 * picker.
 *
 * @example
 * ```ts
 * const picker = document.querySelector(
 *   'ge-baselayerpicker',
 * ) as GeBaseLayerPicker;
 *
 * picker.addElement({
 *   id: 'satellite',
 *   groupId: 'imagery',
 *   groupName: 'Imagery',
 *   iconUrl: '/icons/satellite.svg',
 *   name: 'Satellite',
 *   changeBackground: true,
 *   onSelect: () => setImageryProvider(satelliteProvider),
 * });
 * ```
 */
export class GeBaseLayerPicker extends HTMLElement {
    /**
     * Delay, in milliseconds, used to coordinate expand and collapse animations
     * with insertion or removal of the picker content.
     *
     * @defaultValue 250
     */
    public delay: number = 250;

    /**
     * Currently selected items keyed by their group identifier.
     */
    public activeElements: Record<string, BaseLayerPickerItem>;

    /**
     * Imagery layers currently associated with this picker.
     *
     */
    public currentImageryLayers: unknown[];

    /**
     * Shadow root that encapsulates the component template and styles.
     */
    private _root: ShadowRoot;

    /**
     * Cached references to important elements in the shadow DOM.
     */
    private _html: {
        mainButton: GeButton;
        div: HTMLElement;
        content: HTMLElement;
    };

    /**
     * Picker items organized by group identifier.
     */
    private _groups: Record<string, GroupPickerItem> = {};

    /**
     * Collapses the picker when a click occurs outside of this component.
     *
     * @param e - Document click event.
     */
    private readonly _onOutsideClick = (e: MouseEvent) => {
        const target = e.target as Node | null;
        if (target && !this.contains(target)) this.collapsed = true;
    };

    /**
     * Toggles the state when the main button is clicked.
     */
    private readonly _onMainButton = () => {
        this.collapsed = !this.collapsed;
    };

    /**
     * Text assigned to the main button's title attribute.
     *
     * @remarks
     * This uses the host element's native `title` attribute.
     */
    get title(): string {
        return this.getAttribute('title') || '';
    }

    set title(value) {
        this.setAttribute('title', value);
    }

    /**
     * Text displayed by the main picker button.
     */
    get text() {
        return this._html.mainButton.text;
    }

    set text(value) {
        if (this._html.mainButton) {
            this._html.mainButton.text = value;
        }
    }

    /**
     * Source URL of the icon displayed by the main picker button.
     */
    get src() {
        return this._html.mainButton.src;
    }

    set src(value) {
        this._html.mainButton.src = value;
    }

    /**
     * Whether the baselayerpicker is hidden.
     *
     * @remarks
     * A present `collapsed` attribute means the picker is closed. Setting this
     * property updates the main-button active state and inserts or removes the
     * content container after {@link delay}.
     */
    get collapsed() {
        return this.hasAttribute('collapsed');
    }

    set collapsed(value) {
        this._html.mainButton.active = !value;

        if (value) {
            this.setAttribute('collapsed', '');

            setTimeout(() => {
                this._html.content.remove();
            }, this.delay);
        } else {
            this.addContent();
            this.removeAttribute('collapsed');
        }
    }

    /**
     * Creates the picker shadow DOM and initializes its collapsed state.
     */
    constructor() {
        super();
        this._root = this.attachShadow({mode: 'open'});
        this._root.innerHTML = `<style>${styles}</style>${template}`;

        this.activeElements = {};
        this.currentImageryLayers = [];

        this._html = {
            mainButton: mustQuery(this._root, '#main-btn'),
            div: mustQuery(this._root, '#items'),
            content: document.createElement('div'),
        };

        //set collapsed after this._html is set
        this.collapsed = true;

        this._html.content.id = 'content';
    }

    /**
     * Initializes the visible state and subscribes component event handlers after
     * the custom element is attached to the document.
     */
    connectedCallback() {
        this.title = this.textContent || '';
        this.text = this.textContent || '';

        if (!this.collapsed) {
            this._html.mainButton.active = true;
            this._html.div.append(this._html.content);
        }

        setTimeout(() => {
            this._root.host.setAttribute('loaded', '');
            if (!this.collapsed) {
                this.addContent();
            }
        }, this.delay);

        document.addEventListener('click', this._onOutsideClick);
        this._html.mainButton.addEventListener('click', this._onMainButton);
    }

    /**
     * Removes document and component event listeners when the element is detached.
     */
    disconnectedCallback() {
        document.removeEventListener('click', this._onOutsideClick);
        this._html.mainButton.removeEventListener('click', this._onMainButton);
    }

    /**
     * Converts a CSS `rem` value to pixels using the document root font size.
     *
     * @param rem - Value in root-relative CSS units.
     * @returns Equivalent value in pixels.
     */
    remToPixels(rem: number) {
        const rootFontSize = parseFloat(
            getComputedStyle(document.documentElement).fontSize,
        );
        return rem * rootFontSize;
    }

    /**
     * Adds an item to a named group and re-renders the selectable content.
     *
     * @param element - Base-layer picker item to register.
     * @throws {Error} Thrown when `element` is missing or otherwise falsy.
     */
    addElement(element: BaseLayerPickerItem) {
        if (!element) throw new Error('Not a valid element');
        if (!(element.groupId in this._groups)) {
            this._groups[element.groupId] = {
                groupName: element.groupName,
                items: [],
            };
        }
        this._groups[element.groupId].items.push(element);
        this.render();
    }

    /**
     * Appends the rendered content container to the picker-content host.
     *
     * @remarks
     * Appending an existing node moves it rather than creating a duplicate.
     */
    addContent() {
        if (this._html.content) {
            this._html.div.appendChild(this._html.content);
        }
    }

    /**
     * Rebuilds the rendered groups and layer-selection buttons.
     *
     * @remarks
     * Selecting a button deactivates sibling buttons in the same group. The item
     * callback is then invoked, and the picker is collapsed.
     *
     * The current `element.active` behavior invokes `button.click()` during each
     * render. Consequently, rendering an active item runs its selection callback
     * and closes the picker.
     *
     */
    render() {
        if (this._html.content) {
            this._html.content.replaceChildren();

            for (const group of Object.keys(this._groups)) {
                const htmlGroup = document.createElement('div');
                htmlGroup.classList.add('group');

                const title = document.createElement('span');
                title.classList.add('title');
                title.innerText = this._groups[group].groupName;

                htmlGroup.appendChild(title);

                const elementGroup = document.createElement('div');
                elementGroup.classList.add('elementGroup');

                htmlGroup.appendChild(elementGroup);

                for (const element of this._groups[group].items) {
                    const eleDiv = document.createElement('div');
                    eleDiv.classList.add('elementDiv');

                    const button = document.createElement(
                        'ge-button',
                    ) as GeButton;

                    button.src = element.iconUrl;
                    button.shape = 'square';
                    button.size = 'medium';
                    button.title = element.tooltip || '';

                    button.setAttribute('showborder', '');
                    button.setAttribute('border-hover', '');
                    button.setAttribute('img-size', 'full');

                    button.addEventListener('click', () => {
                        if (button.active) return;

                        const isActive = button.active;

                        //disable all other buttons
                        htmlGroup
                            .querySelectorAll('ge-button')
                            .forEach(btn => ((btn as GeButton).active = false));

                        button.active = element.switchable ? !isActive : true;

                        if (button.active) {
                            this.activeElements[element.groupId] = element;
                        }

                        if (element.changeBackground) {
                            this._html.mainButton.src = element.iconUrl;
                        }

                        element.onSelect();
                        this.collapsed = true;
                    });

                    if (element.active) button.click();

                    const eleTitle = document.createElement('span');
                    eleTitle.classList.add('elementTitle');
                    eleTitle.innerText = element.name;

                    eleDiv.appendChild(button);
                    eleDiv.appendChild(eleTitle);

                    elementGroup.appendChild(eleDiv);
                }
                this._html.content.appendChild(htmlGroup);
            }
        }
        return;
    }
}

/**
 * Registers the base-layer picker custom element.
 */
customElements.define('ge-baselayerpicker', GeBaseLayerPicker);
