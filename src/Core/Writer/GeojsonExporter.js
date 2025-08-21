const POINT = 'Point';
const LINESTRING = 'LineString';
const POLYGON = 'Polygon';

/**
 * Abstract base class for a GeoJSON Feature.
 * Subclasses implement geometry type and coordinate formatting.
 *
 * Handles number formatting (two decimals) for properties and provides
 * a custom string (JSON) representation.
 *
 * @class
 * @abstract
 *
 * @param {number[]|number[][]|number[][][]} coordinates - Geometry coordinates for the feature.
 * @param {object} [properties={}] - Properties for the feature.
 *
 * @example
 * // Usage is via subclass (see below)
 */
export class GeojsonFeature {
    /**
     * JSON.stringify replacer function that rounds all numbers to two decimals.
     * @param {string} key
     * @param {any} value
     * @returns {any}
     */
    static replacer = (key, value) => {
        if (typeof value === 'number') {
            return value.toFixed(2);
        }
        return value;
    };

    /**
     * @param {any} coordinates - Geometry coordinates
     * @param {object} [properties={}] - Feature properties
     */
    constructor(coordinates, properties = {}) {
        /**
         * Raw geometry coordinates for this feature.
         * @type {any}
         */
        this.coordinates = coordinates;

        /**
         * Object of key/value properties.
         * @type {object}
         */
        this.properties = properties;

        /**
         * The geometry type (set by subclass).
         * @type {string|null}
         */
        this.geometryType = null;
    }

    /**
     * Abstract method: Format coordinates for GeoJSON output as string.
     * Implemented by subclasses.
     * @returns {string}
     */
    formatCoordinates() {}

    /**
     * Convert to a GeoJSON Feature as a string.
     * Numbers in properties are formatted to two decimals.
     * @returns {string}
     */
    toString() {
        return `{
            "type": "Feature",
            "geometry": {
                "type": "${this.geometryType}",
                "coordinates": ${this.formatCoordinates()}
            },
            "properties": ${JSON.stringify(this.properties, GeojsonFeature.replacer)}
        }`.replace(/\n{2,}/g, '');
    }
}

/**
 * Concrete GeoJSON Point feature.
 *
 * @class
 * @extends GeojsonFeature
 *
 * @param {number[]} coordinates - [x, y, (z)]
 * @param {object} [properties] - Properties for the feature.
 */
export class GeojsonPoint extends GeojsonFeature {
    constructor(coordinates, properties) {
        super(coordinates, properties);
        this.geometryType = POINT;
    }

    /**
     * Format point coordinates as [x, y, z] array.
     * @returns {string}
     */
    formatCoordinates() {
        return `[${this.coordinates}]`;
    }
}

/**
 * Concrete GeoJSON LineString feature.
 *
 * @class
 * @extends GeojsonFeature
 *
 * @param {number[][]} coordinates - Array of [x, y, (z)] points.
 * @param {object} [properties] - Properties for the feature.
 */
export class GeojsonLine extends GeojsonFeature {
    constructor(coordinates, properties) {
        super(coordinates, properties);
        this.geometryType = LINESTRING;
    }

    /**
     * Format line coordinates as [[x1, y1, z1], [x2, y2, z2], ...].
     * @returns {string}
     */
    formatCoordinates() {
        return `[${this.coordinates.map(xy => `[${xy}]`).join()}]`;
    }
}

/**
 * Concrete GeoJSON Polygon feature.
 *
 * @class
 * @extends GeojsonFeature
 *
 * @param {number[][]} coordinates - Array of [x, y, (z)] points (polygon ring, closedness is caller’s responsibility).
 * @param {object} [properties] - Feature properties.
 */
export class GeojsonPolygon extends GeojsonFeature {
    constructor(coordinates, properties) {
        super(coordinates, properties);
        this.geometryType = POLYGON;
    }

    /**
     * Format polygon coordinates as [[[x1, y1, z1], [x2, y2, z2], ...]] (GeoJSON outer ring array).
     * @returns {string}
     */
    formatCoordinates() {
        return `[[${this.coordinates.map(xy => `[${xy}]`).join()}]]`;
    }
}

/**
 * GeoJSON FeatureCollection for combining multiple features.
 *
 * @class
 *
 * @param {GeojsonFeature[]|GeojsonFeature} [features=[]] - Array or single feature object.
 *
 * @example
 * const fc = new GeojsonFeatureCollection([
 *   new GeojsonPoint([8, 51], {name: "Center"}),
 *   new GeojsonLine([[0,0], [1,2]], {id: 12})
 * ]);
 * console.log(fc.toString());
 */
export class GeojsonFeatureCollection {
    /**
     * @param {GeojsonFeature[]|GeojsonFeature} [features=[]]
     */
    constructor(features = []) {
        /**
         * Features array or single feature.
         * @type {GeojsonFeature[]|GeojsonFeature}
         */
        this.features = features;
    }

    /**
     * Convert to a GeoJSON FeatureCollection string.
     * @returns {string}
     */
    toString() {
        return `{
            "type": "FeatureCollection",
            "features": [${
                Array.isArray(this.features)
                    ? this.features.map(f => f.toString())
                    : [
                          this.features
                              // @ts-ignore
                              .toString(),
                      ]
            }]
        }`.replace(/\s{2,}\n*/g, '');
    }
}
