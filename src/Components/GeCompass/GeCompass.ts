import {Camera} from '@cesium/engine';
import styles from './GeCompass.css?raw';
import html from './GeCompass.html?raw';

/**
 * Shared shadow-DOM template for {@link GeCompass} instances.
 *
 * @remarks
 * The component imports its stylesheet and markup as raw strings, then clones
 * the resulting template into each component instance.
 */
const template = document.createElement('template');
template.innerHTML = `<style>${styles}</style>${html}`;

/**
 * Retrieves a required descendant element from a DOM root.
 *
 * @typeParam T - Expected element type.
 * @param root - Element, document fragment, or shadow root to search.
 * @param selector - CSS selector identifying the required element.
 * @returns The matching element.
 * @throws {Error} Thrown when no element matches `selector`.
 */
function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`Missing element: ${selector}`);
    return el as T;
}

/**
 * A compass custom element synchronized with a Cesium {@link Camera}.
 *
 * @remarks
 * The component rotates its host element according to the negative of the
 * assigned camera heading, so the compass graphic remains aligned with the
 * scene orientation. Clicking an enabled compass animates the camera back to
 * north while preserving its current position, pitch, and roll.
 *
 * @example
 * ```ts
 * const compass = document.querySelector('ge-compass') as GeCompass;
 * compass.camera = viewer.camera;
 * ```
 */
export class GeCompass extends HTMLElement {
    /**
     * Image element used to render the compass graphic.
     */
    private _img: HTMLImageElement;

    /**
     * Current compass rotation in radians.
     *
     * @defaultValue `0`
     */
    private _heading = 0;

    /**
     * Camera whose heading drives the compass rotation.
     */
    private _camera: Camera | null = null;

    /**
     * Cached camera-change callback used for listener registration and removal.
     */
    private _update: () => void;

    /**
     * Compass rotation in radians.
     *
     * @remarks
     * Setting this property immediately updates the host element's CSS rotation.
     */
    get heading() {
        return this._heading;
    }

    set heading(value) {
        this._heading = value;
        this._render();
    }

    /**
     * Source URL of the compass image.
     */
    get src(): string {
        if (!this._img) return '';
        return this._img.src;
    }

    set src(value) {
        if (!this._img) return;
        this._img.src = value;
    }

    /**
     * Cesium camera used to synchronize the compass heading.
     *
     * @remarks
     * Reassigning this property removes the listener from the previously assigned
     * camera before subscribing to the new camera's `changed` event.
     *
     * Assigning a camera does not immediately update {@link heading}; the heading
     * changes on the next `Camera.changed` event. Callers that require immediate
     * synchronization can set `heading` explicitly after assigning `camera`.
     */
    get camera(): Camera | null {
        return this._camera;
    }

    set camera(value) {
        if (this._camera) {
            this._camera.changed.removeEventListener(this._update);
        }
        this._camera = value;
        if (this._camera) this._camera.changed.addEventListener(this._update);
    }

    /**
     * Whether users can click the compass to reorient the camera north.
     *
     * @remarks
     * This property is backed by the inverse of the `disabled` HTML attribute.
     * An element with `disabled` present is not clickable.
     */
    get clickable(): boolean {
        return !this.hasAttribute('disabled');
    }

    set clickable(value: boolean) {
        if (value) {
            this.removeAttribute('disabled');
        } else {
            this.setAttribute('disabled', '');
        }
    }

    /**
     * Creates the component's shadow DOM, initializes the compass image, and
     * installs click handling for north-reset behavior.
     */
    constructor() {
        super();
        const root = this.attachShadow({mode: 'open'});
        root.appendChild(template.content.cloneNode(true));
        this._img = mustQuery<HTMLImageElement>(root, 'img');

        this._update = () => {
            if (this._camera) this.heading = -this._camera?.heading;
        };

        this.addEventListener('click', () => {
            if (this._camera && this.clickable)
                this._camera.flyTo({
                    destination: this._camera.position,
                    orientation: {
                        heading: 0,
                        pitch: this._camera.pitch,
                        roll: this._camera.roll,
                    },
                    duration: 1,
                });
        });
    }

    /**
     * Unsubscribes from the assigned camera when the element leaves the document.
     *
     * @remarks
     * The current component does not re-register the listener in
     * `connectedCallback`. If the same element instance is disconnected and later
     * reattached, assign {@link camera} again to restore camera synchronization.
     */
    disconnectedCallback() {
        if (this._camera) {
            this._camera.changed.removeEventListener(this._update);
        }
    }

    /**
     * Applies the current heading as a clockwise CSS rotation in radians.
     */
    private _render() {
        this.style.transform = `rotate(${this.heading}rad)`;
    }
}

customElements.define('ge-compass', GeCompass);
