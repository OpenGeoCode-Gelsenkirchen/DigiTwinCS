import {Cartesian3, Cartographic, type TerrainProvider} from '@cesium/engine';
import {safeSampleTerrainMostDetailed} from '../utilities';
import type {
    DeviceTypeMapping,
    DrapedUrbanPulseStationObject,
    SensorValueMapping,
    UrbanPulseDeviceObject,
    UrbanPulseResponseObject,
    UrbanPulseSensorObject,
    UrbanPulseSensorReading,
    UrbanPulseStationAnnotationData,
    UrbanPulseStationObject,
} from './types';

/**
 * Narrows a raw UrbanPulse sensor feature to one with a usable point geometry.
 *
 * @param object - Raw UrbanPulse sensor feature to inspect.
 * @returns `true` when the feature contains a non-null point geometry.
 *
 */
function hasGeometry(
    obj: UrbanPulseSensorObject,
): obj is UrbanPulseSensorObject & {
    geometry: {coordinates: [number, number]; type: 'Point'};
} {
    return obj.geometry != null;
}

/**
 * Fetches and parses a JSON response, throwing on non-success HTTP responses.
 *
 * @typeParam T - Expected parsed JSON payload type.
 * @param url - Endpoint URL to request.
 * @param options - Optional fetch configuration, such as headers, signal, or
 * request method.
 * @returns Parsed JSON response.
 * @throws {Error} Thrown when the HTTP response status is not successful.
 */
export async function safeFetchJson<T>(
    url: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
}

/**
 * Extracts raw sensor features from an UrbanPulse API response.
 *
 * @param response - Raw UrbanPulse endpoint response.
 * @returns Sensor features contained in the response result.
 */
export function unwrapResponseObject(
    obj: UrbanPulseResponseObject,
): Array<UrbanPulseSensorObject> {
    return obj.result.features;
}

/**
 * Converts a raw UrbanPulse sensor feature into a normalized sensor reading.
 *
 * @param object - Raw feature containing the source sensor reading.
 * @param valueMappings - Optional conversion configuration keyed by normalized
 * sensor label.
 * @returns Normalized sensor reading with a lower-case label, converted unit,
 * and value rounded to two decimal places.
 *
 * @remarks
 * The raw sensor label is normalized using `toLocaleLowerCase()` before lookup.
 * Therefore, all keys in `valueMappings` must use the same lower-case form.
 *
 * When a mapping exists, the converted value is calculated as:
 *
 * \[
 * \text{value} = \text{rawValue} \times \text{factor} + \text{offset}
 * \]
 *
 * The final value is rounded to two decimal places for annotation display.
 */
export function readFromSensorObject(
    obj: UrbanPulseSensorObject,
    valueMappings?: SensorValueMapping,
): UrbanPulseSensorReading {
    const sensorLabel = obj.properties.sensorLabel.toLocaleLowerCase();

    const result = {
        SID: obj.properties.SID,
        sensorLabel: sensorLabel,
        unit: obj.properties.units,
        value: obj.properties.value,
    };

    if (valueMappings) {
        const mapping = valueMappings[sensorLabel];

        if (mapping) {
            result.value =
                obj.properties.value * mapping.factor + mapping.offset;
            result.unit = mapping.unit;
        }
    }

    result.value = Math.round(result.value * 100) / 100;

    return result;
}

/**
 * Creates the device metadata container for the first sensor feature belonging
 * to an UrbanPulse device.
 *
 * @param object - Raw sensor feature that supplies device metadata.
 * @returns A device with no readings. The caller appends sensor readings later.
 */
export function createDeviceFromSensorObject(
    obj: UrbanPulseSensorObject,
): UrbanPulseDeviceObject {
    return {
        deviceId: obj.properties.deviceId,
        deviceName: obj.properties.deviceName,
        deviceType: obj.properties.deviceType,
        timestamp: obj.properties.timestamp,
        sensors: [],
    };
}

/**
 * Groups raw UrbanPulse sensor features into stations, devices, and normalized
 * sensor readings.
 *
 * @param objects - Raw sensor features returned from the UrbanPulse endpoint.
 * @param valueMappings - Optional conversion configuration keyed by sensor
 * label.
 * @returns Stations grouped by identical longitude and latitude coordinates.
 *
 * @remarks
 * Grouping occurs in two stages:
 *
 * - Features with identical coordinate pairs are assigned to one station.
 * - Features in that station with the same `deviceType` are assigned to one
 *   device.
 */
export function responseObjectsToStationObjects(
    objs: Array<UrbanPulseSensorObject>,
    valueMappings?: SensorValueMapping,
): Array<UrbanPulseStationObject> {
    const stations: Record<string, UrbanPulseStationObject> = {};

    for (const obj of objs) {
        if (!hasGeometry(obj) || !obj.properties.deviceId) continue;

        const coordinates = obj.geometry.coordinates;
        const key = `${coordinates[0]}:${coordinates[1]}`;

        if (!(key in stations)) {
            stations[key] = {
                coordinates: coordinates,
                devices: [],
            };
        }

        const station = stations[key];
        const deviceType = obj.properties.deviceType;
        let device = station.devices.find(d => d.deviceType === deviceType);

        if (!device) {
            device = createDeviceFromSensorObject(obj);
            station.devices.push(device);
        }

        device.sensors.push(readFromSensorObject(obj, valueMappings));
    }

    return Object.values(stations);
}

/**
 * Fetches the latest UrbanPulse sensor response and groups it into station
 * objects.
 *
 * @param url - UrbanPulse endpoint URL.
 * @param valueMappings - Optional conversion configuration keyed by sensor
 * label.
 * @returns Normalized station objects with geographic source coordinates.
 *
 * @throws {Error} Thrown when the endpoint responds with a non-success HTTP
 * status.
 */
export async function fetchSensorStations(
    url: string,
    valueMappings?: SensorValueMapping,
): Promise<Array<UrbanPulseStationObject>> {
    const raw = await safeFetchJson<UrbanPulseResponseObject>(url);
    const sensorObjects = unwrapResponseObject(raw);
    return responseObjectsToStationObjects(sensorObjects, valueMappings);
}

/**
 * Converts station longitude/latitude coordinates to terrain-adjusted Cesium
 * Cartesian positions.
 *
 * @param stations - Stations using source longitude and latitude coordinates.
 * @param terrainProvider - Cesium terrain provider used for elevation sampling.
 * @returns Stations with their coordinate tuple replaced by terrain-adjusted
 * {@link Cartesian3} positions.
 *
 */
export async function drapeStationsOnTerrain(
    stations: Array<UrbanPulseStationObject>,
    terrainProvider: TerrainProvider,
): Promise<Array<DrapedUrbanPulseStationObject>> {
    return Promise.all(
        stations.map(
            async (station): Promise<DrapedUrbanPulseStationObject> => {
                const coordinates = station.coordinates;
                const carto = Cartographic.fromDegrees(
                    coordinates[0],
                    coordinates[1],
                );

                const newLocation = await safeSampleTerrainMostDetailed(
                    terrainProvider,
                    [carto],
                );

                const position = Cartesian3.fromRadians(
                    newLocation[0].longitude,
                    newLocation[0].latitude,
                    newLocation[0].height,
                );

                return {
                    ...station,
                    coordinates: position,
                };
            },
        ),
    );
}

/**
 * Converts a terrain-draped UrbanPulse station into data consumed by a sensor
 * annotation component.
 *
 * @param station - Station with terrain-adjusted Cartesian coordinates and
 * grouped device readings.
 * @param mapping - Device-type mapping that assigns source devices to the
 * MeteoHelix or MeteoWind sensor groups.
 * @returns Data object used by `sensor-annotation`.
 *
 * @remarks
 * A device type belongs to one of two supported groups:
 *
 * - `meteoHelix` provides temperature, humidity, irradiation, rainfall, and
 *   pressure values.
 * - `meteoWind` provides average wind speed and average wind direction.
 *
 * Unknown device types are ignored and reported through `console.warn`.
 *
 * Missing individual values remain valid annotation data and are represented as
 * `{ value: null, unit: '' }`. This allows the UI to display an unavailable
 * placeholder without rejecting the entire station.
 *
 * The current station ID is derived from terrain-adjusted Cartesian X and Y
 * components. This must remain stable between polling updates for
 * `ClusterAnnotation.update()` to match new data to existing billboards.
 */
export function stationToStationData(
    station: DrapedUrbanPulseStationObject,
    mapping: DeviceTypeMapping,
): UrbanPulseStationAnnotationData {
    const result: UrbanPulseStationAnnotationData = {
        name: station.devices[0]?.deviceName ?? 'Unknown',
        id: `${station.coordinates.x}:${station.coordinates.y}`,
    };

    for (const device of station.devices) {
        const deviceKey = mapping.meteoHelix.includes(device.deviceType)
            ? 'meteoHelix'
            : mapping.meteoWind.includes(device.deviceType)
              ? 'meteoWind'
              : null;

        if (!deviceKey) {
            console.warn(`No mapping for deviceType: ${device.deviceType}`);
            continue;
        }

        const sensors = Object.fromEntries(
            device.sensors.map(sensor => [
                sensor.sensorLabel,
                {value: sensor.value, unit: sensor.unit},
            ]),
        );

        if (deviceKey === 'meteoHelix') {
            result.meteoHelix = {
                temperature: {
                    value: sensors.temperature?.value ?? null,
                    unit: sensors.temperature?.unit ?? '',
                },
                humidity: {
                    value: sensors.humidity?.value ?? null,
                    unit: sensors.humidity?.unit ?? '',
                },
                irradiation: {
                    value: sensors.irradiation?.value ?? null,
                    unit: sensors.irradiation?.unit ?? '',
                },
                rain: {
                    value: sensors.rain_counter?.value ?? null,
                    unit: sensors.rain_counter?.unit ?? '',
                },
                pressure: {
                    value: sensors.pressure?.value ?? null,
                    unit: sensors.pressure?.unit ?? '',
                },
                timestamp: new Date(device.timestamp),
            };
        } else if (deviceKey === 'meteoWind') {
            result.meteoWind = {
                windSpeedAvg: {
                    value: sensors.wind_speed_avg?.value ?? null,
                    unit: sensors.wind_speed_avg?.unit ?? '',
                },
                windDirectionAvg: {
                    value: sensors.wind_dir_avg?.value ?? null,
                    unit: sensors.wind_dir_avg?.unit ?? '',
                },
                timestamp: new Date(device.timestamp),
            };
        }
    }
    return result;
}
