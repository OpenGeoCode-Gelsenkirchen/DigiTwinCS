---
title: CSS Styling
group: Documents
category: Guides
---

# CSS Styling

You can modify `theme.module.css` to change typography, colors, and key UI appearance.

⚠️ **Important:** Do not remove or rename variables in the `:export` section — they are referenced in the application code. You may change their values by editing the corresponding `--variable` definitions above.

## Theme Color Variables

| Variable                        | Value                                   | Preview                                                                                                                                      | Purpose/Notes                          |
| ------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `--grey-900`                    | `#222222`                               | <span style="display:inline-block;width:16px;height:16px;background:#222222;border:1px solid #ccc;border-radius:3px;"></span>                | Darkest grey                           |
| `--grey-800`                    | `#484848`                               | <span style="display:inline-block;width:16px;height:16px;background:#484848;border:1px solid #ccc;border-radius:3px;"></span>                | Dark grey (primary background)         |
| `--grey-800-alpha30`            | `#4848484d`                             | <span style="display:inline-block;width:16px;height:16px;background:rgba(72,72,72,0.3);border:1px solid #ccc;border-radius:3px;"></span>     | Same as `--grey-800` with 30% alpha    |
| `--grey-700`                    | `#686868`                               | <span style="display:inline-block;width:16px;height:16px;background:#686868;border:1px solid #ccc;border-radius:3px;"></span>                | Secondary grey                         |
| `--grey-600`                    | `#888888`                               | <span style="display:inline-block;width:16px;height:16px;background:#888888;border:1px solid #ccc;border-radius:3px;"></span>                | Tertiary grey                          |
| `--grey-500`                    | `#999999`                               | <span style="display:inline-block;width:16px;height:16px;background:#999999;border:1px solid #ccc;border-radius:3px;"></span>                | Light grey                             |
| `--primary-color-highlight`     | `#87ceeb`                               | <span style="display:inline-block;width:16px;height:16px;background:#87ceeb;border:1px solid #ccc;border-radius:3px;"></span>                | Highlight color (sky blue)             |
| `--primary-color-active`        | `#87ceeb`                               | <span style="display:inline-block;width:16px;height:16px;background:#87ceeb;border:1px solid #ccc;border-radius:3px;"></span>                | Active element color                   |
| `--primary-color-active-border` | `#ffb01e`                               | <span style="display:inline-block;width:16px;height:16px;background:#ffb01e;border:1px solid #ccc;border-radius:3px;"></span>                | Border for active elements             |
| `--text-color-primary`          | `#ffffff`                               | <span style="display:inline-block;width:16px;height:16px;background:#ffffff;border:1px solid #ccc;border-radius:3px;"></span>                | Primary text color                     |
| `--text-color-warning`          | `#5b5400`                               | <span style="display:inline-block;width:16px;height:16px;background:#5b5400;border:1px solid #ccc;border-radius:3px;"></span>                | Text in warning state                  |
| `--text-color-error`            | `#5f1d16`                               | <span style="display:inline-block;width:16px;height:16px;background:#5f1d16;border:1px solid #ccc;border-radius:3px;"></span>                | Text in error state                    |
| `--warning-bg`                  | `#fef6d5bb`                             | <span style="display:inline-block;width:16px;height:16px;background:rgba(254,246,213,0.73);border:1px solid #ccc;border-radius:3px;"></span> | Warning background (with transparency) |
| `--warning`                     | `#ffeca0`                               | <span style="display:inline-block;width:16px;height:16px;background:#ffeca0;border:1px solid #ccc;border-radius:3px;"></span>                | Solid warning color                    |
| `--warning-alpha`               | `#ffeca0bb`                             | <span style="display:inline-block;width:16px;height:16px;background:rgba(255,236,160,0.73);border:1px solid #ccc;border-radius:3px;"></span> | Warning color with alpha               |
| `--error-bg`                    | `#eed9d590`                             | <span style="display:inline-block;width:16px;height:16px;background:rgba(238,217,213,0.56);border:1px solid #ccc;border-radius:3px;"></span> | Error background (with transparency)   |
| `--error`                       | `#d29c94`                               | <span style="display:inline-block;width:16px;height:16px;background:#d29c94;border:1px solid #ccc;border-radius:3px;"></span>                | Solid error color                      |
| `--error-alpha`                 | `#d29c94bb`                             | <span style="display:inline-block;width:16px;height:16px;background:rgba(210,156,148,0.73);border:1px solid #ccc;border-radius:3px;"></span> | Error color with alpha                 |
| `--color-primary`               | `var(--grey-800)` → `#484848`           | <span style="display:inline-block;width:16px;height:16px;background:#484848;border:1px solid #ccc;border-radius:3px;"></span>                | Primary UI color                       |
| `--color-primary-alpha30`       | `var(--grey-800-alpha30)` → `#4848484d` | <span style="display:inline-block;width:16px;height:16px;background:rgba(72,72,72,0.3);border:1px solid #ccc;border-radius:3px;"></span>     | Transparent primary                    |
| `--color-secondary`             | `var(--grey-700)` → `#686868`           | <span style="display:inline-block;width:16px;height:16px;background:#686868;border:1px solid #ccc;border-radius:3px;"></span>                | Secondary UI color                     |
| `--color-tertiary`              | `var(--grey-600)` → `#888888`           | <span style="display:inline-block;width:16px;height:16px;background:#888888;border:1px solid #ccc;border-radius:3px;"></span>                | Tertiary UI color                      |
| `--color-quaternary`            | `var(--grey-900)` → `#222222`           | <span style="display:inline-block;width:16px;height:16px;background:#222222;border:1px solid #ccc;border-radius:3px;"></span>                | Quaternary UI color                    |
| `--color-quinary`               | `var(--grey-500)` → `#999999`           | <span style="display:inline-block;width:16px;height:16px;background:#999999;border:1px solid #ccc;border-radius:3px;"></span>                | Quinary UI color                       |

## Typography Variables

| Variable                | Value                                      | Purpose                  |
| ----------------------- | ------------------------------------------ | ------------------------ |
| `--font-family-primary` | `'Lato', sans-serif`                       | Default application font |
| `--font-size-base`      | `clamp(0.8rem, 0.8rem + 0.4vw, 2rem)`      | Base font size           |
| `--font-size-secondary` | `clamp(0.65rem, 0.65rem + 0.25vw, 1.6rem)` | Secondary font size      |
