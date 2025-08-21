import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
/**
 * An i18next instance pre-configured for use with async initialization.
 * Holds loaded translations and language settings after calling initI18n.
 *
 * @type {any}
 */
const configuredI18next = i18next.createInstance();

/**
 * Initializes the internationalization (i18n) engine with provided translation resources.
 * Sets up resource loading via HttpApi, language detection, namespace usage, and fallback options.
 *
 * @async
 * @param {string} loadPath - The root path to translation JSON files (e.g. 'locales'), used for backend loading.
 * @param {string[]} [ns=[]] - Optional array of namespaces to load for translations.
 * @returns {Promise<any>} Resolves to the configured i18next instance after initialization.
 *
 * @example
 *   // Loads 'locales/en/common.json' and other namespaces
 *   const i18n = await initI18n('./locales', ['common', 'glossary']);
 */
export async function initI18n(loadPath, ns = []) {
    await configuredI18next
        .use(HttpApi)
        .use(LanguageDetector)
        .init({
            detection: {
                order: ['navigator'],
            },
            fallbackLng: 'en',
            debug: false,
            ns: ns,
            defaultNS: 'common',
            partialBundledLanguages: true,
            backend: {
                loadPath: `${loadPath}/{{lng}}/{{ns}}.json`,
            },
        });

    return configuredI18next;
}

/**
 * The configured i18next instance, exported for use throughout the app.
 * Access to translation functions, current language, etc.
 *
 * @name i18next
 * @type {any}
 * @see initI18n
 */
export {configuredI18next as i18next};
