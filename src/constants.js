import {
    CameraEventType,
    Cesium3DTileStyle,
    Color,
    KeyboardEventModifier,
    SceneTransforms,
    ScreenSpaceEventType,
} from '@cesium/engine';

/**
 * PlannedStyling – Cesium3DTileStyle for planned (proposed) features.
 * Light red/pink color with semi-transparency.
 * @type {Cesium3DTileStyle}
 */
export const PlannedStyling = new Cesium3DTileStyle();
PlannedStyling.color = 'color("#f0A0A0", "0.65")';

/**
 * EmptyStyling – Blank Cesium3DTileStyle (default, disables all styling).
 * @type {Cesium3DTileStyle}
 */
const EmptyStyling = new Cesium3DTileStyle();

/**
 * HeightStyling – Colorizes 3D tiles by their `${Hoehe}` attribute with a multi-stop color ramp.
 * Heights outside range are rendered black/transparent.
 * @type {Cesium3DTileStyle}
 */
const HeightStyling = new Cesium3DTileStyle({
    color: {
        conditions: [
            ['${Hoehe} === null', "color('black', 0.0)"], // 3D-Tiles Styling Tutorial: https://com/learn/cesiumjs-learn/cesiumjs-3d-tiles-styling/
            ['${Hoehe} === undefined', "color('black', 0.0)"],
            ['${Hoehe} >= 150', "color('#0c2c84', 1.0)"], // 3D-Tiles Styling Specification: https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling
            ['${Hoehe} >= 100', "color('#225ea8', 1.0)"],
            ['${Hoehe} >= 50', "color('#1d91c0', 1.0)"],
            ['${Hoehe} >= 20', "color('#41b6c4', 1.0)"],
            ['${Hoehe} >= 15', "color('#7fcdbb', 1.0)"],
            ['${Hoehe} >= 10', "color('#c7e9b4', 1.0)"],
            ['${Hoehe} >= 5', "color('#edf8b1', 1.0)"],
            ['${Hoehe} >= 0', "color('#ffffd9', 1.0)"],
            ['${Hoehe} < 0', "color('#ffacf9', 1.0)"],
            ['${Hoehe} <= 5', "color('#ff64f5', 1.0)"],
        ],
    },
});

/**
 * GFK_ColorScheme – Mapping for custom color schemes for domain-specific functional areas (GFK).
 * Associates building/feature types by ID with specific visualization colors for each category.
 * @type {Object}
 */
const GFK_ColorScheme = {
    Default: {
        color: '#A8D1DB',
    },
    Öffentlich: {
        id: [
            3080, 3060, 3021, 3045, 3030, 3041, 3044, 3046, 3211, 3091, 3051,
            3022, 3070, 3040, 3010, 3000, 3023, 3015, 3075, 3012, 3094, 3042,
            3072, 3071, 3032, 3020, 3043, 3036, 3037, 3221, 3052, 3031, 3014,
            3019, 3034, 3048,
        ],
        color: '#FF9966',
    },
    Industrie: {
        id: [
            2460, 2500, 2000, 2700, 2740, 2600, 2465, 2400, 2513, 2512, 2461,
            2462,
        ],
        color: '#D2C8E6',
    },
};

/**
 * flattenIds – Flattens a color-category object with id arrays into a { id: color, ... } mapping.
 * @param {Object} o - Object with entries containing {id: array, color: string}
 * @returns {Object} Mapping of ID values to assigned color.
 */
function flattenIds(o) {
    const result = {};
    for (const entry of Object.values(o)) {
        if (entry?.id) {
            for (const id of Object.values(entry.id)) {
                result[id] = entry.color;
            }
        }
    }
    return result;
}

/**
 * FunctionalStyling – Cesium3DTileStyle for functional coloring by GFK type (mapping by ID).
 * Uses colors from GFK_ColorScheme or falls back to the default.
 * @type {Cesium3DTileStyle}
 */

const conditions = [];
for (const [key, value] of Object.entries(flattenIds(GFK_ColorScheme))) {
    conditions.push([`\${GFK} === ${key}`, `color('${value}', 1.0)`]);
}

const FunctionalStyling = new Cesium3DTileStyle({
    color: {
        conditions: [
            ...conditions,
            ['true', `color('${GFK_ColorScheme.Default.color}', 1.0)`],
        ],
    },
});

/**
 * STYLING – Main Cesium 3D tile styles registry for all common use cases.
 * @type {Object}
 * @property PlannedStyling  For planned structures
 * @property HeightStyling   For height-based coloring
 * @property FunctionalStyling For functional area coloring
 * @property EmptyStyling    No styling
 */
export const STYLING = {
    isPlanned: PlannedStyling,
    height: HeightStyling,
    functional: FunctionalStyling,
    empty: EmptyStyling,
    default: EmptyStyling,
};

/**
 * Numeric and GUI constants – Utility values for styling, geometry, movement, and interaction.
 */
export const NUM_TRIALS_SAMPLE_TERRAIN = 10;

export const ZOOM_STEPSIZE = 100;

export const {LEFT_DRAG, MIDDLE_DRAG, RIGHT_DRAG, WHEEL, PINCH} =
    CameraEventType;

export const {CTRL} = KeyboardEventModifier;

export const wgs84ToWindowCoordinates =
    SceneTransforms.wgs84ToWindowCoordinates;

//information.js line 31
export const COLOR_HIGHLIGHT = Color.PINK;
export const COLOR_HIGHLIGHT_TRANSPARENT = Color.fromBytes(240, 100, 100, 200);

//information.js line 90
export const COLOR_SELECT = Color.fromBytes(130, 150, 240, 255);
export const COLOR_SELECT_TRANSPARENT = Color.fromBytes(130, 150, 240, 130);

//measurement.js
export const ENTITY_POINT_COLOR = Color.RED.withAlpha(0.8);

export const MEASUREMENT_POINT_COLOR = Color.RED;
export const MEASUREMENT_POINT_PIXELSIZE = 10;
export const MEASUREMENT_LINE_PIXELWIDTH = 4;

export const MEASUREMENT_POLYGON_COLOR_POINT = Color.RED.withAlpha(0.8);
export const MEASUREMENT_POLYGON_COLOR_LINE = Color.GREEN.withAlpha(0.8);
export const MEASUREMENT_POLYGON_COLOR_AREA = Color.LIGHTGREEN.withAlpha(0.8);

export const DRAWING_LINE_PIXELWIDTH = 4;
export const DRAWING_POLYGON_COLOR_POINT = Color.ORANGE.withAlpha(0.8);
export const DRAWING_POLYGON_COLOR_LINE = Color.GREEN.withAlpha(0.8);
export const DRAWING_POLYGON_COLOR_AREA = Color.LIGHTGREEN.withAlpha(0.8);

export const MEASUREMENT_SELECTION_COLOR = Color.PINK.withAlpha(0.8);

//main.js
//only used if outline=true
export const COLOR_OUTLINE_TRANSPARENT = Color.fromBytes(255, 50, 50, 180);
export const COLOR_PLANNED_STRUCTURES = Color.fromBytes(240, 160, 160, 166);

//movement.js
//export constANT move stepsize
export const MOVE_STEPSIZE = 1;

//export constANT rotation stepsize (in radians)
export const ROTATION_STEPSIZE = 5;

//CSS Classes
export const VIS_ON = 'visibility_on';
export const VIS_OFF = 'visibility_off';

export const MIN_SCALE = 0.01;

// Cesium event/utility constants (exported for convenient direct use)
export const {
    LEFT_CLICK,
    LEFT_DOWN,
    LEFT_UP,

    MIDDLE_CLICK,

    RIGHT_CLICK,
    RIGHT_DOWN,
    RIGHT_UP,

    MOUSE_MOVE,
} = ScreenSpaceEventType;

// Color randomizer constraints
export const randomColorOptions = {
    minimumRed: 0.4,
    minimumGreen: 0.4,
    minimumBlue: 0.4,
    maximumRed: 0.85,
    maximumGreen: 0.85,
    maximumBlue: 0.85,
    minimumAlpha: 1.0,
};

// Main global handler/registry objects (empty or filled at runtime)
export const Handlers = {};
export const WMS = {};

// Main global layer registry for all geometry types.
export const Layers = {
    imagery: new Array(),
    localImagery: new Array(),
    specialImagery: new Array(),
    terrain: new Array(),
    b3dm: new Object(),
    mesh: new Array(),
    cmpt: new Object(),
    gltf: new Object(),
    geojson: new Object(),
    mixed: new Object(),
};
