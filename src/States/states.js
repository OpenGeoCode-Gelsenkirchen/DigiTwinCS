import {DefaultState} from './DefaultState.js';
import {ExcavationState} from './ExcavationState.js';
import {FirstPersonState} from './FirstPersonState.js';
import {InformationState} from './InformationState.js';
import {AreaMeasurementState} from './MeasurementStates/AreaMeasurementState.js';
import {HeightMeasurementState} from './MeasurementStates/HeightMeasurementState.js';
import {LengthMeasurementState} from './MeasurementStates/LengthMeasurementState.js';
import {LineMeasurementState} from './MeasurementStates/LineMeasurementState.js';
import {PolygonMeasurementState} from './MeasurementStates/PolygonMeasurementState.js';
import {ViewshedState} from './ViewshedState.js';
import {WaterLevelState} from './WaterLevelState.js';

/**
 * STATES – Centralized mapping of application state names to their singleton instances.
 *
 * Each key corresponds to a specific interaction/state mode in the application, such as default navigation,
 * measurement (polygon, line, height, length, area), informational/pedestrian/excavation/visibility, etc.
 * This object provides quick programmatic access to all available state controllers,
 * ensuring that each state is uniquely instantiated and easily managed via its associated button or configuration.
 *
 * @constant
 * @type {Object.<string, State>}
 *
 * @property {DefaultState}     default      - Baseline navigation/camera/view mode.
 * @property {InformationState} information  - Info/selection mode for querying feature details.
 * @property {WaterLevelState}  waterLevel   - Water level polygon editor/visualizer.
 * @property {PolygonMeasurementState} polygon - Draw and measure polygons/areas.
 * @property {LineMeasurementState} line        - Polyline measurement (distance measurement).
 * @property {HeightMeasurementState} height    - Height (vertical) measurement.
 * @property {LengthMeasurementState} length    - Building/feature length measurement.
 * @property {AreaMeasurementState} area        - Building/feature area measurement.
 * @property {ViewshedState} viewshed           - Viewshed/visibility analysis state.
 * @property {FirstPersonState} pedestrian      - Pedestrian/first-person (walk) navigation.
 * @property {ExcavationState} excavation       - Draw/extrude excavation pits/volumes.
 *
 * @example
 * // Switch to polygon measurement mode:
 * app.applyState(STATES.polygon);
 *
 * // Reset to default state:
 * app.applyState(STATES.default);
 */
export const STATES = {
    default: new DefaultState(),
    information: new InformationState(),
    waterLevel: new WaterLevelState(),
    polygon: new PolygonMeasurementState(
        document.getElementById('polyMeasureBtn'),
    ),
    line: new LineMeasurementState(document.getElementById('lineMeasureBtn')),
    height: new HeightMeasurementState(
        document.getElementById('heightMeasureBtn'),
    ),
    length: new LengthMeasurementState(
        document.getElementById('lengthMeasureBtn'),
    ),
    area: new AreaMeasurementState(document.getElementById('areaMeasureBtn')),
    viewshed: new ViewshedState(document.getElementById('visibility-btn')),
    pedestrian: new FirstPersonState(document.getElementById('pedestrian_btn')),
    excavation: new ExcavationState(document.getElementById('excavationBtn')),
};
