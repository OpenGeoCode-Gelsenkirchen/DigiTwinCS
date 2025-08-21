import {i18next} from '../i18n';

/**
 * ApplyTranslationFn – Function type for applying a translation to a specific part or attribute of a DOM element.
 *
 * @typedef {function} ApplyTranslationFn
 * @param {HTMLElement} el - The target element to translate or update.
 * @param {string} value - The translated (target language) text or value.
 */
type ApplyTranslationFn = (el: HTMLElement, value: string) => void;

/**
 * translationStrategies – Registry of strategies for applying translated values to different element targets.
 * Each strategy keyed by locator string (e.g., "html", "value") and implements ApplyTranslationFn.
 *
 * @type {Record<string, ApplyTranslationFn>}
 *
 * @example
 * translationStrategies["html"](el, "<b>hello</b>");
 * // sets el.innerHTML to given value
 */
const translationStrategies: Record<string, ApplyTranslationFn> = {
    html: (el, value) => {
        el.innerHTML = value;
    },
};

/**
 * Parses a custom i18n string of the form [locator]path, splitting to a locator and translation path.
 * If no locator, path is the full string and locator is null.
 *
 * @param {string} str - Input string, e.g., "[html]app.header" or "app.header".
 * @returns {{locator: string|null, path: string}}
 *
 * @example
 * parseI18nString("[html]about.blurb"); // {locator: "html", path: "about.blurb"}
 * parseI18nString("main.title");       // {locator: null, path: "main.title"}
 */
const parseI18nString = (
    str: string,
): {locator: string | null; path: string} => {
    const match = str.match(/^\[(.*)\](.*)/);
    if (match && match.length == 3) {
        return {locator: match[1], path: match[2]};
    }
    return {locator: null, path: str};
};

/**
 * Translator – Utility for batch, document, or per-element translation, using a custom attribute and patch strategies.
 *
 * Translates all elements with the specified tag (default: 'data-i18n'), optionally applying the translation to
 * textContent, innerHTML, an attribute, or other locations via the translationStrategies registry.
 *
 * Usage: Place attributes like data-i18n="header.title" or data-i18n="[html]about.detail" on your DOM nodes.
 *
 * @class
 *
 * @property {string} tag - The custom data attribute used for i18n, e.g., "data-i18n".
 *
 * @method translate(element) - Translates a single DOM element (resolves i18n tags, applies translation).
 * @method translateDocument(document) - Translates all elements within the document or section.
 * @private method applyTranslation(locator, element, translated) - Applies translated text to the element according to its locator.
 *
 * @example
 * // HTML: <p data-i18n="[html]about.detail"></p>
 * const tr = new Translator();
 * await tr.translateDocument(document); // Fills all marked nodes
 */
export class Translator {
    tag: string;

    /**
     * @param {object} [options]
     * @param {string} [options.tag='data-i18n'] - The HTML attribute to scan for translation keys.
     */
    constructor({tag: tag = 'data-i18n'} = {}) {
        this.tag = tag;
    }

    /**
     * Translates a single HTML element by applying one or more i18n keys from its attribute.
     * Locator format supports [html], [value], [placeholder], or other strategies.
     * Uses global i18next.t for translation lookup.
     *
     * @param {Element} element - The element to translate (must be an HTMLElement).
     * @returns {Promise<void>}
     */
    async translate(element: Element) {
        if (!(element instanceof HTMLElement)) return;

        const attrs = element
            .getAttribute(this.tag)
            ?.split(';')
            .map(s => s.trim())
            .filter(Boolean)
            .map(parseI18nString);

        if (!attrs) return;

        for (const attr of attrs) {
            const {locator, path} = attr;
            const translated = await i18next.t(path);
            this.applyTranslation(locator, element, translated);
        }
    }

    /**
     * Applies the translated value to the appropriate location on the element.
     * Uses translationStrategies for "html" and other advanced locators,
     * falls back to setting textContent and custom text property,
     * or sets an attribute if locator is not recognized.
     *
     * @private
     * @param {string|null} locator - How/where to apply (e.g., "html", "value", or null).
     * @param {HTMLElement} element - Target to update.
     * @param {string} translated - Translated string value.
     */
    private applyTranslation(
        locator: string | null,
        element: HTMLElement,
        translated: string,
    ) {
        if (!locator) {
            element.textContent = translated;
            (element as any).text = translated;
            return;
        }

        const strategy = translationStrategies[locator];
        if (strategy) {
            strategy(element, translated);
        } else {
            element.setAttribute(locator, translated);
        }
    }

    /**
     * Finds and translates all elements (with the configured tag) inside the given document or DOM subtree.
     *
     * @param {Document|ParentNode} document - Container to search for translatable elements.
     * @returns {Promise<void[]>} Resolves when all elements have been translated.
     */
    async translateDocument(document: Document | ParentNode) {
        const elements = document.querySelectorAll(`[${this.tag}]`);
        return await Promise.all(
            Array.from(elements).map(el => this.translate(el)),
        );
    }
}
