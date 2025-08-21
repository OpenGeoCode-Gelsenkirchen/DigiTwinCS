# DigiTwinCS

Create customizable **3D city model applications** for the browser using only configuration files.  
This project extends [Cesium.js](https://github.com/CesiumGS/cesium) with an easy-to-use setup that lets you define data, appearance, and functionality primarily through config files, HTML, and CSS — _no backend required_.

A full working example can be found [here](https://geo.gelsenkirchen.de/3dstadtmodell/standardmodell/index.html)

> **Requires NPM version 10.9.0 or higher.**

---

# Getting started

This application is available as a GitHub repository.  
_The option to download prebuilt source files will be available soon._

For detailed technical documentation and API reference, see the [`docs`](./docs/) directory (generated with Typedoc).

## Installation

After cloning the repository, open a terminal and change into the project directory and execute the following command. This will install all necessary packages under `node_modules`.

```
npm i
```

This project uses vite as a bundler and http server for development. Vite's behavior can be configured via vite.config.js.

## NPM Commands

### Development Server

```
npm run dev
```

Starts a server running the application in development mode (hot modules replacement, faster rebuilds, etc.). In your console output, you can see the actual url it's running on (e.g. localhost:5173)

---

### Production Server

```
npm run preview
```

Starts a server running the application in production mode (produciton-optimized). In your console output, you can see the actual url it's running on (e.g. localhost:5174)

---

### Build

```
npm run build --mode ENVIRONMENT_NAME
```

Builds and bundles all source files into the `dist` output directory. These files match the prebuilt source files from the github repo and can be served by a http server. `ENVIRONMENT_NAME` should be replaced by the actual environment name one wants to build. If `--mode` is not used, vite will look for `.env`, `.env.production`, `.env.local` and `.env.production.local` in that specific order.

---

### Documentation

```
npx typedoc
```

Builds the documentation files and puts them in the `documents` folder.

---

```
npm run docs
```

Serves the generated documentation from the `docs` folder.

## Configuration

For detailed usage, check the `docs` folder.

## Important Notes

- **Configurable vs. Hard-Coded Parts**

    - There are currently **two components** which cannot be configured via config files and must be changed directly in the code.
    - waterLevel.js Line 114/115

- **Prebuilt Files Coming Soon**

    - Prebuilt files are **not available yet** but will be offered in the future.  
      For now, please clone and build from the repository.

- **Legacy/ Code**

    - Some source files are complex, hard to understand, or in need of cleanup (specifically the styling, loading and application logic). Those should get rewritten in the future.

---
