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
- **Keyboard access:** configurable global toggle shortcut, per-action letter shortcuts where supported, keyboard focus navigation, and an optional default focused action.
- **Custom commands:** define your own actions in Preferences using a validated JSON array.
- **Shared confirmations:** destructive actions use a consistent confirmation dialog across layouts.
- **Sleep inhibitor check:** before suspend, inspect logind sleep inhibitors and let the user cancel or explicitly force suspend.
- **Switch user:** show actions for other users' existing local graphical sessions when logind can identify them. Switching asks for confirmation by default; the **Confirm before switching users** preference can disable the prompt.
- **Hibernate detection:** only show Hibernate when logind reports it as available.
- **Suite integration:** panel buttons and launchers can open, close, or toggle this same sheet over the session D-Bus.
- **Appearance controls:** popup scale, panel transparency, backdrop dimming, status-information visibility, and compact/comfortable status-header density.

The sheet respects GNOME Shell's global animation setting: decorative state transitions become instantaneous when animations are disabled. Keyboard navigation and confirmation behavior are unchanged.
- **Matugen integration:** reload color roles whenever the popup is created, with a built-in fallback palette.

Optional system integrations are best-effort: if logind cannot provide inhibitor, hibernate, or session information, the related enhancement is skipped or the normal action behavior is retained.

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

The build compiles schemas in a temporary staging tree without modifying the checkout. ZIP entries are sorted, timestamps are fixed, and file/directory permissions are normalized, so identical source trees produce byte-identical archives. A matching `.sha256` file is written beside the archive.

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
- **Appearance:** adjust UI scale (0.6–2.0), panel transparency (0–100%), backdrop dimming, whether status information is shown, and whether shared status headers use comfortable or compact density. Density affects only layouts that render the shared header; layouts without one are unchanged.
- **Reset preferences:** restore appearance settings, action settings, custom actions, or everything to the GSettings schema defaults. Removing custom actions requires explicit confirmation.


### GSettings reference

The extension stores its preferences in the `org.gnome.shell.extensions.material-system-actions` schema. Defaults below are taken directly from the schema shipped in `schemas/`.

| Key | Type | Default | Effect |
|---|---|---|---|
| `toggle-system-actions` | string array (`as`) | `['<Control><Alt>End']` | Global shortcut used to open or close the sheet. |
| `style` | string (`s`) | `'card'` | Selects the layout used by the popup. |
| `custom-actions` | string (`s`) | `'[]'` | JSON array of user-defined command actions; commands run directly without a shell. |
| `action-order` | string array (`as`) | `['lock', 'logout', 'suspend', 'hibernate', 'reboot', 'shutdown']` | Sets the display order of available actions; newly available actions are appended automatically. |
| `hidden-actions` | string array (`as`) | `[]` | Lists action IDs that are omitted from the popup. |
| `icon-scale` | double (`d`) | `1.0` (range: `0.6–2.0`) | Uniformly scales popup text, icons, and geometry. |
| `panel-opacity` | double (`d`) | `1.0` (range: `0.0–1.0`) | Controls surface opacity; `0.0` is transparent and `1.0` is solid. Labels remain fully opaque. |
| `backdrop-dim-enabled` | boolean (`b`) | `true` | Enables the standard Shell dimming behind the popup; disable it for no backdrop dimming. |
| `show-status-header` | boolean (`b`) | `true` | Shows the user, clock, date, or uptime elements supported by the selected layout. |
| `status-header-density` | string (`s`) | `comfortable` | `comfortable` or `compact` spacing for layouts with the shared status header. |
| `default-focused-action` | string (`s`) | `auto` | Action ID to focus on open; hidden or unavailable choices fall back to the first visible action. |


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
- **Suspend** checks logind for sleep inhibitors. If any are found, the popup lists the application, reason, and inhibitor mode. Choose **Cancel** or **Force suspend**. Forcing suspend runs `systemctl --ignore-inhibitors suspend` and can interrupt ongoing work. Missing application/reason metadata is replaced with readable fallback text. The logind `ListInhibitors` tuple does not include an icon, so entries remain text-based.
- **Custom commands run as your user.** Commands are launched directly as argument arrays, not through a shell. Shell syntax, pipes, redirection, and variable expansion are not interpreted. Only add commands you trust; a custom command can still modify files or perform other actions permitted to your account.
- **Switch user** activates an existing local graphical session; it does not create a new account session. The action is omitted when session discovery is unavailable.
- **Hibernate** is only offered when logind reports that hibernation is available. Actual support also depends on system configuration.

## Security and trust model

### D-Bus scope and authorization

The extension exports `Open`, `Close`, `Toggle`, and `Preview(s style)` on the **user session bus**. It does not expose a system-bus service, network listener, or method for submitting arbitrary commands or action IDs.

There is no additional per-caller authorization layer beyond access to that user's session bus. Any local process that can access the bus can request the popup to open, close, toggle, or enter layout preview. Treat processes running as your user as trusted. The extension releases the exported object and bus name when it is disabled.

D-Bus validates the method signature; only `Preview` accepts an argument, and it must be a string. An unrecognized layout name falls back to the configured/default layout. A D-Bus call does not directly execute a power action.

### Command execution and confirmations

- Built-in logout, reboot, shutdown, and hibernate actions require an explicit confirmation.
- Suspend checks logind sleep inhibitors. If inhibitors are present, the user must cancel or explicitly choose **Force suspend**.
- Custom actions default to confirmation, but the saved `confirm` field can disable that prompt. Custom commands run with the current user's permissions and are **not sandboxed**.
- Commands are passed to `Gio.Subprocess` as an argument array. They are not evaluated by a shell, so pipes, redirection, globbing, and variable expansion are not interpreted.
- Confirmation dialogs reduce accidental activation; they are not a security boundary against another process already running as the same user.

Only add custom commands you trust. A command can read or modify any files and use any privileges available to your account. When the extension is disabled, it cancels its subprocess wait tracking but deliberately leaves already-started child processes running; this avoids interrupting user commands or power/session operations.

### Session discovery and privacy

To build switch-user actions, the extension reads session information from systemd-logind using `ListSessions` and session `GetAll` properties. It uses the session ID, username, seat, session type, class, and remote flag to include only other users' local graphical Wayland/X11 sessions. The session ID is included in a visible label only when duplicate sessions for the same user cannot otherwise be distinguished.

This session metadata is used transiently to build the popup actions; it is not written to files or GSettings. Hibernate availability is queried from logind and is not persisted. User preferences and custom-action configuration are stored in the user's GSettings schema.

### Preview mode

The `Preview` method and Preferences layout preview open the selected layout in preview-only mode. The shared action dispatcher exits before running any command, so selecting an action in a preview closes it without executing the action. Use `Open` for normal operation.

## Matugen colors

The popup reads Matugen CSS color roles when it is created, so palette changes are reflected the next time you open it. The lookup order is:

1. `MATUGEN_COLORS_PATH`, if set
2. `~/.config/matugen/matugen-colors.css`
3. `~/.config/ags/colors.css`
4. Built-in fallback palette

The extension reads the color roles it recognizes from the selected CSS file; a missing or unreadable file does not prevent the popup from opening. The prototype uses the same lookup paths and fallback behavior.

For optional diagnostics, set `MATERIAL_SYSTEM_ACTIONS_DEBUG=1` in GNOME Shell's environment before starting the session. Opening the popup logs the selected CSS file (or the built-in fallback), missing theme roles, and roles using fallback values. Leave the variable unset for quiet normal operation.

## Panel and launcher integration

The extension exposes a session-bus D-Bus interface so another GNOME component can open the existing sheet instead of implementing a separate power dialog.

- **Bus name:** `org.gnome.Shell.Extensions.MaterialSystemActions`
- **Object path:** `/org/gnome/Shell/Extensions/MaterialSystemActions`
- **Interface:** `org.gnome.Shell.Extensions.MaterialSystemActions`
- **Methods:** `Open`, `Close`, `Toggle`, and `Preview(s style)` (`Preview` is intended for the Preferences layout preview; normal integrations should use the first three).

Open the sheet from a panel button or launcher with:

```bash
gdbus call --session \
  --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Open
```

For a **GNOME Shell extension** panel button, use the session bus asynchronously rather than spawning a new power menu or running power commands from the panel:

```js
import Gio from 'gi://Gio';

function callSystemActions(method) {
    Gio.DBus.session.call(
        'org.gnome.Shell.Extensions.MaterialSystemActions',
        '/org/gnome/Shell/Extensions/MaterialSystemActions',
        'org.gnome.Shell.Extensions.MaterialSystemActions',
        method,
        null,
        null,
        Gio.DBusCallFlags.NONE,
        3000,
        null,
        (connection, result) => {
            try {
                connection.call_finish(result);
            } catch (error) {
                logError(error, `material-panel: could not call system actions ${method}`);
            }
        },
    );
}

// In the panel button's clicked handler:
callSystemActions('Toggle');
```

The receiving extension must be enabled. Handle the call error in your integration (for example, show a fallback or no-op if the extension is unavailable); do not assume that a successful request means a power action has completed.

Use `Close` or `Toggle` in place of `Open` for the corresponding operation. To open a temporary preview of a registered layout (without changing the saved default), pass its layout ID to `Preview`:

```bash
gdbus call --session \\
  --dest org.gnome.Shell.Extensions.MaterialSystemActions \\
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \\
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Preview \\
  "'list'"
```

The `Preview` method is mainly for the Preferences UI and development tooling; ordinary panel and launcher integrations should use `Open`, `Close`, or `Toggle`. The interface is available while the extension is enabled and is released when it is disabled. These methods control the popup; they do not bypass the extension's confirmation UI.

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

CI validates JavaScript syntax, action preference behavior, accessibility and preview guards across all layouts, the exported D-Bus contract against this documentation, strict GSettings schema compilation, archive creation, and required package contents. These source-level checks do not replace testing inside a live GNOME Shell session; verify shortcut handling, visual layout, D-Bus calls, suspend inhibitors, and multi-user switching on the target machine.

## Troubleshooting

### Extension does not open

Check whether GNOME Shell has the extension enabled:

```bash
gnome-extensions info material-system-actions@sakib.dev
```

Follow the Shell log while opening the popup:

```bash
journalctl --user -f -o cat /usr/bin/gnome-shell
```

Look for messages prefixed with `material-system-actions:`. To reload the extension after fixing an error:

```bash
gnome-extensions disable material-system-actions@sakib.dev
gnome-extensions enable material-system-actions@sakib.dev
```

On Wayland, log out and back in if GNOME Shell still holds stale extension state.

### D-Bus name is unavailable

The session-bus name is exported only while the extension is enabled. Check that the service and object are present:

```bash
gdbus introspect --session \
  --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions
```

If this reports that the service is unknown, check the extension state and Shell log above. The extension logs `could not own D-Bus session name` if it cannot acquire the name.

### Layout preview does not work

Use the layout preview in Preferences, or test the preview-only D-Bus method with a registered layout name:

```bash
gdbus call --session \
  --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Preview \
  'card'
```

Replace `card` with another registered layout key. Preview mode displays a visible and screen-reader description that actions are disabled. It does not execute actions; use the `Open` method for normal operation.

### Matugen colors are stale or incomplete

The palette is read when the popup is created. Close and reopen the popup after editing a color file. Check the lookup order in [Matugen colors](#matugen-colors), and use `MATUGEN_COLORS_PATH` to select a specific CSS file.

For diagnostics, set `MATERIAL_SYSTEM_ACTIONS_DEBUG=1` in GNOME Shell's environment and restart the session. The log reports the resolved file, missing roles, and roles using fallback values. The variable is opt-in; normal operation remains quiet.

### Keyboard shortcut does nothing

Check the configured accelerator:

```bash
gsettings get org.gnome.shell.extensions.material-system-actions toggle-system-actions
```

Change it in Preferences if another GNOME Shell extension or desktop shortcut already uses the same key. To restore the schema default:

```bash
gsettings reset org.gnome.shell.extensions.material-system-actions toggle-system-actions
```

### A custom action fails

Use **Validate and save** in Preferences, then inspect the stored configuration if needed:

```bash
gsettings get org.gnome.shell.extensions.material-system-actions custom-actions
```

Each `cmd` must be a JSON array containing the executable followed by separate arguments. Commands run directly as your user, not through a shell, so pipes, redirection, globbing, and variable expansion are not interpreted. Use an executable script when shell syntax is required. Check the Shell log for the detailed error. Failed commands now show an immediate notification using the action label, without exposing the full command line.

### Hibernate or switch-user actions are missing

These actions depend on systemd-logind and the current session. Inspect the sessions visible to logind:

```bash
loginctl list-sessions
loginctl show-session "$XDG_SESSION_ID" -p Type -p Class -p Remote -p Seat
```

Hibernate is shown only when logind reports support. Switch-user actions are limited to other users' local Wayland/X11 graphical sessions.

## License

Licensed under the GNU General Public License, version 2 or (at your option) any later version (GPL-2.0-or-later). See [LICENSE](LICENSE) for the complete license text.
