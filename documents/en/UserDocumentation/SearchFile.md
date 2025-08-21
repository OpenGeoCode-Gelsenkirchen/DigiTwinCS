---
title: Search File
group: Documents
category: Guides
---

# Search File

This application offers client-side search for coordinates in a json file. The file has to follow a specific structure for it work. `CATEGORY`, `ITEM`, `x` and `y` represent placeholders. Coordinates consist of a x- and y-value and have to be in the coordinate system of the project.

You can also use i18n translation tokens for categories. See [Internationalization](./Internationalization.md) for more information.

After you have created a search file, you have to reference it inside your local or global config.

```
{
    "CATEGORY 1": [
        {
            "ITEM 1": [x, y]
        },
        {
            "ITEM 2": [x, y]
        },
        ...
    ],
    "CATEGORY 2": [
        {
            "ITEM 1": [x, y]
        },
        {
            "ITEM 2": [x, y]
        },
        ...
    ],
    ...
}
```

## Example

Project Coordinate System: EPSG 25832

```
{
    "address:street": [
        {
            "Altmarkt": [365077.7, 5716126.0]
        },
        ...
    ],
    "address:poi": [
        {
            "Trinkwasserbrunnen Urbanuskirchplatz,St.-Urbanus-Kirchplatz,Trinkwasserbrunnen [Infrastruktur_GE]": [364986.2, 5716186.6]
        },
        ...
    ],
    ...
}
```

In case you don't want to use categories, just make the first category an empty string like:

```
{
    "": [{
            "Altmarkt": [365077.7, 5716126.0]
        },
        ...
    ],
}
```
