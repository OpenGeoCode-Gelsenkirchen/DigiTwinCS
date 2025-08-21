/**
 * URLManager – Utility for managing and mutating browser URL query parameters in a type-safe, structured way.
 *
 * Encapsulates URL query string parsing, updating, and browser history URL manipulation, providing an easy-to-use API
 * for reading, updating, deleting, and previewing query parameters.
 *
 * @class
 *
 * @param {Window} window - The browser window object. Required for location/history access.
 *
 * @property {URLSearchParams} params - Current parsed query parameters (syncs with location.search).
 * @property {Window} window - The window object supplied to the manager.
 *
 * @method get(key, parser?, defaultValue?) - Fetches a parameter, with optional type/array parsing and a default fallback.
 * @method set(key, value) - Sets a query parameter key to value and updates the URL.
 * @method delete(key) - Removes a parameter by key and updates the URL.
 * @method update(updates) - Performs a bulk set/delete on multiple parameters, then updates the URL.
 * @method getUpdatedURLString(updates) - Returns a new URL instance with updates applied, but does not modify the real URL.
 *
 * @example
 * const url = new URLManager(window);
 * url.set("mode", "dark");
 * url.get("mode")               // => "dark"
 * url.get("debug", "boolean")   // => false
 * url.get("id", "number")       // => 0 if unset
 * url.update({foo: "bar", xyz: undefined});
 * url.delete("foo");
 *
 * // Preview a URL state:
 * const previewUrl = url.getUpdatedURLString({hello: "world"});
 */
export class URLManager {
    /**
     * Reference to all current query search parameters.
     * @type {URLSearchParams}
     */
    public params: URLSearchParams;

    /**
     * Browser window in effect (must be supplied).
     * @type {Window}
     */
    public window: Window;

    /**
     * @param {Window} window
     */
    constructor(window: Window) {
        this.window = window;
        this.params = new URLSearchParams(window.location.search);
    }

    /**
     * (Internal) Updates the browser URL bar to reflect current params, using replaceState.
     * @private
     */
    _updateURL(): void {
        const newURL = `${this.window.location.pathname}?${this.params.toString()}`;
        this.window.history.replaceState(null, '', newURL);
    }

    /**
     * Gets a query parameter's value by key, parsing it optionally as a number, boolean, or array.
     * If the parameter does not exist, returns defaultValue (default: 0).
     *
     * @param {string} key - Parameter name.
     * @param {"number"|"boolean"|"array"} [parser] - If given, parse the value accordingly.
     * @param {any} [defaultValue=0] - Default fallback if not found in query.
     * @returns {string|number|boolean|Array<string>} - Parsed value, or the default.
     *
     * @example
     * url.get("id", "number");     // returns a number
     * url.get("mode", "boolean");  // returns true/false
     * url.get("tags", "array");    // returns ["foo","bar"]
     */
    get(
        key: string,
        parser?: 'number' | 'boolean' | 'array',
        defaultValue: any = 0,
    ) {
        const value = this.params.get(key);
        if (value === null) return defaultValue;

        switch (parser) {
            case 'number':
                return parseFloat(value);
            case 'boolean':
                return value === 'true' || value === '1';
            case 'array':
                return value.split(',');
            default:
                return value;
        }
    }

    /**
     * Sets a parameter and updates the URL in the browser.
     * @param {string} key
     * @param {any} value
     */
    set(key: string, value: any) {
        this.params.set(key, value);
        this._updateURL();
    }

    /**
     * Deletes a parameter by key, immediately updating the browser URL.
     * @param {string} key
     */
    delete(key: string) {
        this.params.delete(key);
        this._updateURL();
    }

    /**
     * Bulk set/delete for multiple keys.
     * For every property on updates, if value is undefined, deletes it; else sets it.
     * @param {Object} updates - Key/value pairs (undefined values will trigger deletion).
     */
    update(updates: Object): void {
        Object.entries(updates).forEach(([key, value]) => {
            value === undefined ? this.delete(key) : this.set(key, value);
        });
    }

    /**
     * Creates and returns a URL instance representing the current page, but with the given updates applied.
     * Does not mutate the real browser URL.
     *
     * @param {Object} updates - Key/values to set/delete (undefined = delete).
     * @returns {URL}
     *
     * @example
     * const url = urlManager.getUpdatedURLString({foo: "bar"});
     * // can use url.href to preview
     */
    getUpdatedURLString(updates: Object): URL {
        const url = new URL(this.window.location.href);

        Object.entries(updates).forEach(([key, value]) => {
            value === undefined
                ? url.searchParams.delete(key)
                : url.searchParams.set(key, value);
        });

        return url;
    }
}
