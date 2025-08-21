import {defined, WebMapServiceImageryProvider} from '@cesium/engine';
import {WMS} from './constants.js';
import {app} from './Core/Application.js';
import {IMAGERY, Layer} from './Core/Layer.js';
import {layerCollection} from './Core/LayerCollection.js';
import {addEntryToTable, checkCheckbox, switchCheckbox} from './Core/utils2.js';
import {Variables} from './global.js';
import {i18next} from './i18n.js';
import {createTreeMenu} from './treeMenu.js';
import {viewer} from './viewer.js';

/**
 * Initializes available WMS services by fetching configuration data,
 * parsing each entry, and storing it in the global WMS object.
 * Also triggers theme menu initialization.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function initializeWMServices() {
    if (!app.config.wmsListUrl) {
        document.querySelector('#wms-menu-switch')?.parentElement?.remove();
        return;
    }
    const txt = app.config.wmsListUrl
        .replaceAll('\r', '')
        .split('\n')
        .map(item => {
            return item.split(';');
        });

    txt.forEach(item => {
        //WMS[item[0]] = {description: item[1], url: item[2]};
        WMS[item[0]] = {url: item[1]};
    });
    initializeThemeMenu();
}

/**
 * Creates a theme selection UI element for a custom WMS URL input.
 *
 * @returns {HTMLDivElement} The constructed custom input div.
 */
function customURLInput() {
    const l = document.createElement('label');
    const key = 'custom';

    l.innerText = 'URL: ';
    l.htmlFor = `radio-${key}`;

    const i = document.createElement('input');
    i.type = 'radio';
    i.name = 'WMS';
    i.value = key;
    i.id = `radio-${key}`;

    const ii = document.createElement('input');
    ii.type = 'text';
    ii.name = 'WMS_input';
    ii.id = `input-${key}`;

    const subDiv = document.createElement('div');
    subDiv.classList.add('theme-item');
    subDiv.appendChild(i);
    subDiv.appendChild(l);
    subDiv.appendChild(ii);
    return subDiv;
}

/**
 * Initializes the theme menu by listing all available WMS services,
 * appending a custom input option, and adding control buttons.
 *
 * @returns {void}
 */
function initializeThemeMenu() {
    const div = document.getElementById('theme-list');
    div.innerHTML = '';

    for (const key of Object.keys(WMS)) {
        const l = document.createElement('label');
        const i = document.createElement('input');
        l.innerText = key;
        l.htmlFor = `radio-${key}`;
        i.type = 'radio';
        i.name = 'WMS';
        i.value = key;
        i.id = `radio-${key}`;

        const subDiv = document.createElement('div');
        subDiv.classList.add('theme-item');
        subDiv.appendChild(i);
        subDiv.appendChild(l);
        div.appendChild(subDiv);
    }

    div.appendChild(customURLInput());

    const buttonDiv = document.getElementById('button-list');
    buttonDiv.innerHTML = '';

    const button = createButton(
        'next-button',
        i18next.t('glossary:continue'),
        'cesium-button',
        createNextMenu,
    );
    buttonDiv.appendChild(button);

    document.getElementById('theme-list').style.overflowY = 'auto';
}

/**
 * Re-initializes the theme menu and closes the associated Winbox dialog.
 *
 * @returns {void}
 */
export function toggleThemeMenu() {
    initializeThemeMenu();
    const menu = document.getElementById('win-theme-menu');
    menu.winbox.close();
}

/**
 * Creates a custom-styled button web component with optional click handler.
 *
 * @param {string} id - Button element id.
 * @param {string} text - Button text content.
 * @param {string} classList - CSS class to assign.
 * @param {Function} [callbackFn] - Optional click handler callback.
 * @returns {HTMLElement} The constructed button.
 */
function createButton(id, text, classList, callbackFn = undefined) {
    const button = document.createElement('ge-button');
    button.setAttribute('showborder', '');
    button.setAttribute('shape', 'rectangle');
    button.setAttribute('size', 'small');

    button.id = id;
    button.innerText = text;
    button.classList.add(classList);
    if (defined(callbackFn)) {
        button.addEventListener('click', callbackFn);
    }
    return button;
}

/**
 * Requests the WMS legend graphic for a specific layer and resolves it as a base64 string.
 *
 * @param {string} url - WMS service URL.
 * @param {string} layer - WMS layer name.
 * @returns {Promise<string>} Resolves to base64 representation of legend image.
 */
function getLegendGraphic(url, layer) {
    return new Promise(function (resolve, reject) {
        url += `?Request=GetLegendGraphic&SERVICE=WMS&LAYER=${layer}&VERSION=1.0&FORMAT=image/png`; //&VERSION=1.3.0
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const uInt8Array = new Uint8Array(xhr.response);
                const binaryString = new Array(uInt8Array);
                for (let i = uInt8Array.length; i >= 0; i--) {
                    binaryString[i] = String.fromCharCode(uInt8Array[i]);
                }
                const data = binaryString.join('');

                resolve(window.btoa(data));
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                });
            }
        };

        xhr.onerror = () => {
            reject({
                status: xhr.status,
                statusText: xhr.statusText,
            });
        };
        xhr.send();
    });
}

/**
 * Fetches WMS capabilities XML document from given service URL.
 *
 * @param {string} url - WMS base URL.
 * @returns {Promise<string>} Resolves to capabilities XML string.
 */
function getWMSCapabilities(url) {
    return new Promise(function (resolve, reject) {
        url += '?Request=GetCapabilities&SERVICE=WMS'; //&VERSION=1.3.0
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.responseText);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                });
            }
        };

        xhr.onerror = () => {
            reject({
                status: xhr.status,
                statusText: xhr.statusText,
            });
        };
        xhr.send();
    });
}

/**
 * Adds checked WMS layers from the UI to the map and updates internal collections.
 *
 * @async
 * @param {string} url - WMS server URL.
 * @returns {Promise<void>}
 */
async function addWMS(url) {
    const values = [
        ...document.querySelectorAll('input[name=wms-cb-leaves]:checked'),
    ].map(e => [e.getAttribute('key'), e.value]);
    for (let i = 0; i < values.length; i++) {
        const guid = values[i][0];
        if (layerCollection.getContent(guid).length > 0) {
            continue;
        }
        const imageryLayer = app.viewer.imageryLayers.addImageryProvider(
            new WebMapServiceImageryProvider({
                url: url,
                layers: values[i][1],
                parameters: {
                    transparent: true,
                    format: 'image/png',
                    styles: '',
                    version: '1.3.0',
                },
                enablePickFeatures: true,
                credit: `${guid}: <a style="color: deepskyblue; text-decoration: underline;" href=${url}>${url.includes('gelsenkirchen') ? 'Stadt Gelsenkirchen' : url}</a>`,
            }),
        );

        const layer = new Layer(viewer, {
            id: guid,
            content: imageryLayer,
            type: IMAGERY,
            tags: ['specialImagery'],
            maximumScreenSpaceError: 2,
        });

        layerCollection.addContent(layer);
        addEntryToTable('#localdataTable', guid, layer.id, () => {
            layerCollection.removeLayerById(guid);
        });
        const cb = document.getElementById(`cb_${guid}`);
        checkCheckbox(cb);
        cb.addEventListener('change', () => {
            return switchCheckbox(app, Variables.hideIDs, cb, layer);
        });
    }
    toggleThemeMenu();
}

/**
 * Replaces the content of the given element with the provided child.
 *
 * @async
 * @param {HTMLElement} elem - Element to add as child.
 * @param {string} id - ID of parent element to overwrite.
 * @returns {Promise<void>}
 */
async function overwriteChild(elem, id) {
    const e = document.getElementById(id);
    e.innerHTML = '';
    e.appendChild(elem);
}

/**
 * Displays a loading spinner, fetches and parses WMS capabilities,
 * builds a layer tree UI, and handles errors, resolving on completion.
 *
 * @returns {Promise<void>} Resolves after loading and rendering the theme list.
 */
function createLoadingWindow() {
    return new Promise((resolve, reject) => {
        const ele = document.querySelector("input[name='WMS']:checked");

        if (ele === null) {
            return;
        }
        const value = ele.value;
        const url =
            value === 'custom'
                ? document.getElementById('input-custom')?.value
                : WMS[value].url;
        const spinner = document.createElement('div');
        spinner.classList.add('loading');

        const themeList = document.getElementById('theme-list');
        if (themeList) themeList.style.overflowY = 'unset';
        overwriteChild(spinner, 'theme-list');

        getWMSCapabilities(url)
            .then(response => {
                const json = {};
                const data = new DOMParser().parseFromString(
                    response,
                    'text/xml',
                );

                /**
                 * Resolves namespace prefixes for XML evaluation.
                 * @param {string} prefix
                 * @returns {string|undefined}
                 */
                function nsResolver(prefix) {
                    switch (prefix) {
                        case 'esri_wms':
                            return 'http://www.esri.com/wms';
                        case 'xsi':
                            return 'http://www.w3.org/2001/XMLSchema-instance';
                        case 'wms':
                            return 'http://www.opengis.net/wms';
                    }
                }

                const layers = data.evaluate(
                    'wms:WMS_Capabilities/wms:Capability/wms:Layer',
                    data,
                    nsResolver,
                    7,
                    null,
                );

                /**
                 * Recursively builds JSON from layer XML element.
                 * @param {Element} ele - Layer XML element.
                 * @param {Object} json - Target JSON object.
                 * @returns {Object|string} Layer structure or name.
                 */
                function buildJson(ele, json) {
                    const layers = ele.querySelectorAll(':scope > Layer');
                    if (layers.length > 0) {
                        for (let i = 0; i < layers.length; i++) {
                            const subtitle = layers[i]
                                .querySelector('Title')
                                ?.innerHTML.replace('<![CDATA[', '')
                                .replace(']]>', '');
                            json[subtitle] = buildJson(layers[i], {});
                        }
                    } else {
                        json = defined(ele.querySelector(':scope > Name'))
                            ? ele.querySelector(':scope > Name')?.innerHTML
                            : ele.querySelector(':scope > Title')?.innerHTML;
                    }
                    return json;
                }

                for (let i = 0; i < layers.snapshotLength; i++) {
                    const snap = layers.snapshotItem(i);
                    const title = snap
                        .querySelector('Title')
                        ?.innerHTML.replace('<![CDATA[', '')
                        .replace(']]>', '');
                    json[title] = buildJson(snap, {});
                }

                return createTreeMenu(json, 'input');
            })
            .then(tree => {
                overwriteChild(tree, 'theme-list');
                document.getElementById('theme-list').style.overflowY = 'auto';
                resolve();
            })
            .catch(error => {
                const errorMsg = document.createElement('p');
                errorMsg.innerText = `${error.status}: ${error.statusText}`;
                errorMsg.style.fontWeight = 'bold';
                overwriteChild(errorMsg, 'theme-list');
                reject();
            });
    });
}

/**
 * Handles theme selection UI "next" operation—fetches capability,
 * presents layer selection, and manages control buttons.
 *
 * @returns {void}
 */
function createNextMenu() {
    const ele = document.querySelector("input[name='WMS']:checked");
    if (ele === null) {
        return;
    }

    const value = ele.value;
    const url =
        value === 'custom'
            ? document.getElementById('input-custom')?.value
            : WMS[value].url;
    createLoadingWindow()
        .then(() => {
            const returnButton = createButton(
                'theme-return-btn',
                i18next.t('glossary:back'),
                'cesium-button',
                initializeThemeMenu,
            );
            const addButton = createButton(
                'theme-add-btn',
                i18next.t('glossary:add'),
                'cesium-button',
                addWMS.bind(null, url),
            );

            const buttonDiv = document.getElementById('button-list');
            if (!buttonDiv) return;
            buttonDiv.innerHTML = '';
            buttonDiv.appendChild(returnButton);
            buttonDiv.appendChild(addButton);
        })
        .catch(() => {
            const buttonDiv = document.getElementById('button-list');
            buttonDiv.innerHTML = '';
            const returnButton = createButton(
                'theme-return-btn',
                i18next.t('glossary:back'),
                'cesium-button',
                initializeThemeMenu,
            );
            buttonDiv.appendChild(returnButton);
        });
}
