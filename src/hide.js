// js-functions to hide buildings with middle mouse button
import {GEOJSON3D, PARTICLE_SYSTEM} from './Core/Layer.js';
import {layerCollection} from './Core/LayerCollection.js';
import {getFormattedDatetime} from './Core/utils2.js';
import {Temporary} from './Temporary.js';
import {Handlers, Layers} from './constants.js';
import {Variables} from './global.js';

import {
    Cesium3DTileFeature,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    defined,
} from '@cesium/engine';
import {app} from './Core/Application.js';
import {Layer} from './Core/Layer.js';
import {updateHideIDs} from './Core/utilities.js';
import {i18next} from './i18n.js';
import {switchStyling} from './styling.js';
import {viewer} from './viewer.js';

/**
 * Downloads the current list of hidden model IDs (deletion list) as a text file.
 * If no models are hidden, alerts the user.
 *
 * The file is named with a formatted datetime and a configured suffix,
 * and contains one ID per line.
 *
 * @function
 * @returns {void}
 */
function downloadDeletionList() {
    if (Temporary.hiddenModels.id.length <= 0) {
        window.alert('No models disabled');
        return;
    }
    let s = '';
    for (let i = 0; i < Temporary.hiddenModels.id.length; i++) {
        s += String(Temporary.hiddenModels.id[i]);
        if (i < Temporary.hiddenModels.id.length - 1) {
            s += ',\n';
        }
    }
    const d = document.createElement('a');
    d.href = `data:application/octet-stream,${encodeURIComponent(s)}`;
    d.download = `${getFormattedDatetime()}-${app.config.deletionListSuffix}.txt`;
    d.click();
}

/**
 * Parses a CSV (or plain text) file of IDs line by line.
 *
 * @async
 * @param {File} file - The input file to parse.
 * @returns {Promise<string[]>} Resolves to an array of strings (IDs).
 */
async function parseCSVFile(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = event =>
            resolve(
                event.target.result
                    .split('\n')
                    .map(line => line.replace(',', '')),
            );
        fileReader.onerror = error => reject(error);
        fileReader.readAsText(file);
    });
}

/**
 * Imports a list of IDs from a file, hides the corresponding features,
 * updates internal arrays and the hideIDs object, and disables matching Cesium objects.
 * Also synchronizes particle systems and 3D GeoJSON elements.
 *
 * @async
 * @param {File} file - The file containing IDs to hide (one per line).
 * @returns {Promise<void>}
 */
async function uploadDeletionList(file) {
    const obj = await parseCSVFile(file);
    Variables.hideIDs[file.name] = new Set();
    for (const id of obj) {
        const feature = app.featureRegistry.getFeatureByUUID(id);

        const layer = new Layer({
            content: feature,
            type: Layer.LayerTypes.FEATURE,
        });

        layerCollection.addContent(layer);

        Variables.hideIDs[file.name]?.add(id);
        const index = Temporary.hiddenModels.id.indexOf(id);
        if (index > -1) {
            const btn = document.getElementById(
                `btn${Temporary.hiddenModels.id[index]}`,
            );
            btn.click();
        }

        const particleSystems =
            layerCollection.getLayersByType(PARTICLE_SYSTEM);
        [...particleSystems].forEach(ps => {
            if (ps.targetId === id) {
                ps.show = false;
            }
        });

        layerCollection.getContentByType(GEOJSON3D).forEach(ele => {
            if (ele.properties['UUID'].getValue() === id) {
                ele.disabled = true;
                ele.show = false;
            }
        });
    }

    //INSERT CODE FOR ADDING FILE SPECIFIC ROWS
    switchStyling();
}

/**
 * Creates the table body and header for the table
 * displaying hidden 3D models with controls for reset and deletion.
 *
 * @function
 * @returns {void}
 */
export function createTable_hidden() {
    const hiddentable = document.getElementById('hiddenTable');
    const tbody = hiddentable.createTBody();
    tbody.style = 'display: block; font-size: 14px; font-style: italic;';
    const brow = tbody.insertRow(0);
    brow.style = 'display: table;';
    const bcell1 = brow.insertCell(0);
    const bcell2 = brow.insertCell(1);
    const bcell3 = brow.insertCell(2);
    bcell1.innerHTML = i18next.t('common:body.table.hidden.reset');
    bcell1.style = 'width: 290px; font-weight: bold;';
    //bcell2.style = "width: 20px; display: table-cell; text-align: center; padding-right"
    bcell2.className = 'table-cell2';
    bcell3.innerHTML = `<span style='height: 18px; width: 18px; position: relative; display: flex; left: 50%; transform: translateX(-50%); background-image: url("images/common/trash.svg"); background-size: contain; background-repeat: no-repeat; background-position: center' ></span>`;
    bcell3.style =
        'width: 20px; display: table-cell; text-align: center; cursor: pointer;';
    bcell3.querySelector('span')?.addEventListener('click', listeleeren);
    //bcell3.className = "highlight";
}

/**
 * Sets up the UI for download/upload of the deletion list and
 * file-specific delete controls for managing hidden elements.
 *
 * @function
 * @returns {void}
 */
export function createRemoveUI() {
    const download_btn = document.getElementById('export-deletion-list');
    const upload_btn = document.getElementById('import-deletion-list');
    const upload_inp = document.getElementById('upload_inp');
    const div = document.getElementById('deletion-list');

    download_btn.addEventListener('click', () => {
        downloadDeletionList();
    });

    upload_inp.addEventListener('change', () => {
        if (upload_inp.files.length > 0) {
            for (let i = 0; i < upload_inp.files.length; i++) {
                uploadDeletionList(upload_inp.files[i]);

                const filename = upload_inp.files[i].name;

                const deleteDiv = document.createElement('div');
                deleteDiv.className = 'deleteDiv';

                const deleteLabel = document.createElement('label');
                deleteLabel.textContent = `${filename}`;
                deleteLabel.className = 'deleteLabel';

                const deleteButton = document.createElement('span');
                deleteButton.className = 'deleteButton highlight';
                deleteButton.innerHTML = '<img/>';

                deleteButton.addEventListener('click', () => {
                    Variables.hideIDs[filename].clear();
                    layerCollection.getContentByType(GEOJSON3D).forEach(ele => {
                        for (const key of Object.keys(Variables.hideIDs)) {
                            if (
                                !Array.from(Variables.hideIDs[key]).includes(
                                    String(ele.properties['UUID'].getValue()),
                                )
                            ) {
                                ele.show = true;
                                ele.disabled = false;
                            }
                        }
                    });
                    switchStyling();
                    div.removeChild(deleteDiv);
                });
                deleteDiv.appendChild(deleteLabel);
                deleteDiv.appendChild(deleteButton);

                div.appendChild(deleteDiv);
            }
        }
        upload_inp.value = null;
    });

    upload_btn.addEventListener('click', () => {
        upload_inp.click();
    });
}

/**
 * Extends the Temporary.hiddenModels object with arrays for managing state:
 * - obj: stores feature/model objects that have been hidden.
 * - id: stores the unique IDs for each hidden object.
 * - stat: stores Boolean flags for visibility states of each object.
 *
 * These arrays are kept in parallel: the same index in each
 * corresponds to a specific hidden feature in the viewer.
 *
 * @property {Array} Temporary.hiddenModels.obj - Array of hidden feature/model objects.
 * @property {Array<string>} Temporary.hiddenModels.id - Array of unique IDs for hidden features.
 * @property {Array<boolean>} Temporary.hiddenModels.stat - Array of boolean visibility states.
 */
Temporary.hiddenModels.obj = [];
Temporary.hiddenModels.id = [];
Temporary.hiddenModels.stat = [];

/**
 * Sets up a Cesium ScreenSpaceEventHandler to detect middle mouse button (wheel) clicks on the viewer.
 * When triggered, attempts to "hide" the picked 3D feature by:
 *  - Checking if the pick is valid and not already hidden.
 *  - Resolving the picked feature/ID depending on type (3DTileFeature, Entity, or GeoJSON).
 *  - Excluding features that are not deletable or are GLTF layer entries.
 *  - Adding the feature and its ID to the hidden list and setting show=false.
 *  - Updating UI and hidden ID arrays.
 *
 * This handler enables interactive hiding (disabling visibility) of features by user action.
 */
Handlers.hiding = new ScreenSpaceEventHandler(viewer.canvas);

Handlers.hiding.setInputAction(movement => {
    let feature = viewer.scene.pick(movement.position);

    // If nothing is clicked or feature already hidden, stop execution
    if (!defined(feature) || Temporary.hiddenModels.obj.includes(feature)) {
        return;
    }

    // If the feature has an .id property, it's probably a GeoJSON entity
    if (feature.id !== undefined) {
        feature = feature.id;
    }

    // Exclude undeletable features
    if (
        'properties' in feature &&
        feature.properties.deletable?.getValue() === false
    )
        return;

    // Determine the unique ID of the feature
    let id = undefined;

    if (feature instanceof Cesium3DTileFeature) {
        if (
            feature.getProperty('UUID') &&
            feature.getProperty('UUID') !== 'Baumbestand'
        ) {
            id = feature.getProperty('UUID');
        } else {
            //id = feature.tileset._url.split('/')[feature.tileset._url.split('/').length - 2] + '-' + feature.featureId;
            id = feature.featureId;
        }
    } else if (defined(feature.properties)) {
        // eslint-disable-next-line no-prototype-builtins
        if (feature.properties.hasOwnProperty('UUID')) {
            id = String(feature.properties['UUID'].getValue());
        } else {
            id = feature.id;
        }
    }

    // Abort if this is a GLTF model, a bad/empty feature, or already hidden
    if (
        Layers.gltf.id.indexOf(id) >= 0 ||
        !defined(id) ||
        Temporary.hiddenModels.id.includes(id)
    ) {
        return;
    }

    // Add the feature and its ID to the hidden objects and arrays
    Temporary.hiddenModels.obj.push(feature);
    Temporary.hiddenModels.id.push(id);
    Temporary.hiddenModels.stat.push(false);
    Variables.hideIDs['default'].add(id);

    //turn off visibility
    feature.show = false;

    // Update the UI and table
    fillTable_hidden();
    eventhidden();
}, ScreenSpaceEventType.MIDDLE_CLICK);

//UUID, Höhe, Baumart, Pflanzjahr,

/**
 * Creates the UI table for hidden 3D models: adds rows with IDs, checkboxes, and delete buttons
 * for all currently hidden objects (in Temporary.hiddenModels).
 *
 * @function
 * @returns {void}
 */
export function fillTable_hidden() {
    const hiddentable = document.getElementById('hiddenTable');
    hiddentable.innerHTML = '';
    createTable_hidden();
    const tbody = hiddentable.tBodies[0];
    for (let i = 0; i < Temporary.hiddenModels.obj.length; i++) {
        const brow = tbody.insertRow(0);
        brow.style = 'display: table;';
        const bcell1 = brow.insertCell(0);
        const bcell2 = brow.insertCell(1);
        const bcell3 = brow.insertCell(2);
        bcell1.innerHTML = Temporary.hiddenModels.id[i];
        bcell1.style = 'width: 290px;';
        bcell2.innerHTML = `<label style=" cursor: pointer;"><input type="checkbox" id="cb${Temporary.hiddenModels.id[i]}"/></label>`;
        //bcell2.style = "width: 20px; display: table-cell; text-align: center; cursor: pointer;"
        bcell2.className = 'table-cell2';
        bcell3.innerHTML = `<span id='btn${Temporary.hiddenModels.id[i]}' style='height: 18px; width: 18px; position: relative; display: flex; left: 50%; transform: translateX(-50%); background-image: url("images/common/trash.svg"); background-size: contain; background-repeat: no-repeat; background-position: center'></span>`;
        bcell3.style =
            'width: 20px; display: table-cell; text-align: center; cursor: pointer;';
        bcell3.className = 'highlight';

        const cb = $(`#cb${Temporary.hiddenModels.id[i]}`)[0];
        cb.checked = Temporary.hiddenModels.stat[i] === true;
        if (cb.checked === true) {
            cb.parentNode.className = 'visibility_on';
        } else {
            cb.parentNode.className = 'visibility_off';
        }
    }
}

/**
 * Empties the list of hidden 3D models, restores their visibility,
 * and clears associated arrays and UI table.
 *
 * @function
 * @returns {void}
 */
function listeleeren() {
    const hiddentable = document.getElementById('hiddenTable');
    for (let i = 0; i < Temporary.hiddenModels.obj.length; i++) {
        Temporary.hiddenModels.obj[i].show = true;
        // eslint-disable-next-line no-import-assign
        Variables.hideIDs = updateHideIDs(
            Variables.hideIDs,
            'default',
            Temporary.hiddenModels.id[i],
        );
    }
    Temporary.hiddenModels.obj = [];
    Temporary.hiddenModels.id = [];
    Temporary.hiddenModels.stat = [];
    hiddentable.innerHTML = '';
    createTable_hidden();
}

/**
 * Registers events for each row in the hidden models table, enabling
 * removal or visibility toggle for individual models via the UI controls.
 *
 * @function
 * @returns {void}
 */
function eventhidden() {
    const btn = [];
    const cb = [];
    for (let i = 0; i < Temporary.hiddenModels.obj.length; i++) {
        //create button to delete table entry and show the 3d model
        btn.push(document.getElementById(`btn${Temporary.hiddenModels.id[i]}`));
        btn[i].addEventListener(
            'click',
            function (i) {
                // eslint-disable-next-line no-import-assign
                Variables.hideIDs = updateHideIDs(
                    Variables.hideIDs,
                    'default',
                    Temporary.hiddenModels.id[i],
                );
                Temporary.hiddenModels.obj[i].show = true;
                Temporary.hiddenModels.obj.splice(i, 1);
                Temporary.hiddenModels.id.splice(i, 1);
                Temporary.hiddenModels.stat.splice(i, 1);
                fillTable_hidden();
                eventhidden();
            }.bind(null, i),
            false,
        );

        //create checkbox to toggle visibility
        cb.push(document.getElementById(`cb${Temporary.hiddenModels.id[i]}`));
        cb[i].addEventListener(
            'change',
            function (i) {
                Temporary.hiddenModels.obj[i].show =
                    !Temporary.hiddenModels.obj[i].show;
                Temporary.hiddenModels.stat[i] =
                    !Temporary.hiddenModels.stat[i];
                if (cb[i].checked === true) {
                    //Variables.hideIDs = updateHideIDs(Variables.hideIDs, "default", Temporary.hiddenModels.id[i]);
                    // eslint-disable-next-line no-import-assign
                    Variables.hideIDs = updateHideIDs(
                        Variables.hideIDs,
                        'default',
                        Temporary.hiddenModels.id[i],
                    );
                    cb[i].parentNode.className = 'visibility_on';
                } else {
                    Variables.hideIDs['default'].add(
                        Temporary.hiddenModels.id[i],
                    );
                    cb[i].parentNode.className = 'visibility_off';
                }
            }.bind(null, i),
            false,
        );
    }
}
