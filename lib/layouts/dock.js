// SPDX-License-Identifier: GPL-2.0-or-later
// Port of DockWindow:1198 — Wayland edge vertical icon dock
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import {BaseStyle} from './base.js';

export class DockStyle extends BaseStyle {
    buildUI() {
        this.position = 'left-edge';
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel sa-layout-dock', style: 'spacing: 10px; padding: 14px 10px; min-width: 72px;'});
        for (const a of this.actions.session) {
            const btn = this._circle(a, true);
            box.add_child(btn);
        }
        if (this.actions.session.length && this.actions.power.length) {
            box.add_child(new St.Widget({style: 'height: 1px; background-color: rgba(255,255,255,0.15); margin: 4px 0;'}));
        }
        for (const a of this.actions.power) {
            const btn = this._circle(a, false);
            box.add_child(btn);
        }
        // cancel at bottom
        const cancel = new St.Button({style_class: 'sa-circle-btn', can_focus: true, style: 'width: 44px; height: 44px; border-radius: 14px;', x_align: Clutter.ActorAlign.CENTER});
        cancel.set_child(this.makeIcon('window-close-symbolic', 16));
        cancel.connect('clicked', () => this.dialog.close());
        this.registerNav(cancel);
        box.add_child(cancel);
        return box;
    }

    _circle(action) {
        const tier = this.actionTier(action);
        const btn = new St.Button({style_class: `sa-circle-btn sa-squircle sa-tier-${tier}`, can_focus: true, style: 'width: 44px; height: 44px; border-radius: 14px;'});
        btn.set_child(this.makeIcon(action.icon, 16));
        btn.connect('clicked', () => this.trigger(action));
        this.registerNav(btn);
        return btn;
    }
}
