import type {Translator} from '../../Core/Translator.js';
import {bindHold} from '../../Core/utilities.js';
import '../GeButton/GeButton.js';
import styles from './GeInspector.css?raw';
import html from './GeInspector.html?raw';

/**
 * Retrieves a required descendant element from a DOM root.
 *
 * @typeParam T - Expected type of the queried element.
 * @param root - Element, document fragment, or shadow root to search.
 * @param selector - CSS selector that identifies the required element.
 * @returns The matching element, cast to `T`.
 * @throws {Error} Thrown when no matching element exists.
 */
function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`Missing element: ${selector}`);
    return el as T;
}

/**
 * Shared shadow-DOM template for {@link ModelInspector} instances.
 */
const template = document.createElement('template');
template.innerHTML = `<style>${styles}</style>${html}`;

/**
 * Editable model transformation expressed in projected coordinates, degrees,
 * and per-axis scale factors.
 *
 * @remarks
 * The inspector represents:
 *
 * - `position` as application/project coordinates.
 * - `rotation` as Euler-angle values in degrees.
 * - `scale` as unitless per-axis factors.
 *
 * The controller converts this UI-oriented representation to Cesium's
 * `TranslationRotationScale` representation before updating the gizmo.
 */
export type Transform = {
    /**
     * Translation in application/project coordinates.
     */
    position: {
        x: number;
        y: number;
        z: number;
    };
    /**
     * Model rotation in degrees.
     */
    rotation: {
        x: number;
        y: number;
        z: number;
    };
    /**
     * Unitless scale factors applied along the model axes.
     */
    scale: {
        x: number;
        y: number;
        z: number;
    };
};

/**
 * Cached references to controls in the inspector's shadow DOM.
 */
type Refs = {
    /** Button that requests deletion of the selected model. */
    delete: HTMLElement;

    /** Position input for the projected X coordinate. */
    x: HTMLInputElement;

    /** Position input for the projected Y coordinate. */
    y: HTMLInputElement;

    /** Position input for the projected Z coordinate. */
    z: HTMLInputElement;

    /** Rotation input for the X axis, in degrees. */
    xRotation: HTMLInputElement;

    /** Rotation input for the Y axis, in degrees. */
    yRotation: HTMLInputElement;

    /** Rotation input for the Z axis, in degrees. */
    zRotation: HTMLInputElement;

    /** Scale input for the X axis. */
    xScale: HTMLInputElement;

    /** Scale input for the Y axis. */
    yScale: HTMLInputElement;

    /** Scale input for the Z axis. */
    zScale: HTMLInputElement;

    /** Input controlling translation snapping. */
    translationSnap: HTMLInputElement;

    /** Input controlling rotation snapping. */
    rotationSnap: HTMLInputElement;

    /** Input controlling scale snapping. */
    scaleSnap: HTMLInputElement;

    /** Button that applies the current input values. */
    applyButton: HTMLElement;

    /** Checkbox that enables terrain clamping. */
    clampToGround: HTMLInputElement;

    /** Checkbox that enables uniform scale manipulation. */
    uniformScale: HTMLInputElement;

    /** Button that resets the current translation. */
    resetTranslation: HTMLElement;

    /** Button that resets the current rotation. */
    resetRotation: HTMLElement;

    /** Button that resets the current scale. */
    resetScale: HTMLElement;

    /** Button that activates translation-gizmo mode. */
    translationMode: HTMLElement;

    /** Button that activates rotation-gizmo mode. */
    rotationMode: HTMLElement;

    /** Button that activates scale-gizmo mode. */
    scaleMode: HTMLElement;

    /** Control that moves the model north while held. */
    moveNorth: HTMLElement;

    /** Control that moves the model east while held. */
    moveEast: HTMLElement;

    /** Control that moves the model south while held. */
    moveSouth: HTMLElement;

    /** Control that moves the model west while held. */
    moveWest: HTMLElement;

    /** Control that moves the model upward while held. */
    moveUp: HTMLElement;

    /** Control that moves the model downward while held. */
    moveDown: HTMLElement;

    /** Control that rotates the model clockwise while held. */
    rotateCW: HTMLElement;

    /** Control that rotates the model counterclockwise while held. */
    rotateCCW: HTMLElement;

    /** Button that requests dropping the model onto terrain. */
    dropOnTerrain: HTMLElement;
};

/**
 * A shadow-DOM editor for a selected model's position, rotation, scale, and
 * gizmo interaction settings.
 *
 * @remarks
 * The component is UI-only: it exposes state through accessors and communicates
 * user intent through composed, bubbling custom events. {@link InspectorController}
 * receives those events and applies the corresponding Cesium and gizmo updates.
 *
 * @example
 * ```ts
 * const inspector = document.querySelector(
 *   'model-inspector',
 * ) as ModelInspector;
 *
 * inspector.translator = translator;
 * inspector.applyTransform({
 *   position: { x: 6.5, y: 51.5, z: 80 },
 *   rotation: { x: 0, y: 0, z: 90 },
 *   scale: { x: 1, y: 1, z: 1 },
 * });
 * ```
 */
export class ModelInspector extends HTMLElement {
    /**
     * Translator used to localize text contained within the shadow root.
     */
    private _translator: Translator | null = null;

    /**
     * Cached references to inspector controls.
     */
    private refs: Refs;

    /**
     * Whether terrain clamping is enabled by the UI.
     */
    get clampToGround() {
        return Boolean(this.refs.clampToGround.checked);
    }

    /**
     * Whether uniform scaling is enabled by the UI.
     */
    get uniformScaling() {
        return Boolean(this.refs.uniformScale.checked);
    }

    /**
     * Configured translation snap increment.
     *
     * @remarks
     * A non-positive value is interpreted by the controller as disabled snapping.
     */
    get translationSnap() {
        return Number(this.refs.translationSnap.value);
    }

    /**
     * Configured rotation snap increment.
     *
     * @remarks
     * Rotation values are represented in degrees in the inspector UI.
     */
    get rotationSnap() {
        return Number(this.refs.rotationSnap.value);
    }

    /**
     * Configured scale snap increment.
     */
    get scaleSnap() {
        return Number(this.refs.scaleSnap.value);
    }

    /**
     * Translator used to localize content in the inspector's shadow DOM.
     *
     * @remarks
     * Assigning a translator immediately attempts to translate the component.
     */
    set translator(value: Translator | null) {
        this._translator = value;
        this.tryTranslate();
    }

    get translator() {
        return this._translator;
    }

    /**
     * Reads or updates the inspector's raw input values.
     *
     * @remarks
     * The setter writes unformatted numeric strings. Use {@link applyTransform}
     * when values should be displayed with the component's fixed-decimal format.
     */
    set transform(value: Transform) {
        this.refs.x.value = String(value.position.x);
        this.refs.y.value = String(value.position.y);
        this.refs.z.value = String(value.position.z);

        this.refs.xRotation.value = String(value.rotation.x);
        this.refs.yRotation.value = String(value.rotation.y);
        this.refs.zRotation.value = String(value.rotation.z);

        this.refs.xScale.value = String(value.scale.x);
        this.refs.yScale.value = String(value.scale.y);
        this.refs.zScale.value = String(value.scale.z);
    }

    get transform() {
        return {
            position: {
                x: Number(this.refs.x.value),
                y: Number(this.refs.y.value),
                z: Number(this.refs.z.value),
            },
            rotation: {
                x: Number(this.refs.xRotation.value),
                y: Number(this.refs.yRotation.value),
                z: Number(this.refs.zRotation.value),
            },
            scale: {
                x: Number(this.refs.xScale.value),
                y: Number(this.refs.yScale.value),
                z: Number(this.refs.zScale.value),
            },
        };
    }

    /**
     * Attributes that trigger lifecycle updates when changed.
     */
    static observedAttributes = ['lang'];

    /**
     * Creates the component shadow root, caches required controls, and installs
     * all UI event handlers.
     */
    constructor() {
        super();

        const root = this.attachShadow({mode: 'open'});

        root.appendChild(template.content.cloneNode(true));

        this.refs = {
            delete: mustQuery<HTMLElement>(root, '#model-container-delete'),
            x: mustQuery<HTMLInputElement>(root, '#rw-inp'),
            y: mustQuery<HTMLInputElement>(root, '#hw-inp'),
            z: mustQuery<HTMLInputElement>(root, '#height-inp'),

            xRotation: mustQuery<HTMLInputElement>(root, '#x-rot-inp'),
            yRotation: mustQuery<HTMLInputElement>(root, '#y-rot-inp'),
            zRotation: mustQuery<HTMLInputElement>(root, '#z-rot-inp'),

            xScale: mustQuery<HTMLInputElement>(root, '#x-scale-inp'),
            yScale: mustQuery<HTMLInputElement>(root, '#y-scale-inp'),
            zScale: mustQuery<HTMLInputElement>(root, '#z-scale-inp'),

            translationSnap: mustQuery<HTMLInputElement>(root, '#pos-snap-inp'),
            rotationSnap: mustQuery<HTMLInputElement>(root, '#rot-snap-inp'),
            scaleSnap: mustQuery<HTMLInputElement>(root, '#scale-snap-inp'),

            clampToGround: mustQuery<HTMLInputElement>(
                root,
                '#ground-clamp-cb',
            ),
            uniformScale: mustQuery<HTMLInputElement>(root, '#uni-scale-cb'),

            applyButton: mustQuery<HTMLElement>(root, '#apply-btn'),
            resetTranslation: mustQuery<HTMLElement>(
                root,
                '#reset-translation',
            ),
            resetRotation: mustQuery<HTMLElement>(root, '#reset-rotation'),
            resetScale: mustQuery<HTMLElement>(root, '#reset-scale'),

            translationMode: mustQuery<HTMLElement>(
                root,
                '#translation-widget',
            ),
            rotationMode: mustQuery<HTMLElement>(root, '#rotation-widget'),
            scaleMode: mustQuery<HTMLElement>(root, '#scale-widget'),

            moveNorth: mustQuery<HTMLElement>(root, '#north-widget'),
            moveEast: mustQuery<HTMLElement>(root, '#east-widget'),
            moveSouth: mustQuery<HTMLElement>(root, '#south-widget'),
            moveWest: mustQuery<HTMLElement>(root, '#west-widget'),

            moveUp: mustQuery<HTMLElement>(root, '#up-widget'),
            moveDown: mustQuery<HTMLElement>(root, '#down-widget'),

            rotateCW: mustQuery<HTMLElement>(root, '#clock-widget'),
            rotateCCW: mustQuery<HTMLElement>(root, '#counter-widget'),

            dropOnTerrain: mustQuery<HTMLElement>(root, '#drop-widget'),
        };

        this.initEventListeners();
    }

    /**
     * Translates the component after it is connected to the document.
     */
    connectedCallback() {
        void this.tryTranslate();
    }

    /**
     * Re-translates the shadow DOM when the active language changes.
     *
     * @param name - Name of the changed attribute.
     */
    attributeChangedCallback(name: string) {
        if (name === 'lang') void this.tryTranslate();
    }

    /**
     * Translates this component's shadow DOM when a translator is available.
     */
    private async tryTranslate() {
        if (!this.shadowRoot) return;
        if (!this._translator) return;

        await this._translator.translateDocument(this.shadowRoot);
    }

    /**
     * Emits a composed custom event from the inspector.
     *
     * @param type - Application event name.
     * @param detail - Optional event payload.
     *
     * @remarks
     * Events bubble and cross the shadow-root boundary so a controller can listen
     * on the `<model-inspector>` host element.
     */
    private emit(type: string, detail?: unknown) {
        this.dispatchEvent(
            new CustomEvent(type, {
                bubbles: true,
                composed: true,
                detail,
            }),
        );
    }

    /**
     * Reads, validates, formats, and normalizes the current transform input values.
     *
     * @returns The current inspector transform with finite values rounded to two
     * decimal places. Invalid or non-finite input values are represented as `0`,
     * because `Number('')` evaluates to `0`.
     *
     * @remarks
     * The inspector UI and the Cesium model use different X/Y axis conventions for
     * scale. Therefore, the returned transform deliberately maps the displayed
     * Y-scale input to `scale.x` and the displayed X-scale input to `scale.y`.
     *
     * Both the Enter-key and Apply-button commit paths should use this method to
     * ensure identical transform payloads.
     */
    private _getFormattedTransform(): Transform {
        return {
            position: {
                x: Number(this.formatNumberString(this.refs.x.value)),
                y: Number(this.formatNumberString(this.refs.y.value)),
                z: Number(this.formatNumberString(this.refs.z.value)),
            },
            rotation: {
                x: Number(this.formatNumberString(this.refs.xRotation.value)),
                y: Number(this.formatNumberString(this.refs.yRotation.value)),
                z: Number(this.formatNumberString(this.refs.zRotation.value)),
            },
            scale: {
                x: Number(this.formatNumberString(this.refs.yScale.value)),
                y: Number(this.formatNumberString(this.refs.xScale.value)),
                z: Number(this.formatNumberString(this.refs.zScale.value)),
            },
        };
    }

    /**
     * Registers UI handlers that emit inspector and gizmo control events.
     *
     * @remarks
     * Pressing <kbd>Enter</kbd> in any transform field commits all transform
     * values. The resulting `inspector-commit` event carries a {@link Transform}.
     */
    private initEventListeners() {
        [
            this.refs.x,
            this.refs.y,
            this.refs.z,
            this.refs.xRotation,
            this.refs.yRotation,
            this.refs.zRotation,
            this.refs.xScale,
            this.refs.yScale,
            this.refs.zScale,
        ].forEach(element => {
            element.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    this.emit(
                        'inspector-commit',
                        this._getFormattedTransform(),
                    );
                }
            });
        });

        this.refs.delete.addEventListener('click', () => {
            this.emit('delete');
        });

        this.refs.translationSnap.addEventListener('change', () => {
            this.emit(
                'translation-snap-change',
                this.refs.translationSnap.value,
            );
        });

        this.refs.rotationSnap.addEventListener('change', () => {
            this.emit('rotation-snap-change', this.refs.rotationSnap.value);
        });

        this.refs.scaleSnap.addEventListener('change', () => {
            this.emit('scale-snap-change', this.refs.scaleSnap.value);
        });

        this.refs.applyButton.addEventListener('click', () => {
            this.emit('inspector-commit', this._getFormattedTransform());
        });

        this.refs.clampToGround.addEventListener('change', e => {
            if (!(e.target instanceof HTMLInputElement)) return;

            this.emit('ground-clamp-change', e.target.checked);
        });

        this.refs.uniformScale.addEventListener('change', e => {
            if (!(e.target instanceof HTMLInputElement)) return;

            this.emit('uniform-scale-change', e.target.checked);
        });

        this.refs.resetTranslation.addEventListener('click', e => {
            this.emit('reset-translation');
        });

        this.refs.resetRotation.addEventListener('click', e => {
            this.emit('reset-rotation');
        });

        this.refs.resetScale.addEventListener('click', e => {
            this.emit('reset-scale');
        });

        this.refs.translationMode.addEventListener('click', e => {
            this.emit('mode-translation');
        });

        this.refs.rotationMode.addEventListener('click', e => {
            this.emit('mode-rotation');
        });

        this.refs.scaleMode.addEventListener('click', e => {
            this.emit('mode-scale');
        });

        bindHold(
            this.refs.moveNorth,
            () => {
                this.emit('move-north');
            },
            200,
        );

        bindHold(
            this.refs.moveSouth,
            () => {
                this.emit('move-south');
            },
            200,
        );

        bindHold(
            this.refs.moveEast,
            () => {
                this.emit('move-east');
            },
            200,
        );

        bindHold(
            this.refs.moveWest,
            () => {
                this.emit('move-west');
            },
            200,
        );

        bindHold(
            this.refs.moveUp,
            () => {
                this.emit('move-up');
            },
            200,
        );

        bindHold(
            this.refs.moveDown,
            () => {
                this.emit('move-down');
            },
            200,
        );

        bindHold(
            this.refs.rotateCW,
            () => {
                this.emit('rotate-cw');
            },
            200,
        );

        bindHold(
            this.refs.rotateCCW,
            () => {
                this.emit('rotate-ccw');
            },
            200,
        );

        this.refs.dropOnTerrain.addEventListener('click', () => {
            this.emit('drop-on-terrain');
        });
    }

    /**
     * Updates the displayed transform using fixed-decimal formatting.
     *
     * @param transform - UI-oriented transform values to display.
     *
     * @remarks
     * Non-finite values are rendered as empty strings. Values are formatted with
     * two fractional digits by default through {@link formatNumber}.
     */
    public applyTransform(transform: Transform) {
        this.refs.x.value = this.formatNumber(transform.position.x);
        this.refs.y.value = this.formatNumber(transform.position.y);
        this.refs.z.value = this.formatNumber(transform.position.z);

        this.refs.xRotation.value = this.formatNumber(transform.rotation.x);
        this.refs.yRotation.value = this.formatNumber(transform.rotation.y);
        this.refs.zRotation.value = this.formatNumber(transform.rotation.z);

        this.refs.xScale.value = this.formatNumber(transform.scale.x);
        this.refs.yScale.value = this.formatNumber(transform.scale.y);
        this.refs.zScale.value = this.formatNumber(transform.scale.z);
    }

    /**
     * Formats a finite number for display in an inspector input.
     *
     * @param value - Numeric value to format.
     * @param digits - Number of digits after the decimal point.
     * @returns A fixed-point numeric string, or an empty string for non-finite
     * values.
     */
    private formatNumber(n: number, digits = 2): string {
        return Number.isFinite(n) ? n.toFixed(digits) : '';
    }

    /**
     * Parses and normalizes a numeric input string.
     *
     * @param value - Input value to parse.
     * @param digits - Number of fractional digits used by the normalized value.
     * @returns A fixed-point numeric string, or an empty string when `value` is
     * not a finite number.
     */
    private formatNumberString(s: string, digits = 2): string {
        const n = Number(s);
        return this.formatNumber(n, digits);
    }
}

customElements.define('model-inspector', ModelInspector);
