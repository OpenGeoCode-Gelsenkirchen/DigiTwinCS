import {defined} from '@cesium/engine';
import {app} from './Core/Application.js';
import {Layer} from './Core/Layer.js';
import {layerCollection} from './Core/LayerCollection.js';
import {addGeoJson, loadTiffImage} from './Core/Loader.js';
import {addEntryToTable, checkCheckbox, switchCheckbox} from './Core/utils2.js';
import {Variables} from './global.js';
import {viewer} from './viewer.js';

/**
 * Handles the uploading and loading of local GeoJSON files via a file input element.
 * For each selected file, creates a temporary URL, loads the GeoJSON layer with generalized display options,
 * adds it to the Cesium viewer, and flies the camera to its bounding sphere.
 * The file input is then reset for future uploads.
 *
 * @async
 * @param {Object} app - The main application object/context.
 * @param {Event} event - The input change event; contains the list of chosen files.
 * @returns {Promise<void>}
 */
async function loadFiles(app, event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const tmppath = URL.createObjectURL(files[i]);
        const fileName = files[i].name.split('.')[0];
        const layer = await addGeoJson(app, {
            target: fileName,
            url: tmppath,
            layerName: fileName,
            show: true,
            table: true,
            ableTodelete: true,
            clampToGround: true,
            selectable: false,
        });
        app.viewer.scene.camera.safeFlyToBoundingSphere(layer.boundingSphere);
    }
    document.getElementById('localfiles').value = null;
}

// Attach the GeoJSON file loader to the "localfiles" input element.
document.getElementById('localfiles').addEventListener(
    'change',
    event => {
        loadFiles(app, event);
    },
    false,
);

/**
 * Handles the uploading and visualization of georeferenced TIFF (raster) images via a file input element.
 * Loads each file, creates an imagery layer from it, adds it to the Cesium viewer and
 * the application's layer system, flies to the bounding sphere, updates the layer table,
 * and wires up the show/hide checkbox for each new image layer.
 * The file input is then reset.
 *
 * @async
 * @param {Object} app - The main application object/context.
 * @param {Event} event - The input change event; contains the list of chosen image files.
 * @returns {Promise<void>}
 */
async function loadImage(app, event) {
    const files = event.target.files;

    for (const file of files) {
        const fileName = file.name.split('.')[0];
        const imagery = await loadTiffImage(file);
        app.viewer.imageryLayers.add(imagery);

        const layer = new Layer(viewer, {
            content: imagery,
            name: fileName,
            type: Layer.LayerTypes.IMAGERY,
        });

        layerCollection.addContent(layer);

        app.viewer.scene.camera.safeFlyToBoundingSphere(layer.boundingSphere);

        addEntryToTable('#localdataTable', fileName, layer.id, () => {
            layerCollection.removeLayer(layer);
        });
        const cb = document.getElementById(`cb_${layer.id}`);
        checkCheckbox(cb);
        cb.addEventListener('change', () => {
            return switchCheckbox(app, Variables.hideIDs, cb, layer);
        });
    }
    document.getElementById('localfiles_image').value = null;
}

// Attach the image file loader to the "localfiles_image" input element, if present.
if (defined(document.getElementById('localfiles_image'))) {
    document
        .getElementById('localfiles_image')
        .addEventListener('change', event => loadImage(app, event), false);
}
