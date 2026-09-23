---
title: Building Measurements
group: Documents
category: Guides
---

# Building Measurements

This application offers two measurement tools (area, length) that allow to query another 3DTileset based on the UUID of the selected 3DTileFeature. For this to work, you need a UUID attribute for your 3DTileFeatures and a specific folder structure where every UUID has a separate folder with a tileset.json inside.

This documentation won't go into detail on how to write 3DTiles with a UUID attribute. For that please check the documentation of your 3DTiles writer.

The query URL for an area tileset is concatenated and resolves to:

`buildingAreaUrl` + `UUID` + `tileset.json`

Equally for length:

`buildingLengthUrl` + `UUID` + `tileset.json`

Both `buildingAreaUrl` and `buildingLengthUrl` can be set inside config files.
