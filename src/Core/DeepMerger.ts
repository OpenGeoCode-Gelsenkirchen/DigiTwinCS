import type {Options} from 'deepmerge';
import deepmerge from 'deepmerge';

/**
 * Custom merge callback for deepmerge that enables "full replace"—
 * if either A or B contains the property `fullReplace: true`, that object is
 * used as the entire value (shallow copy, with `fullReplace` property removed).
 * Otherwise, falls back to regular deepmerge behavior.
 *
 * @param {any} k - The current merge key (not used in this callback).
 * @returns {(A: any, B: any) => any} A function to perform the merge for A and B.
 *
 * @example
 * const opts = { customMerge: fullReplaceMerge };
 * deepmerge(A, B, opts);
 */
const fullReplaceMerge = (k: any) => {
    return (A: any, B: any) => {
        if (A?.fullReplace === true) return {...A, fullReplace: undefined};
        if (B?.fullReplace === true) return {...B, fullReplace: undefined};
        return deepmerge(A, B);
    };
};

/**
 * Custom array merge strategy for deepmerge:
 * - If index is missing from `target`, clones the corresponding source item.
 * - If source item is a mergeable object, merges with target's slot.
 * - Otherwise, only adds items not already present in target.
 *
 * Supports recursive merging of nested arrays/objects.
 *
 * @param {Array} target - The destination array (usually the left input).
 * @param {Array} source - The source array (usually the right input).
 * @param {Object} options - Options from deepmerge (provides cloning, etc.).
 * @returns {Array} The merged array.
 */
const customArrayMerge = (target: any[], source: any[], options: any) => {
    const destination = target.slice();

    source.forEach((item: any, i: number) => {
        if (typeof destination[i] === 'undefined') {
            destination[i] = options.cloneUnlessOtherwiseSpecified(
                item,
                options,
            );
        } else if (options.isMergeableObject(item)) {
            destination[i] = deepmerge(target[i], item, options);
        } else if (target.indexOf(item) === -1) {
            destination.push(item);
        }
    });
    return destination;
};

/**
 * Default deepmerge options enabling fullReplace merge on objects and custom array merging.
 *
 * @type {Object}
 * @property {Function} customMerge - The `fullReplaceMerge` function.
 * @property {Function} arrayMerge - The `customArrayMerge` function.
 */
export const defaultOptions: Options = {
    customMerge: fullReplaceMerge,
    arrayMerge: customArrayMerge,
};

/**
 * Recursively merges two objects (A and B) using deepmerge,
 * supporting "fullReplace" semantics and custom array handling.
 *
 * If `fullReplace: true` is set on any nested object, that object is entirely replaced.
 * Arrays are merged with intelligent slot or append logic.
 *
 * @param {Object} A - The base object (left-hand value).
 * @param {Object} B - The incoming object to merge (right-hand value).
 * @param {Object} [options=defaultOptions] - Merge strategy options.
 * @returns {Object} The merged, deeply combined object.
 *
 * @example
 * const merged = deepMergeWithFullReplace({a: 1}, {a: 2, fullReplace: true});
 */
export function deepMergeWithFullReplace(
    A: Object,
    B: Object,
    options: Object = defaultOptions,
): Object {
    return deepmerge(A, B, options);
}
