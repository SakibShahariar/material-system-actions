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

## Configure actions

Open Preferences → **System actions** to hide actions you do not use and move actions up or down. Changes apply the next time the popup opens. Letter shortcuts remain attached to their actions; number shortcuts follow the configured order.

Combined-list layouts follow the configured order. Layouts that intentionally separate session actions from power actions keep those two sections, while respecting the configured order within each section.

## Custom actions

Open Preferences → **Custom actions** and edit the JSON array. Example:

```json
[
  {
    "id": "custom-vpn-toggle",
    "label": "Toggle VPN",
    "icon": "network-vpn-symbolic",
    "cmd": ["nmcli", "connection", "up", "Work VPN"],
    "confirm": false,
    "key": "v"
  },
  {
    "id": "custom-backup",
    "label": "Run backup",
    "icon": "document-save-symbolic",
    "cmd": ["/home/user/bin/backup"],
    "confirm": true
  }
]
```

**Security:** custom commands execute with your user permissions. They are launched as argument arrays directly, never through a shell; shell syntax, pipes, and variable expansion are not interpreted. Treat this setting like executable code and only add commands you trust. `confirm` defaults to `true`; set it to `false` only for actions that are safe to run immediately. Use unique `custom-*` IDs and unused single-letter shortcuts.

## Action confirmation

Log out, reboot, and shutdown use the same confirmation dialog in every layout. In Halo, completing the hold gesture opens that dialog; the hold itself does not execute a destructive action. Cancel or press Escape to return without running the command.

## Install (dev)

```bash
# Compile the extension's settings schema.
glib-compile-schemas schemas/
# Symlink so source edits are live without copying files.
ln -sfn "$(pwd)" ~/.local/share/gnome-shell/extensions/material-system-actions@sakib.dev
# The directory name must match the UUID in metadata.json.
gnome-extensions enable material-system-actions@sakib.dev
# toggle: Ctrl+Alt+End (default)
# after any code change: gnome-extensions disable material-system-actions@sakib.dev; gnome-extensions enable material-system-actions@sakib.dev
# Wayland: log out/in once to pick up new files
```

## Package

```bash
./scripts/package.sh
# output: dist/material-system-actions@sakib.dev.shell-extension.zip
```

The package command includes `lib/` and the compiled GSettings schema, while excluding Git metadata. Theme colors are read when the popup is created, so changes appear the next time you open it. The file lookup order is `MATUGEN_COLORS_PATH` (if set), `~/.config/matugen/matugen-colors.css`, then `~/.config/ags/colors.css`. If no usable file is found, the extension uses its built-in fallback palette.

## Prototype

```bash
python3 prototype/system_actions_all.py --list
python3 prototype/system_actions_all.py card
python3 prototype/system_actions_all.py --style=list  # was rofi
```

The popup reads Matugen CSS color roles from the paths listed above; missing roles use the built-in fallback palette in `lib/theme.js`.

## Git

`git push` after each check (per workflow).

## License

GPL-2.0-or-later
