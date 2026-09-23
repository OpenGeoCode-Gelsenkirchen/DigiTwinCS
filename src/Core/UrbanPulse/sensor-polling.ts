import {Cartesian2, Cartesian3, TerrainProvider} from '@cesium/engine';
import {GeWarningWindow} from '../../Components/GeWindow/src/GeWarningWindow';
import {i18next} from '../../i18n';
import type {
    BillboardPrototype,
    ClusterAnnotation,
    Identifiable,
} from '../Annotations/ClusterAnnotation';
import type {IconCache} from '../IconCache';
import {renderIcon} from '../SensorCanvas';
import {WindowFactory} from '../WindowFactory';
import {
    drapeStationsOnTerrain,
    fetchSensorStations,
    stationToStationData,
} from './UrbanPulseConnector';
import {
    SensorStatus,
    type UrbanPulseConfig,
    type UrbanPulseStationAnnotationData,
    type UrbanPulseStationUpdateData,
} from './types';

/**
 * Creates a stable lookup key from a station's original longitude/latitude
 * coordinate pair.
 *
 * @param coordinates - Original station coordinates, typically longitude and
 * latitude.
 * @returns A colon-separated coordinate key.
 *
 * @remarks
 * This key associates freshly fetched station data with its previously
 * terrain-draped Cesium position. It assumes that source coordinates remain
 * stable across polling responses and that the string representation is unique
 * enough for the configured station dataset.
 */
function idFromCoordinates(coordinates: [number, number]) {
    return `${coordinates[0]}:${coordinates[1]}`;
}

/**
 * Whether the user has dismissed the current sensor-status warning.
 *
 * @remarks
 * This is module-level state. Once the warning is closed, it remains suppressed
 * until the page reloads or another part of the application resets this value.
 */
let warningClosed = false;

/**
 * Shows a warning window when too many stations are partially unavailable or
 * offline.
 *
 * @param stationData - Latest station data and derived station status values.
 * @param config - UrbanPulse polling and warning configuration.
 *
 * @remarks
 * A warning appears only when the proportion of stations with `partial` or
 * `offline` status exceeds `config.pctSensorWarningThreshold`.
 *
 * The method deliberately reuses the window ID `sensorWarningWindow` so that
 * repeated polling cycles do not create duplicate warning dialogs.
 */
function warnUser(
    stationData: Array<UrbanPulseStationUpdateData>,
    config: UrbanPulseConfig,
) {
    const numOffline = stationData.filter(
        sd => sd.data.status === 'partial' || sd.data.status === 'offline',
    ).length;

    /**
     * Do not divide by zero for an empty station response. An empty response does
     * not currently trigger a warning because no station can be classified as
     * offline from the returned data.
     */
    const offlineRatio =
        stationData.length > 0 ? numOffline / stationData.length : 0;

    const shouldWarn = offlineRatio > config.pctSensorWarningThreshold;

    if (shouldWarn && !warningClosed) {
        const id = 'sensorWarningWindow';
        let warning = GeWarningWindow.getInstance(id) as GeWarningWindow;

        if (!warning) {
            warning = WindowFactory.createGeWarningWindow({
                id,
                title: i18next.t('urbanpulse:warning.title'),
                message: i18next.t('urbanpulse:warning.message', {
                    current: numOffline,
                    total: stationData.length,
                    minutes: Math.floor(
                        config.statusTimeThresholdInSeconds / 60,
                    ),
                }),
                closeCallback: () => {
                    warningClosed = true;
                },
            });
        }

        warning.show();
    }
}

/**
 * Randomly replaces sensor timestamps for local development and visual testing.
 *
 * @param data - Annotation data whose timestamps may be overwritten.
 * @returns The same mutable annotation data object.
 *
 * @remarks
 * This function is currently unused. It should remain disabled in production,
 * because it mutates the supplied data and makes station availability appear
 * stale at random.
 */
function randomize(data: UrbanPulseStationAnnotationData) {
    if (Math.random() < 0.5) {
        if (data.meteoHelix) {
            data.meteoHelix.timestamp = new Date('2026-06-12T13:16:00Z');
        }
    }

    if (Math.random() < 0.5) {
        if (data.meteoWind) {
            data.meteoWind.timestamp = new Date('2026-06-12T13:16:00Z');
        }
    }
    return data;
}

const SENSOR_STATUS = ['online', 'partial', 'offline'] as const;

/**
 * Derives overall and per-sensor availability states from measurement
 * timestamps.
 *
 * @param station - Station annotation data
 * @param threshold - Maximum permitted age of a measurement, in seconds.
 * @returns A copied station data object with calculated station and sensor
 * statuses.
 *
 * @remarks
 * The overall station status is based on the number of stale sensor groups:
 *
 * | Stale sensor groups | Result |
 * | --- | --- |
 * | None | `online` |
 * | One | `partial` |
 * | Two | `offline` |
 *
 * A missing sensor group is treated as stale because its fallback timestamp is
 * the Unix epoch (`new Date(0)`).
 */
function computeStationStatus(
    station: UrbanPulseStationAnnotationData,
    threshold: number,
) {
    const now = Date.now();
    const isStale = (ts: Date) => (now - ts.valueOf()) / 1000 > threshold;

    const mhTimestamp = new Date(station.meteoHelix?.timestamp ?? 0);
    const mwTimestamp = new Date(station.meteoWind?.timestamp ?? 0);

    const mhStale = isStale(mhTimestamp);
    const mwStale = isStale(mwTimestamp);

    const status = SENSOR_STATUS[
        Number(mhStale) + Number(mwStale)
    ] as SensorStatus;

    return {
        ...station,
        status,
        meteoHelix: {
            ...station.meteoHelix,
            status: mhStale ? SensorStatus.OFFLINE : SensorStatus.ONLINE,
        },
        meteoWind: {
            ...station.meteoWind,
            status: mwStale ? SensorStatus.OFFLINE : SensorStatus.ONLINE,
        },
    };
}

/**
 * Loads UrbanPulse station data, adds station billboards, and begins periodic
 * polling for sensor and availability updates.
 *
 * @param cluster - Billboard and DOM-annotation manager that receives station
 * data and rendered station icons.
 * @param cache - Shared cache containing status-marker images.
 * @param terrainProvider - Cesium terrain provider used to drape stations onto
 * terrain during initial loading.
 * @param config - UrbanPulse endpoint, mapping, rendering, polling, and status
 * threshold configuration.
 * @returns A cleanup function that stops the polling interval.
 *
 * @throws {Error} Thrown when the required `online` marker is absent from the
 * icon cache.
 *
 * @remarks
 * Terrain sampling runs only during initialization. The resulting Cartesian
 * positions are cached by original source coordinates and reused for all later
 * polling responses, avoiding repeated terrain sampling.
 *
 * The initial billboards use the `online` icon. The immediate call to
 * {@link updateStations} recalculates station status and replaces icons with
 * `online`, `partial`, or `offline` variants as needed.
 *
 * @example
 * ```ts
 * const stopPolling = await startSensorPolling(
 *   stationAnnotations,
 *   IconCache.shared,
 *   viewer.terrainProvider,
 *   urbanPulseConfig,
 * );
 *
 * // Later, when the layer is removed:
 * stopPolling();
 * ```
 */
export async function startSensorPolling(
    cluster: ClusterAnnotation<Identifiable>,
    cache: IconCache,
    terrainProvider: TerrainProvider,
    config: UrbanPulseConfig,
): Promise<() => void> {
    const stations = await fetchSensorStations(
        config.url,
        config.sensorValueMapping,
    );

    const drapedStations = await drapeStationsOnTerrain(
        stations,
        terrainProvider,
    );

    const coordinateCache = new Map(
        stations.map((station, i) => [
            idFromCoordinates(station.coordinates),
            drapedStations[i].coordinates,
        ]),
    );

    const image = await cache.get('online');
    if (!image) throw new Error("Icon 'online' not found in cache.");

    for (const station of drapedStations) {
        const bbPrototype = {
            position: station.coordinates,
            image: renderIcon(image, config.renderSettings),
            pixelOffset: new Cartesian2(0, -config.renderSettings.offset),
        } as BillboardPrototype;

        const stationData = stationToStationData(
            station,
            config.deviceTypeMapping,
        );

        cluster.add(bbPrototype, stationData);
    }

    updateStations(cluster, config, cache, coordinateCache);

    const intervalId = setInterval(() => {
        updateStations(cluster, config, cache, coordinateCache);
    }, config.pollingRateInSeconds * 1000);

    return () => {
        clearInterval(intervalId);
    };
}

/**
 * Updates the data inside an annotation cluster with new sensor data.
 *
 * @param cluster - Billboard and DOM-annotation manager that receives station
 * data and rendered station icons.
 * @param config - UrbanPulse endpoint, mapping, rendering, polling, and status
 * threshold configuration.
 * @param cache - Shared cache containing status-marker images.
 * @param coordinateCache - cache containing the draped coordinates, used for generating the ID
 */
async function updateStations(
    cluster: ClusterAnnotation<Identifiable>,
    config: UrbanPulseConfig,
    cache: IconCache,
    coordinateCache: Map<string, Cartesian3>,
) {
    const stations = await fetchSensorStations(
        config.url,
        config.sensorValueMapping,
    );

    const stationData = (await Promise.all(
        stations.map(async station => {
            const id = idFromCoordinates(station.coordinates);
            const coordinates = coordinateCache.get(id)!;

            const annotationData = stationToStationData(
                {
                    ...station,
                    coordinates,
                },
                config.deviceTypeMapping,
            );

            const stationData = computeStationStatus(
                annotationData,
                config.statusTimeThresholdInSeconds,
            );

            const image = await cache.get(stationData.status);
            if (!image)
                throw new Error(`Could not get '${stationData.status}' image`);
            const icon = renderIcon(image, config.renderSettings).toDataURL();

            return {data: stationData, icon};
        }),
    )) as Array<UrbanPulseStationUpdateData>;

    warnUser(stationData, config);

    cluster.update(
        stationData.map(r => r.data),
        stationData.map(r => r.icon),
    );
}
