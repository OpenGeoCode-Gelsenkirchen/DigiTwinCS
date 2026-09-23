import {uuidv4} from './Core/utilities.js';

/**
 * Toggles all descendant checkboxes in a tree structure to match the checked state of the parent checkbox.
 * Given a checkbox's ID, finds its parent and cascades its 'checked' value to all child checkboxes within the same tree.
 *
 * @export
 * @param {string} id - The DOM element ID of the parent tree checkbox.
 */
export function treeToggleCascade(id) {
    const parent = document.getElementById(id);
    const uls = parent.parentNode.querySelectorAll('ul li');
    if (!uls) return;

    for (const ul of uls) {
        const cb = ul.querySelector('li details input[type=checkbox]');
        if (cb) cb.checked = parent.checked;
    }
}

/**
 * Recursively builds a nested tree menu (<ul>) from a nested data object.
 * Each level creates either a grouped "details" branch (for objects) or an input+label leaf (for values).
 * All checkboxes are wired to cascade toggling to their children for hierarchical selection.
 *
 * @export
 * @param {Object} data - Nested key-value object representing the tree. Leaves can be primitives or objects.
 * @param {string} [leaf='li'] - If set to 'input', renders a label for each leaf. Otherwise uses plain <li>.
 * @returns {HTMLUListElement} The generated tree <ul> element with checkboxes and nested details/branches.
 */
export function createTreeMenu(data, leaf = 'li') {
    const tree = document.createElement('ul');
    tree.classList.add('tree');

    for (const key of Object.keys(data)) {
        const value = data[key];
        const li = document.createElement('li');

        const item_li = document.createElement('input');
        item_li.type = 'checkbox';
        item_li.name = 'cb-wms';
        item_li.value = value;
        item_li.setAttribute('key', key);
        item_li.id = uuidv4();
        item_li.addEventListener(
            'click',
            treeToggleCascade.bind(null, item_li.id),
        );

        if (typeof value === 'object') {
            const detail = document.createElement('details');
            detail.open = true;
            const sum = document.createElement('summary');
            sum.innerText = key;

            li.appendChild(item_li);
            detail.appendChild(sum);
            const ul = createTreeMenu(value, leaf);
            detail.appendChild(ul);
            li.appendChild(detail);
        } else {
            // Leaf node (optionally uses label if leaf=='input')
            let item_label;
            if (leaf === 'input') {
                item_label = document.createElement('label');
                item_label.innerText = key;
                item_label.htmlFor = item_li.id; //key
            }
            item_li.name = 'wms-cb-leaves';
            item_li.innerText = String(value);
            li.appendChild(item_li);
            li.appendChild(item_label);
        }
        tree.appendChild(li);
    }
    return tree;
}
