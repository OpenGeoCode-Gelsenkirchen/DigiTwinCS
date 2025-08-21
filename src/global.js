import {Cesium3DTileStyle, defined} from '@cesium/engine';

/**
 * Stores global application variables related to display styling and entity visibility.
 *
 * @namespace Variables
 * @property {string} TEXTURE_STYLE - The current texture style used in the application.
 * @property {Object.<string, Array>} hideIDs - Map of entity groups to their arrays of hidden IDs.
 */
export const Variables = {
    TEXTURE_STYLE: 'default',
    hideIDs: {
        default: new Set(),
    },
};

window.Variables = Variables;
/**
 * Stores handler references for Cesium ScreenSpaceEventHandlers.
 * Used to manage and track interactive event listeners throughout the application.
 *
 * @namespace Handlers
 */
export const Handlers = {}; // object for ScreenSpaceEventHandlers
// eslint-disable-next-line prefer-const

/**
 * Restricts a value to a defined minimum and/or maximum.
 * Returns the minimum if the value is below, the maximum if above, or the value itself if in range.
 * Throws if min > max and both are defined.
 *
 * @param {number} value - The value to clamp.
 * @param {number} [min] - Optional lower bound (inclusive).
 * @param {number} [max] - Optional upper bound (inclusive).
 * @throws {Error} If min > max.
 * @returns {number} The clipped value.
 */
export function clipValue(value, min = undefined, max = undefined) {
    if (defined(min) && defined(max) && min > max) {
        throw Error('Minimum larger than max');
    }
    if (defined(min) && value < min) {
        return min;
    }
    if (defined(max) && value > max) {
        return max;
    }
    return value;
}

/**
 * Asynchronously generates a Cesium3DTileStyle that hides any features
 * whose IDs appear in the provided deletion list object, by setting their "show" property to false.
 * Pre-existing style show conditions and color are preserved.
 *
 * @async
 * @param {Object} style - The base Cesium3DTileStyle or style definition object.
 * @param {Object.<string, Array>} ids - Object mapping group names to arrays of feature IDs to be hidden.
 * @returns {Promise<Cesium3DTileStyle>} The new Cesium3DTileStyle object with hidden features.
 */
export async function updateStylingWithDeletionList(style, ids) {
    const styling = new Cesium3DTileStyle();
    const conditions = [];

    for (const key of Object.keys(ids)) {
        if (ids[key].size > 0) {
            for (const id of ids[key].values()) {
                const num = Number(id);
                if (!isNaN(num)) {
                    conditions.push(['${UUID} === ' + `${id}`, 'false']);
                    conditions.push(['${featureId} === ' + `${id}`, 'false']);
                }
                conditions.push(['${UUID} === ' + `'${id}'`, 'false']);
                conditions.push(['${featureId} === ' + `'${id}'`, 'false']);
            }
        }
    }

    const pre = style.style?.show?.conditions
        ? style.style.show.conditions
        : [];
    styling.show = {
        conditions: [...pre, ...conditions],
    };

    styling.color = style.color;

    return styling;
}
