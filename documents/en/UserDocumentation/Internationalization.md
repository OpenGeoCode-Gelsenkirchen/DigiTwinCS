---
title: i18n Internationalization
group: Documents
category: Guides
---

# i18next Internationalization

i18next is used for internationalization. By default everything should already be translated to German and English. If you want to add an internationalization, you have to create a folder under `/public/locales/` with the repspective ISO 639-1 language code. Translation files are plain JSON files. They are organized hierarchically where each translation unit is accessed through dot notation (e.g. `path.to.my.translation`). If you want to change translation tokens for static html, change `index.html`. For dynamic content, you would need to modify your configuration file.

#### Example

```
{
    "path": {
        "to": {
            "my": {
                "translation": "This is a translation."
            }
        }
    }
}
```

Elements inside index.html will get translated automatically if the `data-i18n` attribute references a valid translation token. A translation token may start with a locator written in square brackes like `[locator]` which defines the html attribute which will receive the translated unit. If `[html]` is used as a locator, the translated unit will get inserted into `.innerHTML`.

Locales are split into mutliple files which act as namespaces. A namespace is separated from the translation path via `:` (e.g. `namespace:path.to.my.translation`).

If you create a new namespace file, you have to add it to the list of namespaces (`ns`) inside `i18n.js`.

```
export async function initI18n(loadPath) {
    await configuredI18next
        .use(HttpApi)
        .use(LanguageDetector)
        .init({
            fallbackLng: 'de',
            debug: true,
            ns: ['common', 'ge-shadow-control', 'error', 'address', 'glossary'], //add namespace here
            defaultNS: 'common',
            partialBundledLanguages: true,
            backend: {
                loadPath: `${loadPath}/{{lng}}/{{ns}}.json`,
            },
        });

    return configuredI18next;
}
```
