---
title: Configuration Files
group: Documents
category: Guides
---

# Configuration Files

With the help of configuration files, you can define the data that is displayed and that you can work with. Additionally, the url parameter `project` allows requesting a specific configuration file from the `projectFiles/local` folder. This way you can configure the application for specific projects.

Because most parts of a configuration file stay the same between projects (e.g. baselayers), the `projectFiles` folder under `public` is split into a `local` and a `global` folder. Local configuration files can specify global configuration files. If a local and global configuration file specifiy the same property, the application tries to merge both of them (if `fullReplace` is set to `false`, more on that later).

After building the application, all data inside `public` is put inside the root folder. <ins>You should in every case reference files directly as if `public` would be the root folder.</ins> (e.g. `/public/projectFiles/global/global.json` has to be referenced via `/projectFiles/global/global.json` everywhere in the project).

By default, json or array parameters from a local config are merged into the arguments of the global config. Overlapping arguments are replaced with parameters from the local config.

If you don't want that, you can either remove the reference to the global config inside the local config or add `fullReplace: true` next to the object you want to replace fully.

## Example

```
{
    "globalConfig": "./projectFiles/global/global.json", //optional
    "manual": "https://www.example.com/manual.pdf", //optional
    "terrain": {
        "First DTM": {
            "show": true,
            "urls": "https://www.example.com/firstDTM",
            "iconUrl": "./images/dtm1.png",
            "requestWaterMask": false,
            "requestMetadata": false,
            "credit": "DTM 1: <a style='color: deepskyblue; text-decoration: underline; href=...'",
            "creation": "CesiumTerrainProvider"
        },
        "Second DTM": {
            "show": true,
            "urls": "https://www.example.com/secondDTM",
            "iconUrl": "./images/dtm2.png",
            "requestWaterMask": false,
            "requestMetadata": false,
            "credit": "DTM 2: <a style='color: deepskyblue; text-decoration: underline; href=...'",
            "creation": "CesiumTerrainProvider"
        },
        "fullReplace": true
    }
...
```

This would fully replace the terrain declaration from global.json.
