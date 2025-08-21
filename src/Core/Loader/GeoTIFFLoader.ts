import {
    ImageryLayer as CesiumImageryLayer,
    ImageryProvider,
    Rectangle,
    SingleTileImageryProvider,
} from '@cesium/engine';
import {
    GeoTIFFImage,
    Pool,
    fromBlob,
    fromUrl,
    type ReadRasterResult,
} from 'geotiff';
import {WarningGeWindow} from '../../Components/ge-window/ge-window';
import {i18next} from '../../i18n.js';
import {WindowFactory} from '../WindowFactory';
import {boundingBoxProjectCoordsToWGS} from '../utils2';
import type {BoundingBox} from './PNGImageLoader';

export type LoadedGeoTIFFImage = {
    image: GeoTIFFImage;
    data: ReadRasterResult;
    bb: BoundingBox;
    code: number;
};

export type TIFFSource = string | File | Blob;

/**
 * Object describing a loaded GeoTIFF image and its associated data and metadata.
 *
 * @typedef {Object} LoadedGeoTIFFImage
 * @property {GeoTIFFImage} image - The underlying GeoTIFF image instance (from geotiff.js).
 * @property {ReadRasterResult} data - Raster pixel data result.
 * @property {BoundingBox} bb - Bounding box object with geographic extent.
 * @property {number} code - EPSG code or spatial reference id (e.g., 4326).
 */

/**
 * Type for any supported GeoTIFF source.
 * Can be a URL string, File, or Blob.
 *
 * @typedef {string|File|Blob} TIFFSource
 */

/**
 * Load a GeoTIFF from a generic source (URL, File or Blob).
 * Returns the unwrapped geotiff.js object, NOT raster data.
 *
 * @param {TIFFSource} source - Source: URL string, File, or Blob
 * @returns {Promise<any>} Promise resolving to the GeoTIFF file handle (fromUrl or fromBlob).
 */
export async function loadTiffFromSource(source: TIFFSource): Promise<any> {
    if (typeof source === 'string') {
        return fromUrl(source);
    } else {
        return fromBlob(source);
    }
}

/**
 * Loads and parses a GeoTIFF from a given source.
 * Reads the first image, raster data, bounding box, and EPSG code (if available).
 *
 * @param {TIFFSource} source - GeoTIFF source (URL, File, or Blob)
 * @returns {Promise<LoadedGeoTIFFImage>} Promise resolving to loaded image, data and metadata.
 */
export async function loadTiff(
    source: TIFFSource,
): Promise<LoadedGeoTIFFImage> {
    const tiff = await loadTiffFromSource(source);

    const image = await tiff.getImage();
    const pool = new Pool();

    //most performance heavy task
    const data = await image.readRasters({pool, interleave: true});
    const bb = image.getBoundingBox();
    const code =
        image.geoKeys.ProjectedCSTypeGeoKey ||
        image.geoKeys.GeographicTypeGeoKey;

    return {
        image,
        data,
        bb,
        code,
    };
}

/**
 * Converts raster channel data to a visible Canvas (RGBA).
 * Supports 1-channel (grayscale), 3-channel (RGB), or 4-channel (RGBA) data.
 *
 * @param {ReadRasterResult} data - The interleaved raster array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {HTMLCanvasElement} Canvas with the result image.
 */
export function createCanvasFromRasterData(
    data: ReadRasterResult,
    width: number,
    height: number,
) {
    const numChannels = data.length / (width * height);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const imgData = context!.createImageData(width, height);

    canvas.height = height;
    canvas.width = width;

    const pixelCount = width * height;

    switch (numChannels) {
        case 1:
            for (let i = 0; i < pixelCount; ++i) {
                const value = data[i] as number;
                const j = i * 4;
                imgData.data[j] = value;
                imgData.data[j + 1] = value;
                imgData.data[j + 2] = value;
                imgData.data[j + 3] = 255;
            }
            break;
        case 3:
            for (let i = 0; i < pixelCount; ++i) {
                const j = i * 4;
                const k = i * 3;
                imgData.data[j] = data[k] as number;
                imgData.data[j + 1] = data[k + 1] as number;
                imgData.data[j + 2] = data[k + 2] as number;
                imgData.data[j + 3] = 255;
            }
            break;
        case 4:
            for (let i = 0; i < pixelCount; ++i) {
                const j = i * 4;
                imgData.data[j] = data[j] as number;
                imgData.data[j + 1] = data[j + 1] as number;
                imgData.data[j + 2] = data[j + 2] as number;
                imgData.data[j + 3] = data[j + 3] as number;
            }
            break;
    }
    context!.putImageData(imgData, 0, 0);
    return canvas;
}

/**
 * Loads a GeoTIFF and returns a SingleTileImageryProvider for Cesium –
 * automatically handles bounding box, reprojects if not in WGS84 (EPSG:4326),
 * and displays a warning if reprojection occurs.
 *
 * @param {TIFFSource} source - GeoTIFF source (URL, File, or Blob)
 * @returns {Promise<SingleTileImageryProvider|undefined>} Cesium imagery provider or undefined on error
 */
export async function getTiffProvider(
    source: TIFFSource,
): Promise<SingleTileImageryProvider | undefined> {
    try {
        const {image, data, bb, code} = await loadTiff(source);

        let boundingBox = bb;

        if (code !== 4326) {
            new WarningGeWindow({
                title: i18next.t('error:reprojection.title'),
                content: i18next.t('error:reprojection.text'),
            }).apply();
            const projected = boundingBoxProjectCoordsToWGS(boundingBox);
            boundingBox = {
                left: projected[0],
                bottom: projected[1],
                right: projected[2],
                top: projected[3],
            };
        }

        const canvas = createCanvasFromRasterData(
            data,
            image.getWidth(),
            image.getHeight(),
        );

        const provider = SingleTileImageryProvider.fromUrl(
            canvas.toDataURL('image/png'),
            {
                rectangle: Rectangle.fromDegrees(...Object.values(boundingBox)),
            },
        );

        return provider;
    } catch (error) {
        WindowFactory.createErrorGeWindow({
            title: i18next.t('error:file.title'),
            content: `${error}\n${i18next.t('error:file.text')}`,
        }).apply(10);
        return;
    }
}

/**
 * Loads a GeoTIFF from a TIFFSource and returns a Cesium imagery layer.
 * This is the high-level method for adding GeoTIFFs to Cesium:
 * - Loads, parses, and converts the TIFF to a provider
 * - Wraps in a CesiumImageryLayer for easy scene management
 *
 * @param {TIFFSource} source - The GeoTIFF file or URL.
 * @returns {Promise<CesiumImageryLayer>} Loaded ImageryLayer.
 */
export async function load(source: TIFFSource): Promise<CesiumImageryLayer> {
    const provider = await getTiffProvider(source);
    return CesiumImageryLayer.fromProviderAsync(
        provider as unknown as Promise<ImageryProvider>,
    );
}
