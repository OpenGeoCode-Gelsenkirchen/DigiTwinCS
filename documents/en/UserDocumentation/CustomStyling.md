---
title: Custom Styling
group: Documents
category: Guides
---

# Custom Styling

This part won't go into detail on how to write a declarative style in Cesium.js. For that have a look at [Styling and Filtering 3D Tiles](https://cesium.com/learn/cesiumjs-learn/cesiumjs-3d-tiles-styling/) and [Cesium3DTileStyle](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileStyle.html).

After you have created a Cesium3DTileStyle object somewhere inside the project, you can import it into `constants.js` and add it to the `STYLING` variable. Styling is applied to all layers with a tag `stylable`.

```
export const STYLING = {
    isPlanned: PlannedStyling,
    height: HeightStyling,
    functional: FunctionalStyling,
    empty: EmptyStyling,
};
```

You can then reference this style inside the config like so:

```
"styling": {
    "Neutral": {
        "iconUrl": "./images/Styling_Standard_Thumbnail2.png",
        "active": false,
        "changeBackground": false,
        "value": "default"
    },
    "MyCustomStyle": {
        "iconUrl": "./images/MyCustomStyle_Thumbnail.png",
        "active": false,
        "changeBackground": false,
        "value": "custom"
    }
}
```

The `value` property has to match the key of the corresponding style inside `STYLE`.
