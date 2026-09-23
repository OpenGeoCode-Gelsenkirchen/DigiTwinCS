import {GeTree} from './GeTree';
import type {RenderStrategy} from './RenderStrategy';

/**
 * Render strategy for WMS layer trees.
 *
 * @remarks
 * WMS leaves are represented by checkbox controls. A group checkbox applies
 * its checked state to every input nested inside that group. Clicking the text
 * label toggles its corresponding checkbox without triggering native
 * `<summary>` expansion behavior.
 */
class WMSRenderStrategy implements RenderStrategy {
    /**
     * Creates a selectable WMS leaf entry.
     *
     * @param key - Human-readable leaf label and fallback identifier.
     * @param data - WMS metadata, optionally containing a `name` value.
     * @returns A `summary.leaf-summary` containing a checkbox and clickable label.
     *
     * @remarks
     * When `data.name` is a string, it is stored in the checkbox `value`
     * property. Consumers can retrieve selected WMS layer identifiers through
     * {@link WMSTree.checked}.
     */
    renderLeaf(key: string, data: object) {
        const summary = document.createElement('summary');
        summary.classList.add('leaf-summary');

        const div = document.createElement('div');

        const input = document.createElement('input');
        const span = document.createElement('span');

        span.textContent = key;
        input.type = 'checkbox';

        input.name = key;

        if ('name' in data) input.value = data.name as string;

        const toggleLeaf = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            input.checked = !input.checked;
        };

        span.addEventListener('click', toggleLeaf);

        div.appendChild(input);
        div.appendChild(span);

        summary.appendChild(div);
        return summary;
    }

    /**
     * Creates an expandable WMS group with a checkbox that selects or deselects
     * all nested WMS entries.
     *
     * @param key - Group label and checkbox value.
     * @returns A `<details>` element that receives recursively rendered children.
     */
    renderSummary(key: string) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');

        const div = document.createElement('div');
        const span = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = key;
        span.textContent = key;

        /**
         * Updates every checkbox contained by this group.
         *
         * @param checked - Checked state to apply.
         */
        const toggleAll = (checked: boolean) => {
            details.querySelectorAll('input').forEach(cb => {
                cb.checked = checked;
            });
        };

        /**
         * Toggles the group selection when the visible text label is clicked.
         *
         * @param event - Label click event.
         */
        const toggleSummary = (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            const checked = !input.checked;
            input.checked = checked;
            toggleAll(checked);
        };

        input.addEventListener('change', () => {
            toggleAll(input.checked);
        });

        span.addEventListener('click', toggleSummary);

        div.appendChild(input);
        div.appendChild(span);

        summary.appendChild(div);
        details.appendChild(summary);

        return details;
    }
}

/**
 * Tree custom element specialized for selecting WMS layer entries.
 *
 * @remarks
 * Use {@link checked} to obtain the selected leaf checkbox elements. The
 * returned inputs contain WMS layer names in their `value` property when the
 * corresponding source data provides a `name` field.
 */
export class WMSTree extends GeTree {
    /**
     * Configures the base tree with WMS-specific rendering behavior.
     */
    constructor() {
        super();
        this.renderStrategy = new WMSRenderStrategy();
    }

    /**
     * Currently selected WMS leaf controls.
     *
     * @returns Checked leaf checkbox elements. The result is empty when the
     * component has no shadow root or no selected leaves.
     *
     * @remarks
     * Read `input.value` from each returned element to retrieve the WMS layer
     * name assigned by {@link WMSRenderStrategy.renderLeaf}.
     */
    get checked() {
        if (this.shadowRoot) {
            return Array.from(
                this.shadowRoot.querySelectorAll(
                    '.leaf-summary > div > input:checked',
                ),
            );
        }
        return [];
    }
}
customElements.define('wms-tree', WMSTree);
