import {deepMergeWithFullReplace} from './DeepMerger';
import {fetchSafely} from './utilities';
/**
 * ConfigEntry – Type alias for all supported config value forms.
 * May be a string (primitive or URL), an object (nested config), or an array of config objects.
 *
 * @typedef {string | Object | Object[]} ConfigEntry
 */
type ConfigEntry = string | Object | Array<Object>;

/**
 * Loads and parses a hierarchical configuration from a remote URL (JSON or TXT).
 * Fetches the resource, parses JSON, and resolves nested entries via URLs, arrays, or custom objects recursively.
 *
 * @async
 * @param {string} url - The URL of the config file (JSON or TXT).
 * @returns {Promise<Object>} Fully resolved config object.
 *
 * @example
 * const appConfig = await parseConfigFromUrl('https://example.com/conf.json');
 */
export async function parseConfigFromUrl(url: string): Promise<Object> {
    const config = await fetchSafely(url);
    return await parseConfigFromJson(config);
}

/**
 * Recursively parses and resolves a configuration object.
 * Handles "globalConfig" merging, nested URLs, arrays, and indirect references.
 *
 * For every key-value pair:
 *   - If the value is an array, all entries are resolved and flattened.
 *   - If the value is an object with "url" and "resolve" keys, it is replaced via that URL.
 *   - If the value is a string ending in ".json" (excluding "tileset.json"), loads and resolves its content.
 *   - If the value is a string ending in ".txt", reads comma-separated references and resolves each.
 *   - Otherwise, leaves the value as is.
 * If "globalConfig" exists as a key, its content is deeply merged with the resolved config using full replacement.
 *
 * @async
 * @param {Object} config - The input (possibly partially resolved) config object.
 * @returns {Promise<Object>} Fully resolved object.
 *
 * @example
 * const obj = await parseConfigFromJson({foo: "bar.json"});
 */
export async function parseConfigFromJson(config: Object): Promise<Object> {
    const entries = Object.entries(config);

    const resolvedEntries = await Promise.all(
        entries.map(async ([key, value]) => [key, await resolveEntry(value)]),
    );

    const resolved = Object.fromEntries(resolvedEntries);

    // Recursively merge globalConfig on top if present
    if (resolved.globalConfig) {
        return deepMergeWithFullReplace(resolved.globalConfig, resolved);
    }
    return resolved;
}

/**
 * Recursively resolves a config entry or nested config structure:
 * - Arrays: Each entry is resolved and flat-mapped.
 * - Objects: If containing "url" and "resolve", the "url" is resolved on the fly; otherwise, recurses into the object.
 * - Strings:
 *   - ".txt": Fetches, splits by comma, applies cleanup, and recursively resolves each item.
 *   - ".json" (excluding "tileset.json"): Fetches and parses as JSON, recurses unless resolve=false.
 * - Other entries are returned as-is.
 *
 * @async
 * @param {ConfigEntry} entry - The config entry to resolve.
 * @param {boolean} [resolve=true] - Whether to resolve referenced entries.
 * @returns {Promise<ConfigEntry>} The fully resolved value (string, object, or array).
 *
 * @example
 * const val = await resolveEntry('remote/config.json');
 */
export async function resolveEntry(
    entry: ConfigEntry,
    resolve = true,
): Promise<ConfigEntry> {
    if (Array.isArray(entry)) {
        const resolved = await Promise.all(entry.map(e => resolveEntry(e)));
        return resolved.flat(Infinity);
    } else if (typeof entry === 'object') {
        if ('url' in entry && 'resolve' in entry) {
            return await resolveEntry(
                (entry as any).url,
                (entry as any).resolve,
            );
        }
        return await parseConfigFromJson(entry);
    } else if (typeof entry === 'string') {
        if (entry.endsWith('.txt')) {
            const text = await fetchSafely(entry);
            if (resolve) {
                const items = text
                    .split(',')
                    .map((x: string) => x.replace(/[\n\r"]/g, ''));
                const resolved = await Promise.all(
                    items.map((x: string) => resolveEntry(x)),
                );
                return resolved.flat(Infinity);
            }
            return text;
        } else if (entry.endsWith('.json') && !entry.endsWith('tileset.json')) {
            const config = await fetchSafely(entry);
            if (!resolve) {
                return config;
            }
            return await parseConfigFromJson(config);
        }
    }
    return entry;
}
