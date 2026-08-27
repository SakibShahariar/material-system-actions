# Material System Actions

GNOME Shell extension — power/session menu with 15 swappable styles, Material You themed via Matugen.

Ported from `prototype/system_actions_all.py` (GTK4/Adw gallery, 1610 lines, 15 styles) to `St`/`Clutter` for Shell 45-51.

## Styles (generic names, no tool/dotfiles reference)

| Generic (preferred) | Was | Description |
|---|---|---|
| `card` | `card` | header + pill buttons |
| `list` | `rofi` | keyboard-first list, key badges |
| `split` | `quickshell` | big clock + circular dock |
| `grid` | `grid` | numbered icon tiles |
| `radial` | `radial` | icons around clock hub |
| `bento` | `bento` | asymmetric dashboard |
| `tui` | `tui` | whiptail box-drawing |
| `dock` | `dock` | edge vertical dock |
| `tiles` | `wlogout` | square tile row |
| `halo` | `dots` | dot-ring hold-to-confirm |
| `capsule` | `end4` | rounded pill rows |
| `circles` | `circles` | floating stack |
| `avatar` | `avatar` | big avatar + list |
| `pill` | `pill` | compact status + icons |
| `banner` | `banner` | wallpaper + icons |

Old names (`rofi`, `quickshell`, `wlogout`, `dots`, `end4`) still work as aliases in `lib/layouts/registry.js:1` and `prefs.js:1` migrates them.

See `lib/layouts/registry.js:1` for mapping.

## Install (dev)

```bash
glib-compile-schemas schemas/
# copy to extensions dir (Wayland needs logout to rescan)
cp -r extension.js metadata.json prefs.js stylesheet.css lib schemas ~/.local/share/gnome-shell/extensions/material-system-actions@sakib.dev/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/material-system-actions@sakib.dev/schemas/
gnome-extensions enable material-system-actions@sakib.dev
# toggle: Ctrl+Alt+End (default)
```

## Prototype

```bash
python3 prototype/system_actions_all.py --list
python3 prototype/system_actions_all.py card
python3 prototype/system_actions_all.py --style=list  # was rofi
```

Colors via `var(--primary_container)` etc. from `~/.zen/.../colors.css` (GTK>=4.16 `var()`), fallback in `lib/theme.js:15`.

## Git

`git push` after each check (per workflow).

## License

GPL-2.0-or-later
