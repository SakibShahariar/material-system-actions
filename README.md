# Material System Actions

GNOME Shell extension — power/session menu with 15 swappable styles, Material You themed via Matugen.

Ported from `prototype/system_actions_all.py` (GTK4/Adw gallery, 1610 lines, 15 styles) to `St`/`Clutter` for Shell 45-51.

## Styles

`card`, `rofi`, `quickshell`, `grid`, `radial`, `bento`, `tui`, `dock`, `wlogout`, `dots`, `end4`, `circles`, `avatar`, `pill`, `banner` — see `lib/layouts/registry.js:1`.

Currently `card` is implemented (`lib/layouts/card.js:1`); other 14 are stubs delegating to `card` (TODO).

## Install (dev)

```bash
glib-compile-schemas schemas/
gnome-extensions install --force .
# or link
ln -sf $PWD ~/.local/share/gnome-shell/extensions/material-system-actions@sakib.dev
# enable
gnome-extensions enable material-system-actions@sakib.dev
# toggle
# Ctrl+Alt+End (default, set in prefs)
```

## Prototype

```bash
python3 prototype/system_actions_all.py --list
python3 prototype/system_actions_all.py card
python3 prototype/system_actions_all.py --style=grid
```

Colors via `var(--primary_container)` etc. from `~/.zen/.../colors.css` (GTK>=4.16 `var()`), fallback in `lib/theme.js:15`.

## Git

`git push` after each check (per workflow).

## License

GPL-2.0-or-later
