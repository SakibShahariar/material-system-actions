# Material System Actions

A customizable GNOME Shell session and power menu with **15 layouts**, keyboard navigation, custom commands and Matugen colors.

**GNOME Shell:** 45–51 (declared compatibility range; not every version has been live-tested). Preferences use GTK4/libadwaita.

## Features

- 15 layouts, from compact lists and docks to radial and dashboard designs.
- Configurable system actions and trusted custom commands.
- Keyboard shortcuts, accessible navigation and focus controls.
- Matugen colors, scaling, transparency and backdrop dimming.
- Safer power actions with confirmations and suspend-inhibitor checks.
- Session D-Bus controls for panel buttons and launchers.

## Layouts

<!-- BEGIN GENERATED LAYOUT CATALOG -->
| Layout | Description | Recommended use | Shared status header | Preview position |
|---|---|---|---|---|
| `card` | Header with pill buttons | Balanced everyday controls | No | `center` |
| `list` | Keyboard-first list with key badges | Compact, keyboard-led navigation | No | `center` |
| `split` | Large clock with circular dock | Clock-focused presentation with prominent controls | No | `center` |
| `grid` | Numbered icon tiles | Fast visual selection and numeric shortcuts | No | `center` |
| `radial` | Icons arranged around a clock hub | Centered, clock-focused presentation | No | `center` |
| `bento` | Asymmetric dashboard | Dashboard-style arrangement of actions | No | `center` |
| `tui` | Terminal-inspired box drawing | Text-like, keyboard-oriented presentation | No | `center` |
| `dock` | Vertical edge dock | Edge-aligned, space-efficient controls | Yes | `left-edge` |
| `tiles` | Square tile row | Horizontal tile controls | Yes | `center` |
| `halo` | Dot-ring hold-to-confirm interaction | Hold-to-confirm visual interaction | Yes | `center` |
| `capsule` | Rounded pill rows | Grouped, touch-friendly action rows | No | `center` |
| `circles` | Floating stack of circular actions | Compact floating controls | Yes | `center` |
| `avatar` | Large avatar with action list | User-focused header with a clear action list | No | `center` |
| `pill` | Compact status area with icons | Minimal, compact action strip | No | `center` |
| `banner` | Wallpaper-style banner with actions | Wide presentation with prominent action buttons | No | `center` |
<!-- END GENERATED LAYOUT CATALOG -->

Choose a layout in **Preferences → Style**. Preview lets you inspect it without changing the saved layout or executing actions.

## Install

Build and install the ZIP:

```bash
./scripts/package.sh
gnome-extensions install --force dist/material-system-actions@sakib.dev.shell-extension.zip
gnome-extensions enable material-system-actions@sakib.dev
```

Open Preferences from the GNOME Extensions app. If the extension is not detected, log out and back in.

## Configure and custom actions

In **Preferences**, choose a layout, reorder actions, set the global shortcut (default **Ctrl+Alt+End**), and adjust appearance. Custom commands are configured under **Custom actions → Edit JSON**:

```json
[
  {
    "id": "vpn-toggle",
    "label": "Toggle VPN",
    "icon": "network-vpn-symbolic",
    "cmd": ["nmcli", "connection", "up", "Work VPN"],
    "confirm": true
  }
]
```

Commands run directly as argument arrays, **not through a shell**. They run with your user permissions and are not sandboxed. Only add commands you trust; confirmation is not a security boundary.

## Power actions

Logout, reboot, shutdown and hibernate require confirmation. Before suspend, the extension checks systemd-logind sleep inhibitors and lets you cancel or force suspend. Hibernate and Switch User appear only when supported by the current system/session.

This is a session and power menu, **not a replacement for your desktop's lock screen or security mechanisms**.

## Matugen

Matugen CSS is read when the popup opens. The extension checks `MATUGEN_COLORS_PATH`, `~/.config/matugen/matugen-colors.css`, then `~/.config/ags/colors.css`, with a built-in fallback. Reopen the popup to load updated colors.

## Panel and launcher integration

Control the popup over the user's session D-Bus:

- **Bus:** `org.gnome.Shell.Extensions.MaterialSystemActions`
- **Object:** `/org/gnome/Shell/Extensions/MaterialSystemActions`
- **Methods:** `Open`, `Close`, `Toggle`, `Preview(s style)`, and read-only `GetStatus() → (ssb)`
- **GetStatus result:** `(version, active-layout, preview)`

Use `MaterialSystemActions.GetStatus` to inspect the active layout and preview state. Use `MaterialSystemActions.Preview` to request a temporary preview. To open a temporary preview, pass the layout ID to `Preview`. Preview does not execute actions.

For example, open the menu:

```bash
gdbus call --session --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Open
```

The extension must be enabled. D-Bus methods control the popup; they do not execute power actions or bypass confirmation dialogs. Processes with access to your session bus can invoke them.

## Documentation

- [Development and live GNOME testing](DEVELOPING.md)
- [Coverage baseline and exclusions](docs/maintenance/coverage-baseline.md)
- [Issues and feature requests](https://github.com/SakibShahariar/material-system-actions/issues)

## License

[GPL-2.0-or-later](LICENSE).
