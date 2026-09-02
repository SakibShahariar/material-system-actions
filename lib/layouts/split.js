// SPDX-License-Identifier: GPL-2.0-or-later
// Port of clock+dock split (was quickshell):887 — big clock + circular icon dock, split panel

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class SplitStyle extends BaseStyle {
    buildUI() {
        const outer = new St.BoxLayout({style_class: 'sa-panel sa-layout-split', style: 'spacing: 28px; padding: 24px;'});
        const root = new St.BoxLayout({style: 'spacing: 28px;'});

        const left = new St.BoxLayout({vertical: true, style: 'spacing: 2px; min-width: 160px;'});
        this._clockLabel = new St.Label({style: 'font-size: 2.2em; font-weight: 800;'});
        this._dateLabel = new St.Label({style_class: 'sa-muted'});
        left.add_child(this._clockLabel);
        left.add_child(this._dateLabel);
        this._metaLabel = new St.Label({style_class: 'sa-muted', style: 'margin-top: 14px;'});
        left.add_child(this._metaLabel);
        root.add_child(left);

        const icons = new St.BoxLayout({vertical: true, style: 'spacing: 14px;'});
        let row = null;
        for (let i = 0; i < this.actions.all.length; i++) {
            if (i % 3 === 0) { row = new St.BoxLayout({style: 'spacing: 14px;', x_align: Clutter.ActorAlign.CENTER}); icons.add_child(row); }
            const a = this.actions.all[i];
            row.add_child(this._circleWithLabel(a));
        }
        root.add_child(icons);
        outer.add_child(root);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });

        return outer;
    }

    _circleWithLabel(action) {
        const tier = this.actionTier(action);
        const col = new St.BoxLayout({vertical: true, style: 'spacing: 6px;', x_align: Clutter.ActorAlign.CENTER});
        const btn = new St.Button({style_class: `sa-circle-btn sa-tier-${tier}`, can_focus: true, style: 'width: 60px; height: 60px; border-radius: 999px;'});
        btn.set_child(this.makeIcon(action.icon, 20));
        btn.connect('clicked', () => this.trigger(action));
        this.registerNav(btn);
        col.add_child(btn);
        col.add_child(new St.Label({text: action.label.toUpperCase(), style_class: 'sa-circle-label', x_align: Clutter.ActorAlign.CENTER, style: 'font-size: 0.65em; letter-spacing: 0.05em;'}));
        return col;
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._clockLabel.text = now.format('%H:%M') ?? '';
        this._dateLabel.text = now.format('%A, %d %b') ?? '';
        this._metaLabel.text = `${GLib.get_user_name()}@${GLib.get_host_name()}\nup ${getUptime()}`;
    }
}
