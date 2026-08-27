// SPDX-License-Identifier: GPL-2.0-or-later
// Port of TuiWindow:1106 — whiptail/dialog box-drawing popup

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class TuiStyle extends BaseStyle {
    buildUI() {
        const WIDTH = 42;
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel-flat sa-mono', style: 'min-width: 400px; padding: 4px; font-family: monospace;'});
        box.add_child(new St.Label({text: '┌' + '─'.repeat(WIDTH) + '┐', x_align: Clutter.ActorAlign.START}));
        box.add_child(new St.Label({text: (`│ system actions ── ${GLib.get_user_name()}@${GLib.get_host_name()}`.padEnd(WIDTH+1)) + '│', x_align: Clutter.ActorAlign.START}));
        box.add_child(new St.Label({text: '│' + ' '.repeat(WIDTH) + '│', x_align: Clutter.ActorAlign.START}));

        this._rows = [];
        this._idx = 0;
        for (let i = 0; i < this.actions.all.length; i++) {
            const a = this.actions.all[i];
            const isFocused = i === 0;
            const label = new St.Label({text: this._tuiText(a.key, a.label, isFocused, a.destructive), style_class: isFocused ? 'sa-tui-selected' : (a.destructive ? 'sa-danger-text' : ''), x_align: Clutter.ActorAlign.START, style: 'padding: 2px 0;'});
            // clickable
            const btn = new St.Button({can_focus: true, x_expand: true, style: 'padding: 0;'});
            btn.set_child(label);
            btn.connect('clicked', () => this.trigger(a));
            box.add_child(btn);
            this._rows.push({label, action: a});
        }
        box.add_child(new St.Label({text: '│' + ' '.repeat(WIDTH) + '│', x_align: Clutter.ActorAlign.START}));
        box.add_child(new St.Label({text: '├' + '─'.repeat(WIDTH) + '┤', x_align: Clutter.ActorAlign.START}));
        this._statusLabel = new St.Label({x_align: Clutter.ActorAlign.START});
        box.add_child(this._statusLabel);
        box.add_child(new St.Label({text: '└' + '─'.repeat(WIDTH) + '┘', x_align: Clutter.ActorAlign.START}));

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });

        this.dialog.connect('key-press-event', (_a, evt) => {
            const sym = evt.get_key_symbol();
            if (sym === Clutter.KEY_Up || sym === Clutter.KEY_Left) { this._select(this._idx - 1); return Clutter.EVENT_STOP; }
            if (sym === Clutter.KEY_Down || sym === Clutter.KEY_Right) { this._select(this._idx + 1); return Clutter.EVENT_STOP; }
            if (sym === Clutter.KEY_Return) { this.trigger(this._rows[this._idx].action); return Clutter.EVENT_STOP; }
            return Clutter.EVENT_PROPAGATE;
        });

        return box;
    }

    _tuiText(key, label, focused, destructive) {
        let text = focused ? ` > [${key}] ${label}` : `   [${key}] ${label}`;
        text = ('│' + text).padEnd(43) + '│';
        return text;
    }

    _select(idx) {
        const n = this._rows.length;
        idx = ((idx % n) + n) % n;
        this._rows[this._idx].label.remove_style_class_name('sa-tui-selected');
        this._idx = idx;
        this._rows[this._idx].label.add_style_class_name('sa-tui-selected');
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._statusLabel.text = (`│ ${now.format('%H:%M:%S')}  ·  up ${getUptime()}`.padEnd(43)) + '│';
    }
}
