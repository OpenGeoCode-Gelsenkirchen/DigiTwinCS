//@ts-ignore

import type {ILayer} from '../../Core/Layer';

/**
 * Defines how {@link GeTree} converts branch and leaf nodes into DOM elements.
 *
 * @remarks
 * Implementations may use the node value to derive labels, checkbox state,
 * custom events, or application-specific data attributes.
 */
export interface RenderStrategy {
    /**
     * Renders a branch node containing child nodes.
     *
     * @param key - Key under which the branch is stored in its parent node.
     * @param value - Branch data and metadata.
     * @returns A container element that can receive the rendered child subtree.
     */
    renderSummary(key: string, value?: any): HTMLElement;

    /**
     * Renders a leaf node without child nodes.
     *
     * @param key - Key under which the leaf is stored in its parent node.
     * @param value - Leaf data and metadata.
     * @returns The rendered leaf element.
     */
    renderLeaf(key: string, value?: object): HTMLElement;
}

/**
 * Default tree rendering strategy using native `<details>` elements for
 * branches and checkboxes for both branches and leaves.
 *
 * @remarks
 * Changing a branch checkbox updates the checked state of all descendant
 * checkboxes. This default strategy updates the DOM only; it does not emit
 * application events or modify layer visibility.
 */
export class DefaultRenderStrategy implements RenderStrategy {
    /**
     * Creates a checkbox-based leaf element.
     *
     * @param key - Leaf key displayed beside the checkbox.
     * @param value - Leaf metadata.
     * @returns A `div.leaf-summary` containing a checkbox and text label.
     *
     * @remarks
     * `value` is accepted to satisfy {@link RenderStrategy}, but the default
     * implementation currently uses only `key`.
     */
    renderLeaf(key: string, value: object) {
        const div = document.createElement('div');
        div.classList.add('leaf-summary');

        const input = document.createElement('input');
        const span = document.createElement('span');

        span.textContent = key;
        input.type = 'checkbox';

        input.name = key;

        div.appendChild(input);
        div.appendChild(span);

        return div;
    }

    /**
     * Creates an expandable branch with a checkbox that controls descendant
     * checkbox state.
     *
     * @param key - Branch key displayed in the summary.
     * @param value - Branch layer metadata.
     * @returns A `<details>` element whose descendants can be appended by
     * {@link GeTree.makeTree}.
     *
     * @remarks
     * The branch checkbox itself is included in the descendant selector, so it
     * remains synchronized with the selected state it propagates.
     */
    renderSummary(key: string, value: ILayer) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');

        const div = document.createElement('div');
        const span = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = key;

        input.addEventListener('change', event => {
            details.querySelectorAll('input').forEach(node => {
                if (event.target)
                    node.checked = (<HTMLInputElement>event.target).checked;
            });
        });

        div.appendChild(input);
        span.textContent = key;
        div.appendChild(span);

        summary.appendChild(div);
        details.appendChild(summary);

        return details;
    }
}
