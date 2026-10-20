// SPDX-License-Identifier: GPL-2.0-or-later

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {SystemActionsDialog} from './lib/dialog.js';

const DBUS_NAME = 'org.gnome.Shell.Extensions.MaterialSystemActions';
const DBUS_PATH = '/org/gnome/Shell/Extensions/MaterialSystemActions';
const DBUS_XML = `<node><interface name="org.gnome.Shell.Extensions.MaterialSystemActions"><method name="Open"/><method name="Close"/><method name="Toggle"/></interface></node>`;

export default class MaterialSystemActionsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._dialog = null;
        this._dbusObject = null;
        this._dbusOwnerId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            DBUS_NAME,
            Gio.BusNameOwnerFlags.NONE,
            connection => {
                this._dbusObject = Gio.DBusExportedObject.wrapJSObject(DBUS_XML, {
                    Open: () => this._open(),
                    Close: () => this._close(),
                    Toggle: () => this._toggle(),
                });
                this._dbusObject.export(connection, DBUS_PATH);
            },
            () => {},
            () => log('material-system-actions: could not own D-Bus session name'),
        );

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
        this._close();
        this._dbusObject?.unexport();
        this._dbusObject = null;
        if (this._dbusOwnerId) {
            Gio.bus_unown_name(this._dbusOwnerId);
            this._dbusOwnerId = 0;
        }
        this._settings = null;
    }

    _open() {
        if (this._dialog)
            return;
        this._dialog = new SystemActionsDialog(this._settings);
        this._dialog.connect('closed', () => {
            this._dialog = null;
        });
        this._dialog.open();
    }

    _close() {
        if (!this._dialog)
            return;
        const dialog = this._dialog;
        this._dialog = null;
        dialog.close();
    }

    _toggle() {
        if (this._dialog)
            this._close();
        else
            this._open();
    }
}
