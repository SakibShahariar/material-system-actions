// SPDX-License-Identifier: GPL-2.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {getSleepInhibitors} from '../inhibitors.js';
import {getUptime} from '../actions.js';

export class BaseStyle {
    constructor(dialog, theme, actions) {
        this.dialog = dialog;
        this.theme = theme;
        this.actions = actions; // {session, power, all}
        this.position = null; // null = centered
        this._navWidgets = [];
        this._focusedIdx = 0;
        this._keyMap = Object.fromEntries(this.actions.all.filter(a => typeof a.key === 'string' && a.key.length === 1).map(a => [a.key, a]));
        this._confirmation = null;
        this._runTimeoutId = 0;
        this._tickId = 0;
    }

    // Shared lifecycle for status refreshes used by several layouts.
    startTicker(callback, intervalSeconds = 1) {
        this.stopTicker();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, intervalSeconds, () => {
            callback();
            return GLib.SOURCE_CONTINUE;
        });
        this.dialog.connect('closed', () => this.stopTicker());
    }

    stopTicker() {
        if (!this._tickId)
            return;
        GLib.source_remove(this._tickId);
        this._tickId = 0;
    }

    buildSharedStatusHeader(vertical = false) {
        const header = new St.BoxLayout({
            orientation: vertical ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
            style_class: 'sa-shared-status-header',
            style: vertical ? 'spacing: 3px; padding: 6px;' : 'spacing: 12px; padding: 8px 12px;',
            x_align: Clutter.ActorAlign.FILL,
        });
        const user = new St.Label({text: GLib.get_user_name() || 'User', style_class: 'sa-muted', x_expand: !vertical, x_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START});
        const clock = new St.Label({style: 'font-size: 1.15em; font-weight: 700;', x_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.END});
        const details = new St.Label({style_class: 'sa-muted', x_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.END});
        header.add_child(user); header.add_child(clock); header.add_child(details);
        const refresh = () => {
            const now = GLib.DateTime.new_now_local();
            clock.text = now.format('%H:%M') ?? '';
            details.text = vertical ? 'up ' + getUptime() : (now.format('%a %d %b') ?? '') + ' · up ' + getUptime();
        };
        refresh();
        this.startTicker(refresh);
        return this.bindStatusWidget(header);
    }
    bindStatusWidget(widget) {
        const settings = this.dialog._settings;
        const update = () => { widget.visible = settings.get_boolean('show-status-header'); };
        update();
        const signalId = settings.connect('changed::show-status-header', update);
        this.dialog.connect('closed', () => {
            try { settings.disconnect(signalId); } catch (_e) {}
        });
        return widget;
    }

    // To override
    buildUI() { return new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL}); }

    registerNav(widget, action = null) {
        if (!widget)
            return widget;

        // Icon-only layouts must expose the action's human-readable name to
        // assistive technology, not just its symbolic icon.
        if (action?.label) {
            try { widget.accessible_name = action.label; } catch (_e) {}
        }

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
                this._pillPop(widget);
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
        this._pillPop(widget);
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 420, () => {
            try { widget.remove_style_class_name('sa-pressed'); } catch (_e) {}
            return GLib.SOURCE_REMOVE;
        });
    }

    // Mirrors the theme's @keyframes pill-pop spring (0.94 -> 1.08 -> 0.96
    // -> 1.03 -> 1.0, ~600ms) on a center pivot, as St has no CSS keyframes.
    _pillPop(widget) {
        if (!widget || typeof widget.ease !== 'function')
            return;
        try {
            widget.pivot_point = {x: 0.5, y: 0.5};
        } catch (_e) {}
        const easeTo = (scale, duration, mode) => {
            try {
                return widget.ease({scale_x: scale, scale_y: scale},
                    {duration, mode}).catch(() => {});
            } catch (_e) {
                return Promise.resolve();
            }
        };
        const keyframes = [
            [0.94, 150, Clutter.AnimationMode.EASE_OUT_QUAD],
            [1.08, 180, Clutter.AnimationMode.EASE_OUT_QUAD],
            [0.96, 120, Clutter.AnimationMode.EASE_OUT_QUAD],
            [1.03,  90, Clutter.AnimationMode.EASE_OUT_QUAD],
            [1.0,   60, Clutter.AnimationMode.EASE_OUT_QUAD],
        ];
        let run = Promise.resolve();
        for (const [scale, duration, mode] of keyframes)
            run = run.then(() => easeTo(scale, duration, mode));
        run.catch(() => {});
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
        if (this.dialog._previewMode) {
            this.dialog.close();
            return;
        }
        if (!action) { this.dialog.close(); return; }
        if (action.id === 'suspend') {
            const inhibitors = this._querySleepInhibitors();
            if (inhibitors.length) {
                this._confirmSuspendWithInhibitors(inhibitors);
                return;
            }
        }
        if (action.destructive) {
            this._confirmThenRun(action);
            return;
        }
        this._run(action.cmd);
    }

    _querySleepInhibitors() {
        try {
            const reply = Gio.DBus.system.call_sync(
                'org.freedesktop.login1',
                '/org/freedesktop/login1',
                'org.freedesktop.login1.Manager',
                'ListInhibitors',
                null,
                new GLib.VariantType('(a(ssssuu))'),
                Gio.DBusCallFlags.NONE,
                1200,
                null,
            );
            return getSleepInhibitors(reply.deep_unpack()[0]);
        } catch (_e) {
            // Best-effort only: if logind cannot be queried, retain normal suspend.
            return [];
        }
    }

    _confirmSuspendWithInhibitors(inhibitors) {
        if (this._confirmation)
            return;
        const overlay = this.dialog.contentLayout;
        const prevChild = overlay.get_children()[0];
        if (prevChild)
            prevChild.hide();

        const confirmBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'sa-panel',
            style: 'spacing: 12px; min-width: 320px; max-width: 460px; padding: 18px;',
        });
        confirmBox.add_child(new St.Label({
            text: 'Applications are inhibiting sleep',
            style: 'font-weight: 700; font-size: 1.1em;',
            x_align: Clutter.ActorAlign.CENTER,
        }));
        confirmBox.add_child(new St.Label({
            text: 'These applications may be preventing or delaying suspend. Forcing suspend ignores their inhibitor locks and could interrupt ongoing work.',
            style_class: 'sa-muted',
            x_align: Clutter.ActorAlign.CENTER,
            style: 'text-align: center;',
        }));

        const details = inhibitors.map(item =>
            `• ${item.who}: ${item.why} (${item.mode})`).join('\n');
        const detailLabel = new St.Label({
            text: details,
            x_align: Clutter.ActorAlign.START,
            style: 'max-width: 420px;',
        });
        detailLabel.clutter_text.line_wrap = true;
        confirmBox.add_child(detailLabel);

        const btnRow = new St.BoxLayout({
            style: 'spacing: 10px;',
            x_align: Clutter.ActorAlign.CENTER,
        });
        const cancelBtn = new St.Button({
            label: 'Cancel',
            accessible_name: 'Cancel suspend',
            style_class: 'sa-pill-btn',
            can_focus: true,
        });
        const confirmBtn = new St.Button({
            label: 'Force suspend',
            accessible_name: 'Force suspend despite sleep inhibitors',
            style_class: 'sa-pill-btn sa-tier-error',
            can_focus: true,
        });
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
            if (prevChild)
                prevChild.show();
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this.grabInitialFocus();
                return GLib.SOURCE_REMOVE;
            });
        };
        cancelBtn.connect('clicked', () => cleanup());
        confirmBtn.connect('clicked', () => {
            cleanup();
            this._runTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                this._runTimeoutId = 0;
                this._run(['systemctl', '--ignore-inhibitors', 'suspend']);
                return GLib.SOURCE_REMOVE;
            });
        });
        this._confirmation = {cleanup, cancelBtn, confirmBtn};
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            try { cancelBtn.grab_key_focus(); } catch (_e) {}
            return GLib.SOURCE_REMOVE;
        });
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
        const cancelBtn = new St.Button({
            label: 'Cancel',
            accessible_name: `Cancel ${action.label.toLowerCase()}`,
            style_class: 'sa-pill-btn',
            can_focus: true,
        });
        const confirmBtn = new St.Button({
            label: action.label,
            accessible_name: `Confirm ${action.label.toLowerCase()}`,
            style_class: 'sa-pill-btn sa-tier-error',
            can_focus: true,
        });
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
        this._confirmation = {cleanup, cancelBtn, confirmBtn};
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
        return new St.Icon({icon_name: iconName, icon_size: Math.round(size)});
    }
}
