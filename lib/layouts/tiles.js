// SPDX-License-Identifier: GPL-2.0-or-later
// Port of square tiles (was wlogout):1224 — horizontal square tile row, colored top border on focus
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import {BaseStyle} from './base.js';

export class TilesStyle extends BaseStyle {
    buildUI() {
        const row = new St.BoxLayout({style: 'spacing: 14px; padding: 20px;', x_align: Clutter.ActorAlign.CENTER});
        for (const a of this.actions.all) {
            const tier = this.actionTier(a);
            const btn = new St.Button({style_class: `sa-tile-btn sa-sharp sa-tier-${tier}`, can_focus: true, style: 'width: 96px; height: 96px; border-radius: 0;'});
            const content = new St.BoxLayout({vertical: true, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 8px;'});
            content.add_child(this.makeIcon(a.icon, 28));
            content.add_child(new St.Label({text: a.label, style_class: 'sa-tile-label', x_align: Clutter.ActorAlign.CENTER}));
            btn.set_child(content);
            btn.connect('clicked', () => this.trigger(a));
            row.add_child(btn);
        }
        return row;
    }
}
