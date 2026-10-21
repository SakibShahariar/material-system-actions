# Material System Actions

A GNOME Shell extension that provides one configurable **session and power sheet** for locking, logging out, suspending, rebooting, shutting down, and other actions. It has 15 switchable layouts and reads Material You color roles from a Matugen-generated CSS file.

Designed for GNOME Shell **45–51**. The extension is written for GNOME Shell's `St`/Clutter UI; its preferences use GTK4/libadwaita.

## Contents

- [Features](#features)
- [Layouts](#layouts)
- [Install](#install)
- [Configure](#configure)
- [Custom actions](#custom-actions)
- [Safety and confirmations](#safety-and-confirmations)
- [Matugen colors](#matugen-colors)
- [Panel and launcher integration](#panel-and-launcher-integration)
- [Development and testing](#development-and-testing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **15 layouts** with a common action model and configurable action visibility/order.
- **Keyboard access:** configurable global toggle shortcut, per-action letter shortcuts where supported, and keyboard focus navigation.
- **Custom commands:** define your own actions in Preferences using a validated JSON array.
- **Shared confirmations:** destructive actions use a consistent confirmation dialog across layouts.
- **Sleep inhibitor check:** before suspend, inspect logind sleep inhibitors and let the user cancel or explicitly force suspend.
- **Switch user:** show an action for another user's existing local graphical session when logind can identify it.
- **Hibernate detection:** only show Hibernate when logind reports it as available.
- **Suite integration:** panel buttons and launchers can open, close, or toggle this same sheet over the session D-Bus.
- **Appearance controls:** popup scale, panel transparency, backdrop dimming, and a status-information toggle.
- **Matugen integration:** reload color roles whenever the popup is created, with a built-in fallback palette.

Optional system integrations are best-effort: if logind cannot provide inhibitor, hibernate, or session information, the related enhancement is skipped or the normal action behavior is retained.

## Layouts

| Layout | Description |
|---|---|
| `card` | Header with pill buttons |
| `list` | Keyboard-first list with key badges |
| `split` | Large clock with circular dock |
| `grid` | Numbered icon tiles |
| `radial` | Icons arranged around a clock hub |
| `bento` | Asymmetric dashboard |
| `tui` | Terminal-inspired box drawing |
| `dock` | Vertical edge dock |
| `tiles` | Square tile row |
| `halo` | Dot-ring hold-to-confirm interaction |
| `capsule` | Rounded pill rows |
| `circles` | Floating stack of circular actions |
| `avatar` | Large avatar with action list |
| `pill` | Compact status area with icons |
| `banner` | Wallpaper-style banner with actions |

Open **Preferences → Style** to select a layout, then choose **Preview** to inspect it without saving or **Apply** to make it the default. Preview opens the real Shell layout through the extension's session D-Bus interface; system/custom action activation is disabled and closes the preview. Older names (`rofi`, `quickshell`, `wlogout`, `dots`, and `end4`) remain accepted as aliases and are migrated to their generic names.

> Screenshots for the complete style gallery are tracked in [issue #10](https://github.com/SakibShahariar/material-system-actions/issues/10). The layout descriptions above are textual; they are not screenshots.

## Install

### From a packaged ZIP

Build the installable archive from a checkout:

```bash
./scripts/package.sh

gnome-extensions install --force dist/material-system-actions@sakib.dev.shell-extension.zip
gnome-extensions enable material-system-actions@sakib.dev
```

If the extension does not appear immediately, log out and back in to refresh the GNOME Shell extension state. Use the Extensions app or `gnome-extensions` to open its Preferences.

### Development install

From the repository root:

```bash
glib-compile-schemas schemas/
mkdir -p ~/.local/share/gnome-shell/extensions
ln -sfn "$(pwd)" ~/.local/share/gnome-shell/extensions/material-system-actions@sakib.dev
gnome-extensions enable material-system-actions@sakib.dev
```

The extension directory name must match the UUID in `metadata.json`. After changing code, disable and re-enable the extension to reload it. On Wayland, logging out and back in may be required to load changed extension files reliably.

## Configure

Open **Extensions → Material System Actions → Preferences** (the exact route may vary by GNOME version).

- **Style:** select one of the 15 layouts, then use **Preview** to inspect it without saving or **Apply** to make it the default.
- **System actions:** hide or show individual actions and move them up or down. Changes apply the next time the popup opens. Layouts that separate session and power actions preserve those sections while applying the configured order within each section.
- **Custom actions:** edit and validate a JSON array of user-defined commands.
- **Keyboard shortcut:** change the global toggle shortcut. The default is **Ctrl+Alt+End**.
- **Appearance:** adjust UI scale (0.6–2.0), panel transparency (0–100%), backdrop dimming, and whether status information is shown. The toggle applies immediately to open popups; layouts with existing headers keep their native presentation, while dock, tiles, halo, and circles use a shared compact status header.

### Keyboard and accessibility

- Press the configured global shortcut (default **Ctrl+Alt+End**) to open or close the sheet.
- Use **Tab / Shift+Tab** or the arrow keys to move focus; **Enter / Space** activates the focused action and **Escape** closes the sheet.
- Letter shortcuts activate the matching action when one is configured. Number keys 1–9 select actions by their current order where supported.
- Action buttons expose their action labels as accessible names, including icon-only layouts. Confirmation dialogs provide explicit names for cancel and confirm controls.
- The extension uses GNOME Shell's native widgets. Screen-reader behavior still needs verification with Orca in a live GNOME session; keyboard navigation and automated checks are not a substitute for that test.

Letter shortcuts stay attached to their actions; number shortcuts follow the configured order. Some layouts present actions differently by design.

## Custom actions

In Preferences, open **Custom actions → Edit JSON**. Each item needs a unique `custom-*` ID, a visible label, a symbolic icon name, and a command argument array (`cmd`). `confirm` defaults to `true`; `key` is an optional unused single-letter shortcut.

Example:

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

Replace the example paths and connection names with values that exist on your system. Save through **Validate and save**, then reopen the popup to use the updated actions. Valid custom actions also appear in **System actions**, where they can be hidden/shown and reordered.

## Safety and confirmations

- **Logout, reboot, shutdown, and hibernate** require confirmation. Cancel or press Escape to return without executing the action.
- **Suspend** checks logind for sleep inhibitors. If any are found, the popup lists the application, reason, and inhibitor mode. Choose **Cancel** or **Force suspend**. Forcing suspend runs `systemctl --ignore-inhibitors suspend` and can interrupt ongoing work.
- **Custom commands run as your user.** Commands are launched directly as argument arrays, not through a shell. Shell syntax, pipes, redirection, and variable expansion are not interpreted. Only add commands you trust; a custom command can still modify files or perform other actions permitted to your account.
- **Switch user** activates an existing local graphical session; it does not create a new account session. The action is omitted when session discovery is unavailable.
- **Hibernate** is only offered when logind reports that hibernation is available. Actual support also depends on system configuration.

## Matugen colors

The popup reads Matugen CSS color roles when it is created, so palette changes are reflected the next time you open it. The lookup order is:

1. `MATUGEN_COLORS_PATH`, if set
2. `~/.config/matugen/matugen-colors.css`
3. `~/.config/ags/colors.css`
4. Built-in fallback palette

The extension reads the color roles it recognizes from the selected CSS file; a missing or unreadable file does not prevent the popup from opening. The prototype uses the same lookup paths and fallback behavior.

## Panel and launcher integration

The extension exposes a session-bus D-Bus interface so another GNOME component can open the existing sheet instead of implementing a separate power dialog.

- **Bus name:** `org.gnome.Shell.Extensions.MaterialSystemActions`
- **Object path:** `/org/gnome/Shell/Extensions/MaterialSystemActions`
- **Interface:** `org.gnome.Shell.Extensions.MaterialSystemActions`
- **Methods:** `Open`, `Close`, `Toggle`

Open the sheet from a panel button or launcher with:

```bash
gdbus call --session \
  --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Open
```

Use `Close` or `Toggle` in place of `Open` for the corresponding operation. The interface is available while the extension is enabled and is released when it is disabled. These methods control the popup; they do not bypass the extension's confirmation UI.

## Development and testing

The project includes a small GTK4/libadwaita prototype gallery in `prototype/system_actions_all.py`. It is useful for browsing the original concepts, but the installed extension uses GNOME Shell's native `St`/Clutter widgets.

```bash
# List available prototype layouts
python3 prototype/system_actions_all.py --list

# Launch an individual prototype layout
python3 prototype/system_actions_all.py card
python3 prototype/system_actions_all.py --style=list
```

Run the packaging checks and create a ZIP with:

```bash
./scripts/package.sh
```

CI validates JavaScript syntax, action preference behavior, strict GSettings schema compilation, archive creation, and required package contents. Automated checks do not replace testing inside a live GNOME Shell session; verify shortcut handling, visual layout, D-Bus calls, suspend inhibitors, and multi-user switching on the target machine.

## Troubleshooting

- **The shortcut does nothing:** check that the extension is enabled, try the shortcut shown in Preferences, and look for a conflicting GNOME or third-party keybinding.
- **Changes are not visible:** close and reopen the popup. For code changes, disable/re-enable the extension; on Wayland, a logout/login may be needed.
- **Colors do not match Matugen:** confirm the CSS file exists, contains the expected color roles, and is selected by the lookup order above. Set `MATUGEN_COLORS_PATH` to test a specific file.
- **Hibernate or switch-user actions are missing:** these depend on systemd-logind reporting support and sessions that meet the detection requirements.
- **A custom action fails:** confirm the executable and arguments are correct. Because commands are not run through a shell, use an executable script if you need shell syntax.

For bugs and feature requests, use the [GitHub issue tracker](https://github.com/SakibShahariar/material-system-actions/issues).

## License

GPL-2.0-or-later
