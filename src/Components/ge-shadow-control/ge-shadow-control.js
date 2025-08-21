import {JulianDate} from '@cesium/engine';
//import i18n, {initPromise} from '../../i18n.js';
import '../ge-range/ge-range.js';
import '../ge-toggle/ge-toggle.js';
import styles from './ge-shadow-control.css?raw';
import template from './ge-shadow-control.html?raw';

/**
 * `<ge-shadow-control>` – UI component for controlling shadows, date, and time in Cesium scenes.
 *
 * This component provides:
 * - A toggle switch for enabling/disabling shadows (`.toggle`)
 * - A date picker for adjusting the scene date (`.calendar`)
 * - A slider for hour/minute selection during the day (`.slider`)
 * - A live display of the chosen time (`.time`)
 * - Descriptive labels, all customizable via attributes
 *
 * UI changes are automatically synchronized to the given Cesium `viewer` instance.
 * Labels can be configured via either attributes or properties.
 * Time and date are always handled in UTC using JavaScript Date objects.
 *
 * @summary
 * UI control for Cesium.js shadow, date, and time settings, with live viewer sync.
 *
 * @example
 * ```
 * <ge-shadow-control
 *   toggle-label="Shadows"
 *   calendar-label="Date"
 *   slider-label="Time of day"
 *   time-label="Current time"
 * ></ge-shadow-control>
 *
 * <script>
 *   // Pass in a viewer instance and optionally the initial datetime:
 *   const control = new GeShadowControl({
 *     viewer: cesiumViewer,
 *     datetime: new Date(),
 *     bundle: texturesBundle
 *   });
 *   document.body.appendChild(control);
 * </script>
 * ```
 *
 * @property {object} viewer - The Cesium Viewer instance (set externally).
 * @property {Date} date - The current date (changing this updates both UI and the viewer).
 * @property {Date} datetime - Combined UTC date+time (kept in sync between UI and viewer).
 * @property {Date} time - Current time of day (hours/minutes; only the time part is used).
 *
 * @method updateUI() - Updates labels, inputs, and slider based on the current datetime.
 * @method updateViewer() - Pushes the component's datetime state into the Cesium viewer.
 *
 */
export class GeShadowControl extends HTMLElement {
    static get observedAttributes() {
        return ['toggle-label', 'calendar-label', 'slider-label', 'time-label'];
    }

    /**
     * @param {object} [options]
     * @param {any} [options.viewer] - Cesium Viewer reference
     * @param {Date|number} [options.datetime] - Initial date/time (Date object or epoch ms)
     * @param {any} [options.bundle] - Optional external bundle (e.g. for labels)
     */
    constructor({viewer, datetime, bundle} = {}) {
        super();
        this.viewer = viewer;
        this.attachShadow({mode: 'open'});
        if (this.shadowRoot) {
            this.bundle = bundle;
            this.shadowRoot.innerHTML = `
                <style>${styles}</style>
                ${template}
            `;

            this.html = {
                switch: this.shadowRoot.querySelector('.toggle'),
                datePicker: this.shadowRoot.querySelector('.calendar'),
                slider: this.shadowRoot?.querySelector('.slider'),
                //text: this.shadowRoot?.querySelector('.slider-label'),
                time: this.shadowRoot?.querySelector('.time'),
                toggleLabel: this.shadowRoot?.querySelector('.toggle-label'),
                calendarLabel:
                    this.shadowRoot?.querySelector('.calendar-label'),
                sliderLabel: this.shadowRoot?.querySelector('.slider-label'),
                timeLabel: this.shadowRoot?.querySelector('.time-label'),
            };

            // Toggle shadow in Cesium viewer
            this.html.switch?.addEventListener('change', () => {
                this.viewer.scene.shadowMap.enabled = this.html.switch.checked;
            });

            // Change date
            this.html.datePicker.addEventListener('change', e => {
                if (!e.target.value) return;
                const date = new Date();
                const [year, month, day] = e.target.value
                    .split('-')
                    .map(Number);
                date.setFullYear(year, month, day);
                this.date = date;
                this.updateUI();
                this.updateViewer();
            });

            // Change time via slider
            this.html.slider?.addEventListener('input', e => {
                const _minutes = e.target.value;
                const date = new Date();
                const [minutes, hours] = this.getMinutesAndHours(_minutes);
                date.setHours(hours);
                date.setMinutes(minutes);
                this.time = date;
                this.updateUI();
                this.updateViewer();
            });

            this.datetime = datetime || Date.now();
            this.bundle = bundle;
            this.updateUI();
            this.updateViewer();
            this.lastJulianDate = null;
        }
    }

    /**
     * React to attribute changes for updating labels.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'toggle-label': {
                this.html.toggleLabel.textContent = newValue;
                break;
            }
            case 'calendar-label': {
                this.html.calendarLabel.textContent = newValue;
                break;
            }
            case 'slider-label': {
                this.html.sliderLabel.textContent = newValue;
                break;
            }
            case 'time-label': {
                this.html.timeLabel.textContent = newValue;
                break;
            }
        }
    }

    /** @type {any} Cesium viewer reference. */
    set viewer(value) {
        if (!value) return;
        this._viewer = value;
        this.datetime = JulianDate.toDate(value.clock.currentTime);
        this.updateUI();
    }

    get viewer() {
        return this._viewer;
    }

    /** @type {Date} Adjust only the date (year/month/day). */
    set date(newDate) {
        this.datetime.setFullYear(
            newDate.getFullYear(),
            newDate.getMonth(),
            newDate.getDate(),
        );
    }

    /** @type {Date} Only the time part (hours/minutes) is updated. */
    get time() {
        return this.datetime.getTime();
    }

    set time(newTime) {
        this.datetime.setHours(newTime.getHours());
        this.datetime.setMinutes(newTime.getMinutes());
    }

    /** @type {Date} Combined date and time (UTC). */
    get datetime() {
        return this._datetime;
    }

    set datetime(utc) {
        this._datetime = new Date(utc);
    }

    /** Helper: given absolute minutes, returns [minutes, hours] */
    getMinutesAndHours(_minutes) {
        const hours = Math.floor(_minutes / 60);
        const minutes = Math.floor(_minutes % 60);
        return [minutes, hours];
    }

    /** Helper: hours and minutes → HH:MM string */
    minutesAndHoursToString(_minutes, _hours) {
        const hours = _hours.toString().padStart(2, '0');
        const minutes = _minutes.toString().padStart(2, '0'); //(Math.floor((minutes % 60) / 15) * 15)
        return `${hours}:${minutes}`;
    }

    /** Syncs UI fields with the current datetime. */
    updateUI() {
        const hours = this.datetime.getHours();
        const minutes = this.datetime.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        this.html.datePicker.value = this.datetime.toISOString().split('T')[0];
        this.html.slider.value = totalMinutes;

        this.html.time.innerText = this.minutesAndHoursToString(minutes, hours);
    }

    /** Syncs Cesium viewer (time and shadows) to the current datetime. */
    updateViewer() {
        if (!this.viewer) return;
        const julianDate = JulianDate.fromDate(this.datetime);

        if (
            !this.lastJulianDate ||
            !JulianDate.equals(julianDate, this.lastJulianDate)
        ) {
            this.viewer.clock.currentTime = julianDate.clone();
            this.lastJulianDate = JulianDate.clone(julianDate);
        }
    }
}

customElements.define('ge-shadow-control', GeShadowControl);
