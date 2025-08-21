import '../ge-button/ge-button.js';
import styles from './FileUpload.css?raw';
import template from './FileUpload.html?raw';

/**
 * `<file-upload>` - A custom Web Component that provides
 * a styled and responsive file upload dialog.
 *
 * It consists of:
 * - A title label
 * - A descriptive text
 * - A file input field
 * - A confirm and a cancel button
 *
 * The component is fully customizable via attributes and provides
 * two custom events (`confirm`, `cancel`) for host interaction.
 *
 * @summary
 * Custom element for file uploads with configurable text labels
 * and accepted file types.
 *
 * @example
 * ```
 * <file-upload
 *   accept=".glb,.gltf"
 *   title="Upload 3D Model"
 *   text="Please select a .glb or .gltf file."
 *   confirm-text="Upload"
 *   cancel-text="Discard"
 * ></file-upload>
 * ```
 *
 * @fires confirm - Fired when the confirm button is clicked.
 * @property {FileList} detail.files - The files selected by the user.
 *
 * @fires cancel - Fired when the cancel button is clicked.
 *
 * @attr {string} title - Sets the dialog title text.
 * @attr {string} text - Sets the description text below the title.
 * @attr {string} confirm-text - Label text for the confirm button.
 * @attr {string} cancel-text - Label text for the cancel button.
 * @attr {string} accept - Comma-separated list of accepted MIME types or file extensions (e.g. `.glb,.gltf`).
 *
 *
 */

export class FileUpload extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'text', 'confirm-text', 'cancel-text', 'accept'];
    }

    constructor() {
        super();

        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>${styles}</style>
            ${template}
        `;

        this.html = {
            title: this.shadowRoot.querySelector('.title'),
            text: this.shadowRoot.querySelector('.text'),
            input: this.shadowRoot.querySelector('.input'),
            confirm: this.shadowRoot.querySelector('.confirm-button'),
            cancel: this.shadowRoot.querySelector('.cancel-button'),
        };

        this.html.confirm.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('confirm', {
                    detail: {
                        files: this.html.input.files,
                    },
                    bubbles: true,
                    composed: true,
                }),
            );
        });

        this.html.cancel.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('cancel', {
                    bubbles: true,
                    composed: true,
                }),
            );
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'title': {
                this.html.title.textContent = newValue;
                break;
            }
            case 'text': {
                this.html.text.textContent = newValue;
                break;
            }
            case 'confirm-text': {
                this.html.confirm.text = newValue;
                break;
            }
            case 'cancel-text': {
                this.html.cancel.text = newValue;
                break;
            }
            case 'accept': {
                this.html.input.setAttribute('accept', newValue);
                break;
            }
        }
    }
    /** @type {string} The current title label text */
    get title() {
        return this.html?.title.textContent;
    }

    set title(value) {
        this.html.title.textContent = value;
    }
    /** @type {string} The current description text */
    get text() {
        return this.html?.text.textContent;
    }

    set text(value) {
        this.html.text.textContent = value;
    }

    /** @type {string} The label text of the confirm button */
    get confirmText() {
        return this.html?.confirm.text;
    }

    set confirmText(value) {
        this.html.confirm.text = value;
    }

    /** @type {string} The label text of the cancel button */
    get cancelText() {
        return this.html?.cancel.text;
    }

    set cancelText(value) {
        this.html.cancel.text = value;
    }

    /** @type {string|null} The currently accepted file types/extensions */
    get accept() {
        return this.html?.input.getAttribute('accept');
    }

    set accept(value) {
        this.html.input.setAttribute('accept', value);
    }
}

if (!customElements.get('file-upload'))
    customElements.define('file-upload', FileUpload);
