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

        // Escape handled here; layout handles Left/Right/Up/Down via key-press if needed
        this.connect('key-press-event', (_a, event) => {
            const sym = event.get_key_symbol();
            if (sym === Clutter.KEY_Escape) { this.close(); return Clutter.EVENT_STOP; }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    open(timestamp) {
        super.open(timestamp);
        this._applyPosition();
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
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => { this._applyPosition(); return GLib.SOURCE_REMOVE; });
    }

    close() {
        super.close();
    }
});
