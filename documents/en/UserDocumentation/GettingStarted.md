---
title: Getting Started
group: Documents
category: Guides
---

# Getting started

This application is available as a github repository or [prebuilt source files](https://repo.github.com/source). If you download the prebuilt source files or the zipped repository, you have to unzip them first.

If you are using the prebuilt source files, you can skip this part move directly to [Configuration](./Configuration.md). Using prebuilt source files does not allow for easy modifcations of source code.

## Installation

After cloning the repository, open a terminal and change into the project directory and execute the following command. This will install all necessary packages under `node_modules`.

```
npm i
```

This project uses vite as a bundler and http server for development. Vite's behavior can be configured via vite.config.js.

## NPM Commands

```
npm run dev
```

Starts a server running the application in development mode (hot modules replacement, faster rebuilds, etc.). In your console output, you can see the actual url it's running on (e.g. localhost:5173)

---

```
npm run preview
```

Starts a server running the application in production mode (produciton-optimized). In your console output, you can see the actual url it's running on (e.g. localhost:5174)

---

```
npm run build --mode ENVIRONMENT_NAME
```

Builds and bundles all source files into the `dist` output directory. These files match the prebuilt source files from the github repo and can be served by a http server. `ENVIRONMENT_NAME` should be replaced by the actual environment name one wants to build. If `--mode` is not used, vite will look for `.env`, `.env.production`, `.env.local` and `.env.production.local` in that specific order.

---

```
npx typedoc
```

Builds the documentation files and puts them in the `documents` folder.

---

```
npm run docs
```

Serve the built documentation files from `docs`.

---
