// SPDX-License-Identifier: GPL-2.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class BaseStyle {
    constructor(dialog, theme, actions) {
        this.dialog = dialog;
        this.theme = theme;
        this.actions = actions; // {session, power, all}
        this.position = null; // null = centered
    }

    // To override
    buildUI() { return new St.BoxLayout({vertical: true}); }

    actionTier(action) {
        if (action.destructive) return 'error';
        if (action.id === 'lock') return 'primary';
        return 'secondary';
    }

    trigger(action) {
        if (!action) { this.dialog.close(); return; }
        if (action.destructive) {
            this._confirmThenRun(action);
            return;
        }
        this._run(action.cmd);
    }

    _confirmThenRun(action) {
        // Use Shell's ModalDialog confirm via Main.notify? simplest: use GLib.spawn
        // For now just spawn after 150ms with no extra dialog — Shell already has destroyOnClose
        // TODO: replace with proper St confirm popup (mirrors Python Adw.MessageDialog:436)
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            this._run(action.cmd);
            return GLib.SOURCE_REMOVE;
        });
    }

    _run(cmd) {
        try {
            Gio.Subprocess.new(cmd, Gio.SubprocessFlags.NONE);
            this.dialog.close();
        } catch (e) {
            Main.notify('Action failed', `Couldn't run '${cmd.join(' ')}': ${e.message}`);
        }
    }

    makeIcon(iconName, size = 22) {
        return new St.Icon({icon_name: iconName, icon_size: Math.round(size * (this.theme.scale ?? 1))});
    }
}
