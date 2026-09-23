/**
 * Shared asynchronous cache for image assets used by custom elements, Cesium
 * billboards, and annotation icons.
 *
 * @remarks
 * The cache stores decoded source images and returns a fresh clone from
 * {@link get} for each caller. Returning clones is important because an
 * `HTMLImageElement` can only exist at one location in the DOM at a time:
 * appending a cached source image directly would move it out of a previously
 * rendered component.
 *
 * `IconCache.shared` provides the application's singleton cache.
 *
 * @example
 * ```ts
 * const closeIcon = await IconCache.shared.get('close');
 *
 * if (closeIcon) {
 *   closeButton.replaceChildren(closeIcon);
 * }
 * ```
 */
export class IconCache {
    static #instance: IconCache;

    /**
     * Shared application-wide icon cache.
     *
     * @returns The lazily initialized cache singleton.
     */
    static get shared() {
        return (this.#instance ??= new IconCache());
    }

    /**
     * Decoded source images indexed by asset URL, SVG markup, and optional
     * application-defined cache keys.
     */
    private _cache = new Map<string, HTMLImageElement>();

    /**
     * Retrieves a cloned, decoded image for a cached key or source identifier.
     *
     * @param key - Cache key, image URL, or SVG source string.
     * @returns A decoded clone of the cached image, or `undefined` when loading
     * fails to produce an image.
     *
     * @remarks
     * If no image is cached under `key`, this method attempts to load `key` as an
     * image URL or SVG string. The cached source image itself is never returned;
     * a clone is returned instead so each caller can safely insert its own image
     * into the DOM.
     *
     * The extra `decode()` call ensures that a cloned image is decoded before it
     * is returned. Depending on browser behavior and the clone source, this can
     * reject if the source image has not loaded successfully.
     */
    async get(s: string): Promise<HTMLImageElement | undefined> {
        const img = this._cache.get(s) ?? (await this.load(s));
        const clone = img.cloneNode(true) as HTMLImageElement;
        await clone.decode();
        return clone;
    }

    /**
     * Loads and caches an image from a URL or inline SVG markup.
     *
     * @param input - Image URL or SVG document string.
     * @param key - Optional additional cache key assigned to the loaded image.
     * @returns The decoded source image stored by the cache.
     *
     * @remarks
     * Inline SVG text is converted into a blob URL before assigning it to the
     * image source. The image is cached under `input` and, when supplied, also
     * under `key`.
     *
     * The method first checks the cache under `key ?? input`. This means callers
     * may avoid reloading an asset by using the same cache key consistently.
     *
     */
    async load(input: string, key?: string): Promise<HTMLImageElement> {
        const hit = this._cache.get(key ?? input);
        if (hit) return hit;

        let url;

        if (isSvgString(input)) {
            const blob = new Blob([input], {
                type: 'image/svg+xml;charset=utf-8',
            });
            url = URL.createObjectURL(blob);
        } else {
            url = input;
        }

        const img = new Image();
        img.src = url;

        await img.decode();

        this._cache.set(input, img);
        if (key) this._cache.set(key, img);
        return img;
    }

    /**
     * Loads all images from a key-to-source mapping concurrently.
     *
     * @param mapping - Mapping from semantic asset keys to image URLs or inline
     * SVG strings.
     * @returns Mapping from each source key to its cached decoded image.
     *
     * @remarks
     * This method returns the cached source images themselves, not clones. Do not
     * append these returned images directly to multiple DOM locations; use
     * {@link get} when a caller needs an independently insertable image element.
     *
     * All load operations begin concurrently. If any image fails to load or
     * decode, the entire `preloadAll` promise rejects.
     */
    async preloadAll(
        mapping: Record<string, string>,
    ): Promise<Record<string, HTMLImageElement>> {
        const entries = Object.entries(mapping);
        const result: Record<string, HTMLImageElement> = {};

        await Promise.all(
            entries.map(async ([key, url]) => {
                const img = await this.load(url, key);
                result[key] = img;
            }),
        );

        return result;
    }
}
/**
 * Determines whether a string appears to contain an inline SVG document.
 *
 * * @param value - String to inspect.
 * @returns `true` when the trimmed string starts with an SVG or XML declaration.
 *
 */
function isSvgString(str: string) {
    const trimmed = str.trimStart();
    return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml');
}
