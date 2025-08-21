import {
    Cartesian3,
    Cartographic,
    Math as CesiumMath,
    Ray,
} from '@cesium/engine';
import L from 'leaflet';
import 'leaflet-rotatedmarker';
import proj4 from 'proj4';
import {app} from './Core/Application.js';
import {Flags} from './Flags.js';
import {configReady} from './init.js';

/**
 * Initializes and manages the overview map UI component using Leaflet,
 * synchronizing its state and location with the Cesium viewer camera.
 * If no overviewMap configuration is found, removes the overview map button and window
 * and ensures cleanup after app initialization.
 *
 * Features:
 * - Initializes a Leaflet map, sets position and disables/enables map controls as needed.
 * - Observes div resizing for proper map reflow.
 * - Handles double-click on the mini-map to fly the Cesium camera to the corresponding location,
 *   accounting for terrain and optionally mesh intersection if enabled.
 * - Adds a custom frustum marker and a point at the Cesium camera location.
 * - Dynamically updates marker position and angle as the Cesium camera moves.
 * - Adjusts overview map zoom level automatically based on main camera height after every move.
 * - Handles tile errors gracefully with a console warning.
 *
 * @listens DOMContentLoaded
 */
addEventListener('DOMContentLoaded', async () => {
    const config = (await configReady)?.overviewMap;
    if (!config) {
        document.getElementById('map_btn')?.remove();
        document.getElementById('win-overview-map')?.remove();
        addEventListener('initialized', () => {
            document.getElementById('win-overview-map')?.remove();
        });
        return;
    }

    // Get current Cesium camera cartographic coordinates and transform to lat/lng
    const carto = app.viewer.camera.positionCartographic;

    const latLngDeg = L.latLng(
        CesiumMath.toDegrees(carto.latitude),
        CesiumMath.toDegrees(carto.longitude),
    );

    // Initialize the Leaflet overview map with custom (WMS) background layer
    const map = L.map('overview-map', {
        zoomControl: false,
        attributionControl: false,
        boxZoom: false,
        doubleClickZoom: false,
        dragging: true,
        keyboard: false,
        scrollWheelZoom: true,
    }).setView(latLngDeg, 15);

    // Maintain correct map rendering if parent container resizes
    const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
    });

    const overviewMap = document.getElementById('overview-map');
    resizeObserver.observe(overviewMap);

    // Double-clicking on the overview map flies the main camera to the clicked location (with terrain/mesh height logic)
    map.on('dblclick', async function (event) {
        const heightOffset = 100;
        const fallbackHeightOffset = 200;

        if (Flags.cameraChange === true) {
            const coords = proj4('WGS84', 'COORD', [
                event.latlng.lng,
                event.latlng.lat,
            ]);
            coords[1] -= 100;
            const coordinates = proj4('COORD', 'WGS84', [coords[0], coords[1]]);

            let position = Cartesian3.fromDegrees(
                coordinates[0],
                coordinates[1],
                fallbackHeightOffset,
            );

            if (app.showMesh) {
                const direction = Cartesian3.normalize(
                    position,
                    new Cartesian3(),
                );
                const inversedDirection = Cartesian3.negate(
                    direction,
                    new Cartesian3(),
                );
                const origin = Cartesian3.add(
                    position,
                    Cartesian3.multiplyByScalar(
                        direction,
                        heightOffset,
                        new Cartesian3(),
                    ),
                    new Cartesian3(),
                );
                const ray = new Ray(origin, inversedDirection);
                const pick =
                    await app.viewer.scene.pickFromRayMostDetailed(ray);

                if (pick?.position) {
                    position = Cartesian3.add(
                        pick.position,
                        Cartesian3.multiplyByScalar(
                            direction,
                            heightOffset,
                            new Cartesian3(),
                        ),
                        new Cartesian3(),
                    );
                }
            } else {
                const height = app.viewer.scene.globe.getHeight(
                    new Cartographic.fromDegrees(
                        coordinates[0],
                        coordinates[1],
                    ),
                );
                coordinates.push(height + heightOffset);

                if (height) {
                    position = Cartesian3.fromDegrees(
                        coordinates[0],
                        coordinates[1],
                        coordinates[2],
                    );
                }
            }

            // Camera fly to the computed world position
            if (position) {
                app.viewer.camera.flyTo({
                    destination: position,
                    orientation: {
                        heading: 0,
                        pitch: CesiumMath.toRadians(-45),
                        roll: 0,
                    },
                });
            }
        }
    });

    // Add WMS tile layer as overview map base layer
    const mapdefault = L.tileLayer
        .wms(config.url, {
            layers: config.layers,
            format: 'image/png',
            transparent: false,
            attribution: config.attribution,
            minZoom: config.minZoom,
            maxZoom: config.maxZoom,
            bounds: L.latLngBounds(
                L.latLng(config.bounds[0], config.bounds[1]),
                L.latLng(config.bounds[2], config.bounds[3]),
            ),
        })
        .addTo(map);

    // Add built-in zoom, attribution, and scale controls at desired positions
    L.control
        .zoom({
            position: 'topright',
        })
        .addTo(map);

    L.control
        .attribution({
            position: 'bottomleft',
            prefix: 'Leaflet',
        })
        .addTo(map);

    L.control
        .scale({
            imperial: false,
            position: 'bottomright',
        })
        .addTo(map);

    // Custom frustum icon marker for main camera location; add to the map
    const triangle = L.icon({
        iconUrl: 'images/common/frustum.png',
        iconSize: [80, 160],
        iconAnchor: [40, 80],
    });

    const marker = L.marker(latLngDeg, {
        icon: triangle,
        rotationAngle: 0,
        opacity: 0.6,
        interactive: false,
    }).addTo(map);

    // Add a small blue point at the camera's lat/lng
    const point = L.circleMarker(latLngDeg, {
        radius: 1,
        weight: 7,
        color: 'blue',
        interactive: false,
    }).addTo(map);

    /**
     * Updates overview map zoom and view after Cesium camera move ends.
     * Sets zoom according to camera height and recenters to marker.
     */
    app.viewer.camera.moveEnd.addEventListener(function () {
        // Adjust zoom level based on Cesium camera height above the globe
        const cameraheight =
            app.viewer.camera.positionCartographic.height -
            app.viewer.scene.globe.getHeight(
                app.viewer.camera.positionCartographic,
            );
        if (cameraheight > 3000) {
            map.setZoom(10);
        } else if (3000 >= cameraheight && cameraheight > 2000) {
            map.setZoom(11);
        } else if (2000 >= cameraheight && cameraheight > 1000) {
            map.setZoom(12);
        } else if (1000 >= cameraheight && cameraheight > 500) {
            map.setZoom(13);
        } else if (500 >= cameraheight && cameraheight > 250) {
            map.setZoom(14);
        } else if (250 >= cameraheight && cameraheight > 100) {
            map.setZoom(15);
        } else if (100 >= cameraheight) {
            map.setZoom(16);
        }

        setTimeout(function () {
            map.setView(marker.getLatLng());
        }, 500);
    });

    /**
     * Updates the overview map's marker position and rotation as the Cesium camera moves,
     * keeping alignment with the main map's camera heading and position.
     */
    app.viewer.camera.changed.addEventListener(function () {
        const latLngDeg = L.latLng(
            CesiumMath.toDegrees(
                app.viewer.camera.positionCartographic.latitude,
            ),
            CesiumMath.toDegrees(
                app.viewer.camera.positionCartographic.longitude,
            ),
        );
        marker.setLatLng(latLngDeg);
        point.setLatLng(latLngDeg);

        const angle = CesiumMath.toDegrees(app.viewer.camera.heading);
        marker.setRotationAngle(angle);
    });

    /**
     * Handles and logs errors if map tiles fail to load.
     */
    mapdefault.on('tileerror', function () {
        console.warn('WebMap hasnt been loaded. Backup needed.');
    });
});
