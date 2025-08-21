---
title: Configuration Parameters
group: Documents
category: Guides
---

# Configuration Parameters

## **Usage Notes**

- Objects can be defined directly inside the configuration file or referenced externally (using a path/URL to a separate file). Use `fullReplace` if you want to overwrite a global configuration parameter completely (see [ConfigurationFiles.md](./ConfigurationFiles.md)).

#### Example

```
"threeD": "https://example.com/myThreeDConfig.json"
```

<br>

## globalConfig

**Type:** `string` (path/URL)
<br>
**Required:** ❌

Path or URL to the global configuration JSON file.

```
"globalConfig": "./projectFiles/global/global.json"

```

<br>

---

## manual

**Type:** `string` (URL)
<br>
**Required:** ❌

Defines the application's manual or user guide. Downloadable via the sidebar.

<br>

```
"manual": "https://example.com/manual.pdf"
```

<br>

---

## locales

**Type:** `string` (URL)

**Required:** ✅

Path or URL to the locales folder. Inside this folder, subdirectories with ISO 639‑1 language codes are expected.

**Example**:

```
"locales": "./locales/"
```

## <br>

## Camera

**Required:** ✅

Sets the camera position and orientation. Camera position has to be set in EPSG:4978 (Cesium native) coordinates and camera orientation in radians.

**Example**:

```
 "camera": {
        "position": {
            "x": 3943520.422319277,
            "y": 489077.99798218557,
            "z": 4972590.048825602
        },
        "orientation": {
            "heading": 0,
            "pitch": -0.523599,
            "roll": 0
        }
    },
```

<br>

---

## proj4

**Required:** ✅

Defines the project coordinate system. If set, `definition` and `epsg` must both be specified.

### proj4.definition

**Type:** string — proj4 definition string  
See: [epsg.io](https://epsg.io)

### proj4.epsg

**Type:** string | number — EPSG code for the projection.

<br>

**Example**:

```
"proj4": {
        "definition": "+proj=utm +ellps=GRS80 +datum=ETRS89 +unit=m +zone=32U +no_defs",
        "labelLong": "(ETRS89 / UTM Zone 32N)",
        "labelShort": "ETRS89",
        "epsg": 25832
    },
```

<br>

---

## header

**Required:** ❌

Configuration for the application's header section.

### header.icon

- `src`: URL to the icon (e.g. SVG, PNG)
- `link`: URL to open when the icon is clicked

### header.title

**Type:** `string`

String representing the header title.

### header.extra

**Type:** `string`

String for additional information. Placed in the upper right corner.

**Example**:

```
"header": {
    "icon": {
        "src": "https://example.com/image.svg",
        "link": "https://example.com/landingPage"
    },
    "title": "This is an example title",
    "extra": "common:header.extra" //i18n translation token
}
```

<br>

---

## footer

**Required:** ❌

Configuration for the application footer (left side). If you want to change the label for the coordinate display, see proj4 parameter documentation (labelLong).

### footer.elements

**Type:** Array of HTML strings  
**Required:** ✅  
Links to be displayed in the left footer area, e.g. privacy & imprint.

```
"footer": {
    "elements": [
        "<a href='https://example.com/A' target='_blank' data-i18n='common:body:footer:data-privacy:text'>",
        "<a href='https://example.com/B' target='_blank' data-i18n='common:body:footer:imprint:text'>"
    ]
},
```

<br>

---

## address

**Required:** ❌

If address/poi search should be available, you have to set a reference to the json search file. For more information on how to set up a search file, see [SearchFile](./SearchFile.md).

- `url`: (`string`) Path/URL to the address data source
- `resolve`: (`boolean`) If this is set to true, the json file will get resolved completely leading to increased loading times. Should be set to `false`.

### Example

```
"address": {
    "url": "https://example.com/adress_coordinates.json",
    "resolve": false
}
```

<br>

---

## buildingAreaUrl, buildingLengthUrl

**Type:** `string`

**Required:** ❌

Both measuring tools for building area and length require paths/urls to folders containing measurements as 3d tilesets. For more information see [BuildingMeasurements](./BuildingMeasurements.md).

### Example

```
"buildingAreaUrl": "https://example.com/dimensions/area/",
"buildingLengthUrl": "https://example.com/dimensions/line/",
```

<br>

---

## compass

**Type:** `string` (path/URL to image/svg)

**Required:** ❌

Path to compass icon. This icon is used inside the 3d view and printed pdf document.

### Example

```
"compass": "./images/compass.svg",
```

<br>

---

## pdfIcon

**Type:** `string` (path/URL to image/svg)

**Required:** ❌

Path to an image file used as an icon inside the printed pdf document.

```
"pdfIcon": "./images/pdfIcon.png",
```

---

## overviewMap

**Required:** ❌

Overview map configuration.

- `url`: (`string`) Service URL
- `layers`: (`string` / array) Layer IDs/keys
- `attribution`: (`string`) Data source attribution
- `minZoom`: (`number`) Minimum zoom level
- `maxZoom`: (`number`) Maximum zoom level
- `bounds`: (`array` of coordinate pairs) Map extent

### Example

```
"overviewMap": {
    "url": "https://example.com/exampleService/guest",
    "layers": "0",
    "attribution": "Example.com",
    "minZoom": 10,
    "maxZoom": 16,
    "bounds": [
        [48.0, 6.08],
        [60.64, 7.55]
    ]
}
```

<br>
<br>

---

## links

**Type:** Array of Objects

**Required:** ❌

A list of linked applications/websites displayed to the user.

### Properties of a link entry

- `imgUrl`: (`string`) URL to a PNG/JPEG preview image of the website/application.
- `title`: (`string`) Short title.
- `description`: (`string`) Description for the website/application
- `linkUrl`: (`string`) URL to the web application.

<br>

```
"links": [
    {
        "imgUrl": "https://example.com/ExampleApp1.png",
        "title": "App1",
        "description": "First Application",
        "linkUrl": "https://app1.example.com/"
    },
    {
        "imgUrl": "https://example.com/ExampleApp2.png",
        "title": "App2",
        "description": "Second Application",
        "linkUrl": "https://app2.example.com/"
    }
]
```

---

## baseLayer

**Required:** ❌

Base map configuration — each key is equal to the layer name.

### Properties of a base map

- `show`: (`boolean`) Whether the map is visible
- `iconUrl`: (`string`) Path to the icon
- `tooltip`: (`string`) Tooltip text for the map
- `creation`: (`array` of objects) Layer/service description

### Properties of `"WebMapServiceImageryProvider"`:

- `type`: `"WebMapServiceImageryProvider"`
- `url`: Service URL
- `layers`: Layer ID/name
- `parameters`: Additional parameters (format, transparency)
- `enablePickFeatures`: (`boolean`)
- `crs`: CRS notation, e.g. `"EPSG:25832"`
- `credit`: HTML string for attribution
-

### Properties of `"WebMapTileServiceImageryProvider"`:

- `type`: `"WebMapTileServiceImageryProvider"`
- `url`: (`string`) URL with placeholders
- `layer`: (`string`) The layer name for WMTS requests.
- `style`: (`string`)The style name for WMTS requests.
- `tileMatrixSetID`: The identifier of the TileMatrixSet to use for WMTS requests.

<br>

## Examples:

### WebMapServiceImageryProvider

```
"baseLayer": {
    "Example Webmap": {
        "show": true,
        "iconUrl": "./images/webmap.png",
        "tooltip": "My example WebMap",
        "creation": [
            {
                "type": "WebMapServiceImageryProvider",
                "url": "https://wms.example.com/guest",
                "layers": "0",
                "parameters": {
                    "transparent": true,
                    "format": "image/jpeg"
                },
                "enablePickFeatures": false,
                "crs": "EPSG:25832",
                "credit": "Webmap: <a style=\"color: deepskyblue; text-decoration: underline;\" href=\"https://example.com/webmap/metadata\">Example.com</a>"
            }
        ]
    }
}
```

<br>

### WebMapTileServiceImageryProvider

```
"baseLayer": {
    "Example TiledWebmap": {
        "iconUrl": "./images/tiled_webmap.png",
        "tooltip": "My example tiled Webmap",
        "creation": [
            {
                "type": "WebMapTileServiceImageryProvider",
                "url": "https://example.com/tile/1.0.0/web/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
                "layer": "",
                "style": "default",
                "tileMatrixSetID": "WEBMERCATOR",
                "parameters": {
                    "transparent": true,
                    "format": "image/jpeg"
                },
                "enablePickFeatures": false,
                "credit": "Tiled Webmap: <a style='color: deepskyblue; text-decoration: underline;' href='https://example.com/tiled_webmap/metadata'>Example.com</a>"
            }
        ]
    }
}
```

<br>

### Multiple WebMapServiceImageryProvider

```
"baseLayer": {
    "Example Overlay Map": {
        "iconUrl": "./images/overlay_map.png",
        "tooltip": "My example overlay Webmap",
        "creation": [
            {
                "type": "WebMapServiceImageryProvider",
                "url": "https://example.com/myWebmap",
                "layers": "2025",
                "parameters": {
                "transparent": true,
                "format": "image/png"
                },
                "enablePickFeatures": true,
                "credit": "Overlay Webmap: <a href='https://example.com/overlay_webmap/meta_Data' style='color: deepskyblue; text-decoration: underline;'>Example.com</a>"
            },
            {
                "type": "WebMapServiceImageryProvider",
                "url": "https://example.com/myOverlay",
                "layers": "example_layer_1,example_layer_2",
                "parameters": {
                "transparent": true,
                "format": "image/png"
                },
                "enablePickFeatures": false,
                "tileWidth": 256,
                "tileHeight": 256,
                "crs": "EPSG: 4326"
            }
        ]
    }
}
```

<br>

---

## terrain

**Required:** ✅

Terrain provider configuration.

### Properties of a terrain:

- `show`: (`boolean`) Whether the terrain is displayed
- `iconUrl`: (`string`) Icon for the terrain
- `tooltip`: (`string`) Short info
- `creation`: (`array` of objects, e.g. `"EllipsoidTerrainProvider"` or `"CesiumTerrainProvider"`)

### Properties of `"EllipsoidTerrainProvider"`:

- `show`: (`boolean`) Whether the terrain is displayed.
- `iconUrl`: (`string`) Path to the icon for the terrain.
- `toolTip`: (`string`) Tooltip text for the terrain option.
- `creation`: (`string`) Name/type of the terrain provider (`"EllipsoidTerrainProvider"`).

### Properties of `"CesiumTerrainProvider"`:

- `show`: (`boolean`) Whether the terrain is displayed.
- `url`: (`string`) Path or URL to the terrain data/service.
- `iconUrl`: (`string`) Path to the icon for the terrain.
- `toolTip`: (`string`) Tooltip text for the terrain option.
- `requestVertexNormals`: (`boolean`) Request vertex normals from the terrain provider.
- `requestWaterMask`: (`boolean`) Request the water mask layer.
- `requestMetadata`: (`boolean`) Request additional metadata.
- `credit`: (`string`) HTML attribution string.
- `creation`: (`string`) Name/type of the terrain provider (`"CesiumTerrainProvider"`).

### Example

#### EllipsoidTerrainProvider

```
"terrain": {
    "Example Ellipsoid": {
            "show": true,
            "iconUrl": "./images/example_icon.png",
            "tooltip": "WGS84 Ellipsoid",
            "creation": [
                {
                    "type": "EllipsoidTerrainProvider"
                }
            ]
    }
}
```

#### CesiumTerrainProvider

```
"terrain": {
    "Example Terrain": {
        "show": true,
        "url": "https://example.com/terrain/",
        "iconUrl": "./images/terrain.png",
        "toolTip": "Example Terrain Tooltip",
        "requestVertexNormals": true,
        "requestWaterMask": false,
        "requestMetadata": false,
        "credit": "Example Terrain: <a style='color: deepskyblue; text-decoration: underline;' href='https://example.com/terrain_metadata'>Example.com</a>",
        "creation": "CesiumTerrainProvider"
    }
}
```

<br>

---

## threeD

**Required:** ❌

3d dataset configuration. Each key is equal to the layer name.

### Properties of a 3D tileset

- `url`: (`string`, array<`string`>) URL or array of URLs to tileset json or a text files.
- `target`: (`string`) Target or data category. LEGACY
- `show`: (`boolean`) Sets the layer visibility after loading.
- `table`: (`boolean`) Adds layer to layer overview.
- `backFaceCulling`: (`boolean`) If backefaceculling should be enabled for the 4d tileset.
- `credit`: (`string`) HTML attribution string.
- `hideIDs`: (array<`string`>) array of UUIDs (3DTileFeatures and 3DGeojson only) that should be hidden when the layer is active (and vice versa). **NOTE**: hiding buildings requires a UUID for every feature. In the case of entities (e.g. geojson), you can set the `uuidAttribute` property in the config to define an attribute that acts as a UUID.
- `format`: (`object`)
    - `title`: (`string`) I18N key or label.
    - `attributes`: (`array`) List of data attributes for the table.
- `type`: `"b3dm"`

### Properties of a 3D geojson

Extruded 2D Layers are handled as 3D inside the application.

- `url`: (`string`) URL for the GeoJSON WFS service.
- `target`: (`string`) Data category (e.g. `"3d"`).
- `show`, `table`: Booleans.
- `clampToGround`: (`boolean`)
- `color`: (`string`) RGBA or color string.
- `extrusionAttribute`: (`object`) Key-value map specifying extrusion for 3D rendering.
- `uuidAttribute`: (`string`) Fills the UUID property of the entity with the value of the attribute.
- `outline`: (`boolean`) Should outlines be drawn.
- `entityName`: (`string`) Label for entities.
- `tableAttributes`: (`object`)
    - Entries are either strings or arrays of strings for composite attributes.
- `type`: `"3Dgeojson"`

### Properties of a mixed layer

Mixed layers are a special case. They can combine 2D (vector and raster) and 3D data into a single layer. Supported file formats are: 3DTilesets, Geojson, GeoTIFF, and PNGs (with pgw). If you want to include a georeferenced .png file, make sure that the .pgw is in the same folder. Don't reference the .pgw file under `url`.

- `url`: (`string`) URL for the GeoJSON WFS service.
- `target`: (`string`) Target or data category. LEGACY
- `show`: (`boolean`) Sets the layer visibility after loading.
- `table`: (`boolean`) Adds layer to layer overview.
- `backFaceCulling`: (`boolean`) If backefaceculling should be enabled for the 3d tileset.
- `clampToGround`: (`boolean`)
- `credit`: (`string`) HTML attribution string.
- `hideIDs`: (array<`string`>) array of UUIDs (3DTileFeatures only) that should be hidden when the layer is active (and vice versa).
- `format`: (`object`) (only works for 3DTileFeatures inside mixed layer)
    - `title`: (`string`) I18N key or label.
    - `attributes`: (`array`) List of data attributes for the table.
- `type`: `"mixed"`

<br>

## Examples

### 3D Tileset Example with multiple urls

```

"threeD": {
    "Example Buildings": {
        "url": [
            "https://example.com/lod2/tileset.json",
            "https://example.com/LOD3.txt",
            "https://example.com/LOD2.txt"
        ],
        "uuidAttribute": "gml_id",
        "target": "buildings",
        "show": true,
        "table": true,
        "backFaceCulling": true,
        "type": "b3dm",
        "format": {
        "title": "glossary:building",
        "attributes": ["UUID", "Height"]
        }
    }
}

```

<br>
<br>

### Vegetation Example

```

"threeD": {
    "Vegetation": {
        "url": "https://example.com/vegetation/tileset.json",
        "target": "vegetation",
        "show": true,
        "table": true,
        "backFaceCulling": true,
        "type": "b3dm",
        "tags": ["vegetation"],
        "format": {
        "title": "glossary:vegetation",
        "attributes": [
            "UUID",
            "Species",
            "Year",
            "Height",
            "Diameter"
            ]
        }
    }
}

```

<br>
<br>

### Internal License Data Example

```

"threeD": {
    "Internal Data": {
        "url": "https://example.com/tileset.json",
        "target": "internal",
        "tags": ["internalOnly"], //if this layer is active and a pdf is printed, this will trigger a separate license notice based on the respective i18n translation token
        "show": false,
        "table": true,
        "backFaceCulling": true,
        "type": "b3dm",
        "credits": "Internal Example Data: <a style='color: deepskyblue; text-decoration: underline;' href='https://example.com'>Example.com</a>"
    }
}

```

<br>
<br>

### Geojson 3D Example

```

"threeD": {
    "Example Geojson 3D": {
        "url": "https://example.com/WFS/guest?service=wfs&request=GetFeature&typeNames=Example:Buildings&outputFormat=GeoJSON",
        "target": "3d",
        "show": true,
        "table": true,
        "ableToDelete": false,
        "clampToGround": true,
        "color": "rgba(240, 160, 160, 0.65)",
        "extrusionAttribute": {
            "extrusionHeight": "FH-EFH" //this is an expression that gets evaluated during runtime and results in the difference of two attributes. You can also declare a fixed value here.
        },
        "outline": false,
        "entityName": "Planned Buildings",
        "tableAttributes": {
            "Example": "Example Attribute",
            "Example Composite": [
                "Example Attribute 1",
                "Example Attribute 2",
                "Example Attribute 3"
            ]
        },
        "type": "3Dgeojson"
    }
}

```

<br>
<br>

---

## twoD

**Required:** ❌

2D dataset configuration. Each key is equal to the layer name.

### Properties of a 2D dataset (e.g. `"Example File"`)

- `url`: (`string`) URL to the GeoJSON or vector file.
- `target`: (`string`) Target or data category (e.g. `"file"`).
- `show`: (`boolean`) Should the layer be initially visible?
- `table`: (`boolean`) Should data be shown in a table?
- `ableToDelete`: (`boolean`) Is the dataset deletable by the user?
- `color`: (`string`) Color value (e.g. `"rgba(0,0,140,0.7)"`).
- `clampToGround`: (`boolean`) Should features be clamped to the ground?
- `credit`: (`string`) HTML attribution string.

<br>
<br>

---

## styling

**Required:** ❌

Different styles with configuration for icons, active state, and background changes. By default, three different styles exist.

#### Neutral

This style applies a white custom shader to all layers with tags `stylable` and a green custom shader to all layers with tags `vegetation`.

#### Height

This style applies a declarative styling to all layers with tags `stylable` where the color depends on the attribute `Hoehe`.

#### Functional

This style applies a declarative styling to all layers with tags `stylable` where the color depends on the attribute `GFK`. This refers to `Gebäudefunktion` from `ALKIS NRW Objektartenkatalog (ALKIS-OK NRW)`.

#### Custom Styling

See [CustomStyling](./CustomStyling.md).

### Properties of a style

- `iconUrl`: Path to thumbnail image for the baselayerpicker.
- `active`: (`boolean`) Activates the style right from the start. If multiple styles are set active, the last one is chosen.
- `changeBackground`: (`boolean`) Defines if the background image of the baselayerpicker is updated to the thumbnail image after activation.
- `value`: (`string`) Identifier/value for the style. This is needed to map to the actual definition inside the source code. See [CustomStyling](./CustomStyling.md) for more information.

### Example

```

"styling": {
    "Neutral": {
        "iconUrl": "./images/neutral_styling.png",
        "active": false,
        "changeBackground": false,
        "value": "default"
    },
    "Height": {
        "iconUrl": "./images/height_styling.png",
        "active": false,
        "changeBackground": false,
        "value": "height"
    },
    "Functional": {
        "iconUrl": "./images/functional_styling.png",
        "active": true,
        "changeBackground": false,
        "value": "functional"
    }
}

```

<br>
<br>
```
