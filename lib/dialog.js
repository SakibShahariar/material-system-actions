// SPDX-License-Identifier: GPL-2.0-or-later

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {ModalDialog} from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {loadTheme, hexToRgba} from './theme.js';
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
        this._theme = theme;
        this._applyThemeColors();
        this._actions = getActions();

        const styleName = settings.get_string('style') || DEFAULT_STYLE;
        const StyleClass = STYLES[styleName] ?? STYLES[DEFAULT_STYLE];
        this._style = new StyleClass(this, theme, this._actions);

        const built = this._style.buildUI();
        this._styleRoot = built;
        this.contentLayout.add_child(built);
        this._applyUiScale();
        this._scaleHandlerId = this._settings.connect('changed::icon-scale', () => this._applyUiScale());
        this._applyPanelOpacity();
        this._opacityHandlerId = this._settings.connect('changed::panel-opacity', () => this._applyPanelOpacity());
        this._applyBackdropDim();
        this._dimHandlerId = this._settings.connect('changed::backdrop-dim-enabled', () => this._applyBackdropDim());

        // Centralized keyboard nav — prototype BaseWindow.on_key parity
        // Esc = close, arrows/jk/hl/Tab = move, Enter/Space = activate, letter/digit = hotkey
        this.connect('key-press-event', (_a, event) => {
            const sym = event.get_key_symbol();
            const unicode = Clutter.keysym_to_unicode(sym);
            // A confirmation overlay owns Escape while it is visible.
            if (this._style.handleDialogKeyPress?.(sym, event))
                return Clutter.EVENT_STOP;

            // While a destructive confirmation is showing, swallow every
            // shortcut so actions can't fire behind it. Only Enter/Space are
            // meaningful: they activate the focused Cancel/Confirm button.
            if (this._style._confirmation) {
                if (sym === Clutter.KEY_Return || sym === Clutter.KEY_KP_Enter || sym === Clutter.KEY_space) {
                    const focused = global.stage.get_key_focus();
                    if (focused && typeof focused.emit === 'function') {
                        try { this._style.pressFlash?.(focused); focused.emit('clicked'); } catch (_e) {}
                    }
                }
                return Clutter.EVENT_STOP;
            }

            // Escape always
            if (sym === Clutter.KEY_Escape) { this.close(); return Clutter.EVENT_STOP; }

            // Letter hotkey (prototype BaseWindow: chr(keyval_to_unicode).lower()).
            // Checked before hjkl nav and layout handlers so an action key such
            // as 'l' (Lock) is never shadowed by movement.
            if (unicode) {
                const ch = String.fromCharCode(unicode).toLowerCase();
                const map = this._style._keyMap || {};
                if (ch && map[ch]) { this._style.trigger(map[ch]); return Clutter.EVENT_STOP; }
            }

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
                    try { this._style.pressFlash?.(focused); focused.emit('clicked'); return Clutter.EVENT_STOP; } catch (_e) {}
                }
                const idx = this._style._focusedIdx ?? 0;
                const w = this._style._navWidgets?.[idx];
                if (w) { this._style.pressFlash?.(w); w.emit('clicked'); return Clutter.EVENT_STOP; }
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
        // Re-apply the user dim level: ModalDialog._fadeOpen calls
        // lightbox.lightOn(), which eases the radial brightness back to the
        // stock 0.5 and would otherwise override the configured backdrop dim.
        this._applyBackdropDim();
        // grab initial focus like prototype BaseWindow._grab_initial_focus
        if (this._style.grabInitialFocus) this._style.grabInitialFocus();
        else GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            const focused = this._style._navWidgets?.[0];
            if (focused) try { focused.grab_key_focus(); } catch (_e) { focused.grab_focus?.(); }
            return GLib.SOURCE_REMOVE;
        });
    }

    _applyBackdropDim() {
        let enabled = true;
        try { enabled = this._settings.get_boolean('backdrop-dim-enabled'); } catch (_e) {}
        const lb = this._lightbox;
        if (!lb) return;
        try {
            // Radial lightbox (used by ModalDialog): the 'brightness' uniform
            // is inverted — 0.5 dims (stock shell), 1.0 is fully transparent.
            const radial = lb.get_effect('radial');
            if (radial) {
                if (enabled) {
                    const props = {duration: 250, mode: Clutter.AnimationMode.EASE_OUT_QUAD};
                    lb.ease_property('@effects.radial.brightness', 0.5, props);
                    lb.ease_property('@effects.radial.sharpness', 0.7, props);
                } else {
                    // lightbox.lightOn() started an ease to 0.5 in super.open().
                    // A competing ease to 1.0 would first compose that in-flight
                    // transition to its end value for one frame — a visible 1ms
                    // dim flash. Cancel it and set the uniform directly before
                    // the next paint instead.
                    lb.remove_all_transitions();
                    radial.brightness = 1.0;
                    radial.sharpness = 0.0;
                }
                return;
            }
            // Non-radial fallback shades by actor opacity (inverted too).
            lb.set_opacity(enabled ? Math.round(255 * 0.5) : 0);
        } catch (_e) {}
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

    _applyUiScale() {
        let s = 1.0;
        try { s = this._settings.get_double('icon-scale'); } catch (_e) {}
        if (Number.isNaN(s) || s <= 0) s = 1.0;
        const root = this._styleRoot;
        if (!root) return;
        try {
            // Uniform zoom: transform the panel around its center so text,
            // icons, geometry and hit areas all grow together. The layout
            // box's visual center stays put, so centering is unaffected.
            root.pivot_point = {x: 0.5, y: 0.5};
            root.scale_x = s;
            root.scale_y = s;
        } catch (_e) {}
    }

    _applyPanelOpacity() {
        let opacity = 1.0;
        try { opacity = this._settings.get_double('panel-opacity'); } catch (_e) {}
        if (Number.isNaN(opacity)) opacity = 1.0;
        opacity = Math.max(0, Math.min(1, opacity));

        // Translucency belongs on the panel's own surface, never the text:
        // alpha-fading the whole popup made labels unreadable, especially
        // once the backdrop dim can be turned off. Blend the surface role
        // color into the scene and leave every label fully opaque.
        const target = this._styleRoot;
        if (!target) return;
        const base = this._theme?.surface_container_low;
        if (!base) return;
        try {
            const bg = hexToRgba(base, opacity);
            const current = target.get_style?.() ?? '';
            const stripped = current.replace(/background-color:[^;]*;?/g, '').trim();
            target.set_style(`${stripped} background-color: ${bg};`);
        } catch (_e) {}
    }

    _applyThemeColors() {
        const theme = this._theme;
        if (!theme || !this.dialogLayout)
            return;
        // St inherits custom properties on supported Shell versions. On older
        // versions the stylesheet's explicit fallback colors remain in effect.
        const variables = Object.entries(theme)
            .filter(([name, value]) => name !== 'scale' && typeof value === 'string')
            .map(([name, value]) => `--${name}: ${value};`)
            .join(' ');
        const current = this.dialogLayout.get_style?.() ?? '';
        this.dialogLayout.set_style(`${current} ${variables}`);
    }

    close() {
        if (this._scaleHandlerId) {
            try { this._settings.disconnect(this._scaleHandlerId); } catch (_e) {}
            this._scaleHandlerId = 0;
        }
        if (this._opacityHandlerId) {
            try { this._settings.disconnect(this._opacityHandlerId); } catch (_e) {}
            this._opacityHandlerId = 0;
        }
        if (this._dimHandlerId) {
            try { this._settings.disconnect(this._dimHandlerId); } catch (_e) {}
            this._dimHandlerId = 0;
        }
        // cleanup tick timers owned by style
        try { if (this._style._tickId) { GLib.source_remove(this._style._tickId); this._style._tickId = 0; } } catch (_e) {}
        try { if (this._style._holdId) { GLib.source_remove(this._style._holdId); this._style._holdId = 0; } } catch (_e) {}
        try { if (this._style._runTimeoutId) { GLib.source_remove(this._style._runTimeoutId); this._style._runTimeoutId = 0; } } catch (_e) {}
        super.close();
    }
});
