import {
    CameraEventType,
    Cartesian2,
    Cartesian3,
    Cesium3DTileFeature,
    Color,
    Entity,
    KeyboardEventModifier,
    Scene,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
} from '@cesium/engine';
import {GeInfobox} from '../Components/GeInfobox/GeInfobox';
import {RIGHT_CLICK} from '../constants';
import {Picked, type RawType} from './Picked';

function same(pickedA: Picked, pickedB: Picked) {
    return (
        pickedA.content !== undefined &&
        pickedB.content !== undefined &&
        pickedA.content === pickedB.content
    );
}

export const {LEFT_DRAG, MIDDLE_DRAG, RIGHT_DRAG, WHEEL, PINCH} =
    CameraEventType;

export const {
    LEFT_CLICK,
    LEFT_DOWN,
    LEFT_UP,
    RIGHT_DOWN,
    RIGHT_UP,
    MOUSE_MOVE,
} = ScreenSpaceEventType;

export type PickColor = {
    opaque: Color;
    transparent: Color;
};

export type CesiumMouseButtonEvent = {
    position: Cartesian2;
};

export type CesiumMouseMoveEvent = {
    startPosition: Cartesian2;
    endPosition: Cartesian2;
};

type Action = (event: unknown) => void;

type HandlerCollection = Map<string, Array<Action>>;

export type CustomEntity = Entity & {selectable?: boolean};
export type Feature = Cesium3DTileFeature | CustomEntity;

export const EVENT_TARGETS = {
    LEFT_CLICK: 'viewer-left-click',
    LEFT_CLICK_3D: 'viewer-left-click-3d',
    LEFT_UP: 'viewer-left-up',
    LEFT_DOWN: 'viewer-left-down',
    LEFT_DOWN_3D: 'viewer-left-down-3d',
    MOUSE_MOVE: 'viewer-mouse-move',
    MOUSE_MOVE_3D: 'viewer-mouse-move-3d',
    RIGHT_CLICK: 'viewer-right-click',
    RIGHT_CLICK_3D: 'viewer-right-click-3d',
    RIGHT_UP: 'viewer-right-up',
    RIGHT_DOWN: 'viewer-right-down',
    WHEEL: 'viewer-wheel',
} as const;

export type EventTargetName =
    (typeof EVENT_TARGETS)[keyof typeof EVENT_TARGETS];

export class EventHandler {
    public static instance: EventHandler;
    public events: EventTarget;
    public showInfobox = true;
    public allowSelection = true;
    public allowHighlight = true;

    public lastValidPickedPosition = new Cartesian3();
    public lastValidPickedFeature?: Feature;

    public highlightColor?: PickColor;
    public selectionColor?: PickColor;

    public overrideDragging = false;
    private _tmpPickedPosition = new Cartesian3();
    private _pickOut: {
        position?: Cartesian3;
        feature?: Feature;
    } = {};

    private _scene: Scene;
    private _screenSpaceEventHandler: ScreenSpaceEventHandler;

    private _infobox: GeInfobox = new GeInfobox();
    private _handlers: HandlerCollection = new Map<string, Array<Action>>();
    private _interval = 0;

    private _newPicked: Picked = new Picked();
    private _highlighted = new Picked();
    private _selected = new Picked();

    private _originalColorMap = new WeakMap<object, Color>();
    private _isDragging = false;

    constructor({
        scene,
        canvas,
        highlightColor,
        selectionColor,
    }: {
        scene: Scene;
        canvas: HTMLCanvasElement;
        highlightColor?: PickColor;
        selectionColor?: PickColor;
    }) {
        if (!EventHandler.instance) {
            EventHandler.instance = this;
        }

        this._scene = scene;
        this.highlightColor = highlightColor;
        this.selectionColor = selectionColor;

        this.events = new EventTarget();

        this._screenSpaceEventHandler = new ScreenSpaceEventHandler(canvas);
        document.body.appendChild(this._infobox);

        this._addEventHandlers();

        canvas.addEventListener('mouseleave', () => {
            this.unhighlight();
            this._highlighted.set(undefined);
        });
    }

    public enableHighlighting() {
        this.flush();
        this.allowHighlight = true;
        this.allowSelection = true;
    }

    public disableHighlighting() {
        this.flush();
        this.allowHighlight = false;
        this.allowSelection = false;
    }

    public addInputAction(
        callback: Action,
        type: ScreenSpaceEventType,
        modifier?: KeyboardEventModifier,
    ) {
        const key = modifier == null ? String(type) : `${type}:${modifier}`;

        if (!this._handlers.has(key)) {
            this._handlers.set(key, []);
        }

        const handler = this._handlers.get(key)!;
        handler.push(callback);

        const throttled = this.throttle(event => {
            handler.forEach(cb => cb(event));
        }, this._interval);

        this._screenSpaceEventHandler.setInputAction(
            (event: unknown) => {
                throttled(event);
            },
            type,
            modifier,
        );

        return () => {
            this.removeInputAction(callback, type, modifier);
        };
    }

    public removeInputAction(
        callback: Action,
        type: ScreenSpaceEventType,
        modifier?: KeyboardEventModifier,
    ) {
        const key = modifier == null ? String(type) : `${type}:${modifier}`;

        if (!this._handlers.has(key)) return;

        const handler = this._handlers.get(key)!;
        const index = handler.indexOf(callback);
        if (index < 0) return;

        handler.splice(index, 1);

        if (handler.length === 0) {
            this._screenSpaceEventHandler.removeInputAction(type, modifier);
            this._handlers.delete(key);
        }
    }

    private throttle(func: Action, wait: number) {
        let lastTime: number = 0;
        let timeout: ReturnType<typeof setTimeout> | null = null;

        return function (event: unknown) {
            const now = Date.now();
            const remaining = wait - (now - lastTime);

            if (remaining <= 0) {
                if (timeout !== null) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                lastTime = Date.now();
                func(event);
                return;
            }

            if (timeout === null) {
                timeout = setTimeout(() => {
                    lastTime = Date.now();
                    timeout = null;
                    func(event);
                }, remaining);
            }
        };
    }

    private _pick(position: Cartesian2) {
        const picked = this._scene.pickPosition(
            position,
            this._tmpPickedPosition,
        );

        if (picked)
            this.lastValidPickedPosition = picked.clone(
                this.lastValidPickedPosition,
            );

        return picked;
    }

    private _pickPositionAndFeature(position: Cartesian2) {
        this._pickOut.position = this._pick(position);
        try {
            this._scene.pickTranslucentDepth = true;
            this._pickOut.feature = this._scene.pick(position);
            this._scene.pickTranslucentDepth = false;
            if (this._pickOut.feature)
                this.lastValidPickedFeature = this._pickOut.feature;
        } catch (error) {
            console.error('Could not pick a valid feature:', error);
        } finally {
            this._scene.pickTranslucentDepth = false;
        }

        return this._pickOut;
    }

    private _emit(target: EventTargetName, payload: unknown) {
        this.events.dispatchEvent(
            new CustomEvent(target, {
                detail: payload,
            }),
        );
    }

    private _addEventHandlers() {
        this.addInputAction(event => {
            const e = event as CesiumMouseButtonEvent;
            this._emit(EVENT_TARGETS.LEFT_CLICK, e);
            const pick = this._pickPositionAndFeature(e.position);

            if (this.allowSelection) {
                this._handleSelection(pick.feature);
            }

            this._emit(EVENT_TARGETS.LEFT_CLICK_3D, pick);
        }, LEFT_CLICK);

        this.addInputAction(event => {
            this._isDragging = false;
            const e = event as CesiumMouseButtonEvent;
            this._emit(EVENT_TARGETS.LEFT_UP, e);
        }, LEFT_UP);

        this.addInputAction(event => {
            this._isDragging = true;
            const e = event as CesiumMouseButtonEvent;
            this._emit(EVENT_TARGETS.LEFT_DOWN, e);
            const pick = this._pickPositionAndFeature(e.position);
            this._emit(EVENT_TARGETS.LEFT_DOWN_3D, pick);
        }, LEFT_DOWN);

        this.addInputAction(event => {
            const e = event as CesiumMouseButtonEvent;
            this._emit(EVENT_TARGETS.RIGHT_CLICK, e);
        }, RIGHT_CLICK);

        this.addInputAction(event => {
            this._isDragging = false;
            const e = event as CesiumMouseButtonEvent;
            this._emit(EVENT_TARGETS.RIGHT_UP, e);
        }, RIGHT_UP);

        this.addInputAction(event => {
            this._isDragging = true;
            const e = event as CesiumMouseButtonEvent;
            this._emit(EVENT_TARGETS.RIGHT_DOWN, e);
        }, RIGHT_DOWN);

        this.addInputAction(event => {
            if (!this.overrideDragging && this._isDragging) return;
            const e = event as CesiumMouseMoveEvent;
            this._emit(EVENT_TARGETS.MOUSE_MOVE, e);

            const pick = this._pickPositionAndFeature(e.endPosition);

            if (this.allowHighlight) {
                this._handleHighlight(pick.feature);
            }

            this._emit(EVENT_TARGETS.MOUSE_MOVE_3D, pick);
        }, MOUSE_MOVE);

        this._infobox.events.addEventListener('close', () => {
            this.unselect();
        });
    }

    private _handleHighlight(raw: RawType) {
        this._newPicked.set(raw);

        if (
            this._newPicked.content !== undefined &&
            !this._originalColorMap.has(this._newPicked.content)
        ) {
            const color = this._newPicked.color?.clone();
            if (color)
                this._originalColorMap.set(this._newPicked.content, color);
        }

        if (
            same(this._highlighted, this._newPicked) ||
            same(this._selected, this._newPicked)
        ) {
            return;
        }

        //reset to original color
        if (this._highlighted.content) {
            try {
                const color = this._originalColorMap.get(
                    this._highlighted.content,
                );
                if (color)
                    this._highlighted.color = color.clone(
                        this._highlighted.color,
                    );
            } catch {
                console.warn('highlighted object not existing anymore');
            }
        }

        //set new current
        this._highlighted.set(raw);

        //highlight current
        if (
            this._highlighted &&
            this.highlightColor?.transparent &&
            this.highlightColor?.opaque
        ) {
            const c =
                this.highlightColor[
                    this._highlighted.type === 'entity'
                        ? 'transparent'
                        : 'opaque'
                ];
            this._highlighted.color = c.clone(this._highlighted.color);
        }
    }

    public flush() {
        this.unhighlight();
        this.unselect();
        this._originalColorMap = new WeakMap();
    }

    public unhighlight() {
        if (this._highlighted.content) {
            const color = this._originalColorMap.get(this._highlighted.content);
            if (color)
                this._highlighted.color = color.clone(this._highlighted.color);
        }
    }

    public unselect() {
        if (this._selected.content) {
            const color = this._originalColorMap.get(this._selected.content);

            if (color) {
                this._selected.color = color.clone(this._selected.color);
            }

            this._infobox.show = false;

            this._selected.set(undefined);
            this._highlighted.set(undefined);

            this.events.dispatchEvent(new CustomEvent('unselect'));
        }
    }

    private _handleSelection(raw: RawType) {
        this._newPicked.set(raw);

        if (
            this._newPicked.content !== undefined &&
            !this._originalColorMap.has(this._newPicked.content)
        ) {
            const color = this._newPicked.color?.clone();
            if (color)
                this._originalColorMap.set(this._newPicked.content, color);
        }

        if (same(this._selected, this._newPicked)) {
            this.unselect();
            return;
        }

        //reset to original color
        if (this._selected.content) {
            try {
                const color = this._originalColorMap.get(
                    this._selected.content,
                );
                if (color)
                    this._selected.color = color.clone(this._selected.color);
            } catch {
                console.warn('selected object not existing anymore');
            }

            this._infobox.show = false;
        }

        //set new current
        this._selected.set(raw);

        //reset picked and color in highlighting state
        this._highlighted.set(undefined);

        //highlight current
        if (this._selected && this.selectionColor) {
            const c =
                this.selectionColor[
                    this._selected.type === 'entity' ? 'transparent' : 'opaque'
                ];
            this._selected.color = c.clone(this._selected.color);
        }

        if (!this.showInfobox) return;

        if (this._selected.type === 'tiles' && this._selected.content) {
            const table = this._selected.propertyTable;

            if (!this._selected.title && table.length == 0) return;

            this._infobox.show = true;
            this._infobox.title = this._selected.title || '';
            this._infobox.table = table;
        } else if (this._selected.type === 'entity') {
            if (
                !this._selected.propertyTable ||
                (this._selected?.content as CustomEntity)?.selectable === false
            )
                return;

            this._infobox.title = this._selected.title;
            this._infobox.table = this._selected.propertyTable;
            this._infobox.show = true;
        }
    }
}
