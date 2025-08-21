import {Color} from '@cesium/engine';
/**
 * An object container for temporary, interactive, and ephemeral application entities and their states.
 * Used for geometries, picked/selected objects, measurement results, and UI interaction data.
 *
 * @namespace Temporary
 * @property {Object} hiddenModels - Temporarily hidden 3D models.
 * @property {Array} activePoints - Primary list of active points for in-progress shapes or selections.
 * @property {Array} activePoints2 - Secondary list of active points (for dual measure or overlay).
 * @property {*} activeShape - The currently drawn or edited shape (set after initialization).
 * @property {*} activeShape2 - The secondary shape being drawn (set later in dual edit modes).
 * @property {Array} drawnEntities - Array of all drawn Cesium entities.
 * @property {*} floatingPoint - Reference to the current floating/preview point (primary).
 * @property {*} floatingPoint2 - Reference to the current floating/preview point (secondary).
 * @property {number} sumdistance - Cumulative measurement distance.
 * @property {Object} bemassungen - Saved measurements or dimension objects.
 * @property {*} picked - Currently picked feature/object.
 * @property {string} pickedID - ID of the currently picked feature/object.
 * @property {Object} selected - Currently selected feature and its color: `{ feature, originalColor }`.
 * @property {Object} highlighted - Currently highlighted feature and its color: `{ feature, originalColor }`.
 * @property {*} startMousePosition - Mouse position at the start of an operation.
 * @property {*} mousePosition - Current live mouse position.
 * @property {*} dynamicViewpoint - Mutable property for dynamic camera viewpoint or setting.
 * @property {*} lightSphere - Sphere object used for lighting/illumination.
 * @property {*} point_carto - Temporary point in cartographic coordinates.
 */

export const Temporary = {
    // object for Temporary "things"
    hiddenModels: new Object(),
    activePoints: new Array(),
    activePoints2: new Array(),
    activeShape: undefined, // gets defined later
    activeShape2: undefined, // gets defined later
    drawnEntities: new Array(),
    floatingPoint: undefined, // gets defined later
    floatingPoint2: undefined, // gets defined later
    sumdistance: 0.0,
    bemassungen: new Object(),
    picked: undefined, // gets defined later
    pickedID: '',
    selected: {feature: undefined, originalColor: new Color()},
    selectedEntity: undefined,
    highlighted: {feature: undefined, originalColor: new Color()},
    startMousePosition: undefined,
    mousePosition: undefined,
    dynamicViewpoint: undefined,
    lightSphere: undefined,
    point_carto: undefined,
};
