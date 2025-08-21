import {
    Cartesian2,
    Color,
    GeoJsonDataSource,
    HeightReference,
    ImageMaterialProperty,
} from '@cesium/engine';

/**
 * WaterLevel – Manages and visualizes a 3D water level surface (polygon) using Cesium's event system.
 *
 * Loads polygon areas from a GeoJSON source, textures them with a semi-transparent image,
 * and controls height (Z value) of all polygons for dynamic water level simulation.
 * Uses custom events (EventTarget) for async initialization notices.
 *
 * @class
 * @extends EventTarget
 *
 * @param {string} geometryUrl - URL to the GeoJSON file defining the water surface geometry.
 * @param {string} textureUrl - URL to the texture or image to apply to the water surface.
 *
 * @property {GeoJsonDataSource} dataSource - Loaded Cesium data source representing the polygons.
 * @property {boolean} initialized - True after the GeoJSON and textures/materials have been applied and shown.
 * @property {boolean} show - Controls show/hide state for all water polygons.
 * @property {number} height - Current water elevation (set via setHeight).
 *
 * @fires ready - CustomEvent fired when water polygons are initialized and ready.
 *
 * @method setHeight(height) - Sets the polygon Z height for all water surfaces.
 *
 * @example
 * const water = new WaterLevel('water.geojson', 'water-texture.png');
 * water.addEventListener('ready', () => {
 *   // Now water.dataSource is loaded, add to viewer, animate, etc.
 *   water.show = true;
 *   water.setHeight(15);
 * });
 */
class WaterLevel extends EventTarget {
    /**
     * Creates the WaterLevel instance and starts loading data.
     * @param {string} geometryUrl
     * @param {string} textureUrl
     */
    constructor(geometryUrl, textureUrl) {
        super();
        if (!geometryUrl) return;
        this.geometryUrl = geometryUrl;
        this.textureUrl = textureUrl;
        this.initialized = false;
        this.loadData(geometryUrl, textureUrl);
    }

    /**
     * Loads the water surface polygons from GeoJSON, sets up material/texture, and disables outlines and selection.
     * All polygons are initially hidden until "show" or setHeight are called.
     * Fires 'ready' event on completion.
     * @async
     * @param {string} geometryUrl
     * @param {string} textureUrl
     */
    async loadData(geometryUrl, textureUrl) {
        this.dataSource = await GeoJsonDataSource.load(geometryUrl);
        this.dataSource.show = false;

        const entities = this.dataSource.entities.values;

        entities.forEach(entity => {
            entity.polygon.material = new ImageMaterialProperty({
                image: textureUrl,
                color: Color.WHITE.withAlpha(0.7),
                repeat: new Cartesian2(10, 10),
            });
            entity.polygon.outline = false;
            entity.polygon.heightReference = HeightReference.NONE;
            entity.polygon.height = 25;
            entity.selectable = false;
        });
        this.initialized = true;
        this.setHeight(this.height);

        this.dispatchEvent(new CustomEvent('ready', {}));
    }

    /**
     * Sets the display height (Z) for all loaded polygons.
     * If not initialized, stores as pending.
     * @param {number} height - The vertical elevation to apply.
     */
    setHeight(height) {
        if (this.initialized) {
            this.dataSource.entities.values.forEach(v => {
                v.polygon.height.setValue(height);
            });
        } else {
            this.height = height;
        }
    }

    /**
     * Controls show/hide for all water surface polygons.
     * @type {boolean}
     */
    get show() {
        return this.dataSource.entities.show;
    }

    set show(value) {
        this.dataSource.entities.show = value;
    }
}

export const waterLevel = new WaterLevel(
    'https://geodata.gelsenkirchen.de/3dmodelle/standardmodell/wasser.geojson',
    'https://geo.gelsenkirchen.de/3dstadtmodell/standardmodell/images/common/Water_Li_Square.png',
);
