---
title: Configuration Parameters
group: Documents
category: Guides
---

# Configuration Parameters

## **Usage Notes**

- Objects can be defined directly inside the configuration file or referenced externally (using a path/URL to a separate file). Use `fullReplace` if you want to overwrite a global configuration parameter completely (see [ConfigurationFiles.md](./ConfigurationFiles.md)).

#### Example 1

```
"threeD": "https://example.com/myThreeDConfig.json"
```

#### Example 2

The following example shows different declaration styles for tilesets.

```
"threeD": {
    "Tileset 1": {
        "url": "url/tileset.json",
        ...
    },
    "Tileset 2": {
        "url": [
            "url/tileset1.json",
            "url/tileset2.json"
        ],
        ...
    },
    "Tileset 3": {
        "url": "url/myTilesets.txt"
    },
    "Tileset 4": {
        "url": [
            "url/myTilesets.txt",
            "url/tileset3.json"
        ]
    }
}
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

Path or URL to the locales folder. Inside this folder, subdirectories with ISO 639‑1 language codes are expected. For more information on internationalization, see [Internationalization](./Internationalization.md)

**Example**:

```
"locales": "./locales/"
```

<br>

---

## boundaries

**Required:** ✅

Sets the translation boundaries (in project coordinate system format) for loaded gltf models. Does not act on the camera at the moment.

**Example**:

```
"boundaries": {
    "x": {
        "min": 355000,
        "max": 375000
    },
    "y": {
        "min": 5702000,
        "max": 5723000
    }
},
```

<br>

## camera

**Required:** ✅

Sets the camera position and orientation. Camera position has to be set in EPSG:4978 (Cesium native) coordinates and camera orientation in radians.

You can derive the current camera position in the console with

```
app.viewer.scene.camera.position
```

This way you can also get the heading, pitch and roll:

```
app.viewer.scene.camera.heading
app.viewer.scene.camera.pitch
app.viewer.scene.camera.roll
```

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

### proj4.labelShort

**Type:** string  — short label for the project coordinate system

### proj4.labelLong

**Type:** string  — long label for the project coordinate system

<br>

**Example**:

```
"proj4": {
        "definition": "+proj=utm +ellps=GRS80 +datum=ETRS89 +unit=m +zone=32U +no_defs",
        "epsg": 25832
        "labelShort": "ETRS89",
        "labelLong": "(ETRS89 / UTM Zone 32N)",
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

## highlight

**Required:** ❌

### hover

Sets the color when hovering over features with your cursor.

- `opaque`: (`hex color string` | `false`) Sets the hover color for opaque features.
- `transparent`: (`hex color string` | `false`) Sets the hover color for transparent features.

### selected

Sets the color when selecting a feature.

- `opaque`: (`hex color string` | `false`) Sets the color for selecting opaque features.
- `transparent`: (`hex color string` | `false`) Sets the color for selecting transparent features.

### Example

```
"highlight": {
    "hover": {
        "opaque": false
        "transparent": false
    },
    "selected": {
        "opaque": "#8296f0",
        "transparent": "#8296f082"
    }
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
- `subtitle`: (`string`) Additional subtitle.
- `description`: (`string`) Description for the website/application
- `linkUrl`: (`string`) URL to the web application.

<br>

```
"links": [
    {
        "imgUrl": "https://example.com/ExampleApp1.png",
        "title": "App1",
        "subtitle": "App1 Subtitle",
        "description": "First Application",
        "linkUrl": "https://app1.example.com/"
    },
    {
        "imgUrl": "https://example.com/ExampleApp2.png",
        "title": "App2",
        "subtitle": "App2 Subtitle",
        "description": "Second Application",
        "linkUrl": "https://app2.example.com/"
    }
]
```

<br>

---

## Deletion List Suffix

**Required:** ❌

Sets the suffix for the deletion list filenames.

<br>

---

## Default GLTF URL

**Required:** ❌

If this is set, users can place a default gltf object in the scene (`Model menu` -> `Add content`).

```
"defaultGltfUrl": "https://example.com/Block.glb"
```

<br>

---

## Datetime

**Required:** ❌

Sets the scene's datetime accordingly. A ISO-8601 string is necessary. If no datetime is set, the current date at 12 o'clock is used.

**Example**:

```
    "datetime": {
        "iso8601": "2025-07-01T10:00:00Z"
    }
```

<br>

---

## WMS List URL

**Required:** ❌

If this is set, the list of WMS services will get queried during startup which enables adding WMS content to the scene. The WMS list has to have the following shape (.txt).

### WMSList.txt

```
WMS-Name 1; https://example.de/url/to/my/WMS1/guest
WMS-Name 2; https://example.de/url/to/my/WMS2/guest
```

**Example**:

Set `resolve` to `false`, otherwise the list will get resolved before reaching the WMS component.

```
"wmsListUrl": {
    "url": "https://example.com/WMSList.txt",
    "resolve": false
},
```

<br>

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
- `url`: (`string`) Service URL
- `layers`: (`string`) Layer ID/name
- `parameters`: (`object`) Additional parameters (format, transparency)
- `enablePickFeatures`: (`boolean`)
- `tileWidth`: (`number`)
- `tileHeight`: (`number`)
- `minimumLevel`: (`number`)
- `maximumLevel`: (`number`)
- `crs`: (`string`) CRS notation for WMS spec >= 1.3.0, e.g. `"EPSG:25832"`
- `srs`: (`string`) SRS notation for WMS spec 1.1.0 or 1.1.1, e.g. `"EPSG:25832"`
- `credit`: (`string`) HTML string for attribution

### Properties of `"WebMapTileServiceImageryProvider"`:

- `type`: `"WebMapTileServiceImageryProvider"`
- `url`: (`string`) URL with placeholders
- `layer`: (`string`) The layer name for WMTS requests.
- `style`: (`string`)The style name for WMTS requests.
- `tileMatrixSetID`: (`string`) The identifier of the TileMatrixSet to use for WMTS requests., e.g. "WEBMERCATOR"
- `tileWidth`: (`number`)
- `tileHeight`: (`number`)
- `minimumLevel`: (`number`)
- `maximumLevel`: (`number`)
- `tileMatrixLabels`: (`array` of `string`)
- `credit`: (`string`) HTML string for attribution
- `subdomains`: (`string` or `array` of `string`)

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
                "tileWidth": 256,
                "tileHeight": 256,
                "minimumLevel": 0,
                "maximumLevel": 20,
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
                "format": "image/jpeg",
                "layer": "",
                "style": "default",
                "tileMatrixSetID": "WEBMERCATOR",
                "tileWidth": 256,
                "tileHeight": 256,
                "minimumLevel": 0,
                "maximumLevel": 18,
                "tileMatrixLabels": [],
                "credit": "Tiled Webmap: <a style='color: deepskyblue; text-decoration: underline;' href='https://example.com/tiled_webmap/metadata'>Example.com</a>",
                "subdomains": []
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
- `creation`: (`"EllipsoidTerrainProvider"` or `"CesiumTerrainProvider"`)

### Properties of `"EllipsoidTerrainProvider"`:

- `show`: (`boolean`) Whether the terrain is displayed.
- `iconUrl`: (`string`) Path to the icon for the terrain.
- `toolTip`: (`string`) Tooltip text for the terrain option.
- `creation`: `"EllipsoidTerrainProvider"`

### Properties of `"CesiumTerrainProvider"`:

- `show`: (`boolean`) Whether the terrain is displayed.
- `url`: (`string`) Path or URL to the terrain data/service.
- `iconUrl`: (`string`) Path to the icon for the terrain.
- `toolTip`: (`string`) Tooltip text for the terrain option.
- `requestVertexNormals`: (`boolean`) Request vertex normals from the terrain provider.
- `requestWaterMask`: (`boolean`) Request the water mask layer.
- `requestMetadata`: (`boolean`) Request additional metadata.
- `credit`: (`string`) HTML attribution string.
- `creation`: `"CesiumTerrainProvider"`

### Example

#### EllipsoidTerrainProvider

```
"terrain": {
    "Example Ellipsoid": {
            "show": true,
            "iconUrl": "./images/example_icon.png",
            "tooltip": "WGS84 Ellipsoid",
            "creation": "type": "EllipsoidTerrainProvider"
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
- `allowOpacityChange`: (`boolean`) Allow changes in opaqueness. Used while viewshedding.

### Properties of a 3D model (GLTF)

- `url`: (`string`) URL gltf/glb model
- `position`: (array<`number`>) Position array (length = 3) in project coordinates
- `hpr`: (array<`number`>) Rotation array (HeadingPitchRoll) in degrees
- `scale`: (array<`number`>) Scale (length = 3) along each axis
- `type`: `"model"`
- `table`: (`boolean`) Adds layer to layer overview.
- `allowOpacityChange`: (`boolean`) Allow changes in opaqueness. Used while viewshedding.

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
            "attributes": [
                {
                    "key": "UUID"
                },
                {
                    "key": "Name",
                    "label": "layers:threeD.building.format.Name"
                }
            ]
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

### Mesh

To populate the mesh folder in the model content, put layer configuration here.

**Required:** ❌

### Properties of a mesh

Extruded 2D Layers are handled as 3D inside the application.

- `url`: (`string`) URL for the GeoJSON WFS service.
- `target`: (`string`) mainly used for internal procedures.
- `show`: (`boolean`)
- `credit`: (`string`)
- `tags`: (`array` of `string`) used for internal filtering (e.g. `stylable`, `internalOnly`)

```
"mesh": {
    "layers:mesh.name": {
        "url": "https://example.com/tileset.json",
        "target": "mesh",
        "show": false,
        "credit": "My Example Mesh></a>",
        "tags": ["abc"]
    }
},
```

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

### Single Models

`.glb`-models can be loaded when `type` is set to `model`. `Position` has to be in project coordinates.

```
"threeD": {
    "Christmas Tree": {
            "url": "https://example.com/christmas_tree.glb",
            "show": true,
            "position": [7, 61, 100],
            "hpr": [0, 0, 0],
            "scale": [1, 1, 1],
            "table": true,
            "shadows": "ENABLED",
            "tags": ["myTreeModel"],
            "type": "model"
        },
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

2D dataset configuration. Each key is equal to the layer name. Valid configuration parameters depend on the actual 2D entity type (e.g. `polygon`, `polyline`, `point`). Additionally, you can declare vector-tile datasets, beware that you have to set the type to `vector-tile`.

### Properties of a 2D dataset (e.g. `"Example File"`)

- `url`: (`string`) URL to the GeoJSON or vector file.
- `target`: (`string`) Target or data category (e.g. `"file"`).
- `show`: (`boolean`) Should the layer be initially visible?
- `table`: (`boolean`) Should data be shown in a table?
- `markerSymbol`: (`string`) Text inside Cesium's standard point marker. Acts as a fallback, if the billboard can not be generated.
- `markerSize`: (`number`) Sets the marker size. Not used for billboard.
- `billboardSource`: (`string`) URL referencing an image file. If this is set, the point entity is overwritten by the billboard.
- `billboardScale`: (`number`) Billboard scaling factor.
- `billboardVerticalOrigin`: (`enum`) Vertical location of an origin relative to an object. Possible values: `BOTTOM`, `CENTER`, `TOP`
- `height`: (`number`) Height above reference (see heightReference)
- `heightReference`: (`enum`) Height reference used for `height`. Possible values `NONE`, `CLAMP_TO_GROUND`, `RELATIVE_TO_GROUND`. Default `NONE`.
- `deletable`: (`boolean`) Is the dataset hidable by the user?
- `selectable`: (`boolean`) Is the entity selectable?
- `color`: (`string`) Color value (e.g. `"rgba(0,0,140,0.7)"`).
- `clampToGround`: (`boolean`) Should features be clamped to the ground?
- `credit`: (`string`) HTML attribution string.
- `tableAttributes`: (`object`) Object consisting of key-label pairs. `Key` has to reference the actual entity attribute name. `Label` is used for displaying in the infobox (you can use an i18n translation token as well).

- `type`: (`string`) Only used to differentiate between geometries and labels. Either `geojson` or `label`.
- `style`: (`object`) Style to apply to the label dataset. All supported key-value pairs are listed in the example below.

```
    "2D Example": {
        "url": "https://example.com/example.geojson",
        "target": "2d",
        "show": true,
        "table": true,
        "markerSymbol": "?",
        "billboardSource": "./images/myBillboard.svg",
        "billboardScale": 0.05,
        "billboardVerticalOrigin": "TOP",
        "height": 30,
        "heightReference": "RELATIVE_TO_GROUND",
        "markerSize": 25,
        "selectable": true,
        "deletable": false,
        "clampToGround": true,
        "type": "geojson",
        "tableAttributes": {
            "Place": "Place",
            "Height": "billboard:height"
        }
    },
    "Label": {
        "url": "https://example.com/labels.geojson",
        "show": true,
        "table": true,
        "type": "label",
        "style": {
            "labelText": "__labeltext__",
            "scaleByDistance": {
                "near": 5000,
                "nearValue": 1.0,
                "far": 25000,
                "farValue": 0.5
            },
            "distanceDisplayCondition": {
                "near": 1500,
                "far": 25000
            },
            "heightOffset": 70,
            "anchorLineEnabled": false,
            "labelColor": "#FFFFFF",
            "labelStyle": "FILL_AND_OUTLINE",
            "labelOutlineWidth": 2,
            "labelOutlineColor": "#000000",
            "disableDepthTestDistance": "0"
        }
    }

```

  <br>
  <br>

---

## Particle Systems

**Required:** ❌

You can define particle systems inside the config. Particle system layers will not appear in the model menu. You can instead bind particle systems to registered features (Cesium3DTileFeature and Geojson3D. UUID needed). Only ConeEmitters are supported at the moment. The number after `ConeEmitter` represents the angle of the cone in radians.

Configuration parameters are almost fully derived from [Cesium.js](https://cesium.com/learn/cesiumjs/ref-doc/ParticleSystem.html?classFilter=particle)

**Example**:

```
 "particleSystems": [
        {
            "targetId": "R1402_K123",
            "coordinates": [343958.21, 5609938.04, 54.8], //coordinates in project coordinate system
            "imageSize": [20, 20],
            "startScale": 50,
            "endScale": 500,
            "startColor": [1, 1, 1, 1],
            "endColor": [1, 0, 0, 0],
            "emitter": ["ConeEmitter", 50],
            "direction": [0, 5, 0],
            "forceFactor": 2,
            "emissionRate": 10,
            "speed": 0.2,
            "particleLife": 5
        },
        {
            "targetId": "R1402_R5598",
            "coordinates": [369691.56, 5749842.77, 101],
            "imagePath": "./images/smoke2.png",
            "imageSize": [20, 20],
            "startScale": 50,
            "endScale": 50,
            "startColor": [1, 1, 1, 1],
            "endColor": [1, 0, 0, 0],
            "emitter": ["ConeEmitter", 50],
            "direction": [0, 5, 0],
            "forceFactor": 2,
            "emissionRate": 10,
            "speed": 0.2,
            "particleLife": 5
        }
    ]

```

  <br>
  <br>
---

## styling

**Required:** ❌

Different styles with configuration for icons, active state, and background changes. By default, three different styles exist. For more information on custom styling, see [CustomStyling](./CustomStyling.md)

#### Neutral

This style applies a white custom shader to all layers with tags `stylable` and a green custom shader to all layers with tags `vegetation`.

#### Height

This style applies a declarative styling to all layers with tags `stylable` where the color depends on the attribute `Hoehe`.

#### Functional

This style applies a declarative styling to all layers with tags `stylable` where the color depends on the attribute `GFK`. This refers to `Gebäudefunktion` from `ALKIS NRW Objektartenkatalog (ALKIS-OK NRW)`.

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
---

## excavationPit

**Required** ❌

Declare geojson urls so that excavation pits are loaded during startup.

### Example

```
"excavationPit": [
        "https://website.com/path/to/my/exPit1.geojson",
        "https://website.com/path/to/my/exPit2.geojson",
    ]
```

<br>
<br>

---

## waterArea

**Required** ❌

Declare geojson urls so that water areas are loaded during startup.

### Example

```
"waterArea": [
        "https://website.com/path/to/my/waterArea1.geojson",
        "https://website.com/path/to/my/waterArea2.geojson",
    ]
```

## waterRectangle

**Required** ❌

Declare a rectangle in WGS84 (EPSG: 4326) coordinates (lower-left and upper-right corner) for the water analysis tool.

### Example

```
"waterLevelRectangle": [ 8, 51.5, 8.21, 52.7 ]
```

## modalWindow

**Required** ❌

Generates a modal window during startup.

- `html`: (`string`): HTML content to insert into the modal window.
- `width`: (`number`, `value with px or %`): width of the modal window
- `height`: (`number`, `value with px or %`): height of the modal window

### Example

```
"modalWindow": {
        "html": "<div><h1>Lorem Ipsum</h1><p>Eiusmod quis nisi sint nulla qui.</p></div>",
        "height": "700px",
        "width": 900
    }
```

## Annotations

**Required** ❌

Reads a geojson file from the url and places annotations into the viewer.

- `url`: (`string`): url of the adress link
- `name`: (`string`): name of the annotation (shown when annotation window is closed)
- `linkText`: (`string`): text representation of the adress link (shown when the annotation window is opened)
- `textColor`: (hex color as `string`, e.g. `#FF0000`): color of the annotation label (when annotation window is closed)
- `backgroundColor`: (`string`): background color of the annotation badge (shown when the annotation window is closed)

## Urban Pulse

Configures sensor vizualization.

**Required** ❌

```
"urbanPulse": {
        "url": "https://urbanpulse.example.com/getData",
        "icons": {
            "byType": {
                "temperature": "./images/common/sensor-temperature.png",
                "humidity": "./images/common/sensor-humidity.png",
                "irradiation": "./images/common/sensor-irradiation.png",
                "pressure": "./images/common/sensor-pressure.png",
                "rain": "./images/common/sensor-rain.png",
                "windSpeedAvg": "./images/common/sensor-windSpeed.png",
                "windDirectionAvg": "./images/common/sensor-windDirection.png"
            },
            "byState": {
                "online": "./images/common/sensor-weather-online.svg",
                "partial": "./images/common/sensor-weather-partial.svg",
                "offline": "./images/common/sensor-weather-offline.svg"
            }
        },
        "renderSettings": {
            "offset": 32,
            "width": 48,
            "height": 48,
            "iconSize": 0.75,
            "backgroundColor": "#00000060",
            "pinTailLength": 32
        },
        "statusTimeThresholdInSeconds": 900,
        "pctSensorWarningThreshold": 0.2,
        "pollingRateInSeconds": 60,
        "deviceTypeMapping": {
            "meteoHelix": [
                "MeteoHelix_IoT_Pro_Gen2",
                "MeteoHelix_IoT_Pro_Gen2-2",
                "meteoHelix",
                "atmo"
            ],
            "meteoWind": [
                "MeteoWind_IoT_Pro_Gen2",
                "MeteoWind_IoT_Pro_Gen2-2",
                "meteoWind"
            ]
        },
        "sensorValueMapping": {
            "pressure": {
                "factor": 0.01,
                "offset": 0,
                "unit": "hPa"
            }
        }
    },
```
