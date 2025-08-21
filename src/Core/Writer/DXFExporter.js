import {cartesianToProjectCoord} from '../utilities.js';

/**
 * Utility class for a single DXF value pair (group code and value).
 * Used internally for DXF line serialization.
 *
 * @private
 * @class
 * @param {number|string} groupCode - The DXF group code (e.g. 10 for X coord).
 * @param {number|string} value - The value for that group code.
 */
class DXFValue {
    constructor(groupCode, value) {
        this.groupCode = groupCode;
        this.value = value;
    }

    /**
     * Serializes to a DXF line: "groupCode\nvalue\n"
     * @returns {string}
     */
    toString() {
        return `${this.groupCode}\n${this.value}\n`;
    }
}

/**
 * DXFExporter – Class for exporting feature coordinates as ASCII-format DXF (AutoCAD Drawing Exchange Format).
 *
 * Supports exporting both polylines and polygons, with optional local coordinate system.
 * Creates all required DXF header, entity, and vertex blocks for basic 3D geometries.
 *
 * @class
 *
 * @example
 * const exporter = new DXFExporter();
 * const dxfString = exporter.export([
 *   {
 *     coordinates: [[10, 20, 0], [20, 25, 0], [30, 15, 0]],
 *     name: 'Layer1',
 *     mode: 'polyline'
 *   }
 * ]);
 * // Save or download dxfString as .dxf file!
 */
export class DXFExporter {
    /**
     * Compute the min/max extent of an array of coordinates.
     * @param {number[][]} coordinates - Array of [x, y, z] arrays.
     * @returns {number[]} [minX, maxX, minY, maxY, minZ, maxZ]
     */
    getExtension(coordinates) {
        const minX = Math.min(...coordinates.map(x => x[0]));
        const minY = Math.min(...coordinates.map(x => x[1]));
        const minZ = Math.min(...coordinates.map(x => x[2]));

        const maxX = Math.max(...coordinates.map(x => x[0]));
        const maxY = Math.max(...coordinates.map(x => x[1]));
        const maxZ = Math.max(...coordinates.map(x => x[2]));
        return [minX, maxX, minY, maxY, minZ, maxZ];
    }

    /**
     * Compute centroid of an array of coordinates.
     * @param {number[][]} coordinates - Array of [x, y, z] coordinates.
     * @returns {number[]} The centroid as [x, y, z].
     */
    getCenter(coordinates) {
        return coordinates
            .reduce(
                (p, c) => {
                    p[0] += c[0];
                    p[1] += c[1];
                    p[2] += c[2];
                    return p;
                },
                [0, 0, 0],
            )
            .map(x => x / coordinates.length);
    }

    /**
     * Localizes (translates) a coordinate array to be relative to a center point.
     * @param {number[][]} coordinates - Input coordinates.
     * @param {number[]} center - Center [x, y, z].
     * @returns {number[][]} Localized coordinates.
     */
    localize(coordinates, center) {
        return coordinates.map(coord => {
            return [
                coord[0] - center[0],
                coord[1] - center[1],
                coord[2] - center[2],
            ];
        });
    }

    /**
     * Construct the DXF header block for a drawing with given bounding extents.
     * @param {number} minX
     * @param {number} minY
     * @param {number} minZ
     * @param {number} maxX
     * @param {number} maxY
     * @param {number} maxZ
     * @returns {string} DXF header as string block
     */
    createHeader(minX, minY, minZ, maxX, maxY, maxZ) {
        return (
            new DXFValue('999', 'DXF').toString() +
            new DXFValue(0, 'SECTION').toString() +
            new DXFValue(2, 'HEADER').toString() +
            new DXFValue(9, '$ACADVER').toString() +
            new DXFValue(1, 'AC1006').toString() +
            new DXFValue(9, '$INSBASE').toString() +
            new DXFValue(10, 0.0).toString() +
            new DXFValue(20, 0.0).toString() +
            new DXFValue(30, 0.0).toString() +
            new DXFValue(9, '$EXTMIN').toString() +
            new DXFValue(10, minX).toString() +
            new DXFValue(20, minY).toString() +
            new DXFValue(30, minZ).toString() +
            new DXFValue(9, '$EXTMAX').toString() +
            new DXFValue(10, maxX).toString() +
            new DXFValue(20, maxY).toString() +
            new DXFValue(30, maxZ).toString() +
            new DXFValue(0, 'ENDSEC').toString() +
            new DXFValue(0, 'SECTION').toString() +
            new DXFValue(2, 'ENTITIES').toString()
        );
    }

    /**
     * Create the DXF body for an array of measurements (features).
     * Adds polylines/polygons via DXF ENTITY/SEQ blocks.
     * @param {Object[]} measurements - Each with {coordinates, name, mode}
     * @returns {string} DXF-encoded body.
     */
    createBody(measurements) {
        let body = '';

        for (const measurement of measurements) {
            body += this.createEntity(
                measurement.coordinates,
                measurement.name,
                measurement.mode,
            );
        }

        body +=
            new DXFValue(0, 'ENDSEC').toString() +
            new DXFValue(0, 'EOF').toString();

        return body;
    }

    /**
     * Create a single DXF POLYLINE entity (open or closed).
     * @param {number[][]} coordinates - Vertex array.
     * @param {string} name - Layer name.
     * @param {string} mode - 'polyline' (open) or 'polygon' (closed).
     * @returns {string} DXF blocks as text.
     */
    createEntity(coordinates, name, mode) {
        let geomCode;

        switch (mode) {
            case 'polyline':
                geomCode = 0;
                break;
            case 'polygon':
                geomCode = 1;
                coordinates.push(coordinates[0]);
                break;
        }

        let body =
            new DXFValue(0, 'POLYLINE').toString() +
            new DXFValue(8, name).toString() +
            new DXFValue(62, 1).toString() +
            new DXFValue(66, 1).toString() +
            new DXFValue(70, geomCode).toString();

        for (const coordinate of coordinates) {
            body +=
                new DXFValue(0, 'VERTEX').toString() +
                new DXFValue(8, name).toString() +
                new DXFValue(10, coordinate[0]).toString() +
                new DXFValue(20, coordinate[1]).toString() +
                new DXFValue(30, coordinate[2]).toString() +
                new DXFValue(70, 0).toString();
        }

        body += new DXFValue(0, 'SEQEND').toString();
        return body;
    }

    /**
     * Export provided feature data as a plain ASCII DXF string.
     * Optionally localizes coordinates about their centroid.
     *
     * @param {Object|Object[]} data - One or multiple objects, each with {coordinates, name, mode}
     * @param {boolean} [local=false] - If true, localizes coordinates relative to centroid.
     * @returns {string} ASCII DXF text
     *
     * @example
     * const dxf = exporter.export({coordinates: [...], name: 'Layer', mode: 'polygon'});
     */
    export(data, local = false) {
        if (!Array.isArray(data)) data = [data];

        data.forEach((_, index, arr) => {
            arr[index].coordinates = arr[index].coordinates.map(coord =>
                cartesianToProjectCoord(coord),
            );
        });

        let coord = data.flatMap(d => d.coordinates);

        if (local) {
            const center = this.getCenter(coord);
            coord = this.localize(coord, center);
            data.forEach((_, index, arr) => {
                arr[index].coordinates = this.localize(
                    arr[index].coordinates,
                    center,
                );
            });
        }

        const [minX, maxX, minY, maxY, minZ, maxZ] = this.getExtension(coord);

        const header = this.createHeader(minX, minY, minZ, maxX, maxY, maxZ);
        const body = this.createBody(data);
        return header + body;
    }
}
