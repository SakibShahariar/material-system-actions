// SPDX-License-Identifier: GPL-2.0-or-later
// Port of CirclesWindow:1398 — floating vertical circle stack, no card
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import {BaseStyle} from './base.js';

export class CirclesStyle extends BaseStyle {
    buildUI() {
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel sa-layout-circles', style: 'spacing: 12px; padding: 16px; min-width: 76px;', x_align: Clutter.ActorAlign.CENTER});
        for (const a of this.actions.all) {
            const tier = this.actionTier(a);
            const btn = new St.Button({style_class: `sa-circle-btn sa-circle-hero sa-tier-${tier}`, can_focus: true, style: 'width: 52px; height: 52px; border-radius: 999px;'});
            btn.set_child(this.makeIcon(a.icon, 18));
            btn.connect('clicked', () => this.trigger(a));
            this.registerNav(btn);
            box.add_child(btn);
        }
        return box;
    }
}
