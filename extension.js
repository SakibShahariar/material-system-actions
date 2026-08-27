// SPDX-License-Identifier: GPL-2.0-or-later

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {SystemActionsDialog} from './lib/dialog.js';

export default class MaterialSystemActionsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._dialog = null;

        Main.wm.addKeybinding(
            'toggle-system-actions',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._toggle()
        );
    }

    disable() {
        Main.wm.removeKeybinding('toggle-system-actions');
        this._dialog?.close();
        this._dialog = null;
        this._settings = null;
    }

    _toggle() {
        if (this._dialog) {
            this._dialog.close();
            this._dialog = null;
            return;
        }
        this._dialog = new SystemActionsDialog(this._settings);
        this._dialog.connect('closed', () => {
            this._dialog = null;
        });
        this._dialog.open();
    }
}
