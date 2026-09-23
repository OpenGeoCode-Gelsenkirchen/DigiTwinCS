import {Cartesian3} from '@cesium/engine';

/**
 * Root response returned by the UrbanPulse sensor endpoint.
 *
 * @remarks
 * The actual sensor features are nested under `result.features` rather than
 * being returned as a standard top-level GeoJSON `FeatureCollection`.
 */
export interface UrbanPulseResponseObject {
    result: {
        features: Array<UrbanPulseSensorObject>;
    };
}

/**
 * Raw GeoJSON-like feature representing one UrbanPulse sensor measurement.
 *
 * @remarks
 * A station can produce multiple features: typically one per physical sensor
 * or measured property. These raw measurements are later grouped into
 * {@link UrbanPulseDeviceObject} and then {@link UrbanPulseStationObject}
 * instances.
 */
export interface UrbanPulseSensorObject {
    geometry?: {
        coordinates: [number, number];
        type: 'Point';
    };
    properties: {
        SID: string;
        deviceId: string;
        deviceName: string;
        deviceType: string;
        sensorLabel: string;
        timestamp: string; //ISO 8601
        units: string;
        value: number;
    };
    type: 'Feature';
}

/**
 * Normalized reading for a single sensor associated with an UrbanPulse device.
 */
export interface UrbanPulseSensorReading {
    SID: string;
    sensorLabel: string;
    unit: string;
    value: number;
}

/**
 * A physical UrbanPulse device and all sensor readings associated with it.
 *
 * @remarks
 * Multiple raw {@link UrbanPulseSensorObject} features are grouped into one
 * device when they share the same `deviceId`.
 */
export interface UrbanPulseDeviceObject {
    deviceId: string;
    deviceName: string;
    deviceType: string;
    timestamp: string;
    sensors: Array<UrbanPulseSensorReading>;
}

/**
 * A geographic UrbanPulse station containing one or more physical devices.
 *
 * @remarks
 * This is the pre-terrain-sampling representation. Its coordinate tuple is
 * normally longitude and latitude in the source coordinate reference system.
 */
export interface UrbanPulseStationObject {
    coordinates: [number, number];
    devices: Array<UrbanPulseDeviceObject>;
}

/**
 * UrbanPulse station after its source coordinates have been projected and
 * draped onto the Cesium terrain surface.
 */
export interface DrapedUrbanPulseStationObject {
    coordinates: Cartesian3;
    devices: Array<UrbanPulseDeviceObject>;
}

/**
 * A sensor value and its display unit.
 *
 * @remarks
 * A `null` value denotes an unavailable, invalid, or unreported measurement.
 * UI components can display a placeholder, such as `-`, for this state.
 */
export interface SensorValue {
    value: number | null;
    unit: string;
}

/**
 * Data consumed by a `sensor-annotation` custom element.
 *
 * @remarks
 * The station-level status is derived from freshness of the two optional sensor
 * groups. The UI displays absent groups as offline and absent individual
 * measurements as unavailable.
 */
export interface UrbanPulseStationAnnotationData {
    id: string;
    name: string;
    meteoHelix?: {
        temperature: SensorValue;
        humidity: SensorValue;
        irradiation: SensorValue;
        rain: SensorValue;
        pressure: SensorValue;
        timestamp: Date;
        status?: SensorStatus;
    };
    meteoWind?: {
        windSpeedAvg: SensorValue;
        windDirectionAvg: SensorValue;
        timestamp: Date;
        status?: SensorStatus;
    };
    status?: SensorStatus;
}

/**
 * Conversion configuration keyed by source sensor label.
 *
 * @remarks
 * Each record key corresponds to an UrbanPulse `sensorLabel`. The associated
 * conversion is used to normalize raw source values for display and processing.
 */
export type SensorValueMapping = Record<string, SensorValueConversion>;

/**
 * Linear transformation applied to a raw sensor value.
 *
 * @remarks
 * A converted value is calculated as:
 *
 * \[
 * \text{convertedValue} =
 * \text{rawValue} \times \text{factor} + \text{offset}
 * \]
 */
export interface SensorValueConversion {
    factor: number;
    offset: number;
    unit: string;
}

/**
 * Availability states for an UrbanPulse station or a sensor group.
 */
export const SensorStatus = {
    ONLINE: 'online',
    PARTIAL: 'partial',
    OFFLINE: 'offline',
} as const;

/**
 * Union of supported {@link SensorStatus} values.
 */
export type SensorStatus = (typeof SensorStatus)[keyof typeof SensorStatus];

/**
 * Maps application sensor groups to UrbanPulse device types.
 *
 * @remarks
 * A station can contain several devices of the same category. The connector
 * uses these lists to decide which source device contributes data to the
 * MeteoHelix and MeteoWind sections of an annotation.
 */
export type DeviceTypeMapping = {
    meteoHelix: Array<string>;
    meteoWind: Array<string>;
};

/**
 * Complete configuration required to fetch, convert, render, and periodically
 * update UrbanPulse station annotations.
 */
export type UrbanPulseConfig = {
    url: string;
    icons: {
        byType: Record<string, string>;
        byState: Record<SensorStatus, string>;
    };
    renderSettings: {
        offset: number;
        width: number;
        height: number;
        iconSize: number;
        backgroundColor: string;
        pinTailLength: number;
    };
    statusTimeThresholdInSeconds: number;
    pctSensorWarningThreshold: number;
    pollingRateInSeconds: number;
    deviceTypeMapping: DeviceTypeMapping;
    sensorValueMapping: Record<string, SensorValueConversion>;
};
/**
 * Result of a station polling update.
 *
 * @remarks
 * The data object updates the detailed annotation, while `icon` updates the
 * corresponding Cesium billboard image.
 */
export type UrbanPulseStationUpdateData = {
    data: UrbanPulseStationAnnotationData;
    icon: string;
};
