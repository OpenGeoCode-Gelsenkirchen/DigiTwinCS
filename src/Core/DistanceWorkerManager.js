/**
 * DistanceWorkerManager – Manages the batching, registration, and updating of 3D distance computations
 * using parallel Web Workers (see DistanceWorker.js).
 *
 * Splits up entity pairs into batches, distributes computation to workers,
 * and dispatches `CustomEvent` results with calculated distances.
 *
 * @class
 *
 * @param {object} options
 * @param {number} [options.batchSize=16] - How many entity pairs per worker.
 * @param {string} [options.workerScript=''] - URL or path to the worker script (DistanceWorker.js).
 *
 * @property {number} batchSize - Number of pairs processed per worker.
 * @property {string} workerScript - Script URL/path for spawning Worker instances.
 * @property {Array} from - Registered source entities.
 * @property {Array} to - Registered destination entities.
 * @property {Array<string>} eventNames - Custom event names for dispatching results.
 * @property {boolean} loop - Whether to auto-update, not managed directly here.
 * @property {Array<Object>} batches - [{from, to}] entity pair batches.
 * @property {Array<Worker>} workers - Active Worker objects.
 *
 * @example
 * // Register a pair and listen for CustomEvent:
 * manager.register(entityA, entityB, "myDistanceEvent");
 * window.addEventListener("myDistanceEvent", e => console.log(e.detail)); // distance
 * manager.update(); // triggers computation
 */

export class DistanceWorkerManager {
    /**
     * @param {object} options
     * @param {number} [options.batchSize=16]
     * @param {string} [options.workerScript='']
     */
    constructor({batchSize = 16, workerScript = ''}) {
        /**
         * Pairs per batch/worker (max).
         * @type {number}
         */
        this.batchSize = batchSize;

        /**
         * URL or path to Web Worker script.
         * @type {string}
         */
        this.workerScript = workerScript;

        /** @type {Array<any>} */
        this.from = [];

        /** @type {Array<any>} */
        this.to = [];

        /** @type {Array<string>} */
        this.eventNames = [];

        /**
         * Auto-update flag (not used directly here).
         * @type {boolean}
         */
        this.loop = false;

        /**
         * Current entity pair batches for processing.
         * @type {Array<{from: Object[], to: Object[]}>}
         */
        this.batches = [];

        /**
         * All spawned Workers for the current round.
         * @type {Array<Worker>}
         */
        this.workers = [];
    }

    /**
     * Registers an entity pair for distance calculation with an event name.
     * Triggers an update of batches and worker allocation.
     *
     * @param {Object} entity1 - The first/source entity (must have .position).
     * @param {Object} entity2 - The second/target entity (must have .position).
     * @param {string} eventName - The CustomEvent name for reporting results.
     */
    register(entity1, entity2, eventName) {
        this.from.push(entity1);
        this.to.push(entity2);
        this.eventNames.push(eventName);
        this.updateBatches();
    }

    /**
     * Deregisters an entity pair (by index).
     * Also re-batches and re-spawns workers.
     *
     * @param {number} index - Index of the pair to remove.
     */
    deregister(index) {
        this.from.splice(index, 1);
        this.to.splice(index, 1);
        this.eventNames.splice(index, 1);
        this.updateBatches();
    }

    /**
     * Splits all registered pairs into batches and creates fresh Worker objects.
     * Each worker is assigned a postMessage handler for dispatching results via CustomEvents.
     */
    updateBatches() {
        this.batches = [];
        this.workers = [];

        for (let i = 0; i < Math.ceil(this.from.length / this.batchSize); i++) {
            const worker = new Worker(this.workerScript);

            const fromBatch = this.from.slice(
                i * this.batchSize,
                (i + 1) * this.batchSize,
            );
            const toBatch = this.to.slice(
                i * this.batchSize,
                (i + 1) * this.batchSize,
            );
            const eventNames = this.eventNames.slice(
                i * this.batchSize,
                (i + 1) * this.batchSize,
            );

            this.batches.push({
                from: fromBatch,
                to: toBatch,
            });

            worker.onmessage = e => {
                const result = e.data;
                for (let j = 0; j < result.length; j++) {
                    dispatchEvent(
                        new CustomEvent(eventNames[j], {
                            detail: result[j],
                        }),
                    );
                }
            };
            this.workers.push(worker);
        }
    }

    /**
     * Sends current batches to workers for processing.
     * Each entity's .position is used and projected to flat [x, y, z] arrays for computation.
     * Worker will emit CustomEvents for computed distances.
     */
    update() {
        this.workers.forEach((w, i) => {
            const fromBatch = this.batches[i].from.map(e => {
                return [...Object.values(e.position)];
            });
            const toBatch = this.batches[i].to.map(e => {
                return [...Object.values(e.position)];
            });
            w.postMessage({from: fromBatch, to: toBatch});
        });
    }
}
