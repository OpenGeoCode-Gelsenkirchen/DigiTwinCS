//taken from https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
import {
    Cartesian3,
    Cartographic,
    Math as CesiumMath,
    EllipsoidTerrainProvider,
    JulianDate,
    sampleTerrainMostDetailed,
} from '@cesium/engine';
import {NUM_TRIALS_SAMPLE_TERRAIN} from '../constants.js';
import {Variables} from '../global.js';
import {i18next} from '../i18n.js';
import {WindowFactory} from './WindowFactory.js';

/**
 * Wrapped function to check for an ID. Especially useful inside .filter()
 * @param {string} id
 * @returns
 */
function checkId(id) {
    return function (element) {
        return id !== element;
    };
}

/**
 * Util function to check if something is an Object
 * @param {any} val
 * @returns
 */
export function isObject(val) {
    return Object.prototype.toString.call(val) === '[object Object]';
}

/**
 * Util function to filter IDs inside an object based on a key
 * @param {*} dict
 * @param {*} key
 * @param {*} id
 * @returns
 */
export function updateHideIDs(dict, key, id) {
    const s = new Set();

    Array.from(dict[key])
        .filter(checkId(id))
        .forEach(x => s.add(x));
    dict[key] = s;
    return dict;
}

/**
 * Function to sample safely from a terrain. If sampling fails, it's tried again every 50ms for num_trials.
 * @param {CesiumTerrainProvider} terrainProvider
 * @param {Array<Cartesian3>} terrainSamplePositions
 * @param {number} num_trials
 * @returns
 */
export async function safeSampleTerrainMostDetailed(
    terrainProvider,
    terrainSamplePositions,
    num_trials = 0,
) {
    try {
        const positions = await sampleTerrainMostDetailed(
            terrainProvider,
            terrainSamplePositions,
            true,
        );
        return positions;
    } catch (error) {
        if (num_trials < NUM_TRIALS_SAMPLE_TERRAIN) {
            return new Promise(resolve => {
                setTimeout(async () => {
                    const result = await safeSampleTerrainMostDetailed(
                        terrainProvider,
                        terrainSamplePositions,
                        num_trials + 1,
                    );
                    resolve(result);
                }, 50);
            });
        } else {
            throw error;
        }
    }
}

/**
 * Utility function to generate a pseudo random uuid version 4
 * @returns
 */
export function uuidv4() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (
            +c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
        ).toString(16),
    );
}

import proj4 from 'proj4';

/**
 * Utility function to convert from WGS84 to the project coordinate system
 * @param {[number, number]} degrees
 * @returns
 */
export function degreesToProjectCoord(degrees) {
    return proj4('WGS84', 'COORD', degrees);
}

/**
 * Utility function to convert from project coordinate system to WGS84
 * @param {[number, number]} coord
 * @returns
 */
export function projectCoordToDegrees(coord) {
    return proj4('COORD', 'WGS84', coord);
}

/**
 * Utility function to convert from project coordinate system to WGS84 and then to Cartesian3
 * @param {[number, number]} coord
 * @returns
 */
export function projectCoordToCartesian(coord) {
    const carto = projectCoordToDegrees(coord);
    // @ts-ignore
    const cartesian = Cartesian3.fromDegrees(...carto);
    return cartesian;
}

/**
 * Utility function to convert from cartesian to an array with coordinates in degrees
 * @param {Cartesian3} cartesian
 * @returns
 */
export function cartesianToDegree(cartesian) {
    // @ts-ignore
    const carto = Cartographic.fromCartesian(cartesian);
    const degrees = [
        // @ts-ignore
        CesiumMath.toDegrees(carto.longitude),
        // @ts-ignore
        CesiumMath.toDegrees(carto.latitude),
    ];
    if (carto.height) degrees.push(carto.height);
    return degrees;
}

/**
 * Utility function to convert cartesians to project coordinates
 * @param {*} cartesian
 * @returns
 */
export function cartesianToProjectCoord(cartesian) {
    const degrees = cartesianToDegree(cartesian);
    const coord = proj4('WGS84', 'COORD', degrees);
    // @ts-ignore
    return [...coord, degrees.height];
}

/**
 * Utility function to find the maximum z value of an array of Cartesian3.
 * @param {*} cartesian
 * @returns
 */
export function cartesianToMaxZ(cartesian) {
    const cartos = cartesian.map(c => Cartographic.fromCartesian(c));
    return cartos.reduce((m, v) => {
        if ((m && v.height > m) || !m) {
            return v.height;
        }
        return m;
    }, undefined);
}

/**
 * Utility function to find the minimum z value of an array of Cartesian3.
 * @param {*} cartesian
 * @returns
 */
export function cartesianToMinZ(cartesian) {
    const cartos = cartesian.map(c => Cartographic.fromCartesian(c));
    return cartos.reduce((m, v) => {
        if ((m && v.height < m) || !m) {
            return v.height;
        }
        return m;
    }, undefined);
}

/**
 * Utility function to subsample a distance from startCartesian to endCartesian with an approximate spacing of approxSpacing
 * @param {*} startCartesian
 * @param {*} endCartesian
 * @param {*} approxSpacing
 * @returns
 */
export function subsampleLine(startCartesian, endCartesian, approxSpacing) {
    const distBetween = Cartesian3.distance(startCartesian, endCartesian);
    const divider = Math.ceil(distBetween / approxSpacing);
    const spacing = distBetween / divider;
    const subsamples = [startCartesian];

    for (const step of getSteps(distBetween, spacing)) {
        const alpha = step / distBetween;
        const interpolated = Cartesian3.lerp(
            startCartesian,
            endCartesian,
            alpha,
            new Cartesian3(),
        );
        subsamples.push(interpolated);
    }
    subsamples.push(endCartesian);
    return subsamples;
}

/**
 * Utility function to an array of offsets from 0 to maxDistance with set spacing.
 * @param {*} maxDistance
 * @param {*} spacing
 * @returns
 */
export function getSteps(maxDistance, spacing) {
    const result = [];

    for (let i = spacing; i < maxDistance; i += spacing) {
        result.push(i);
    }
    return result;
}

/**
 * Utility function to remove neighboring duplicates in an array based on a compare callback function.
 * @param {*} array
 * @param {*} compareFn
 * @returns
 */
export function removeNeighboringDuplicates(array, compareFn) {
    const result = [];
    for (let i = 0; i < array.length; i++) {
        const j = (i + 1) % array.length;
        if (!compareFn(array[i], array[j])) {
            result.push(array[i]);
        }
    }
    return result;
}

/**
 * Utility function to subsample a polygon (outline) with an approximate spacing.
 * @param {*} polygon
 * @param {*} approxSpacing
 * @returns
 */
export function subsamplePolygon(polygon, approxSpacing) {
    const subsamples = [];
    polygon.forEach((_, i) => {
        const start = polygon[i];
        const end = polygon[(i + 1) % polygon.length];
        const subsampledLine = subsampleLine(start, end, approxSpacing);
        subsamples.push(...subsampledLine);
    });

    return [
        ...removeNeighboringDuplicates(subsamples, (a, b) => {
            return a.equals(b);
        }),
        subsamples[0],
    ];
}

/**
 * Utility function to convert a cartesian array to a cartographic array
 * @param {*} cartesians
 * @returns
 */
export function cartesianArrayToCartographic(cartesians) {
    return cartesians.map(x => Cartographic.fromCartesian(x));
}

/**
 * Utility function to convert an array of radians cartographic coordinates to an array of Cartesian3
 * @param {*} radians
 * @returns
 */
export function radiansArrayToCartesian(radians) {
    return radians.map(r =>
        Cartesian3.fromRadians(r.longitude, r.latitude, r.height),
    );
}

/**
 * Utility function to create an array of length count filled with value.
 * @param {*} value
 * @param {*} count
 * @returns
 */
export function stack(value, count) {
    return Array(count).fill(value);
}

/**
 * Utility function to check if two bounding spheres intersect with each other.
 * @param {*} bs1
 * @param {*} bs2
 * @returns
 */
export function spheresIntersect(bs1, bs2) {
    const dx = bs1.center.x - bs2.center.x;
    const dy = bs1.center.y - bs2.center.y;
    const dz = bs1.center.z - bs2.center.z;

    const distanceSquared = dx * dx + dy * dy + dz * dz;

    const radiusSum = bs1.radius + bs2.radius;
    const radiusSumSquared = radiusSum * radiusSum;

    return radiusSumSquared >= distanceSquared;
}

/**
 * Utility function to create a description object from properties and a mapping object.
 * @param {*} properties
 * @param {*} mapping
 * @returns
 */
export function makeDescriptionFromProperties(properties, mapping) {
    //create start of table
    let tableTemplate = `<table class="cesium-infoBox-defaultTable"><tbody>`;

    //iterate over key, value pairs in the mapping (name, value)
    for (const [key, value] of Object.entries(mapping)) {
        let valueString = '';

        //if multiple values
        if (value.constructor === Array) {
            for (let i = 0; i < value.length; i++) {
                if (value[i] in properties) {
                    const v = properties[value[i]].getValue();
                    if (v !== undefined && v !== null && v !== 'null') {
                        //concatenate multiple values
                        valueString += `${String(properties[value[i]].getValue())} `;
                    }
                } else {
                    break;
                }
            }
            //if single value
        } else {
            if (value in properties) {
                const v = properties[value].getValue();
                if (v !== undefined && v !== null) {
                    valueString = String(properties[value].getValue());
                }
            } else {
                continue;
            }
        }

        if (valueString === '') {
            continue;
        }
        //inject strings
        tableTemplate += `<tr><th>${key}</th><td>${valueString}</td></tr>`;
    }

    //end template string
    tableTemplate += `</tbody></table>`;
    return tableTemplate;
}

/**
 * Utility function to evaluate a string consisting of values and operations.
 * @param {*} properties
 * @param {*} evalString
 * @returns
 */
export function propertyEvaluation(properties, evalString) {
    //split string with math ops as delimiters
    const values = evalString.split(/[-+*/]+/);
    //split string with characters and numbers as delimiters (we only want the math ops in the right order)
    const ops = evalString.split(/[A-z0-9.]+/).filter(Boolean);
    let result = '';

    //iterate over values
    for (let i = 0; i < values.length; i++) {
        let v = values[i];

        //check if value is in properties or can be converted to float
        if (v in properties) {
            v = properties[v].getValue();
        } else {
            v = Number(v);
        }

        if (isNaN(parseFloat(v))) {
            throw new Error('extrusionAttribute is not valid');
        }
        //if valid ops exists
        const op = i < ops.length ? ops[i] : undefined;

        //add value and op to string
        result += String(v);
        result += op !== undefined ? String(op) : '';
    }

    //iterate over the complete result string and find double minus to convert to single plus
    for (let i = 0; i < result.length - 2; i++) {
        if (result[i] === result[i + 1] && result[i] === '-') {
            result = `${result.slice(0, i)}+${result.slice(i + 2)}`;
        }
    }
    // eslint-disable-next-line no-eval
    return eval(result);
}

/**
 * Utility function to check if the application camera is under the terrain, and if so, move it to the terrain height + 300 meters.
 * @param {*} app
 */
export async function checkAndAdjustCameraPosition(app) {
    const camera = app.viewer.scene.camera;
    const position = Cartographic.fromCartesian(camera.position);

    if (!(app.viewer.terrainProvider instanceof EllipsoidTerrainProvider)) {
        const terrainSample = await sampleTerrainMostDetailed(
            app.viewer.terrainProvider,
            [position],
        );

        if (position.height < terrainSample[0].height) {
            camera.flyTo({
                destination: Cartesian3.fromRadians(
                    position.longitude,
                    position.latitude,
                    terrainSample[0].height + 300,
                ),
                orientation: {
                    heading: 0,
                    pitch: CesiumMath.toRadians(-45),
                    roll: 0,
                },
                duration: 0,
            });
        }
    }
}

/**
 * Utility function to create a link for sharing.
 * @param {*} app
 */
export async function makeShareLink(app) {
    const [RW, HW, height] = cartesianToProjectCoord(
        app.viewer.scene.camera.position,
    );

    const camera = app.viewer.scene.camera;

    const url = app.urlManager.getUpdatedURLString({
        RWCamera: RW,
        HWCamera: HW,
        HCamera: height,
        RWTarget: undefined,
        HWTarget: undefined,
        HTarget: undefined,
        cameraHeading: CesiumMath.toDegrees(camera.heading),
        cameraPitch: CesiumMath.toDegrees(camera.pitch),
        cameraRoll: CesiumMath.toDegrees(camera.roll),
        pedestrian: app.urlManager.get('pedestrian'),
        mesh: app.urlManager.get('mesh'),
    });

    navigator.clipboard.writeText(url);

    const info = WindowFactory.createInformationGeWindow({
        title: i18next.t('common:body.share-view.title'),
        content: i18next.t('common:body.share-view.content'),
    });
    info.setTimer(4);
    info.apply();
}

/**
 * Utility function to create the UI html table element (3D)
 */
export function createTable_3dm() {
    const threeDtable = document.getElementById('D3Table');
    const tbody = threeDtable.createTBody();
    tbody.style =
        'display: block; font-size: 14px; overflow-y: auto; font-style: italic; width: 336px;';
}

/**
 * Utility function to create the UI html table element (Mesh)
 */
export function createMeshTable() {
    const threeDtable = document.getElementById('MeshTable');
    const tbody = threeDtable.createTBody();
    tbody.style =
        'display: block; font-size: 14px; overflow-y: auto; font-style: italic; width: 336px;';
}

/**
 * Utility function to create the UI html table element (2D)
 */
export function createTable_localdata() {
    const datatable = document.getElementById('localdataTable');
    const tbody = datatable.createTBody();
    tbody.style =
        'display: block; max-height: 200px; overflow-y: auto; font-size: 14px; font-style: italic; width: 336px;';
}

/**
 * Utility function to set the time of the application based on the global value of Variables.dynamicTime.datetime.
 * @param {*} app
 */
export function updateTime(app) {
    app.viewer.clock.currentTime = JulianDate.fromIso8601(
        Variables.dynamicTime.datetime,
    );
}

/**
 * Utility function to make the camera face north.
 * @param {*} app
 * @param {*} isWalking
 */
export function northAlign(app, isWalking) {
    if (!isWalking) {
        app.viewer.camera.flyTo({
            destination: app.viewer.camera.position,
            orientation: {
                heading: 0,
                pitch: app.viewer.camera.pitch,
                roll: app.viewer.camera.roll,
            },
            duration: 1,
        });
    }
}

/**
 * Utiliity functon to safely (try/catch) fetch a url.
 * @param {*} url
 * @returns
 */
export async function fetchSafely(url) {
    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`Failed to fetch: ${response.status}`);

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            return await response.json();
        }

        if (contentType?.includes('text/') || !contentType) {
            return url.endsWith('.json')
                ? await response.json()
                : await response.text();
        }
        return await response.text();
    } catch (error) {
        console.error(`Error loading from ${url}:`, error);
    }
}

/**
 * Utility function to load a SVG file from a path
 * @param {*} path
 * @returns
 */
export async function loadSVG(path) {
    const response = await fetch(path);
    const text = await response.text();

    const parser = new DOMParser();
    const svg = parser.parseFromString(text, 'image/svg+xml');
    return svg.documentElement;
}

/**
 * Utility function to convert a svg object to a canvas object.
 * @param {*} svg
 * @param {*} width
 * @param {*} height
 * @returns
 */
export async function svgToCanvas(svg, width, height) {
    return new Promise((resolve, _) => {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgDataBase64 = btoa(unescape(encodeURIComponent(svgData)));
        const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${svgDataBase64}`;

        const image = new Image();

        image.addEventListener('load', () => {
            const canvas = document.createElement('canvas');

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png', 1.0));
        });

        image.src = svgDataUrl;
    });
}

/**
 * Utility wrapper function to translate a word based on count
 * @param {*} word
 * @param {*} count
 * @returns
 */
export function translate(word, count = 1) {
    const result = i18next.t(word, {count: count});
    return result;
}

/**
 * Utility function to apply an options object with overrides to an input object.
 * @param {*} object
 * @param {*} defaults
 * @param {*} overrides
 */
export function applyOptions(object, defaults, overrides) {
    const options = {...defaults, ...overrides};
    for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) {
            object[key] = value;
        }
    }
}

/**
 * Utility function to find the minimum value of a property of an object.
 * @param {*} object
 * @param {*} property
 * @returns
 */
export function findMin(object, property) {
    let min = undefined;

    for (const value of Object.values(object[property])) {
        if (min === undefined || value < min) {
            min = value;
        }
    }

    return min;
}
