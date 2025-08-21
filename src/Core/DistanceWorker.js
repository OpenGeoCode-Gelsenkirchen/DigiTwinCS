/**
 * DistanceWorker – Web Worker for batch 3D Euclidean distance calculation.
 *
 * Expects a message with two properties:
 *   - `from`: Array of source 3D coordinates (Array<[number, number, number]>)
 *   - `to`:   Array of destination 3D coordinates (Array<[number, number, number]>)
 * Both arrays should be the same length.
 *
 * For each index i, computes the Euclidean distance between from[i] and to[i]
 * and sends back an array of distances.
 *
 * @example
 * // In main thread:
 * worker.postMessage({from: [[0,0,0], [1,2,3]], to: [[1,0,0],[4,5,6]]});
 * // The worker will post back: [1, 5.196]
 */

onmessage = e => {
    /** @type {Array<[number, number, number]>} */
    const fromArray = e.data.from;

    /** @type {Array<[number, number, number]>} */
    const toArray = e.data.to;

    /** @type {number[]} */
    const result = new Array();
    for (let i = 0; i < fromArray.length; i++) {
        const from = fromArray[i];
        const to = toArray[i];

        // Euclidean distance in 3D
        const distance = Math.sqrt(
            Math.pow(to[0] - from[0], 2) +
                Math.pow(to[1] - from[1], 2) +
                Math.pow(to[2] - from[2], 2),
        );
        result.push(distance);
    }
    postMessage(result);
};
