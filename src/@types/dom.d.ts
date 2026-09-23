import {Cartesian3} from '@cesium/engine';
import {EVENT_TARGETS} from '../Core/Handler';

/**
 * Extends the standard DOM event map with application-specific Cesium
 * interaction events.
 *
 * @remarks
 * This declaration enables type-safe listeners such as:
 *
 * @example
 * document.addEventListener(EVENT_TARGETS.LEFT_CLICK_3D, (event) => {
 *   const { feature, position } = event.detail;
 * });
 */

declare global {
    interface GlobalEventHandlersEventMap {
        /**
         * Raised when the user left-clicks a picked 3D location.
         *
         * @property feature - The picked application feature, if one was found.
         * @property position - The clicked world-space position in Earth-fixed
         * Cartesian coordinates, if available.
         */
        [EVENT_TARGETS.LEFT_CLICK_3D]: CustomEvent<{
            feature: Feature | undefined;
            position: Cartesian3 | undefined;
        }>;
    }
}
