import {
    Cartesian3,
    Cartographic,
    GeoJsonDataSource,
    TerrainProvider,
} from '@cesium/engine';
import {safeSampleTerrainMostDetailed, uuidv4} from '../utilities';

/**
 * Data required to create and position a link annotation in the Cesium scene.
 *
 * @remarks
 * The loader derives this data from GeoJSON entities and samples the configured
 * terrain provider so that the annotation position uses terrain-adjusted height.
 */
export type LinkAnnotationData = {
    id: string;
    position: Cartesian3;
    name: string;
    url: string;
    linkText?: string;
    textColor?: string;
    backgroundColor?: string;
    font?: string;
};

/**
 * Loads link-annotation data from a GeoJSON source and adjusts entity heights
 * to the most detailed terrain data available.
 *
 * @param url - URL or resource identifier of the GeoJSON annotation file.
 * @param terrainProvider - Cesium terrain provider used to sample terrain
 * elevation for every GeoJSON entity position.
 * @returns Link annotation data for all valid GeoJSON entities.
 *
 * @throws {Error} Thrown when the loaded GeoJSON contains no entities.
 * @throws {Error} Thrown when an entity has no position property.
 * @throws {Error} Thrown when an entity position cannot be resolved for the
 * current Cesium time.
 * @throws {Error} Thrown when an entity has no resolvable properties object.
 *
 * @remarks
 * The function uses the entity's position at Cesium's default evaluation time
 * by calling `position.getValue()` without a time argument. Dynamic
 * time-dependent GeoJSON positions may therefore need an explicit
 * `JulianDate` supplied by an extended implementation.
 *
 * The source position is converted from Cartesian to cartographic coordinates,
 * sampled against the terrain, and converted back to a Cartesian position using
 * the sampled longitude, latitude, and height.
 *
 * The resulting array preserves the entity order from the loaded
 * {@link GeoJsonDataSource}.
 *
 */
export async function loadLinkAnnotationData(
    url: string,
    terrainProvider: TerrainProvider,
): Promise<LinkAnnotationData[]> {
    const ds = await GeoJsonDataSource.load(url);

    const entities = ds.entities.values;

    if (entities.length === 0)
        throw new Error(`No valid entities inside annotation link file ${url}`);

    const data = entities.map(entity => {
        const position = entity.position;
        if (!position) throw new Error(`No valid position in "${entity.id}"`);

        const positionValue = position.getValue();
        if (!positionValue)
            throw new Error(
                `No valid position value for current time in "${entity.id}"`,
            );

        return {
            entity,
            carto: Cartographic.fromCartesian(positionValue),
        };
    });

    const sampledCartos = await safeSampleTerrainMostDetailed(
        terrainProvider,
        data.map(d => d.carto),
    );

    return sampledCartos.map((carto: Cartographic, i: number) => {
        const properties = entities[i].properties?.getValue();

        if (!properties)
            throw new Error(
                'No valid properties found inside link annotation entity',
            );

        const position = Cartesian3.fromRadians(
            carto.longitude,
            carto.latitude,
            carto.height,
        );

        return {
            id: properties.id || uuidv4(),
            position: position,
            name: properties.name,
            font: properties.font,
            url: properties.url,
            linkText: properties.linkText,
            textColor: properties.textColor,
            backgroundColor: properties.backgroundColor,
        };
    });
}
