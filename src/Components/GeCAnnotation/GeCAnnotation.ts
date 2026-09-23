import {Cartesian2} from '@cesium/engine';
import styles from './GeCAnnotation.css?raw';
import html from './GeCAnnotation.html?raw';

/**
 * Shared shadow-DOM template for {@link CAnnotation} instances.
 *
 * @remarks
 * The CSS and HTML assets are imported as raw strings and cloned into each
 * component instance during construction.
 */
const template = document.createElement('template');
template.innerHTML = `<style>${styles}</style>${html}`;

/**
 * A screen-space annotation custom element positioned from Cesium canvas
 * coordinates.
 *
 * @remarks
 * Assign {@link position} each frame, or whenever a corresponding world-space
 * location is projected into window coordinates. The component rounds the
 * supplied position to the nearest pixel and only updates its transform when
 * that pixel changes.
 *
 * The host element is centered on its screen position by applying
 * `translate(-50%, -50%)` after its pixel translation.
 *
 * @example
 * ```ts
 * const annotation = document.createElement(
 *   'c-annotation',
 * ) as CAnnotation;
 *
 * annotation.pixelOffset = [0, -24];
 * annotation.show = true;
 * annotation.position = new Cartesian2(640, 360);
 * annotation.zIndex = 10;
 * ```
 */
export class CAnnotation extends HTMLElement {
    /**
     * Whether the annotation is intended to be visible.
     *
     * @defaultValue true
     */
    private _show = true;

    /**
     * Pixel offset applied after the projected screen position.
     *
     * The first value offsets horizontally and the second offsets vertically.
     *
     * @defaultValue `[0, 0]`
     */
    public pixelOffset = [0, 0];

    /**
     * Controls annotation visibility.
     */
    set show(value: boolean) {
        if (value === this._show) return;
        //if (!this._inViewport) return;

        this._show = value;
        //this.style.display = value ? 'block' : 'none';
        this.style.visibility = value ? 'visible' : 'hidden';
    }

    get show() {
        return this._show;
    }

    /**
     * Last applied rounded horizontal screen coordinate.
     *
     * @defaultValue `NaN`
     */
    private _lastX = Number.NaN;

    /**
     * Last applied rounded vertical screen coordinate.
     *
     * @defaultValue `NaN`
     */
    private _lastY = Number.NaN;

    /**
     * Updates the annotation's screen-space position.
     *
     * @param value - Canvas-relative position in pixels, or `undefined` when no
     * projected position is available.
     *
     * @remarks
     * Coordinates are rounded to their nearest integer values. If the rounded
     * coordinates match the previous position, no style update occurs.
     *
     * The applied transform has the form:
     *
     * ```css
     * transform: translate(x + offsetX, y + offsetY)
     *   translate(-50%, -50%);
     * ```
     */
    set position(value: Cartesian2 | undefined) {
        if (value == undefined) {
            return;
        } else {
            //this._inViewport = true;

            const x = (value.x + 0.5) | 0;
            const y = (value.y + 0.5) | 0;

            if (x === this._lastX && y === this._lastY) return;

            this._lastX = x;
            this._lastY = y;

            const tx = this.pixelOffset[0] + x;
            const ty = this.pixelOffset[1] + y;

            this.style.transform = `translate(${tx}px,${ty}px) translate(-50%, -50%)`;
        }
    }

    /**
     * CSS stacking order of the annotation.
     *
     * @remarks
     * This maps directly to the host element's inline `z-index` style.
     */
    set zIndex(value: number) {
        this.style.zIndex = String(value);
    }

    get zIndex() {
        return Number(this.style.zIndex);
    }

    /**
     * Creates the component shadow root and disables the native context menu on
     * the annotation element.
     */
    constructor() {
        super();
        const root = this.attachShadow({mode: 'open'});
        root.appendChild(template.content.cloneNode(true));
        this.addEventListener('contextmenu', e => e.preventDefault());
    }
}

customElements.define('c-annotation', CAnnotation);
