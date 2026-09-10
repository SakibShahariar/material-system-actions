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
        this._navWidgets = [];
        this._focusedIdx = 0;
        this._keyMap = Object.fromEntries(this.actions.all.map(a => [a.key, a]));
        this._confirmation = null;
        this._runTimeoutId = 0;
    }

    // To override
    buildUI() { return new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL}); }

    registerNav(widget) {
        if (!widget)
            return widget;

        if (!this._navWidgets.includes(widget))
            this._navWidgets.push(widget);

        // Keep interaction states consistent across every layout.  St exposes
        // focus/active pseudo-classes, but explicit state classes give us a
        // stable visual contract across Shell releases and make the pressed
        // state distinct from keyboard focus.
        if (!widget._saInteractionBound) {
            widget._saInteractionBound = true;
            widget.connect('key-focus-in', () => widget.add_style_class_name('sa-focus-ring'));
            widget.connect('key-focus-out', () => widget.remove_style_class_name('sa-focus-ring'));
            widget.connect('button-press-event', () => {
                widget.add_style_class_name('sa-pressed');
                return Clutter.EVENT_PROPAGATE;
            });
            widget.connect('button-release-event', () => {
                widget.remove_style_class_name('sa-pressed');
                return Clutter.EVENT_PROPAGATE;
            });
        }
        return widget;
    }

    pressFlash(widget) {
        if (!widget) return;
        try {
            widget.add_style_class_name('sa-pressed');
        } catch (_e) {
            return;
        }
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            try { widget.remove_style_class_name('sa-pressed'); } catch (_e) {}
            return GLib.SOURCE_REMOVE;
        });
    }

    moveNav(delta) {
        if (!this._navWidgets.length) return false;
        const focused = global.stage.get_key_focus();
        let idx = this._navWidgets.indexOf(focused);
        if (idx === -1) idx = this._focusedIdx;
        else this._focusedIdx = idx;
        idx = ((idx + delta) % this._navWidgets.length + this._navWidgets.length) % this._navWidgets.length;
        this._focusedIdx = idx;
        const w = this._navWidgets[idx];
        if (w) {
            try { w.grab_key_focus(); } catch (_e) { w.grab_focus?.(); }
            return true;
        }
        return false;
    }

    grabInitialFocus() {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (this._navWidgets.length) {
                try { this._navWidgets[0].grab_key_focus(); } catch (_e) { this._navWidgets[0].grab_focus?.(); }
                this._focusedIdx = 0;
            } else {
                // fallback: find first can_focus Button inside dialog
                const root = this.dialog?.contentLayout;
                if (root) {
                    const found = this._findFocusable(root);
                    if (found) try { found.grab_key_focus(); } catch (_e) { found.grab_focus?.(); }
                }
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _findFocusable(actor) {
        if (actor.can_focus) return actor;
        if (actor.get_children) {
            for (const c of actor.get_children()) {
                const f = this._findFocusable(c);
                if (f) return f;
            }
        }
        return null;
    }

    /** Called by dialog before generic handling. Return true if consumed. */
    onKeyPress(_sym, _keyval) { return false; }

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
        if (this._confirmation)
            return;
        // Mimic Python Adw.MessageDialog:436 — confirm destructive actions before running
        const overlay = this.dialog.contentLayout;
        const prevChild = overlay.get_children()[0];
        if (prevChild) prevChild.hide();

        const confirmBox = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'sa-panel', style: 'spacing: 12px; min-width: 300px;'});
        confirmBox.add_child(new St.Label({text: `${action.label}?`, style: 'font-weight: 700; font-size: 1.1em;', x_align: Clutter.ActorAlign.CENTER}));
        confirmBox.add_child(new St.Label({text: `This will ${action.label.toLowerCase()} the machine now. Any unsaved work will be lost.`, style_class: 'sa-muted', x_align: Clutter.ActorAlign.CENTER, style: 'text-align: center;'}));
        const btnRow = new St.BoxLayout({style: 'spacing: 10px;', x_align: Clutter.ActorAlign.CENTER});
        const cancelBtn = new St.Button({label: 'Cancel', style_class: 'sa-pill-btn', can_focus: true});
        const confirmBtn = new St.Button({label: action.label, style_class: 'sa-pill-btn sa-tier-error', can_focus: true});
        btnRow.add_child(cancelBtn);
        btnRow.add_child(confirmBtn);
        confirmBox.add_child(btnRow);
        overlay.add_child(confirmBox);
        this.dialog._applyPanelOpacity?.();

        const cleanup = () => {
            if (!this._confirmation)
                return;
            this._confirmation = null;
            confirmBox.destroy();
            if (prevChild) prevChild.show();
            // restore focus to nav
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => { this.grabInitialFocus(); return GLib.SOURCE_REMOVE; });
        };
        cancelBtn.connect('clicked', () => cleanup());
        confirmBtn.connect('clicked', () => {
            cleanup();
            this._runTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                this._runTimeoutId = 0;
                this._run(action.cmd);
                return GLib.SOURCE_REMOVE;
            });
        });
        this._confirmation = {cleanup};
        // Escape cancels. Enter activates the focused (initially Cancel) button.
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            try { cancelBtn.grab_key_focus(); } catch (_e) {}
            return GLib.SOURCE_REMOVE;
        });
    }

    handleDialogKeyPress(sym, _event) {
        if (!this._confirmation || sym !== Clutter.KEY_Escape)
            return false;
        this._confirmation.cleanup();
        return true;
    }

    _run(cmd) {
        try {
            const process = Gio.Subprocess.new(cmd, Gio.SubprocessFlags.NONE);
            process.wait_check_async(null, (proc, result) => {
                try {
                    proc.wait_check_finish(result);
                } catch (e) {
                    Main.notify('Action failed', `Couldn't complete '${cmd.join(' ')}': ${e.message}`);
                }
            });
            this.dialog.close();
        } catch (e) {
            Main.notify('Action failed', `Couldn't run '${cmd.join(' ')}': ${e.message}`);
        }
    }

    makeIcon(iconName, size = 22) {
        return new St.Icon({icon_name: iconName, icon_size: Math.round(size * (this.theme.scale ?? 1))});
    }
}
