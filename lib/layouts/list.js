// SPDX-License-Identifier: GPL-2.0-or-later
// Port of RofiWindow:770 — keyboard-first list (was rofi) keyboard-first list

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class ListStyle extends BaseStyle {
    buildUI() {
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel-flat sa-mono', style: 'min-width: 340px;'});
        // top bar
        const top = new St.BoxLayout({style_class: 'sa-bar sa-bar-top', x_expand: true, style: 'spacing: 6px; padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.1);'});
        top.add_child(new St.Label({text: `${GLib.get_user_name()}@${GLib.get_host_name()}`, x_expand: true, x_align: Clutter.ActorAlign.START}));
        this._clockTop = new St.Label({x_align: Clutter.ActorAlign.END});
        top.add_child(this._clockTop);
        box.add_child(top);

        box.add_child(new St.Label({text: 'SYSTEM ACTIONS', style_class: 'sa-heading', x_align: Clutter.ActorAlign.START, style: 'padding: 8px 0 0 12px;'}));

        const list = new St.BoxLayout({vertical: true, style: 'spacing: 2px; padding: 6px 0;'});
        for (const a of this.actions.all) {
            const row = this._rofiRow(a);
            list.add_child(row);
        }
        box.add_child(list);

        box.add_child(new St.Label({text: '↑↓/jk move   enter select   letter jump   esc quit', style_class: 'sa-muted', x_align: Clutter.ActorAlign.START, style: 'padding: 0 0 6px 12px; font-size: 0.75em;'}));

        const bottom = new St.BoxLayout({style_class: 'sa-bar sa-bar-bottom', x_expand: true, style: 'spacing: 6px; padding: 6px 12px; border-top: 1px solid rgba(255,255,255,0.1);'});
        this._dateLabel = new St.Label({x_expand: true, x_align: Clutter.ActorAlign.START});
        this._uptimeLabel = new St.Label({x_align: Clutter.ActorAlign.END});
        bottom.add_child(this._dateLabel);
        bottom.add_child(this._uptimeLabel);
        box.add_child(bottom);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });

        // key handling: dialog already grabs Esc, we handle j/k etc via dialog key-press
        this.dialog.connect('key-press-event', (_a, evt) => {
            const sym = evt.get_key_symbol();
            if (sym === Clutter.KEY_j || sym === Clutter.KEY_Down) { this._move(1); return Clutter.EVENT_STOP; }
            if (sym === Clutter.KEY_k || sym === Clutter.KEY_Up) { this._move(-1); return Clutter.EVENT_STOP; }
            if (sym === Clutter.KEY_Return) { const focused = global.stage.get_key_focus(); if (focused) focused.emit('clicked'); return Clutter.EVENT_STOP; }
            return Clutter.EVENT_PROPAGATE;
        });

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
        // faux focus style via :focus in CSS, but add sa-focused on hover
        return btn;
    }

    _move(delta) {
        // no-op: visual move not tracked in St, relies on focus traversal
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._clockTop.text = now.format('%H:%M:%S') ?? '';
        this._dateLabel.text = now.format('%a %d %b') ?? '';
        this._uptimeLabel.text = `up ${getUptime()}`;
    }
}
