# GNOME Shell compatibility

`metadata.json` declares GNOME Shell **45–51**. This is the declared target range, not a claim that every release has been live-tested. See [DEVELOPING.md](../DEVELOPING.md) for how to record a runtime result.

## Live validation status

| Shell | Status | Notes |
|---|---|---|
| 45 | Untested | Declared in metadata only |
| 46 | Untested | Declared in metadata only |
| 47 | Untested | Declared in metadata only |
| 48 | Untested | Declared in metadata only |
| 49 | Untested | Declared in metadata only |
| 50 | Untested | Declared in metadata only |
| 51 | Live-tested | GNOME Shell 51.1, Wayland; layouts, D-Bus, confirmations, Preferences, focus, notifications, and Matugen source resolution exercised |

Each row is either `Live-tested` or `Untested`; a new release must be added to this table before `metadata.json` claims support for it.

## API review inventory

The following module specifiers are used by runtime or Preferences code. `tests/shell-compatibility.test.mjs` fails when a new specifier appears in source without being recorded here, which forces a compatibility review of any newly used Shell/GI API.

- `gi://Adw`
- `gi://cairo`
- `gi://Clutter`
- `gi://Gdk`
- `gi://GdkPixbuf`
- `gi://Gio`
- `gi://GLib`
- `gi://GObject`
- `gi://Gtk`
- `gi://Meta`
- `gi://Shell`
- `gi://St`
- `resource:///org/gnome/shell/extensions/extension.js`
- `resource:///org/gnome/shell/misc/extensionUtils.js`
- `resource:///org/gnome/shell/ui/main.js`
- `resource:///org/gnome/shell/ui/messageTray.js`
- `resource:///org/gnome/shell/ui/modalDialog.js`

## Known Shell 51 differences

- `St.Widget`/`St.Bin` no longer expose `x_fill`; use an expanding `St.Bin` with a center-aligned child instead.
- `Gio.DBusExportedObject.wrapJSObject` passes unpacked method arguments (plus the invocation), not a single `GLib.Variant`.
- `Clutter.Actor.raise_top()` is unavailable; raise via `parent.set_child_above_sibling(actor, null)`.
- St does not clip a child icon to a parent's `border-radius`; avatars are rendered as cached circular PNGs.

These differences were found in live Shell 51 sessions and are covered by source-level regression tests where possible.
