import styles from './ge-card.css?raw';
import template from './ge-card.html?raw';

/**
 * `<ge-card>` - A custom card component for displaying an image,
 * title, subtitle, description, and an optional action link.
 *
 * The card is fully stylable via CSS and is clickable as a whole.
 * When clicked, it navigates to the `linkUrl`.
 *
 * @summary
 * Custom card UI element with image, text sections, and link navigation.
 *
 * @example
 * ```
 * <ge-card
 *   img-url="./images/common/example.jpg"
 *   title="Mars Terrain"
 *   subtitle="Imagery from HiRISE"
 *   description="High-resolution imagery from NASA's Mars Reconnaissance Orbiter."
 *   link-url="https://mars.nasa.gov"
 * ></ge-card>
 * ```
 *
 */
export class GeCard extends HTMLElement {
    constructor({
        imgUrl: imgUrl = './images/common/thumbnail.svg',
        title: title = '',
        subtitle: subtitle = '',
        description: description = '',
        linkUrl: linkUrl = '',
    } = {}) {
        super();

        this.shadow = this.attachShadow({mode: 'open'});

        this.shadow.innerHTML = `
        <style>${styles}</style>
        ${template}
        `;

        this.html = {
            card: this.shadow.querySelector('.card'),
            imgDiv: this.shadow.querySelector('.img-div'),
            img: this.shadow.querySelector('img'),
            textDiv: this.shadow.querySelector('.text-div'),
            title: this.shadow.querySelector('.title'),
            subtitle: this.shadow.querySelector('.subtitle'),
            description: this.shadow.querySelector('.description'),
            actionDiv: this.shadow.querySelector('.action-div'),
            button: this.shadow.querySelector('ge-button'),
        };

        this.html.title.innerText = this.title;
        this.html.subtitle.innerText = this.subtitle;
        this.html.description.innerText = this.description;

        this.imgUrl = imgUrl;
        this.html.title.innerText = title;
        this.html.subtitle.innerText = subtitle;
        this.html.description.innerText = description;
        this.linkUrl = linkUrl;

        // Entire card clickable
        this.html.card.addEventListener('click', () => {
            window.location.href = this.linkUrl;
        });
    }

    /** @type {string} Image URL */
    set imgUrl(url) {
        this.html.img.src = url;
    }

    /** @type {string} Card title */
    get title() {
        return this.html.title.innerText;
    }

    set title(value) {
        this.html.title.innerText = value || '';
    }

    /** @type {string} Card subtitle */
    get subtitle() {
        return this.html.subtitle.innerText;
    }
    set subtitle(value) {
        this.html.subtitle.innerText = value || '';
    }

    /** @type {string} Card description */
    get description() {
        return this.html.description.innerText;
    }
    set description(value) {
        this.html.description.innerText = value || '';
    }

    /** @type {string} Target link URL */
    get linkUrl() {
        return this.getAttribute('link-url');
    }

    set linkUrl(value) {
        if (value) {
            this.setAttribute('link-url', value);
        } else {
            this.removeAttribute('link-url');
        }
    }
}

if (!customElements.get('ge-card')) customElements.define('ge-card', GeCard);
