import styles from './GeTree.css?raw';
import template from './GeTree.html?raw';
import {DefaultRenderStrategy, type RenderStrategy} from './RenderStrategy';

/**
 * A recursively renderable tree node.
 *
 * @remarks
 * A node with a `children` property is rendered as a branch. Every other node
 * is rendered as a leaf by the active {@link RenderStrategy}.
 *
 * Additional properties are intentionally allowed so specialized tree
 * implementations can attach metadata such as labels, IDs, URLs, or layer
 * references.
 */
export interface TreeNode {
    /**
     * Child nodes keyed by their display or identifier value.
     */
    children?: Record<string, TreeNode>;

    /**
     * Additional metadata consumed by a specialized render strategy.
     */
    [key: string]: any;
}

/**
 * Base custom element for rendering nested object data as an expandable tree.
 *
 * @remarks
 * The component delegates creation of branch and leaf elements to
 * {@link renderStrategy}. Subclasses can provide a specialized strategy for
 * their data model, such as WMS layers or application layers.
 *
 * Calling {@link render} appends a newly created tree to the existing wrapper.
 * It does not clear previously rendered content.
 *
 * @example
 * ```ts
 * const tree = document.querySelector('ge-tree') as GeTree;
 *
 * tree.render({
 *   basemaps: {
 *     children: {
 *       osm: {},
 *       satellite: {},
 *     },
 *   },
 * });
 *
 * tree.expand();
 * ```
 */
export class GeTree extends HTMLElement {
    /**
     * Cached references to elements in this component's shadow DOM.
     */
    private html: {
        /**
         * Container receiving rendered tree elements.
         */
        wrapper: HTMLElement | null;
    };

    /**
     * Optional property name used by specialized render strategies as an item key.
     *
     * @remarks
     * This base implementation does not currently consume the property.
     */
    public keyIdentifier: string = '';

    /**
     * Optional property name used by specialized render strategies as a display
     * value or data value.
     *
     * @remarks
     * This base implementation does not currently consume the property.
     */
    public valueIdentifier: string = '';

    /**
     * Optional additional property names consumed by specialized render
     * strategies.
     *
     * @remarks
     * This base implementation does not currently consume these identifiers.
     */
    public additionalIdentifiers: string[] = [];

    /**
     * Strategy used to render tree branches and leaves.
     *
     * @defaultValue `new DefaultRenderStrategy()`
     */
    public renderStrategy: RenderStrategy = new DefaultRenderStrategy();

    /**
     * Creates the component shadow DOM and initializes the tree wrapper.
     */
    constructor() {
        super();

        this.attachShadow({mode: 'open'});
        this.shadowRoot!.innerHTML = `
            <style>${styles}</style>
            ${template}
        `;

        this.html = {
            wrapper: this.shadowRoot!.querySelector(
                '.wrapper',
            ) as HTMLElement | null,
        };
    }

    /**
     * Opens every expandable branch currently rendered in the tree.
     */
    expand(): void {
        this.shadowRoot?.querySelectorAll('details').forEach(detail => {
            (detail as HTMLDetailsElement).open = true;
        });
    }

    /**
     * Renders a data tree and appends it to the component wrapper.
     *
     * @param data - Root-level nodes to render.
     *
     * @remarks
     * Existing rendered content is preserved. Call `replaceChildren()` on the
     * wrapper before rendering if a full replacement is required.
     */
    render(data: TreeNode): void {
        if (!this.html?.wrapper) return;
        const tree = this.makeTree(data);
        if (tree) this.html.wrapper.appendChild(tree);
    }

    /**
     * Recursively converts tree data into a DOM subtree.
     *
     * @param data - Nodes at the current depth of the tree.
     * @returns A container holding rendered nodes, or `null` when no data is
     * provided.
     */
    makeTree(data: Record<string, TreeNode>): HTMLElement | null {
        if (!data) return null;

        const tree = document.createElement('div');
        for (const [key, value] of Object.entries(data)) {
            if (value.children) {
                const container = this.renderStrategy.renderSummary(key, value);
                const subtree = this.makeTree(value.children);
                if (subtree) container.appendChild(subtree);
                tree.appendChild(container);
            } else {
                const leaf = this.renderStrategy.renderLeaf(key, value);
                tree.appendChild(leaf);
            }
        }
        return tree;
    }
}

customElements.define('ge-tree', GeTree);
