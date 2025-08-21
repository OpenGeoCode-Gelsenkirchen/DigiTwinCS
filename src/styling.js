import {Cesium3DTileStyle} from '@cesium/engine';
import {STYLING} from './constants.js';
import {app} from './Core/Application.js';
//js-script for styling stylable an setting transparency of globe
import {layerCollection} from './Core/LayerCollection.js';
import {ShaderFactory} from './Core/ShaderFactory.js';
import {updateStylingWithDeletionList, Variables} from './global.js';
import {WaterLevelState} from './States/WaterLevelState.js';

/**
 * Switches the visual styling and shader logic of all stylable/vegetation 3D layers in the viewer.
 *
 * - Updates all stylable and vegetation layers with a Cesium3DTileStyle that accounts for
 *   hidden features/entities (using Variables.hideIDs and updateStylingWithDeletionList).
 * - Swaps between texture (realistic/photoreal/colored) and schematic (white/green) custom shaders
 *   depending on the 'texture' query parameter in the URL manager.
 * - Ensures both the layerCollection and the styleManager reflect the currently applied style.
 * - If a non-default style is selected, applies it and updates with the hidden ID filtering.
 *
 * @async
 * @export
 * @param {string} [style=app.baseLayerPicker?.activeElements?.style?.value || 'default'] - The name/key of the style to use.
 * @returns {Promise<void>}
 */
export async function switchStyling(
    style = app.baseLayerPicker?.activeElements?.style?.value || 'default',
) {
    const stylable = layerCollection.getLayersByTags(['stylable']);

    const vegetation = layerCollection.getLayersByTags(['vegetation']);

    // Apply hidden IDs to base/default style
    const updatedStyle = await updateStylingWithDeletionList(
        app.styleManager.groups.get('default').style || new Cesium3DTileStyle(),
        Variables.hideIDs,
    );

    stylable.style = updatedStyle;
    vegetation.style = updatedStyle;

    const texture = app.urlManager.get('texture', 'number');

    // If texture mode is off, apply white/green schematic shaders for clarity.
    if (!texture) {
        stylable.customShader = ShaderFactory.createWhiteShader();
        vegetation.customShader = ShaderFactory.createGreenShader();
    } else {
        stylable.customShader = undefined;
        vegetation.customShader = undefined;
    }

    // Update style manager's 'stylable' group and set the new style
    app.styleManager.groups.set('stylable', stylable);
    app.styleManager.groups.get('stylable').style = updatedStyle;

    // If another style is chosen, apply it with hidden ID filtering as well
    stylable.style = await updateStylingWithDeletionList(
        STYLING[style],
        Variables.hideIDs,
    );
}

/**
 * Initializes event bindings for water level state button on DOMContentLoaded.
 * Attaches handlers for applying and removing water level overlays via the UI.
 *
 * @listens DOMContentLoaded
 */
addEventListener('DOMContentLoaded', () => {
    new WaterLevelState().applyHandle = app => {
        app.remove(new WaterLevelState());
    };

    new WaterLevelState().removeHandle = app => {
        app.applyState(new WaterLevelState());
    };

    document.getElementById('waterLevelClick').addEventListener('click', () => {
        app.applyState(new WaterLevelState());
    });
});
