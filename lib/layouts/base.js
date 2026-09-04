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
    buildUI() { return new St.BoxLayout({vertical: true}); }

    registerNav(widget) {
        if (widget && !this._navWidgets.includes(widget))
            this._navWidgets.push(widget);
        return widget;
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

        const confirmBox = new St.BoxLayout({vertical: true, style_class: 'sa-panel', style: 'spacing: 12px; min-width: 300px;'});
        confirmBox.add_child(new St.Label({text: `${action.label}?`, style: 'font-weight: 700; font-size: 1.1em;', x_align: Clutter.ActorAlign.CENTER}));
        confirmBox.add_child(new St.Label({text: `This will ${action.label.toLowerCase()} the machine now. Any unsaved work will be lost.`, style_class: 'sa-muted', x_align: Clutter.ActorAlign.CENTER, style: 'text-align: center;'}));
        const btnRow = new St.BoxLayout({style: 'spacing: 10px;', x_align: Clutter.ActorAlign.CENTER});
        const cancelBtn = new St.Button({label: 'Cancel', style_class: 'sa-pill-btn sa-tier-primary', can_focus: true});
        const confirmBtn = new St.Button({label: action.label, style_class: 'sa-pill-btn sa-tier-error', can_focus: true});
        this.styleActionButton(cancelBtn);
        this.styleActionButton(confirmBtn);
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

    _stripPaint(style) {
        return (style ?? '')
            .replace(/(?:^|;)\s*(?:background(?:-color)?|color|border(?:-color)?|box-shadow)\s*:[^;]*;?/gi, ';')
            .replace(/;;+/g, ';')
            .trim();
    }

    _paint(actor, paint) {
        const geometry = this._stripPaint(actor.get_style?.() ?? '');
        const rules = Object.entries(paint)
            .filter(([, value]) => value != null && value !== '')
            .map(([property, value]) => `${property}: ${value};`)
            .join(' ');
        actor.set_style(`${geometry}${geometry && rules ? ' ' : ''}${rules}`);
    }

    _role(role, fallback = '#000000') {
        return this.theme?.[role] ?? fallback;
    }

    /**
     * Apply Material roles and interaction states directly to St.Button.
     * St's CSS engine does not reliably support CSS custom properties, so
     * role values are resolved from the Matugen file in JavaScript.
     *
     * normal  -> tonal surface
     * hover   -> primary/error/secondary
     * focus   -> normal + two-layer ring
     * pressed -> filled + stronger ring
     */
    styleActionButton(button, action = null) {
        if (!button || button._saStyled)
            return button;

        button._saStyled = true;
        button._saHovered = false;
        button._saFocused = false;
        button._saPressed = false;

        const tier = action ? this.actionTier(action) :
            (button.has_style_class_name?.('sa-tier-error') ? 'error' :
             button.has_style_class_name?.('sa-tier-secondary') ? 'secondary' : 'primary');

        const roles = {
            primary: {
                normalBg: this._role('surface_container_high', '#36271e'),
                normalFg: this._role('primary', '#ffb689'),
                hoverBg: this._role('primary', '#ffb689'),
                hoverFg: this._role('on_primary', '#512300'),
                ring: this._role('primary', '#ffb689'),
            },
            secondary: {
                normalBg: this._role('surface_container', '#2a1d14'),
                normalFg: this._role('on_surface', '#f8ddcf'),
                hoverBg: this._role('secondary', '#ecbe91'),
                hoverFg: this._role('on_secondary', '#48290b'),
                ring: this._role('secondary', '#ecbe91'),
            },
            error: {
                normalBg: this._role('error_container', '#93000a'),
                normalFg: this._role('error', '#ffb4ab'),
                hoverBg: this._role('error', '#ffb4ab'),
                hoverFg: this._role('on_error', '#690005'),
                ring: this._role('error', '#ffb4ab'),
            },
        }[tier] ?? {
            normalBg: this._role('surface_container', '#2a1d14'),
            normalFg: this._role('on_surface', '#f8ddcf'),
            hoverBg: this._role('primary', '#ffb689'),
            hoverFg: this._role('on_primary', '#512300'),
            ring: this._role('primary', '#ffb689'),
        };

        const refresh = () => {
            let bg = roles.normalBg;
            let fg = roles.normalFg;
            let border = this._role('outline_variant', '#544339');
            let shadow = 'none';

            if (button._saHovered || button._saPressed) {
                bg = roles.hoverBg;
                fg = roles.hoverFg;
                border = roles.hoverBg;
            }

            if (button._saPressed) {
                shadow = `0 0 0 2px ${this._role('surface_container_lowest', '#170b05')}, 0 0 0 4px ${roles.ring}, 0 2px 4px rgba(0,0,0,0.28)`;
            } else if (button._saFocused) {
                shadow = `0 0 0 2px ${this._role('surface_container_lowest', '#170b05')}, 0 0 0 4px ${roles.ring}`;
            } else if (button._saHovered) {
                shadow = `0 2px 8px rgba(0,0,0,0.20)`;
            }

            this._paint(button, {
                'background-color': bg,
                'color': fg,
                'border-color': border,
                'box-shadow': shadow,
            });

            const tintChildren = actor => {
                try {
                    for (const child of actor.get_children?.() ?? []) {
                        this._paint(child, {'color': fg});
                        tintChildren(child);
                    }
                } catch (_e) {}
            };
            tintChildren(button);
        };

        button.connect('notify::hover', () => {
            button._saHovered = button.hover;
            refresh();
        });
        button.connect('key-focus-in', () => {
            button._saFocused = true;
            refresh();
        });
        button.connect('key-focus-out', () => {
            button._saFocused = false;
            refresh();
        });
        button.connect('button-press-event', () => {
            button._saPressed = true;
            refresh();
            return Clutter.EVENT_PROPAGATE;
        });
        button.connect('button-release-event', () => {
            button._saPressed = false;
            refresh();
            return Clutter.EVENT_PROPAGATE;
        });

        refresh();
        return button;
    }

    applyThemeTree(root) {
        if (!root)
            return;

        const visit = actor => {
            if (!actor)
                return;

            try {
                if (actor.has_style_class_name?.('sa-panel') ||
                    actor.has_style_class_name?.('sa-panel-flat')) {
                    this._paint(actor, {
                        'color': this._role('on_surface', '#f8ddcf'),
                        'background-color': this._role('surface', '#1d1109'),
                        'border-color': this._role('outline', '#a28c80'),
                    });
                }

                if (actor.has_style_class_name?.('sa-header-pill')) {
                    this._paint(actor, {
                        'color': this._role('on_surface', '#f8ddcf'),
                        'background-color': this._role('surface_container', '#2a1d14'),
                        'border-color': this._role('outline_variant', '#544339'),
                    });
                }

                if (actor.has_style_class_name?.('sa-avatar')) {
                    this._paint(actor, {
                        'background-color': this._role('primary_container', '#733500'),
                        'color': this._role('on_primary_container', '#ffdbc8'),
                    });
                }

                if (actor.has_style_class_name?.('sa-muted') ||
                    actor.has_style_class_name?.('sa-heading')) {
                    this._paint(actor, {
                        'color': this._role('on_surface_variant', '#dac2b4'),
                    });
                }

                if (actor.has_style_class_name?.('sa-title') ||
                    actor.has_style_class_name?.('sa-heading-lg')) {
                    this._paint(actor, {
                        'color': this._role('primary', '#ffb689'),
                    });
                }

                if (actor.has_style_class_name?.('sa-danger-text')) {
                    this._paint(actor, {
                        'color': this._role('error', '#ffb4ab'),
                    });
                }

                if (actor.has_style_class_name?.('sa-dot')) {
                    this._paint(actor, {
                        'background-color': this._role('outline_variant', '#544339'),
                        'border-color': this._role('outline_variant', '#544339'),
                    });
                }

                if (actor.has_style_class_name?.('sa-dot-filled')) {
                    this._paint(actor, {
                        'background-color': this._role('error', '#ffb4ab'),
                    });
                }

                if (actor.has_style_class_name?.('sa-tui-selected')) {
                    this._paint(actor, {
                        'background-color': this._role('primary', '#ffb689'),
                        'color': this._role('on_primary', '#512300'),
                    });
                }

                if (actor.has_style_class_name?.('sa-row-icon-badge')) {
                    this._paint(actor, {
                        'background-color': actor.has_style_class_name?.('sa-tier-error')
                            ? this._role('error_container', '#93000a')
                            : this._role('surface_container_high', '#36271e'),
                        'border-color': this._role('outline_variant', '#544339'),
                    });
                }

                if (actor instanceof St.Button) {
                    this.styleActionButton(actor);
                }
            } catch (_e) {}

            try {
                for (const child of actor.get_children?.() ?? [])
                    visit(child);
            } catch (_e) {}
            try {
                const child = actor.get_child?.();
                if (child) visit(child);
            } catch (_e) {}
            try {
                if (actor.child) visit(actor.child);
            } catch (_e) {}
        };

        visit(root);
    }

    makeIcon(iconName, size = 22) {
        return new St.Icon({icon_name: iconName, icon_size: Math.round(size * (this.theme.scale ?? 1))});
    }
}
