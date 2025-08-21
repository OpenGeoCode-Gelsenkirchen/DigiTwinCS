---
title: Building Environments
group: Documents
category: Guides
---

# Building Environments

Environment files (`.env.*`) allow for **conditional compilation** and are **required** for building this project.

---

## Available Environment Variables

| Variable                    | Description                                                                                           | Example Value                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------- |
| `VITE_LOCAL_PROJECT_PATH`   | Path to look for local project files (used if URL parameter `project` is given; otherwise: see below) | `src/projects/`               |
| `VITE_DEFAULT_PROJECT_FILE` | Default project file to load if **no** `project` is specified via the URL                             | `project_default.json`        |
| `VITE_LOCAL_PROJECT_FILES`  | Files to copy into the build:<br> - `*` = all <br> - or a comma-separated list (no spaces)            | `fileA.json,fileB.json` / `*` |
| `VITE_GLOBAL_PROJECT_FILES` | Global files to copy into the build:<br> - `*` = all <br> - or comma-separated list                   | `fileA.json,fileB.json` / `*` |

---

## How to Build with a Custom Environment

When building the project, specify the environment with the `--mode` flag:

Example with an environment file called `.env.development`.

```
npx vite build --mode development
```
