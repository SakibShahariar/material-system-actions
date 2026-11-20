# Layout readability audit

This is the repeatable checklist for text truncation, focus visibility, contrast, hit-target size, and transparency extremes across all 15 layouts. It was last performed on 2026-11-20 in GNOME Shell 51.1 (Wayland) using live geometry checks (AT-SPI), source review, and the fixes listed below. Numeric contrast and spoken Orca output were not instrumented; those remain manual items.

## How to repeat

For each layout id from `lib/layouts/metadata.js`:

```bash
gdbus call --session --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Preview <layout-id>
gsettings set org.gnome.shell.extensions.material-system-actions icon-scale 0.6
gsettings set org.gnome.shell.extensions.material-system-actions icon-scale 2.0
gsettings set org.gnome.shell.extensions.material-system-actions panel-opacity 0.2
gsettings set org.gnome.shell.extensions.material-system-actions panel-opacity 1.0
gsettings set org.gnome.desktop.interface text-scaling-factor 1.25
```

Check: action labels are not clipped, focus rings remain visible over destructive styling, hit targets stay usable, and low opacity does not make text unreadable. Restore the original values afterwards. Also verify with Orca and a high-contrast theme.

## Per-layout status

| Layout | Text truncation | Focus visibility | Contrast | Hit targets | Transparency | Notes / limitations |
|---|---|---|---|---|---|---|
| `card` | Fit at default scale | CSS focus ring over error tier | Theme tokens; not measured numerically | 84×42 px action buttons | Solid fallback when no blur provider | Fixed-width 520×438 card; very large text may clip |
| `list` | Names exposed to AT-SPI | CSS ring on text rows | Theme tokens | 200×32 px rows | Same | Letter-key hints present; large text not measured |
| `split` | Verified in live sessions | CSS ring | Theme tokens | Circular dock buttons | Same | Default layout; confirmation flows live-tested |
| `grid` | Wraps 6 tiles per row | CSS ring on tiles | Theme tokens | 76×96 px tiles | Same | Wrapping added so 7 actions fit; badges can be hidden |
| `radial` | Not measured | CSS ring | Theme tokens | Circular icons | Same | Live visual check not performed |
| `bento` | Not measured | CSS ring | Theme tokens | Mixed tiles | Same | Live visual check not performed |
| `tui` | `[key]` prefixes present | CSS selected row | Theme tokens | Compact rows | Same | Not visually inspected in this pass |
| `dock` | Compact status header measured | CSS ring on circles | Theme tokens | 44×44 px buttons | Same | Pinned left, vertically centered; 64 px panel |
| `tiles` | Not measured | CSS ring | Theme tokens | Square tiles | Same | Live visual check not performed |
| `halo` | Status text visible | CSS ring on center button | Error-tier ring | 80 px hold target | Same | Ring centered; hold progress dot class verified |
| `capsule` | Labels centered under icons | CSS ring | Theme tokens | 78×80 px destructive tiles | Same | Icon-in-badge centering fixed |
| `circles` | Not measured | CSS ring | Theme tokens | Circular icons | Same | Live visual check not performed |
| `avatar` | Centered icon + label | CSS ring | Theme tokens | 200×54 px rows | Same | Avatar is a cached circular PNG |
| `pill` | Centered icon row | CSS ring | Theme tokens | 44×44 px buttons | Same | Row centered with 12 px spacing |
| `banner` | Action labels fit | CSS ring | Theme tokens; banner contrast not measured | 38 px buttons | Same | Wallpaper center-cropped; actions centered |

## Fixes made during this audit

- Card action row constrained to the fixed card width (was clipped).
- Grid wraps onto centered rows so seven actions fit.
- Dock pinned left and vertically centered with centered 44 px icons.
- Halo ring wrapped in a center-aligned `St.Bin`.
- Capsule icon centered in its row badge; destructive tiles uniform.
- Pill action row centered with larger buttons.
- Avatar images rendered as circular cached PNGs and vertically centered.
- Banner action row centered; wallpaper center-cropped.

## Remaining limitations

- High-contrast themes and `text-scaling-factor` above 1.0 were not instrumented across all layouts.
- Numeric contrast ratios and Orca speech output were not captured; these need a manual pass.
- Radial, Bento, Tiles, Circles, and TUI were not visually inspected in this pass.
