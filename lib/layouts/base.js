// SPDX-License-Identifier: GPL-2.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {getSleepInhibitors} from '../inhibitors.js';
import {getUptime} from '../actions.js';
import {runPillPop} from '../pill-pop.js';
import {INTERACTION_STATE_DURATION_MS} from '../interaction-timing.js';
import {normalizeStatusHeaderDensity} from '../status-header.js';
import {spawnCommand} from '../process.js';
import {getActionFailureNotice} from '../action-feedback.js';
import {selectInitialFocusWidget} from '../focus-preferences.js';
import {createConfirmationOverlay} from '../confirmation-overlay.js';

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
        const density = normalizeStatusHeaderDensity(this.dialog._settings.get_string('status-header-density'));
        const header = new St.BoxLayout({
            orientation: vertical ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
            style_class: `sa-shared-status-header ${vertical ? 'sa-status-header-vertical' : 'sa-status-header-horizontal'} sa-status-header-${density}`,
            x_align: Clutter.ActorAlign.FILL,
        });
        const user = new St.Label({text: vertical ? (GLib.get_user_name() || 'U').slice(0, 2).toUpperCase() : (GLib.get_user_name() || 'User'), style_class: 'sa-muted sa-status-user', x_expand: !vertical, x_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START});
        const clock = new St.Label({style_class: 'sa-status-clock', x_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.END});
        const details = new St.Label({style_class: 'sa-muted sa-status-detail', x_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.END});
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
        if (action?.destructive) {
            try {
                widget.add_style_class_name('sa-tier-error');
                widget.accessible_description = `${action.label} is a destructive action and requires confirmation.`;
            } catch (_e) {}
        }

        if (action?.id)
            widget._saActionId = action.id;
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
                this._setPressedState(widget, true);
                this._pillPop(widget);
                return Clutter.EVENT_PROPAGATE;
            });
            widget.connect('button-release-event', () => {
                this._setPressedState(widget, false);
                return Clutter.EVENT_PROPAGATE;
            });
            widget.connect('destroy', () => this._setPressedState(widget, false));
        }
        return widget;
    }

    _setPressedState(widget, pressed, timeoutMs = 0) {
        if (!widget)
            return;

        const previousTimeout = widget._saPressedTimeoutId ?? 0;
        if (previousTimeout) {
            try { GLib.source_remove(previousTimeout); } catch (_e) {}
            widget._saPressedTimeoutId = 0;
        }

        if (!pressed) {
            try { widget.remove_style_class_name('sa-pressed'); } catch (_e) {}
            return;
        }

        try { widget.add_style_class_name('sa-pressed'); } catch (_e) { return; }
        if (timeoutMs <= 0)
            return;

        widget._saPressedTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeoutMs, () => {
            widget._saPressedTimeoutId = 0;
            try { widget.remove_style_class_name('sa-pressed'); } catch (_e) {}
            return GLib.SOURCE_REMOVE;
        });
    }

    pressFlash(widget) {
        if (!widget)
            return;
        this._setPressedState(widget, true, INTERACTION_STATE_DURATION_MS);
        this._pillPop(widget);
    }

    // Mirrors the theme's @keyframes pill-pop spring (0.94 -> 1.08 -> 0.96
    // -> 1.03 -> 1.0, ~600ms) on a center pivot, as St has no CSS keyframes.
    _pillPop(widget) {
        if (!widget || typeof widget.ease !== 'function')
            return;
        try {
            widget.pivot_point = {x: 0.5, y: 0.5};
        } catch (_e) {}
        const keyframes = [
            [0.94, 150, Clutter.AnimationMode.EASE_OUT_QUAD],
            [1.08, 180, Clutter.AnimationMode.EASE_OUT_QUAD],
            [0.96, 120, Clutter.AnimationMode.EASE_OUT_QUAD],
            [1.03,  90, Clutter.AnimationMode.EASE_OUT_QUAD],
            [1.0,   60, Clutter.AnimationMode.EASE_OUT_QUAD],
        ];
        runPillPop(widget, keyframes).catch(() => {});
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

    _restoreFocus(originWidget) {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (originWidget && this._navWidgets.includes(originWidget)) {
                try {
                    if (originWidget.get_stage() === global.stage) {
                        originWidget.grab_key_focus();
                        this._focusedIdx = this._navWidgets.indexOf(originWidget);
                        return GLib.SOURCE_REMOVE;
                    }
                } catch (_e) {}
            }
            this.grabInitialFocus();
            return GLib.SOURCE_REMOVE;
        });
    }

    grabInitialFocus() {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            const preferredId = this.dialog?._settings?.get_string('default-focused-action') ?? 'auto';
            const target = selectInitialFocusWidget(this._navWidgets, preferredId);
            if (target) {
                try { target.grab_key_focus(); } catch (_e) { target.grab_focus?.(); }
                this._focusedIdx = this._navWidgets.indexOf(target);
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
                this._confirmSuspendWithInhibitors(inhibitors, action);
                return;
            }
        }
        if (action.destructive) {
            this._confirmThenRun(action);
            return;
        }
        this._run(action.cmd, action.label, action.id.startsWith('custom-'));
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

    _showConfirmation(options) {
        if (this._confirmation)
            return null;
        const {
            originWidget = global.stage.get_key_focus(),
            onConfirm,
            ...overlayOptions
        } = options;
        const overlay = this.dialog.contentLayout;
        const previousChild = overlay.get_children()[0];
        if (previousChild)
            previousChild.hide();

        let component;
        const cleanup = () => {
            if (!this._confirmation)
                return;
            this._confirmation = null;
            component.root.destroy();
            if (previousChild)
                previousChild.show();
            this._restoreFocus(originWidget);
        };

        component = createConfirmationOverlay({
            ...overlayOptions,
            onCancel: cleanup,
            onConfirm: () => {
                cleanup();
                onConfirm?.();
            },
        });
        overlay.add_child(component.root);
        this.dialog._applyPanelOpacity?.();
        this._confirmation = {
            cleanup,
            cancelBtn: component.cancelButton,
            confirmBtn: component.confirmButton,
        };
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            try { component.cancelButton.grab_key_focus(); } catch (_e) {}
            return GLib.SOURCE_REMOVE;
        });
        return this._confirmation;
    }

    _confirmSuspendWithInhibitors(inhibitors, action = null) {
        const originWidget = this._navWidgets.find(widget => widget._saActionId === action?.id) ?? global.stage.get_key_focus();
        const details = inhibitors.map(item =>
            '• ' + item.who + ': ' + item.why + ' (' + item.mode + ')').join('\n');
        this._showConfirmation({
            originWidget,
            heading: 'Applications are inhibiting sleep',
            body: 'These applications may be preventing or delaying suspend. Forcing suspend ignores their inhibitor locks and could interrupt ongoing work.',
            details,
            rootStyle: 'spacing: 12px; min-width: 320px; max-width: 460px; padding: 18px;',
            accessibleName: 'Suspend confirmation',
            accessibleDescription: 'Applications are holding sleep inhibitors. Forcing suspend ignores those locks and could interrupt ongoing work.',
            bodyAccessibleDescription: 'These applications may be preventing or delaying suspend. Forcing suspend ignores their inhibitor locks and could interrupt ongoing work.',
            detailsAccessibleName: 'Applications holding sleep inhibitors',
            detailsAccessibleDescription: details,
            cancelLabel: 'Cancel',
            cancelAccessibleName: 'Cancel suspend',
            cancelAccessibleDescription: 'Cancel suspend and leave the applications holding inhibitors undisturbed.',
            confirmLabel: 'Force suspend',
            confirmAccessibleName: 'Force suspend despite sleep inhibitors',
            confirmAccessibleDescription: 'Force the computer to suspend even though applications are blocking sleep. This may interrupt ongoing work.',
            onConfirm: () => {
                this._runTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                    this._runTimeoutId = 0;
                    this._run(['systemctl', '--ignore-inhibitors', 'suspend'], 'Force suspend');
                    return GLib.SOURCE_REMOVE;
                });
            },
        });
    }

    _confirmThenRun(action) {
        const originWidget = this._navWidgets.find(widget => widget._saActionId === action.id) ?? global.stage.get_key_focus();
        const actionLabel = action.label.toLowerCase();
        const consequence = 'This will ' + actionLabel + ' the machine now. Any unsaved work will be lost.';
        this._showConfirmation({
            originWidget,
            heading: action.label + '?',
            body: consequence,
            accessibleName: 'Confirm ' + actionLabel,
            accessibleDescription: consequence,
            cancelLabel: 'Cancel',
            cancelAccessibleName: 'Cancel ' + actionLabel,
            cancelAccessibleDescription: 'Cancel ' + actionLabel + '; no action will be taken.',
            confirmLabel: action.label,
            confirmAccessibleName: 'Confirm ' + actionLabel,
            confirmAccessibleDescription: consequence,
            onConfirm: () => {
                this._runTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                    this._runTimeoutId = 0;
                    this._run(action.cmd, action.label, action.id.startsWith('custom-'));
                    return GLib.SOURCE_REMOVE;
                });
            },
        });
    }

    handleDialogKeyPress(sym, _event) {
        if (!this._confirmation || sym !== Clutter.KEY_Escape)
            return false;
        this._confirmation.cleanup();
        return true;
    }

    _notifyActionFailure(actionLabel, error) {
        logError(error, `material-system-actions: ${actionLabel} failed`);
        const notice = getActionFailureNotice(actionLabel);
        try {
            Main.notify(notice.title, notice.message);
        } catch (notifyError) {
            logError(notifyError, 'material-system-actions: could not display action failure notification');
        }
    }

    _run(cmd, actionLabel = 'Action', auditCustomAction = false) {
        let completion;
        try {
            completion = spawnCommand(cmd, actionLabel, auditCustomAction);
        } catch (error) {
            this._notifyActionFailure(actionLabel, error);
            return false;
        }
        this.dialog.close();
        completion.catch(error => this._notifyActionFailure(actionLabel, error));
        return true;
    }

    makeIcon(iconName, size = 22) {
        return new St.Icon({icon_name: iconName, icon_size: Math.round(size)});
    }
}
