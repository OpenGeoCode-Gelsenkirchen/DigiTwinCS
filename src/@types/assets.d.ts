/**
 * Declares raw CSS-file imports as strings.
 *
 * @example
 * import styles from './widget.css?raw';
 * // styles: string
 */
declare module '*.css?raw' {
    const css: string;
    export default css;
}

/**
 * Declares raw HTML-file imports as strings.
 *
 * @example
 * import template from './widget.html?raw';
 * // template: string
 */
declare module '*.html?raw' {
    const html: string;
    export default html;
}
