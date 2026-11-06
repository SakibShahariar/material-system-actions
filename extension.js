// SPDX-License-Identifier: GPL-2.0-or-later

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {SystemActionsDialog} from './lib/dialog.js';
import {cleanupProcesses} from './lib/process.js';
import {STYLES, DEFAULT_STYLE} from './lib/layouts/registry.js';

const DBUS_NAME = 'org.gnome.Shell.Extensions.MaterialSystemActions';
const DBUS_PATH = '/org/gnome/Shell/Extensions/MaterialSystemActions';
const DBUS_XML = `<node><interface name="org.gnome.Shell.Extensions.MaterialSystemActions"><method name="Open"/><method name="Close"/><method name="Toggle"/><method name="Preview"><arg name="style" type="s" direction="in"/></method><method name="GetStatus"><arg name="version" type="s" direction="out"/><arg name="layout" type="s" direction="out"/><arg name="preview" type="b" direction="out"/></method></interface></node>`;

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
                    Preview: params => this._preview(params.deep_unpack()[0]),
                    GetStatus: () => this._getStatus(),
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
        cleanupProcesses();
        this._dbusObject?.unexport();
        this._dbusObject = null;
        if (this._dbusOwnerId) {
            Gio.bus_unown_name(this._dbusOwnerId);
            this._dbusOwnerId = 0;
        }
        this._settings = null;
    }

    _getStatus() {
        const configuredStyle = this._settings.get_string('style') || DEFAULT_STYLE;
        const activeStyle = this._dialog?._styleName ??
            (STYLES[configuredStyle] ? configuredStyle : DEFAULT_STYLE);
        return new GLib.Variant('(ssb)', [
            String(this.metadata?.version ?? 'unreleased'),
            activeStyle,
            Boolean(this._dialog?._previewMode),
        ]);
    }

    _open() {
        if (this._dialog)
            return;
        const dialog = new SystemActionsDialog(this._settings);
        this._dialog = dialog;
        dialog.connect('closed', () => {
            if (this._dialog === dialog) this._dialog = null;
        });
        dialog.open();
    }

    _close() {
        if (!this._dialog)
            return;
        const dialog = this._dialog;
        this._dialog = null;
        dialog.close();
    }

    _preview(styleName) {
        this._close();
        const dialog = new SystemActionsDialog(this._settings, styleName, true);
        this._dialog = dialog;
        dialog.connect('closed', () => {
            if (this._dialog === dialog) this._dialog = null;
        });
        dialog.open();
    }

    _toggle() {
        if (this._dialog)
            this._close();
        else
            this._open();
    }
}
