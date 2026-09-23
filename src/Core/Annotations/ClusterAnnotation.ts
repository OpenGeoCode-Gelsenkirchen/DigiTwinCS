import {
    Billboard,
    BillboardCollection,
    BlendOption,
    Cartesian2,
    Cartesian3,
    DistanceDisplayCondition,
    NearFarScalar,
    Scene,
    SceneTransforms,
    VerticalOrigin,
} from '@cesium/engine';
import type {CAnnotation} from '../../Components/GeCAnnotation/GeCAnnotation';
import {EVENT_TARGETS} from '../Handler';

/**
 * Contract for a DOM annotation rendered inside a {@link CAnnotation} wrapper.
 *
 * @typeParam T - Data type assigned to the annotation.
 *
 * @remarks
 * Annotation elements are regular custom elements. `ClusterAnnotation` creates
 * an element for a clicked billboard, assigns its source data through `data`,
 * and embeds it in a `c-annotation` screen-space wrapper.
 */
export interface Annotation<T extends Identifiable> extends HTMLElement {
    /**
     * Data currently displayed by this annotation.
     */
    data: T;
}

/**
 * Properties used when creating a Cesium {@link Billboard}.
 *
 * @remarks
 * This describes the common billboard configuration required by the annotation
 * system. Cesium supports additional billboard properties that may be added to
 * this interface when needed.
 */
export interface BillboardPrototype {
    position: Cartesian3;
    image: HTMLCanvasElement;
    pixelOffset: Cartesian2;
    verticalOrigin: VerticalOrigin;
    distanceDisplayCondition: DistanceDisplayCondition;
    scaleByDistance: NearFarScalar;
}

/**
 * Minimal identity requirement for objects represented by annotation billboards.
 */
export interface Identifiable {
    id: string;
}

type AnnotationEntry<T extends Identifiable> = {
    position: Cartesian3;
    cAnnotation: CAnnotation;
    screenPosition: Cartesian2;
    annotation: Annotation<T>;
    billboard: Billboard;
};

/**
 * Connects Cesium billboards with expandable DOM annotations.
 *
 * @typeParam T - Data type associated with each billboard and annotation.
 *
 * @remarks
 * `ClusterAnnotation` owns a Cesium {@link BillboardCollection}, maps each
 * billboard to application data, and opens a custom DOM annotation when a
 * mapped billboard is clicked.
 *
 * It does not inherit from `BillboardCollection`; composition keeps ownership
 * and cleanup explicit.
 *
 * When a billboard is selected:
 *
 * - The billboard is hidden.
 * - A custom element using `elementTag` is created.
 * - The matching data object is assigned to its `data` property.
 * - The element is embedded in a `<c-annotation>` wrapper.
 * - The wrapper is appended to `document.body`.
 * - Every Cesium pre-render event updates the wrapper's screen position.
 *
 * When the annotation emits a `close` event, the wrapper is removed and the
 * billboard becomes visible again.
 */
export class ClusterAnnotation<T extends Identifiable> {
    private _collection = new BillboardCollection({
        blendOption: BlendOption.TRANSLUCENT,
    });

    private _show = true;
    private _scene: Scene;

    /**
     * Mapping from Cesium billboards to their application data.
     */
    private _map = new Map<Billboard, T>();

    /**
     * Mapping from application IDs to their billboard instances.
     */
    private _billboardById = new Map<string, Billboard>();

    /**
     * Billboards temporarily hidden because a detailed annotation is open.
     *
     * @remarks
     * This set currently tracks hidden billboards but is not otherwise read.
     * It can be useful for future bulk visibility restoration or diagnostics.
     */
    private _hidden = new Set<Billboard>();

    /**
     * Open DOM annotations keyed by their associated data ID.
     */
    private _entries = new Map<string, AnnotationEntry<T>>();
    private _removeEventListener: () => void;

    /**
     * Updates data and optional billboard images for existing annotations.
     *
     * @param newData - Updated data objects, identified by `id`.
     * @param newBillboards - Optional replacement images aligned by index with
     * `newData`.
     *
     * @remarks
     * If an annotation is currently open, its custom element receives the updated
     * object through its `data` setter.
     */
    update(newData: Array<T>, newBillboards?: Array<string>) {
        for (const [i, data] of newData.entries()) {
            const entry = this._entries.get(data.id);
            if (entry) {
                entry.annotation.data = data;
            }

            const billboard = this._billboardById.get(data.id);

            if (!billboard) continue;

            if (newBillboards) billboard.image = newBillboards[i];

            this._map.set(billboard, data);
        }
    }

    /**
     * Creates a billboard-to-DOM-annotation manager.
     *
     * @param scene - Cesium scene receiving the billboard collection and
     * screen-position update listener.
     * @param eventTarget - Event target that emits the application's typed
     * `LEFT_CLICK_3D` event.
     * @param elementTag - Registered custom-element tag used to render the
     * detailed annotation content.
     *
     * @remarks
     * The selected annotation element must implement {@link Annotation} and emit
     * a `close` event when the user requests that it be dismissed.
     */
    constructor(scene: Scene, eventTarget: EventTarget, elementTag: string) {
        this._scene = scene;
        this._scene.primitives.add(this._collection);

        eventTarget.addEventListener(EVENT_TARGETS.LEFT_CLICK_3D, e => {
            //@ts-ignore
            const billboard = e.detail.feature?.primitive as Billboard;

            if (this._map.has(billboard)) {
                this._hideBillboard(billboard);

                const annotation = document.createElement(
                    elementTag,
                ) as Annotation<T>;

                const cAnnotation = document.createElement(
                    'c-annotation',
                ) as CAnnotation;

                cAnnotation.addEventListener('wheel', e => {
                    const wheelEvent = new WheelEvent('wheel', {
                        deltaX: e.deltaX,
                        deltaY: e.deltaY,
                        deltaZ: e.deltaZ,
                        deltaMode: e.deltaMode,
                    });

                    scene.canvas.dispatchEvent(wheelEvent);
                });

                cAnnotation.appendChild(annotation);

                const data = this._map.get(billboard);
                if (!data) return;

                annotation.data = data;

                document.body.appendChild(cAnnotation);

                const entry: AnnotationEntry<T> = {
                    position: billboard.position,
                    cAnnotation,
                    screenPosition: new Cartesian2(),
                    annotation,
                    billboard,
                };

                this._entries.set(data.id, entry);

                const controller = new AbortController();

                annotation.addEventListener(
                    'close',
                    () => {
                        this._showBillboard(billboard);
                        cAnnotation.remove();
                        this._entries.delete(data.id);
                        controller.abort();
                    },
                    {signal: controller.signal},
                );
            }
        });

        this._removeEventListener = scene.preRender.addEventListener(() => {
            for (const entry of this._entries.values()) {
                entry.cAnnotation.position =
                    SceneTransforms.worldToWindowCoordinates(
                        scene,
                        entry.position,
                        entry.screenPosition,
                    );
            }
        });
    }

    /**
     * Shows or hides every managed billboard and open DOM annotation.
     */
    set show(value) {
        this._collection.show = value;
        this._entries.forEach(entry => {
            entry.cAnnotation.style.display = value ? '' : 'none';
        });
        this._show = value;
    }

    get show() {
        return this._show;
    }

    /**
     * Adds a billboard and associates it with application data.
     *
     * @param prototype - Cesium billboard properties.
     * @param object - Application data associated with the billboard.
     * @returns The created Cesium billboard.
     *
     * @remarks
     * The data object's ID must be unique within this manager. Adding a second
     * object with the same ID replaces the ID-to-billboard lookup entry but leaves
     * the earlier billboard in the collection.
     */
    add(prototype: BillboardPrototype, object: T): Billboard {
        const billboard = this._collection.add(prototype);
        this._map.set(billboard, object);
        this._billboardById.set(object.id, billboard);
        return billboard;
    }

    /**
     * Removes all managed Cesium and DOM resources.
     */
    destroy() {
        this._removeEventListener();
        this._scene.primitives.remove(this._collection);
        this._entries.forEach(entry => entry.cAnnotation.remove());
        this._entries.clear();
        this._map.clear();
        this._billboardById.clear();
        this._hidden.clear();
    }

    /**
     * Hides a billboard while its detailed DOM annotation is displayed.
     *
     * @param billboard - Billboard to hide.
     */
    private _hideBillboard(billboard: Billboard) {
        this._hidden.add(billboard);
        billboard.show = false;
    }

    /**
     * Restores a billboard after its DOM annotation is closed.
     *
     * @param billboard - Billboard to make visible.
     */
    private _showBillboard(billboard: Billboard) {
        this._hidden.delete(billboard);
        billboard.show = true;
    }
}
