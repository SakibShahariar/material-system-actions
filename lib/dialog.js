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
import {INTERACTION_STATE_DURATION_MS} from './interaction-timing.js';
import {getStateTransitionDuration} from './motion.js';
import {handleKeyboardNavigation} from './keyboard-navigation.js';

export const SystemActionsDialog = GObject.registerClass(
class SystemActionsDialog extends ModalDialog {
    _init(settings, styleOverride = null, previewMode = false) {
        super._init({styleClass: 'system-actions-dialog', destroyOnClose: true});
        this._settings = settings;
        this._previewMode = previewMode;
        this.dialogLayout.set_style('background-color: transparent; border: none; box-shadow: none; padding: 0;');
        this.contentLayout.set_style('background-color: transparent; padding: 0; margin: 0;');
        this.buttonLayout.hide();

        const theme = loadTheme();
        this._theme = theme;
        this._applyThemeColors();
        this._actions = getActions(settings);

        const requestedStyleName = previewMode && STYLES[styleOverride] ? styleOverride : (settings.get_string('style') || DEFAULT_STYLE);
        this._styleName = STYLES[requestedStyleName] ? requestedStyleName : DEFAULT_STYLE;
        const StyleClass = STYLES[this._styleName];
        this._style = new StyleClass(this, theme, this._actions);

        if (previewMode) {
            try {
                this.dialogLayout.accessible_name = 'System actions preview';
                this.dialogLayout.accessible_description = 'Preview mode. Actions are disabled and will not execute.';
            } catch (_e) {}
            this.contentLayout.add_child(new St.Label({
                text: 'PREVIEW · actions are disabled',
                style_class: 'sa-preview-banner',
                accessible_name: 'Preview mode. Actions are disabled and will not execute.',
                x_align: Clutter.ActorAlign.CENTER,
            }));
        }

        const built = this._actions.allHidden ? this._buildEmptyState() : this._style.buildUI();
        this._styleRoot = built;
        this.contentLayout.add_child(built);
        this._applyUiScale();
        this._scaleHandlerId = this._settings.connect('changed::icon-scale', () => this._applyUiScale());
        this._applyPanelOpacity();
        this._opacityHandlerId = this._settings.connect('changed::panel-opacity', () => this._applyPanelOpacity());
        this._applyBackdropDim();
        this._dimHandlerId = this._settings.connect('changed::backdrop-dim-enabled', () => this._applyBackdropDim());

        // Keyboard behavior is centralized and independently testable.
        const keyboardContext = {
            style: this._style,
            actions: this._actions,
            keys: {
                escape: Clutter.KEY_Escape,
                enter: Clutter.KEY_Return,
                keypadEnter: Clutter.KEY_KP_Enter,
                space: Clutter.KEY_space,
                tab: Clutter.KEY_Tab,
                isoLeftTab: Clutter.KEY_ISO_Left_Tab,
                left: Clutter.KEY_Left,
                right: Clutter.KEY_Right,
                up: Clutter.KEY_Up,
                down: Clutter.KEY_Down,
                h: Clutter.KEY_h,
                k: Clutter.KEY_k,
                l: Clutter.KEY_l,
                j: Clutter.KEY_j,
                one: Clutter.KEY_1,
                nine: Clutter.KEY_9,
                keypadOne: Clutter.KEY_KP_1,
                keypadNine: Clutter.KEY_KP_9,
            },
            keysymToUnicode: sym => Clutter.keysym_to_unicode(sym),
            eventStop: Clutter.EVENT_STOP,
            eventPropagate: Clutter.EVENT_PROPAGATE,
            getKeyFocus: () => global.stage.get_key_focus(),
            closeDialog: () => this.close(),
        };
        this.connect('key-press-event', (_a, event) =>
            handleKeyboardNavigation(event, keyboardContext));;
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
        const monitors = Main.layoutManager.monitors ?? [];
        if (!monitors.length) return;

        // Position relative to the display the pointer is actually on, rather
        // than forcing every non-centered layout onto the primary monitor.
        const [pointerX, pointerY] = global.get_pointer();
        const monitor = monitors.find(monitor =>
            pointerX >= monitor.x && pointerX < monitor.x + monitor.width &&
            pointerY >= monitor.y && pointerY < monitor.y + monitor.height
        ) ?? Main.layoutManager.primaryMonitor;
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

    _buildEmptyState() {
        const emptyState = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'sa-panel sa-empty-state',
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        emptyState.add_child(new St.Label({
            text: 'No actions are visible',
            style_class: 'sa-empty-state-title',
            x_align: Clutter.ActorAlign.CENTER,
        }));
        emptyState.add_child(new St.Label({
            text: 'Open Preferences and enable at least one action under System actions.',
            style_class: 'sa-empty-state-message',
            line_wrap: true,
            x_align: Clutter.ActorAlign.CENTER,
        }));
        return emptyState;
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
        // Glow/ring colors derived from the theme roles loaded for this popup (GTK derives the
        // focus outline from var(--primary); St can't color-mix, so precompute
        // the tinted rgba for each role here).
        const glowVars = ['primary', 'secondary', 'error'].flatMap(role => {
            const base = theme[role];
            if (!base)
                return [];
            return [
                `--sa-glow-${role}: ${hexToRgba(base, 0.20)};`,
                `--sa-glow-${role}-soft: ${hexToRgba(base, 0.16)};`,
            ];
        });
        // Replace any existing declarations so each theme role has one effective value.
        const current = (this.dialogLayout.get_style?.() ?? '')
            .replace(/--[a-z0-9_-]+\s*:\s*[^;]+;/g, '')
            .trim();
        // Shell actor easing already follows St.Settings.enable_animations;
        // keep our CSS-only state transitions consistent with that preference.
        const stateDuration = getStateTransitionDuration(
            St.Settings.get().enable_animations,
            INTERACTION_STATE_DURATION_MS);
        const stateTiming = `--sa-state-transition-duration: ${stateDuration}ms;`;
        this.dialogLayout.set_style(`${current} ${variables} ${stateTiming} ${glowVars.join(' ')}`);
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
