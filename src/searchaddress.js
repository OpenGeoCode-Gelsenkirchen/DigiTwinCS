import {Flags} from './Flags.js';
import {FirstPersonState} from './States/FirstPersonState.js';

import {Cartesian3, Math as CesiumMath} from '@cesium/engine';
import proj4 from 'proj4';
import {app} from './Core/Application.js';
import {i18next} from './i18n.js';

/**
 * Sets up and customizes the address search/autocomplete UI component after all layers are loaded.
 *
 * - If app.config does not contain address data, removes the search UI element.
 * - Combines and localizes address entries into an array for autocomplete source.
 * - Groups search suggestions by category, with custom rendering.
 * - Extends autocomplete navigation to support category header skipping.
 * - Handles "Enter" key to select/autofill the first suggestion if none selected.
 * - On selection, triggers a geographic search/fly-to in the Cesium viewer.
 * - Disables/enables pedestrian control flag when the search input gains/loses focus.
 *
 * @listens layers-loaded
 */
addEventListener('layers-loaded', async () => {
    if (!app.config?.address) {
        document.getElementById('autocomplete')?.remove();
        return;
    }
    const customRenderMenu = function (ul, items) {
        let currentCategory = '';
        const self = this;

        $.each(items, function (index, item) {
            if (item.category !== currentCategory) {
                ul.append(
                    `<li class='ui-autocomplete-group ui-state-disabled'><b>${
                        item.category
                    }</b></li>`,
                );
                currentCategory = item.category;
            }
            self._renderItemData(ul, item);
        });
    };

    // Flatten and localize address categories for autocomplete
    const res = [];
    for (let cat of Object.keys(app.config.address)) {
        for (const value of Object.values(app.config.address[cat])) {
            if (i18next.exists(cat)) cat = i18next.t(cat);
            const key = Object.keys(value);
            res.push({
                label: key,
                value: value[key],
                category: cat,
            });
        }
    }

    // Initialize the autocomplete UI on #searchinput
    $('#searchinput')
        .autocomplete({
            source: res,
            create: function () {
                $(this).data('ui-autocomplete')._renderMenu = customRenderMenu;
                // Override for grouped navigation, enabling arrow keys to skip disabled headers

                $(this).data('ui-autocomplete')._move = function (
                    direction,
                    event,
                ) {
                    if (!this.menu.element.is(':visible')) {
                        this.search(null, event);
                        return;
                    }

                    const items = this.menu.element
                        .children('li')
                        .not('.ui-state-disabled');
                    if (!items.length) return;

                    let nextIndex;
                    const currentIndex = this.menu.active
                        ? items.index(this.menu.active)
                        : -1;

                    if (direction === 'next') {
                        nextIndex = (currentIndex + 1) % items.length;
                    } else {
                        nextIndex =
                            (currentIndex - 1 + items.length) % items.length;
                    }

                    this.menu.focus(event, items.eq(nextIndex));
                };
            },
            minLength: 4,
            delay: 100,
        })
        // "Enter" will select the first item if none actively selected
        .on('keydown', event => {
            if (event.keyCode === 13) {
                const autocomplete = $('#searchinput').data('ui-autocomplete');
                if (!autocomplete.selectedItem) {
                    const menu = autocomplete.menu;
                    if (menu.element.is(':visible')) {
                        const firstItem = menu.element.find('li:nth-child(2)');
                        if (firstItem.length > 0) {
                            firstItem.click();
                            event.preventDefault();
                        }
                    }
                    return;
                }

                search(autocomplete.selectedItem);

                if ($(this).is(':ui-autocomplete')) {
                    $(this).autocomplete('close');
                }
            }
        })
        // When an address is selected, fly/camera-move to that position
        .on('autocompleteselect', (event, ui) => {
            event.preventDefault();

            if (ui.item) {
                $('#searchinput').get(0).value = ui.item.label[0];
            }

            search(ui.item);
        })
        .on('autocompletefocus', (event, ui) => {
            event.preventDefault();
        });

    /**
     * Handles selection/search: projects the found address to WGS84 and flies the camera there.
     * Deactivates walking mode if it's active.
     *
     * @param {object} item - The selected item from autocomplete, with .value array of [x, y].
     */
    async function search(item) {
        const coords = item.value;

        const lonlat = proj4('COORD', 'WGS84', [
            Number(coords[0]),
            Number(coords[1]) - 180,
        ]);

        if (Flags.walking === true) {
            app.removeState(new FirstPersonState());
        }

        app.viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(lonlat[0], lonlat[1], 250),
            orientation: {
                heading: 0.0,
                pitch: CesiumMath.toRadians(-45),
                roll: 0.0,
            },
        });
        $('#searchinput').blur();
        Flags.blockPedestrianControl = false;
    }

    // Block pedestrian controls while search input is focused
    document.getElementById('searchinput').addEventListener('focus', () => {
        Flags.blockPedestrianControl = true;
    });

    document.getElementById('searchinput').addEventListener('blur', () => {
        Flags.blockPedestrianControl = false;
    });
});
