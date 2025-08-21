---
title: PNG Creation with QGIS and GIMP
group: Documents
category: Guides
---

This guide shows how to generate georeferenced .png files (+ .pgw file) with QGIS. As of now, in contrast to vector files, raster files can receive shadows inside Cesium. Georeferenced .png files can be loaded through mixed layers into your 3d city model.

## 1. Export data from QGIS

To later make the background appear transparent, we need to swap colors in GIMP. Be careful that your background color doesn't match any other color in your data. Otherwise you would need to clip it manually in GIMP.

If you want to change the background color in QGIS, go to `settings`, then choose `map & legend` and set the background color accordingly.

![QGIS background color](../../images/PNGCreation_BackgroundColor.png)

Open all layers, style and reorganize them if necessary. Check if your project coordinate system is set to `EPSG:4326`. This is the native coordinate system for 2D data in Cesium.js.
![QGIS preview](../../images/PNGCreation_QGIS_EPSG.png)

Finally, export the map as an image via `Project` -> `Import/Export` -> `Export Map to Image...`.

![QGIS Export](../../images/PNGCreation_Export.png)

In the export menu you can define the output resolution and set the export extent to the map canvas. Don't overdo it with the resolution, due to loading times 100 to 200 dpi is advised.

![QGIS Export Options](../../images/PNGCreation_ExportOptions.png)

## 2. Make background transparent

Open GIMP and load the exported .png file. Then select `Colors` -> `Color to Alpha`. You can now pick a color value that should be represented as transparent. Tuning the transparency threshold can help broaden the applicable range.

![GIMP ColorToAlpha Selection](../../images/PNGCreation_ColorToAlpha.png)
![GIMP ColorToAlpha Settings](../../images/PNGCreation_ColorToAlpha_2.png)

After that overwrite the original png image.

![GIMP ColorToAlpha Export](../../images/PNGCreation_ColorToAlpha_Export.png)

You should now have a transformed .png and the original .pgw file (from QGIS), which then can be used inside the application.
