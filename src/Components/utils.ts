/**
 * Retrieves a required descendant element from a DOM root.
 *
 * @typeParam T - Expected type of the queried element.
 * @param root - Element, document fragment, or shadow root to search.
 * @param selector - CSS selector that identifies the required element.
 * @returns The matching element, cast to `T`.
 * @throws {Error} Thrown when no matching element exists.
 */
export function mustQuery<T extends Element>(
    root: ParentNode,
    selector: string,
): T {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`Missing element: ${selector}`);
    return el as T;
}
