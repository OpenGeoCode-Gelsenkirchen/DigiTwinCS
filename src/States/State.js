/**
 * State – Abstract/base class for representing a UI or application state in an interactive application (such as a Cesium/3D tool).
 *
 * Encapsulates state name and relationships to other states (mutual exclusivity, restore, and dependencies)
 * and provides a standardized interface for managing state logic.
 * Designed to be subclassed for concrete state implementations (e.g., measurement, edit, or navigation modes).
 *
 * @class
 *
 * @param {string} name - The unique name or identifier of the state (e.g., "default", "polygon", "dimension").
 * @param {string[]} [exclusiveStates=[]] - Names of states that cannot coexist with this one (mutually exclusive).
 * @param {string[]} [restoreStates=[]] - Names of states to restore/activate when this state ends.
 * @param {string[]} [dependentStates=[]] - Names of other states this state relies on.
 *
 * @property {string} name - Name/identifier for the state.
 * @property {string[]} exclusiveStates - States that are deactivated when this state activates.
 * @property {string[]} restoreStates - States that should be restored when this state ends.
 * @property {string[]} dependentStates - Required/precondition states.
 *
 * @method remove() - Removes/deactivates the state (intended to be overridden or extended by subclasses).
 *
 * @example
 * class CustomModeState extends State {
 *   constructor() {
 *     super('custom', ['edit', 'default'], ['default'], []);
 *   }
 * }
 */
export class State {
    /**
     * @param {string} name
     * @param {string[]} [exclusiveStates=[]]
     * @param {string[]} [restoreStates=[]]
     * @param {string[]} [dependentStates=[]]
     */
    constructor(
        name,
        exclusiveStates = [],
        restoreStates = [],
        dependentStates = [],
    ) {
        this.name = name;
        this.exclusiveStates = exclusiveStates;
        this.restoreStates = restoreStates;
        this.dependentStates = dependentStates;
    }

    /**
     * Removes or deactivates this state. May be overridden by subclasses.
     * @returns {boolean} Always returns true.
     */
    remove() {
        return true;
    }
}
