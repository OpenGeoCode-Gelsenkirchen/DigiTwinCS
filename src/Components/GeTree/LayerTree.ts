import {GeTree, type TreeNode} from './GeTree';
import type {RenderStrategy} from './RenderStrategy';

/**
 * Render strategy that displays layer labels and emits application-level
 * selection events when layer nodes are toggled.
 *
 * @remarks
 * The strategy emits `ui:node:toggle` on `window`. Listeners outside the
 * shadow DOM can use the event to synchronize the application's layer state.
 */
class LayerRenderStrategy implements RenderStrategy {
    /**
     * Creates a selectable leaf node for a layer.
     *
     * @param key - Identifier emitted in the `ui:node:toggle` event payload.
     * @param value - Layer metadata containing an optional display label.
     * @returns A `div.leaf-summary` with a checkbox and label.
     */
    renderLeaf(key: string, value: TreeNode) {
        const div = document.createElement('div');
        div.classList.add('leaf-summary');

        const input = document.createElement('input');
        const span = document.createElement('span');

        span.textContent = value.label;
        input.type = 'checkbox';
        input.name = key;

        input.addEventListener('change', event => {
            if (event.target) {
                window.dispatchEvent(
                    new CustomEvent('ui:node:toggle', {
                        detail: {
                            id: key,
                            value: (<HTMLInputElement>event.target).checked,
                        },
                    }),
                );
                //layer.show = (<HTMLInputElement>event.target).checked;
            }
        });

        div.appendChild(input);
        div.appendChild(span);

        return div;
    }

    /**
     * Creates an expandable layer group.
     *
     * @param key - Identifier emitted when the group checkbox changes.
     * @param layer - Group metadata containing an optional display label.
     * @returns A `<details>` element that receives child tree elements.
     *
     * @remarks
     * Toggling the group checkbox updates the checked state of all descendant
     * inputs in the UI. It emits one event for the group itself, but does not
     * emit separate events for each descendant layer.
     */
    renderSummary(key: string, layer: TreeNode) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');

        const div = document.createElement('div');
        const span = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = key;

        input.addEventListener('change', event => {
            window.dispatchEvent(
                new CustomEvent('ui:node:toggle', {
                    detail: {
                        id: key,
                        value: (<HTMLInputElement>event.target).checked,
                    },
                }),
            );
            details.querySelectorAll('input').forEach(node => {
                if (event.target) {
                    node.checked = (<HTMLInputElement>event.target).checked;
                    //node.dispatchEvent(new Event('change')); //<HTMLInputElement>event.target).checked;
                }
            });
        });

        div.appendChild(input);
        span.textContent = layer.label;
        div.appendChild(span);

        summary.appendChild(div);
        details.appendChild(summary);

        return details;
    }
}

/**
 * Tree custom element specialized for selectable application layers.
 *
 * @remarks
 * This component inherits recursive data rendering from {@link GeTree}, but
 * uses {@link LayerRenderStrategy} to display `TreeNode.label` values and emit
 * `ui:node:toggle` events on the global window object.
 */
export class LayerTree extends GeTree {
    constructor() {
        super();
        this.renderStrategy = new LayerRenderStrategy();
    }
}

customElements.define('layer-tree', LayerTree);
