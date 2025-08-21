import {Cesium3DTileStyle} from '@cesium/engine';
import {Temporary} from '../Temporary.js';
import {fillTable_hidden} from '../hide.js';
import {Feature} from './Feature.js';

/**
 * @ignore
 * @deprecated partially used, but not advised
 */
export class StyleManager {
    constructor(app) {
        this.app = app;
        this.featureVisibility = new Map();
        this.featureVisibility.set('default', new Map());
        this.colors = new Map();
        this.groups = new Map();
        this.groups.set('default', app.layerCollection);

        addEventListener('viewer-middle-click-3d', e => {
            if (e.detail.pickedFeature) {
                const feature = new Feature(e.detail.pickedFeature);

                Temporary.hiddenModels.obj.push(feature);
                Temporary.hiddenModels.id.push(feature.uuid);
                this.addFeatureVisibility(feature.uuid, false);
                fillTable_hidden();
            }
        });
    }

    addFeatureVisibility(uuid, show = false, group = 'default') {
        if (!this.featureVisibility.has(group)) {
            this.featureVisibility.set(group, new Map());
        }
        this.featureVisibility.get(group).set(uuid, show);
        //this.applyToGroup(group);
        return true;
    }

    addLayerCollectionVisibility(layerCollection, show = false) {
        if (!this.featureVisibility.has(layerCollection.id)) {
            this.featureVisibility.set(layerCollection.id, new Map());
        }
        const featureGroup = this.featureVisibility.get(layerCollection.id);
        for (const layer of layerCollection) {
            featureGroup.set(layer.content.uuid, show);
        }
        this.applyToGroup(layerCollection.id);
    }

    removeFeatureVisibility(uuid, group = 'default') {
        if (!uuid && this.featureVisibility.has(group)) {
            if (group === 'default') {
                this.featureVisibility.get(group).clear();
            } else {
                this.featureVisibility.delete(group);
            }

            this.applyToGroup(group);
            return true;
        }
        if (
            this.featureVisibility.has(group) &&
            this.featureVisibility.get(group).has(uuid)
        ) {
            this.featureVisibility.get(group).delete(uuid);
            if (this.featureVisibility.get(group).size === 0)
                this.featureVisibility.delete(group);
            this.applyToGroup(group);
            return true;
        }
        this.applyToGroup(group);
        return false;
    }

    buildStyle(colorGroup) {
        const conditions = [];

        for (const group of this.featureVisibility.keys()) {
            for (const [uuid, value] of this.featureVisibility
                .get(group)
                .entries()) {
                conditions.push([
                    '${UUID} === ' + `'${uuid}'`,
                    value.toString(),
                ]);
                conditions.push([
                    '${featureId} === ' + `'${uuid}'`,
                    value.toString(),
                ]);
            }
        }
        const style = new Cesium3DTileStyle({
            color: this.colors.get(colorGroup),
            show: conditions.length > 0 ? {conditions: conditions} : true,
        });
        return style;
    }

    addColorToGroup(color, group = 'default') {
        this.colors.set(group, color);
        this.applyToGroup(group, group);
    }

    removeColorfromGroup(group = 'default') {
        if (this.colors.has(group)) {
            this.colors.delete(group);
        }
    }

    applyToLayer(
        layerCollection = this.app.layerCollection,
        colorGroup = 'default',
    ) {
        layerCollection.style = this.buildStyle(colorGroup);
    }

    applyToGroup(group, colorGroup = 'default') {
        if (this.groups.has(group)) {
            const style = this.buildStyle(colorGroup);
            //this.groups.get(group).style = style;

            this.app.layerCollection
                .getContentByTags(['stylable'])
                .forEach(c => (c.style = style));

            this.app.layerCollection
                .getLayersByTags(['inverted'])
                .forEach(c => {
                    if (c?.parent) {
                        c.parent.style = style;
                    }
                });
        }
    }
}
