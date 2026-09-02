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
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel-flat sa-mono sa-layout-tui', style: 'min-width: 400px; padding: 10px; font-family: monospace;'});
        box.add_child(new St.Label({text: '┌' + '─'.repeat(WIDTH) + '┐', x_align: Clutter.ActorAlign.START}));
        box.add_child(new St.Label({text: (`│ system actions ── ${GLib.get_user_name()}@${GLib.get_host_name()}`.padEnd(WIDTH+1)) + '│', x_align: Clutter.ActorAlign.START}));
        box.add_child(new St.Label({text: '│' + ' '.repeat(WIDTH) + '│', x_align: Clutter.ActorAlign.START}));

        this._rows = [];
        this._idx = 0;
        this._btns = [];
        for (let i = 0; i < this.actions.all.length; i++) {
            const a = this.actions.all[i];
            const isFocused = i === 0;
            const label = new St.Label({text: this._tuiText(a.key, a.label, isFocused), style_class: isFocused ? 'sa-tui-selected' : (a.destructive ? 'sa-danger-text' : ''), x_align: Clutter.ActorAlign.START, style: 'padding: 2px 0;'});
            const btn = new St.Button({can_focus: true, x_expand: true, style: 'padding: 0; border: none; background: transparent;'});
            btn.set_child(label);
            btn.connect('clicked', () => this.trigger(a));
            btn.connect('key-focus-in', () => this._select(this._btns.indexOf(btn)));
            box.add_child(btn);
            this._rows.push({label, action: a});
            this._btns.push(btn);
            this.registerNav(btn);
        }
        box.add_child(new St.Label({text: '│' + ' '.repeat(WIDTH) + '│', x_align: Clutter.ActorAlign.START}));
        box.add_child(new St.Label({text: '├' + '─'.repeat(WIDTH) + '┤', x_align: Clutter.ActorAlign.START}));
        this._statusLabel = new St.Label({x_align: Clutter.ActorAlign.START});
        box.add_child(this._statusLabel);
        box.add_child(new St.Label({text: '└' + '─'.repeat(WIDTH) + '┘', x_align: Clutter.ActorAlign.START}));

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });
        return box;
    }

    _tuiText(key, label, focused) {
        let text = focused ? ` > [${key}] ${label}` : `   [${key}] ${label}`;
        text = ('│' + text).padEnd(43) + '│';
        return text;
    }

    onKeyPress(sym) {
        if (!this._rows.length)
            return false;
        if (sym === Clutter.KEY_Up || sym === Clutter.KEY_Left || sym === Clutter.KEY_k || sym === Clutter.KEY_h) { this._select(this._idx - 1); return true; }
        if (sym === Clutter.KEY_Down || sym === Clutter.KEY_Right || sym === Clutter.KEY_j || sym === Clutter.KEY_l) { this._select(this._idx + 1); return true; }
        if (sym === Clutter.KEY_Return || sym === Clutter.KEY_KP_Enter || sym === Clutter.KEY_space) { this.trigger(this._rows[this._idx].action); return true; }
        return false;
    }

    _select(idx) {
        const n = this._rows.length;
        if (!n)
            return;
        idx = ((idx % n) + n) % n;
        const old = this._rows[this._idx];
        if (old) {
            old.label.remove_style_class_name('sa-tui-selected');
            if (old.action.destructive) old.label.add_style_class_name('sa-danger-text');
            const a = old.action;
            old.label.text = this._tuiText(a.key, a.label, false);
        }
        this._idx = idx;
        this._focusedIdx = this._btns.indexOf(this._btns[idx]);
        const cur = this._rows[this._idx];
        cur.label.remove_style_class_name('sa-danger-text');
        cur.label.add_style_class_name('sa-tui-selected');
        cur.label.text = this._tuiText(cur.action.key, cur.action.label, true);
        const btn = this._btns[idx];
        if (btn) try { btn.grab_key_focus(); } catch (_e) { btn.grab_focus?.(); }
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._statusLabel.text = (`│ ${now.format('%H:%M:%S')}  ·  up ${getUptime()}`.padEnd(43)) + '│';
    }
}
