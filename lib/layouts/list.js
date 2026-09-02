// SPDX-License-Identifier: GPL-2.0-or-later
// Port of RofiWindow:770 — keyboard-first list (was rofi)

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class ListStyle extends BaseStyle {
    buildUI() {
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel-flat sa-mono sa-layout-list', style: 'min-width: 360px;'});
        const top = new St.BoxLayout({style_class: 'sa-bar sa-bar-top', x_expand: true, style: 'spacing: 6px; padding: 6px 12px;'});
        top.add_child(new St.Label({text: `${GLib.get_user_name()}@${GLib.get_host_name()}`, x_expand: true, x_align: Clutter.ActorAlign.START}));
        this._clockTop = new St.Label({x_align: Clutter.ActorAlign.END});
        top.add_child(this._clockTop);
        box.add_child(top);

        box.add_child(new St.Label({text: 'SYSTEM ACTIONS', style_class: 'sa-heading', x_align: Clutter.ActorAlign.START, style: 'padding: 8px 0 0 12px;'}));

        this._rows = [];
        this._idx = 0;
        const list = new St.BoxLayout({vertical: true, style: 'spacing: 2px; padding: 6px 0;'});
        for (const a of this.actions.all) {
            const row = this._rofiRow(a);
            list.add_child(row);
            this._rows.push(row);
        }
        box.add_child(list);
        if (this._rows.length) GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => { this._select(0); return GLib.SOURCE_REMOVE; });

        box.add_child(new St.Label({text: '↑↓/jk move   enter select   letter jump   esc quit', style_class: 'sa-muted', x_align: Clutter.ActorAlign.START, style: 'padding: 0 0 6px 12px; font-size: 0.75em;'}));

        const bottom = new St.BoxLayout({style_class: 'sa-bar sa-bar-bottom', x_expand: true, style: 'spacing: 6px; padding: 6px 12px;'});
        this._dateLabel = new St.Label({x_expand: true, x_align: Clutter.ActorAlign.START});
        this._uptimeLabel = new St.Label({x_align: Clutter.ActorAlign.END});
        bottom.add_child(this._dateLabel);
        bottom.add_child(this._uptimeLabel);
        box.add_child(bottom);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });
        return box;
    }

    _rofiRow(action) {
        const tier = this.actionTier(action);
        const btn = new St.Button({style_class: `sa-rofi-row sa-tier-${tier}`, can_focus: true, x_expand: true, style: 'padding: 8px 12px; border-left: 3px solid transparent;'});
        const row = new St.BoxLayout({style: 'spacing: 10px;'});
        const badge = new St.Label({text: action.key.toUpperCase(), style_class: 'sa-rofi-key', style: 'min-width: 24px; border: 1px solid rgba(255,255,255,0.2); padding: 0 4px; font-size: 0.7em; font-weight: 700; text-align: center;'});
        row.add_child(badge);
        row.add_child(new St.Label({text: action.label, y_align: Clutter.ActorAlign.CENTER}));
        btn.set_child(row);
        btn.connect('clicked', () => this.trigger(action));
        btn.connect('key-focus-in', () => this._select(this._rows.indexOf(btn)));
        this.registerNav(btn);
        return btn;
    }

    onKeyPress(sym) {
        if (sym === Clutter.KEY_j || sym === Clutter.KEY_Down || sym === Clutter.KEY_Right) { this._move(1); return true; }
        if (sym === Clutter.KEY_k || sym === Clutter.KEY_Up || sym === Clutter.KEY_Left) { this._move(-1); return true; }
        if (sym === Clutter.KEY_Return || sym === Clutter.KEY_KP_Enter) { this.trigger(this.actions.all[this._idx]); return true; }
        return false;
    }

    _move(delta) {
        this._select(this._idx + delta);
    }

    _select(idx) {
        if (!this._rows.length) return;
        idx = ((idx % this._rows.length) + this._rows.length) % this._rows.length;
        this._idx = idx;
        this._focusedIdx = idx;
        const w = this._rows[idx];
        if (w) try { w.grab_key_focus(); } catch (_e) { w.grab_focus?.(); }
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._clockTop.text = now.format('%H:%M:%S') ?? '';
        this._dateLabel.text = now.format('%a %d %b') ?? '';
        this._uptimeLabel.text = `up ${getUptime()}`;
    }
}
