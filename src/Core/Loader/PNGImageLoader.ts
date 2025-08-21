import {
    ImageryLayer as CesiumImageryLayer,
    ImageryProvider,
    Rectangle,
    SingleTileImageryProvider,
} from '@cesium/engine';

export type BoundingBox = {
    left: number;
    bottom: number;
    right: number;
    top: number;
};

/**
 * BoundingBox type – Represents a georeferenced rectangle.
 *
 * All coordinates are typically in degrees longitude/latitude (WGS84).
 *
 * @typedef {Object} BoundingBox
 * @property {number} left - Minimum X/longitude (westernmost).
 * @property {number} bottom - Minimum Y/latitude (southernmost).
 * @property {number} right - Maximum X/longitude (easternmost).
 * @property {number} top - Maximum Y/latitude (northernmost).
 */

/**
 * Obtain the pixel dimensions of an image via its URL.
 *
 * @param {string} imageUrl - URL to the image file.
 * @returns {Promise<{width: number, height: number}>} Promise resolving to an object with width and height.
 *
 * @example
 * const {width, height} = await getImageDimensions('tiles/layer.png');
 */
export async function getImageDimensions(
    imageUrl: string,
): Promise<{width: number; height: number}> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
            resolve({width: img.naturalWidth, height: img.naturalHeight});
        img.onerror = reject;
        img.src = imageUrl;
    });
}

/**
 * Load a PNG/JPG world file (PGW/JGW) and calculate the bounding box in map coordinates.
 *
 * @param {string} pngUrl - URL to the PNG/JPG image.
 * @param {string} pgwUrl - URL to its paired PGW/JGW (world) file.
 * @returns {Promise<BoundingBox>} Promise resolving to a bounding box object for the image.
 *
 * @example
 * const bbox = await getPngBoundingBox('tile.png', 'tile.pgw');
 */
export async function getPngBoundingBox(
    pngUrl: string,
    pgwUrl: string,
): Promise<BoundingBox> {
    const response = await fetch(pgwUrl);
    const text = await response.text();
    const [xSize, _, __, ySize, x, y] = text
        .replaceAll('\r', '')
        .split('\n')
        .filter(Boolean)
        .map(Number);

    const {width, height} = await getImageDimensions(pngUrl);

    const left = x - xSize / 2;
    const top = y - ySize / 2;
    const right = left + width * xSize;
    const bottom = top + height * ySize;

    const bb = {
        left,
        bottom,
        right,
        top,
    };
    return bb;
}

/**
 * Load a PNG/JPG image plus its world file and return a SingleTileImageryProvider for Cesium.
 *
 * @param {string} pngUrl - Image URL.
 * @param {string} pgwUrl - PGW world file URL.
 * @returns {Promise<ImageryProvider>} Cesium provider for use with imagery layers.
 *
 * @example
 * const provider = await loadPGWImage('terrain.png', 'terrain.pgw');
 * viewer.imageryLayers.addImageryProvider(provider);
 */
export async function loadPGWImage(
    pngUrl: string,
    pgwUrl: string,
): Promise<ImageryProvider> {
    const bb = await getPngBoundingBox(pngUrl, pgwUrl);
    return SingleTileImageryProvider.fromUrl(pngUrl, {
        rectangle: Rectangle.fromDegrees(...Object.values(bb)),
    });
}

/**
 * High-level loader function, returning a Cesium imagery layer for a PNG+world file.
 *
 * @param {string} imageUrl - URL to the PNG or JPG file.
 * @param {string} worldFileUrl - URL to its world file (.pgw, .jgw).
 * @returns {Promise<CesiumImageryLayer>} Imagery layer covering the referenced area.
 *
 * @example
 * const imageryLayer = await load('map.png', 'map.pgw');
 * viewer.imageryLayers.add(imageryLayer);
 */
export async function load(
    imageUrl: string,
    worldFileUrl: string,
): Promise<CesiumImageryLayer> {
    const provider = loadPGWImage(imageUrl, worldFileUrl);
    return CesiumImageryLayer.fromProviderAsync(provider);
}
