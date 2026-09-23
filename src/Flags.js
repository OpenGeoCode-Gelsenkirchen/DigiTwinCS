/**
 * @namespace Flags
 * @property {boolean} coordinates - Display coordinates in the UI.
 * @property {boolean} cameraChange - Handle doubleclick for camera movement; uses getter/setter.
 * @property {boolean} measurement - Main flag for enabling/disabling measurement tools.
 * @property {boolean} metrics - Flag for single building metrics.
 * @property {boolean} information - Enable picking (left-click) for info panel.
 * @property {boolean} walking - Enable pedestrian navigation mode.
 * @property {boolean} turn - Enable rotation in pedestrian mode.
 * @property {boolean} forwards - Move forwards in walking mode.
 * @property {boolean} backwards - Move backwards in walking mode.
 * @property {boolean} left - Move left in walking mode.
 * @property {boolean} right - Move right in walking mode.
 * @property {boolean} sprint - Enable sprint speed for walking.
 * @property {boolean} activeTurning - Allow certain actions during walking/turning modes.
 * @property {boolean} visibility - Enable visibility analysis tools.
 * @property {boolean} selectVisibilityPosition - Allow picking positions for visibility analysis.
 * @property {boolean} clipping - Enable clipping mode.
 * @property {boolean} gizmoActive - Enable/disable the gizmo tool.
 * @property {boolean} gizmoEdit - Enable gizmo edit mode.
 * @property {boolean} zooming - Flag for zoom operations.
 * @property {boolean} clippingPlaneSelected - Whether a clipping plane is currently selected.
 * @property {boolean} blockPedestrianControl - Prevent pedestrian controls (e.g., in some modes).
 * @property {boolean} layerLoaded - Whether a layer is loaded in the viewer.
 */
export const Flags = {
    // object to activate/deactivate specific functionalities
    coordinates: true, // coordinates in bottom bar
    _cameraChange: true, // doubleclick on viewer/map
    set cameraChange(value) {
        this._cameraChange = value;
    },
    get cameraChange() {
        return this._cameraChange;
    },

    measurement: false, // all measurements
    metrics: false, // metrics of a single building
    information: true, // left click on object
    walking: false, // main flag for pedestrian view
    turn: false, // flag for turning in pedestrian view
    forwards: false, // flag for walking forwards
    backwards: false, // flag for walking backwards
    left: false, // flag for walking to the left
    right: false, // flag for walking to the rights
    sprint: false, // flag for faster walking
    activeTurning: true, // 2nd flag for turning to be able to execute funtions like measurement while in pedestrian view
    visibility: false, // main flag vor visibility analysis
    selectVisibilityPosition: false, // flag for position selection on visibility analysis,
    clipping: false,
    gizmoActive: false,
    gizmoEdit: false,
    zooming: false,
    clippingPlaneSelected: false,
    blockPedestrianControl: false,
    layerLoaded: false,
};
