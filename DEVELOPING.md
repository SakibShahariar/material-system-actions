# Development and live GNOME testing

This guide separates automated source/package checks from validation that must happen in a real GNOME session. A passing CI run does **not** prove that every layout, D-Bus call, accessibility behavior, or power action works on every supported Shell release.

## Declared compatibility

`metadata.json` currently declares GNOME Shell **45–51**. Treat that as the project's declared target range, not proof that every release has been manually tested. Record the exact Shell version and desktop/session type when reporting a runtime result:

```bash
gnome-shell --version
printf 'Session: %s\n' "${XDG_SESSION_TYPE:-unknown}"
printf 'Desktop: %s\n' "${XDG_CURRENT_DESKTOP:-unknown}"
```

## Requirements

For local development and packaging, install:

- GNOME Shell and the GNOME Extensions command-line utility.
- GJS and the GTK4/libadwaita runtime used by the installed extension Preferences.
- Node.js for the repository's built-in `node:test` suite.
- Python 3, `glib-compile-schemas`, `sha256sum`, and `unzip` for packaging checks.

On Debian/Ubuntu-based systems, the packaging workflow installs `glib2.0-bin` and `unzip`; the developer must also install GNOME Shell, Node.js, and Python 3 as appropriate for the target desktop.

## Automated checks

Run these from the repository root:

```bash
# All source-level tests
node --test tests/*.test.mjs

# Packaging script syntax and extension metadata
bash -n scripts/package.sh
python3 -m json.tool metadata.json >/dev/null

# Validate and compile the GSettings schema
glib-compile-schemas --strict schemas/

# Build the installable archive and checksum
./scripts/package.sh

# Validate the generated archive and checksum
unzip -t dist/material-system-actions@sakib.dev.shell-extension.zip
(cd dist && sha256sum --check material-system-actions@sakib.dev.shell-extension.zip.sha256)
```

CI runs the same test suite, strict schema compilation, archive build, and archive-content checks. The package script stages runtime files in a temporary directory and does not intentionally modify the source tree.

## Install a development checkout

From the repository root, create a symlink in the current user's extension directory. The guard below avoids replacing an existing non-symlink installation:

```bash
UUID='material-system-actions@sakib.dev'
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
mkdir -p "$(dirname "$EXT_DIR")"
if [ -e "$EXT_DIR" ] && [ ! -L "$EXT_DIR" ]; then
    echo "An installed directory already exists at $EXT_DIR." >&2
    echo "Uninstall or move that copy through GNOME Extensions before continuing." >&2
else
    ln -sfn "$(pwd)" "$EXT_DIR"
fi

glib-compile-schemas schemas/
gnome-extensions enable "$UUID"
gnome-extensions info "$UUID"
```

After editing files, disable and enable the extension again:

```bash
gnome-extensions disable material-system-actions@sakib.dev
gnome-extensions enable material-system-actions@sakib.dev
```

On Wayland, GNOME Shell cannot be safely restarted with the Xorg restart shortcut. If changed files are not reloaded, log out and back in. Do not test on a production session where an extension crash or a power action could interrupt important work.

To test the packaged installation path instead, use the documented package workflow:

```bash
./scripts/package.sh
gnome-extensions install --force dist/material-system-actions@sakib.dev.shell-extension.zip
gnome-extensions enable material-system-actions@sakib.dev
```

## Logs and D-Bus

Follow GNOME Shell logs while exercising the extension:

```bash
journalctl --user -f -o cat /usr/bin/gnome-shell
```

Look for messages prefixed with `material-system-actions:`. For opt-in Matugen diagnostics, launch the GNOME Shell session with `MATERIAL_SYSTEM_ACTIONS_DEBUG=1` in its environment; do not expect changing a shell variable in an ordinary terminal to change the already-running Shell process.

Check that the session-bus service is exported:

```bash
gdbus introspect --session \
  --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions
```

Query integration status without opening the popup:

```bash
gdbus call --session \
  --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.GetStatus
```

The reply is `(version, effective-layout, preview)`. An unversioned development checkout reports `unreleased`; when the popup is closed, the layout is the configured default.

Exercise the existing control methods:

```bash
gdbus call --session --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Open

gdbus call --session --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Close

gdbus call --session --dest org.gnome.Shell.Extensions.MaterialSystemActions \
  --object-path /org/gnome/Shell/Extensions/MaterialSystemActions \
  --method org.gnome.Shell.Extensions.MaterialSystemActions.Preview "'list'"
```

Verify that Preview is visibly identified and that activating any item in preview mode never runs the associated command.

## Live-session validation checklist

Record the GNOME Shell version, session type, hardware/monitor setup, and test date. Mark a check only after performing it in the live session.

### Popup and layouts

- [ ] Open and close the sheet using the configured global shortcut.
- [ ] Open, close, toggle, and preview the sheet through D-Bus.
- [ ] Check all 15 layouts; verify that an unknown stored style safely falls back to the default.
- [ ] Verify action ordering, hidden actions, the all-actions-hidden recovery row, and the default-focused-action preference.
- [ ] Verify that the shared status-header controls affect only the layouts that declare shared-header support in the layout metadata.
- [ ] Check popup placement on each connected monitor, including the edge-positioned dock layout.
- [ ] Resize or change display scale and check clipping, hit targets, and focus visibility.

### Keyboard and accessibility

- [ ] Check Tab/Shift+Tab, arrow keys, supported letter/digit shortcuts, Enter/Space, and Escape.
- [ ] Verify that focus remains usable after confirmation dialogs open, cancel, and close.
- [ ] Use Orca to check icon-only action names, destructive-action descriptions, preview status, and confirmation consequences.
- [ ] Toggle GNOME's animation preference off and verify decorative transitions become instantaneous while keyboard and confirmation flows remain usable; restore the original preference after the test.

### Confirmation and optional system actions

- [ ] Verify logout, reboot, shutdown, hibernate, and switch-user confirmation presentation without executing a disruptive action on a machine containing important work.
- [ ] To inspect the suspend-inhibitor warning safely, create a temporary inhibitor in another terminal with `systemd-inhibit --what=sleep --who='Material System Actions test' --why='Verify inhibitor warning' sleep 60`, open the sheet, and confirm the warning can be cancelled. Do not choose Force suspend on a system where interruption is unsafe.
- [ ] Verify Hibernate and Switch User are omitted when logind reports them unavailable; test positive paths only on a disposable test machine with the required capability/session.
- [ ] Test a harmless custom command such as `/usr/bin/true`; verify confirmation settings and failure notifications without pasting untrusted commands.

### Preferences, themes, and packaging

- [ ] Open Preferences and verify layout selection, preview/apply, reset groups, destructive reset confirmations, keyboard shortcut recording, and appearance controls.
- [ ] Verify custom-action reset Cancel preserves the saved configuration and Reset removes it; reopen Preferences to confirm values persist.
- [ ] Test a valid Matugen CSS source and the built-in fallback in a disposable test account; inspect the debug log for the resolved source and missing roles.
- [ ] Install the generated ZIP, verify the extension enables, then disable/uninstall it cleanly.
- [ ] Verify `GetStatus()` while closed, while a normal popup is open, and while Preview is open.

## Environment-dependent checks

Some paths cannot be meaningfully verified on every machine:

- Switch User needs another local graphical session.
- Hibernate/hybrid sleep depends on logind, firmware, swap/resume configuration, and hardware.
- Multi-monitor behavior needs multiple active displays.
- Orca checks need a screen-reader-enabled session.
- Matugen source/fallback checks need the corresponding CSS files and GNOME Shell environment.

Record these as **not tested / unavailable**, not passed. Keep issues open when their acceptance criteria still require one of these checks. Do not publish a stable release until the live-session checks required by the release issue have been completed.
