// SPDX-License-Identifier: GPL-2.0-or-later
// Port of PillWindow:1443 — compact status pill + icon row
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class PillStyle extends BaseStyle {
    buildUI() {
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel', style: 'spacing: 12px; min-width: 300px; padding: 16px;'});
        const header = new St.BoxLayout({style_class: 'sa-pill-btn', style: 'spacing: 8px; padding: 6px 10px; border-radius: 999px; background-color: rgba(255,255,255,0.08);', x_align: Clutter.ActorAlign.START});
        header.add_child(new St.Label({text: (GLib.get_user_name()||'U').slice(0,2).toUpperCase(), style_class: 'sa-avatar', style: 'width: 28px; height: 28px; border-radius: 999px; font-size: 0.8em; text-align: center;'}));
        header.add_child(new St.Label({text: GLib.get_user_name(), y_align: Clutter.ActorAlign.CENTER}));
        box.add_child(header);

        this._uptimeLabel = new St.Label({style_class: 'sa-muted', x_align: Clutter.ActorAlign.START});
        box.add_child(this._uptimeLabel);

        const row = new St.BoxLayout({style: 'spacing: 10px;'});
        for (const a of this.actions.all) {
            const tier = this.actionTier(a);
            const btn = new St.Button({style_class: `sa-circle-btn sa-tier-${tier}`, can_focus: true, style: 'width: 40px; height: 40px; border-radius: 999px;'});
            btn.set_child(this.makeIcon(a.icon, 16));
            btn.connect('clicked', () => this.trigger(a));
            row.add_child(btn);
        }
        box.add_child(row);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });
        return box;
    }

    _tick() { this._uptimeLabel.text = `uptime: ${getUptime()}`; }
}
