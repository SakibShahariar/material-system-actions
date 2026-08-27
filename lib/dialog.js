// SPDX-License-Identifier: GPL-2.0-or-later

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {ModalDialog} from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {loadTheme} from './theme.js';
import {getActions} from './actions.js';
import {STYLES, DEFAULT_STYLE} from './layouts/registry.js';

export const SystemActionsDialog = GObject.registerClass(
class SystemActionsDialog extends ModalDialog {
    _init(settings) {
        super._init({styleClass: 'system-actions-dialog', destroyOnClose: true});
        this._settings = settings;
        this.dialogLayout.set_style('background-color: transparent; border: none; box-shadow: none; padding: 0;');
        this.contentLayout.set_style('background-color: transparent; padding: 0; margin: 0;');
        this.buttonLayout.hide();

        const theme = loadTheme();
        theme.scale = settings.get_double('icon-scale');
        theme.opacity = settings.get_double('background-opacity');
        this._theme = theme;
        this._actions = getActions();

        const styleName = settings.get_string('style') || DEFAULT_STYLE;
        const StyleClass = STYLES[styleName] ?? STYLES[DEFAULT_STYLE];
        this._style = new StyleClass(this, theme, this._actions);

        this.contentLayout.add_child(this._style.buildUI());

        // Centralized keyboard nav — prototype BaseWindow.on_key parity
        // Esc = close, arrows/jk/hl/Tab = move, Enter/Space = activate, letter/digit = hotkey
        this.connect('key-press-event', (_a, event) => {
            const sym = event.get_key_symbol();
            const unicode = Clutter.keysym_to_unicode(sym);
            // Escape always
            if (sym === Clutter.KEY_Escape) { this.close(); return Clutter.EVENT_STOP; }

            // Let layout handle first (tui, list, grid have custom select)
            if (this._style.onKeyPress && this._style.onKeyPress(sym, event)) return Clutter.EVENT_STOP;

            if (sym === Clutter.KEY_Left || sym === Clutter.KEY_Up || sym === Clutter.KEY_h || sym === Clutter.KEY_k || sym === Clutter.KEY_ISO_Left_Tab) {
                if (this._style.moveNav(-1)) return Clutter.EVENT_STOP;
            }
            if (sym === Clutter.KEY_Right || sym === Clutter.KEY_Down || sym === Clutter.KEY_l || sym === Clutter.KEY_j || sym === Clutter.KEY_Tab) {
                if (this._style.moveNav(1)) return Clutter.EVENT_STOP;
            }
            if (sym === Clutter.KEY_Return || sym === Clutter.KEY_KP_Enter || sym === Clutter.KEY_space) {
                const focused = global.stage.get_key_focus();
                if (focused && typeof focused.emit === 'function') {
                    // Prefer clicking focused button; fall back to style's focused idx
                    try { focused.emit('clicked'); return Clutter.EVENT_STOP; } catch (_e) {}
                }
                const idx = this._style._focusedIdx ?? 0;
                const w = this._style._navWidgets?.[idx];
                if (w) { w.emit('clicked'); return Clutter.EVENT_STOP; }
            }
            // Letter hotkey (prototype BaseWindow: chr(keyval_to_unicode).lower())
            if (unicode) {
                const ch = String.fromCharCode(unicode).toLowerCase();
                const map = this._style._keyMap || {};
                if (ch && map[ch]) { this._style.trigger(map[ch]); return Clutter.EVENT_STOP; }
            }
            // Digit 1-9 quick select (grid + generic)
            if (sym >= Clutter.KEY_1 && sym <= Clutter.KEY_9) {
                const idx = sym - Clutter.KEY_1;
                if (idx < this._actions.all.length) { this._style.trigger(this._actions.all[idx]); return Clutter.EVENT_STOP; }
            }
            if (sym >= Clutter.KEY_KP_1 && sym <= Clutter.KEY_KP_9) {
                const idx = sym - Clutter.KEY_KP_1;
                if (idx < this._actions.all.length) { this._style.trigger(this._actions.all[idx]); return Clutter.EVENT_STOP; }
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    open(timestamp) {
        super.open(timestamp);
        this._applyPosition();
        // grab initial focus like prototype BaseWindow._grab_initial_focus
        if (this._style.grabInitialFocus) this._style.grabInitialFocus();
        else GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            const focused = this._style._navWidgets?.[0];
            if (focused) try { focused.grab_key_focus(); } catch (_e) { focused.grab_focus?.(); }
            return GLib.SOURCE_REMOVE;
        });
    }

    _applyPosition() {
        const pos = this._style.position;
        if (!pos) return;
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;
        const [, w] = this.dialogLayout.get_preferred_width(-1);
        const [, h] = this.dialogLayout.get_preferred_height(-1);
        const margin = 32;
        let x = monitor.x + Math.floor((monitor.width - w) / 2);
        let y = monitor.y + Math.floor((monitor.height - h) / 2);
        switch (pos) {
            case 'top': y = monitor.y + margin; break;
            case 'bottom': y = monitor.y + monitor.height - h - margin; break;
            case 'left-edge': x = monitor.x + margin; y = monitor.y + margin; break;
            case 'fullscreen': x = monitor.x; y = monitor.y; break;
        }
        this.dialogLayout.set_position(x, y);
    }

    close() {
        // cleanup tick timers owned by style
        try { if (this._style._tickId) { GLib.source_remove(this._style._tickId); this._style._tickId = 0; } } catch (_e) {}
        try { if (this._style._holdId) { GLib.source_remove(this._style._holdId); this._style._holdId = 0; } } catch (_e) {}
        super.close();
    }
});
