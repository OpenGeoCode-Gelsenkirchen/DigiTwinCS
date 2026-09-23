/**
 * Downloads a delimiter-separated service list and parses it into rows.
 *
 * @param url - URL of the text file containing one service entry per line.
 * @param interLineDelimiter - Delimiter separating values within one line.
 * @param lineDelimiter - Delimiter separating individual list entries.
 * @returns Parsed non-empty rows, with each row split into its individual
 * fields.
 *
 * @throws {Error} Thrown when the list request returns a non-success HTTP
 * status.
 *
 * @remarks
 * Windows (`\r\n`) and legacy Mac (`\r`) line endings are normalized to `\n`
 * before splitting. Empty or whitespace-only lines are ignored.
 *
 * @example
 * Given a list file:
 *
 * ```text
 * https://example.com/wms;Road map
 * https://example.com/orthophoto;Orthophoto
 * ```
 *
 * `parseURLList()` returns:
 *
 * ```ts
 * [
 *   ['https://example.com/wms', 'Road map'],
 *   ['https://example.com/orthophoto', 'Orthophoto'],
 * ]
 * ```
 */
async function parseURLList(
    url: string,
    interLineDelimiter: string = ';',
    lineDelimiter: string = '\n',
) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    if (!text.trim()) return [];

    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split(lineDelimiter)
        .filter(line => line.trim())
        .map(line => line.split(interLineDelimiter));
}

/**
 * Metadata represented by a WMS capabilities `<Layer>` element.
 *
 * @remarks
 * A layer with a `name` is requestable through the WMS `LAYERS` parameter.
 * A layer without a `name`, but with nested `children`, is treated as an
 * organizational category. WMS capabilities may nest layers recursively.
 */
interface WMSLayerData {
    name?: string;
    children?: Record<string, WMSLayer>;
}

/**
 * Recursive UI tree describing WMS layers.
 *
 * @remarks
 * Keys are layer titles intended for display. Values store the optional
 * requestable WMS name and nested child layers.
 *
 * @example
 * ```ts
 * const layers: WMSLayer = {
 *   Basemaps: {
 *     children: {
 *       Orthophoto: {
 *         name: 'orthophoto_2025',
 *       },
 *     },
 *   },
 * };
 * ```
 */
interface WMSLayer {
    [title: string]: WMSLayerData;
}

/**
 * Loads and parses WMS service lists and `GetCapabilities` documents.
 *
 * @remarks
 * A WMS capabilities document advertises service operations and an optionally
 * nested hierarchy of `<Layer>` elements inside `<Capability>`. This parser
 * extracts that hierarchy into {@link WMSLayer} objects suitable for use with a
 * tree UI.
 *
 * The timeout applies only to the capabilities request. It is expressed in
 * milliseconds.
 */
export class WMSParser {
    private timeout: number;

    constructor(timeout = 5000) {
        this.timeout = timeout;
    }

    /**
     * Loads a delimiter-separated WMS service list.
     *
     * @param url - URL of the service-list text file.
     * @returns Non-empty list rows split by the configured field delimiter.
     */
    async parseServiceList(url: string): Promise<string[][]> {
        return parseURLList(url);
    }

    /**
     * Requests, validates, and parses a WMS `GetCapabilities` XML document.
     *
     * @param url - Base URL of the WMS service.
     * @returns The document's `<Capability>` element, or `null` when no such
     * element exists.
     *
     * @throws {Error} Thrown when the HTTP request fails or the response contains
     * invalid XML.
     * @throws {DOMException} Thrown when the request is aborted by the timeout.
     *
     * @remarks
     * The request includes the standard `SERVICE=WMS` and
     * `REQUEST=GetCapabilities` parameters.
     *
     * XML parsing uses `DOMParser`. An invalid XML document produces a document
     * containing a `parsererror` node, which is checked explicitly.
     */
    async getWMSCapabilities(url: string): Promise<Element | null> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(
                `${url}?Request=GetCapabilities&SERVICE=WMS`,
                {signal: controller.signal},
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            const dom = new DOMParser().parseFromString(text, 'text/xml');

            if (dom.querySelector('parsererror')) {
                throw new Error('Invalid XML');
            }

            return dom.querySelector('Capability');
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Recursively converts a WMS `<Layer>` element into a tree node.
     *
     * @param layerElement - WMS XML `<Layer>` element to convert.
     * @returns Tree node keyed by the layer title, or `null` when no usable layer
     * data can be derived.
     *
     * @remarks
     * The `<Title>` is the human-readable label used as the object key. `<Name>`
     * is retained separately because only named WMS layers can be requested in a
     * `GetMap` `LAYERS` parameter. Layers without a `<Name>` are valid category
     * layers that organize nested requestable children.
     *
     * `:scope > ...` restricts queries to direct children, preventing a parent
     * layer from accidentally reading a descendant layer's name or title.
     */
    getLayers(layerElement: Element): WMSLayer | null {
        const name =
            layerElement.querySelector(':scope > Name')?.textContent || '';
        const title =
            layerElement.querySelector(':scope > Title')?.textContent || name;
        //if (name === '' && title === '') return null;

        const childElements = Array.from(
            layerElement.querySelectorAll(':scope > Layer'),
        );

        const children: Record<string, WMSLayer> = {};

        for (const child of childElements) {
            const childLayer = this.getLayers(child);
            if (childLayer) {
                Object.assign(children, childLayer);
            }
        }

        const layerData: WMSLayerData = {};

        if (name !== '') layerData['name'] = name;

        if (Object.keys(children).length > 0) {
            layerData.children = children;
        }

        /**
         * WMS requires a title, but malformed services can omit it. Falling back to
         * `name` keeps named layers usable. If both strings are empty, this
         * produces an empty object key; return `null` instead if such layers should
         * be omitted from the UI.
         */
        return {[title || name]: layerData};
    }

    /**
     * Loads a WMS capabilities document and extracts its root layer tree.
     *
     * @param url - Base URL of the WMS service.
     * @returns Nested layer tree, or `null` when the service exposes no usable
     * capability or root-layer element.
     *
     * @throws {Error} Propagates request and XML parsing errors from
     * {@link getWMSCapabilities}.
     */
    async getLayerTree(url: string): Promise<WMSLayer | null> {
        const capabilities = await this.getWMSCapabilities(url);
        if (!capabilities) {
            return null;
        }
        const rootLayer = capabilities.querySelector(':scope > Layer');

        return rootLayer ? this.getLayers(rootLayer) : null;
    }
}
