import type {Annotation} from '../../Core/Annotations/ClusterAnnotation';
import {IconCache} from '../../Core/IconCache';
import {
    SensorStatus,
    type SensorValue,
    type UrbanPulseStationAnnotationData,
} from '../../Core/UrbanPulse/types';
import {mustQuery} from '../utils';
import styles from './SensorAnnotation.css?raw';
import html from './SensorAnnotation.html?raw';

/**
 * Identifiers for icons displayed by {@link SensorAnnotation}.
 *
 * @remarks
 * Each key corresponds to an icon stored in the shared {@link IconCache}.
 * The keys also map to placeholder image elements in the annotation template.
 */
type IconKey =
    | 'temperature'
    | 'humidity'
    | 'irradiation'
    | 'pressure'
    | 'rain'
    | 'windSpeedAvg'
    | 'windDirectionAvg'
    | 'close';

/**
 * Shared shadow-DOM template for {@link SensorAnnotation} instances.
 *
 * @remarks
 * The markup and stylesheet are imported as raw strings and cloned into the
 * shadow root of every annotation instance.
 */
const template = document.createElement('template');
template.innerHTML = `<style>${styles}</style>${html}`;

/**
 * A screen-space annotation that displays environmental measurements from an
 * UrbanPulse weather station.
 *
 * @remarks
 * The annotation renders values from two data sources:
 *
 * - **MeteoHelix**: temperature, humidity, irradiation, pressure, and rain.
 * - **MeteoWind**: average wind speed and average wind direction.
 *
 * Sensor groups provide an independent timestamp and status indicator. Missing
 * sensor data is presented as an offline status and unavailable values are
 * displayed as `-`.
 *
 * Positioning, viewport visibility, clustering, and element removal are managed
 * by the surrounding annotation system. This component only renders station
 * data, resolves icons, and emits a composed `close` event.
 */
export class SensorAnnotation
    extends HTMLElement
    implements Annotation<UrbanPulseStationAnnotationData>
{
    private _root = this.attachShadow({mode: 'open'});

    /**
     * Cached references to required elements in the component shadow DOM.
     */
    private _html: {
        close: HTMLButtonElement;
        closeImg: HTMLImageElement;

        name: HTMLHeadingElement;

        meteoHelixTimestamp: HTMLSpanElement;
        meteoHelixStatus: HTMLDivElement;

        temperature: HTMLSpanElement;
        temperatureImg: HTMLImageElement;

        humidity: HTMLSpanElement;
        humidityImg: HTMLImageElement;

        irradiation: HTMLSpanElement;
        irradiationImg: HTMLImageElement;

        pressure: HTMLSpanElement;
        pressureImg: HTMLImageElement;

        rain: HTMLSpanElement;
        rainImg: HTMLImageElement;

        meteoWindTimestamp: HTMLSpanElement;
        meteoWindStatus: HTMLDivElement;

        windSpeedAvg: HTMLSpanElement;
        windSpeedAvgImg: HTMLImageElement;

        windDirectionAvg: HTMLSpanElement;
        windDirectionAvgImg: HTMLImageElement;
    };

    /**
     * Shared icon cache used to load and reuse sensor icons.
     */
    private _iconCache = IconCache.shared;

    /**
     * Mapping of icon-cache keys to their template image placeholders.
     *
     * @remarks
     * Each placeholder is replaced by the image returned from {@link IconCache}.
     */
    private _iconTargets: Record<IconKey, HTMLElement>;

    /**
     * Updates the annotation from UrbanPulse station data.
     *
     * @param data - Station metadata and optional MeteoHelix and MeteoWind
     * measurement groups.
     *
     * @remarks
     * Missing sensor groups are treated as offline. Missing values within a sensor
     * group are represented by a `SensorValue` with `null` as its value and an
     * empty unit.
     */
    set data(data: UrbanPulseStationAnnotationData) {
        this.name = data.name;

        this.meteoHelixTimestamp = data.meteoHelix?.timestamp ?? null;
        this.meteoHelixStatus = data.meteoHelix?.status ?? SensorStatus.OFFLINE;

        this.temperature = data.meteoHelix?.temperature ?? {
            value: null,
            unit: '',
        };

        this.rain = data.meteoHelix?.rain ?? {
            value: null,
            unit: '',
        };

        this.humidity = data.meteoHelix?.humidity ?? {
            value: null,
            unit: '',
        };

        this.irradiation = data.meteoHelix?.irradiation ?? {
            value: null,
            unit: '',
        };

        this.pressure = data.meteoHelix?.pressure ?? {
            value: null,
            unit: '',
        };

        this.meteoWindTimestamp = data.meteoWind?.timestamp ?? null;
        this.meteoWindStatus = data.meteoWind?.status ?? SensorStatus.OFFLINE;

        this.windSpeedAvg = data.meteoWind?.windSpeedAvg ?? {
            value: null,
            unit: '',
        };
        this.windDirectionAvg = data.meteoWind?.windDirectionAvg ?? {
            value: null,
            unit: '',
        };
    }

    set name(value: string) {
        this._html.name.textContent = value;
    }

    set meteoHelixTimestamp(value: Date | null) {
        if (value) {
            this._html.meteoHelixTimestamp.textContent =
                value.toLocaleString('de-DE');
        } else {
            this._html.meteoHelixTimestamp.textContent = '';
        }
    }

    set temperature(sv: SensorValue) {
        this._html.temperature.textContent =
            sv.value !== null ? `${sv.value} ${sv.unit}` : '-';
    }

    set rain(sv: SensorValue) {
        this._html.rain.textContent =
            sv.value !== null ? `${sv.value} ${sv.unit}` : '-';
    }

    set humidity(sv: SensorValue) {
        this._html.humidity.textContent =
            sv.value !== null ? `${sv.value} ${sv.unit}` : '-';
    }

    set irradiation(sv: SensorValue) {
        this._html.irradiation.textContent =
            sv.value !== null ? `${sv.value} ${sv.unit}` : '-';
    }

    set pressure(sv: SensorValue) {
        this._html.pressure.textContent =
            sv.value !== null ? `${sv.value} ${sv.unit}` : '-';
    }

    set meteoWindTimestamp(value: Date | null) {
        if (value) {
            this._html.meteoWindTimestamp.textContent =
                value.toLocaleString('de-DE');
        } else {
            this._html.meteoWindTimestamp.textContent = '';
        }
    }

    set windSpeedAvg(sv: SensorValue) {
        this._html.windSpeedAvg.textContent =
            sv.value !== null ? `${sv.value} ${sv.unit}` : '-';
    }

    set windDirectionAvg(sv: SensorValue) {
        this._html.windDirectionAvg.textContent =
            sv.value !== null ? `${sv.value} ${sv.unit}` : '-';
    }

    set meteoHelixStatus(value: SensorStatus) {
        this._html.meteoHelixStatus.setAttribute('status', value);
    }

    set meteoWindStatus(value: SensorStatus) {
        this._html.meteoWindStatus.setAttribute('status', value);
    }

    /**
     * Creates the annotation shadow DOM, resolves template elements, creates the
     * icon-placeholder mapping, and installs the close-button event handler.
     */
    constructor() {
        super();
        this._root.appendChild(template.content.cloneNode(true));
        this._html = {
            close: mustQuery<HTMLButtonElement>(this._root, '#close'),
            closeImg: mustQuery<HTMLImageElement>(this._root, '#close-img'),
            name: mustQuery<HTMLHeadingElement>(this._root, '#name'),
            meteoHelixTimestamp: mustQuery<HTMLSpanElement>(
                this._root,
                '#helix-span',
            ),
            meteoWindTimestamp: mustQuery<HTMLSpanElement>(
                this._root,
                '#wind-span',
            ),

            temperature: mustQuery<HTMLSpanElement>(
                this._root,
                '#temperature-span',
            ),
            temperatureImg: mustQuery<HTMLImageElement>(
                this._root,
                '#temperature-img',
            ),
            humidity: mustQuery<HTMLSpanElement>(this._root, '#humidity-span'),
            humidityImg: mustQuery<HTMLImageElement>(
                this._root,
                '#humidity-img',
            ),
            irradiation: mustQuery<HTMLSpanElement>(
                this._root,
                '#irradiation-span',
            ),
            irradiationImg: mustQuery<HTMLImageElement>(
                this._root,
                '#irradiation-img',
            ),
            pressure: mustQuery<HTMLSpanElement>(this._root, '#pressure-span'),
            pressureImg: mustQuery<HTMLImageElement>(
                this._root,
                '#pressure-img',
            ),
            rain: mustQuery<HTMLSpanElement>(this._root, '#rain-span'),
            rainImg: mustQuery<HTMLImageElement>(this._root, '#rain-img'),
            windSpeedAvg: mustQuery<HTMLSpanElement>(
                this._root,
                '#windSpeedAvg-span',
            ),
            windSpeedAvgImg: mustQuery<HTMLImageElement>(
                this._root,
                '#windSpeedAvg-img',
            ),
            windDirectionAvg: mustQuery<HTMLSpanElement>(
                this._root,
                '#windDirectionAvg-span',
            ),
            windDirectionAvgImg: mustQuery<HTMLImageElement>(
                this._root,
                '#windDirectionAvg-img',
            ),
            meteoHelixStatus: mustQuery<HTMLDivElement>(
                this._root,
                '#helix-status-bar',
            ),
            meteoWindStatus: mustQuery<HTMLDivElement>(
                this._root,
                '#wind-status-bar',
            ),
        };

        this._iconTargets = {
            temperature: this._html.temperatureImg,
            humidity: this._html.humidityImg,
            irradiation: this._html.irradiationImg,
            pressure: this._html.pressureImg,
            rain: this._html.rainImg,
            windSpeedAvg: this._html.windSpeedAvgImg,
            windDirectionAvg: this._html.windDirectionAvgImg,
            close: this._html.closeImg,
        };

        this._html.close.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('close', {
                    bubbles: true,
                    composed: true,
                }),
            );
        });
    }

    /**
     * Retrieves all required icons and replaces the corresponding placeholders.
     */
    private async _applyIcons() {
        await Promise.all(
            Object.entries(this._iconTargets).map(async ([key, imgEl]) => {
                const img = await this._iconCache.get(key);
                if (img) {
                    imgEl.replaceWith(img);
                    imgEl = img;
                }
            }),
        );
    }

    async connectedCallback() {
        this._applyIcons();
    }
}

customElements.define('sensor-annotation', SensorAnnotation);
