# Material System Actions

A customizable GNOME Shell session and power menu with **15 layouts**, keyboard controls, custom commands and Matugen colors.

Designed for GNOME Shell **45–51**. The extension uses GNOME Shell's native UI; Preferences use GTK4/libadwaita. The declared version range is not a claim that every release has been live-tested.

## Features

- **15 switchable layouts** — from compact lists and docks to radial, bento and dashboard-style designs.
- **Configurable actions** — show, hide and reorder system or custom actions.
- **Keyboard navigation** — global shortcut, action shortcuts, focus controls and accessible labels.
- **Custom commands** — define trusted commands with optional confirmation.
- **Safer power actions** — confirmations for destructive actions and logind sleep-inhibitor checks before suspend.
- **Smart availability** — show Hibernate and Switch User only when the required system/session support is available.
- **Appearance** — scale, transparency, backdrop dimming, status header and Matugen color roles.
- **Integration** — open, close or toggle the same menu from a panel button or launcher over the session D-Bus.

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

Choose a layout in **Preferences → Style**. Use **Preview** to inspect it without changing the saved default, or **Apply** to select it. Preview mode never executes actions.

## Install

Build and install the extension ZIP:

```bash
./scripts/package.sh

gnome-extensions install --force dist/material-system-actions@sakib.dev.shell-extension.zip
gnome-extensions enable material-system-actions@sakib.dev
```

If GNOME does not detect the extension, log out and back in. Open its Preferences from the Extensions app or with your usual GNOME Extensions workflow.

For a development checkout, see [DEVELOPING.md](DEVELOPING.md).

## Configure

Open **Extensions → Material System Actions → Preferences**.

- **Style:** choose and preview one of the 15 layouts.
- **System actions:** show, hide and reorder built-in or custom actions.
- **Custom actions:** create commands using a validated JSON array.
- **Keyboard:** change the global toggle shortcut (default: **Ctrl+Alt+End**) and choose the initially focused action.
- **Appearance:** adjust UI scale, panel opacity, backdrop dimming and status-header density.
- **Reset:** restore selected preference groups or all settings to their defaults.

The extension follows GNOME's animation setting; disabling animations removes decorative transitions without changing keyboard or confirmation behavior.

## Custom actions

Add actions in **Preferences → Custom actions → Edit JSON**. Each action has a unique ID, label, symbolic icon name and command argument array.

```json
[
  {
    "id": "custom-vpn-toggle",
    "label": "Toggle VPN",
    "icon": "network-vpn-symbolic",
    "cmd": ["nmcli", "connection", "up", "Work VPN"],
    "confirm": true,
    "key": "v"
  }
]
```

Replace the example command with one available on your system. Commands are launched directly as argument arrays, **not through a shell**; pipes, redirection, globbing and variable expansion are not interpreted.

**Only add commands you trust.** They run with your user permissions and are not sandboxed. Confirmation is enabled by default, but it is not a security boundary.

## Safety and system actions

- Logout, reboot, shutdown and hibernate require confirmation.
- Before suspend, the extension checks systemd-logind sleep inhibitors and lets you cancel or explicitly force suspend.
- Hibernate is shown only when logind reports it as available.
- Switch User lists other users' existing local graphical sessions when logind can identify them; it does not create accounts or sessions.
- Optional integrations are best-effort. If logind cannot provide the relevant information, the related enhancement may be unavailable.

This is a session and power menu, **not a replacement for your desktop's security or session-locking mechanisms**.

## Matugen colors

The popup reads Matugen CSS roles when it opens. It checks:

1. `MATUGEN_COLORS_PATH`, when set
2. `~/.config/matugen/matugen-colors.css`
3. `~/.config/ags/colors.css`
4. Built-in fallback palette

A missing or unreadable CSS file does not prevent the menu from opening. Close and reopen the popup to load updated colors.

For optional diagnostics, set `MATERIAL_SYSTEM_ACTIONS_DEBUG=1` in GNOME Shell's environment before starting the session. Normal operation is quiet.

## Panel and launcher integration

Other GNOME components can control the same popup through the user's session D-Bus:

- **Bus name:** `org.gnome.Shell.Extensions.MaterialSystemActions`
- **Object path:** `/org/gnome/Shell/Extensions/MaterialSystemActions`
- **Methods:** `Open`, `Close`, `Toggle`, `Preview(s style)`, and read-only GetStatus() → (ssb)
- **GetStatus result:** `(version, active-layout, preview)`

Use `MaterialSystemActions.GetStatus` to inspect the active layout and preview state. Use `MaterialSystemActions.Preview` to request a temporary layout preview. To open a temporary preview, pass the layout ID to `Preview`. Preview mode does not execute actions.

For example, open the menu from a launcher:

```bash
gdbus call --session \
  --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Open
```

The receiving extension must be enabled. These methods control the popup; they do not execute power actions or bypass its confirmation dialogs. Any local process with access to your user session bus can invoke them.

## Development and testing

Run the source tests and packaging checks described in [DEVELOPING.md](DEVELOPING.md). CI covers Node-compatible modules, schema validation and archive contents. These checks do **not** replace live GNOME testing.

The live-session guide covers all 15 layouts, keyboard and Orca accessibility, D-Bus integration, power-action safeguards, Matugen fallback, packaging and environment-dependent checks. GNOME Shell compatibility and visual behavior must be verified in a real session.

## Documentation

- [Development and live GNOME testing](DEVELOPING.md)
- [Coverage baseline and exclusions](docs/maintenance/coverage-baseline.md)
- [Issues and feature requests](https://github.com/SakibShahariar/material-system-actions/issues)

## License

[GPL-2.0-or-later](LICENSE).
