// SPDX-License-Identifier: GPL-2.0-or-later
// Port of RadialWindow:996 — icons on circle around clock hub

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';

export class RadialStyle extends BaseStyle {
    buildUI() {
        const size = 320;
        const cx = size / 2, cy = size / 2;
        const r = 118;

        const fixed = new Clutter.Actor({width: size, height: size, layout_manager: new Clutter.FixedLayout()});
        // wrap fixed in St.Widget for ModalDialog
        const wrapper = new St.Widget({style_class: 'sa-panel sa-layout-radial', style: 'padding: 16px; border-radius: 999px;', layout_manager: new Clutter.BinLayout()});
        wrapper.add_child(fixed);

        // guide circle dashed
        const guide = new St.Widget({style_class: 'sa-guide-circle', style: `width: ${r*2}px; height: ${r*2}px; border-radius: 999px; border: 1px dashed rgba(255,255,255,0.2);`});
        guide.set_position(Math.round(cx - r), Math.round(cy - r));
        fixed.add_child(guide);

        // hub
        const hubBtn = new St.Button({style_class: 'sa-circle-btn', style: 'width: 110px; height: 110px; border-radius: 999px;', can_focus: true});
        const hubBox = new St.BoxLayout({vertical: true, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER});
        this._clockLabel = new St.Label({style: 'font-size: 1.4em; font-weight: 700;', x_align: Clutter.ActorAlign.CENTER});
        hubBox.add_child(this._clockLabel);
        hubBox.add_child(new St.Label({text: 'TAP TO CANCEL', style_class: 'sa-muted', x_align: Clutter.ActorAlign.CENTER, style: 'font-size: 0.6em;'}));
        hubBtn.set_child(hubBox);
        hubBtn.connect('clicked', () => this.dialog.close());
        this.registerNav(hubBtn);
        hubBtn.set_position(Math.round(cx - 55), Math.round(cy - 55));
        fixed.add_child(hubBtn);

        const n = Math.max(1, this.actions.all.length);
        for (let i = 0; i < this.actions.all.length; i++) {
            const a = this.actions.all[i];
            const angle = (2 * Math.PI * i / n) - Math.PI / 2;
            const x = cx + r * Math.cos(angle) - 28;
            const y = cy + r * Math.sin(angle) - 28;
            const tier = this.actionTier(a);
            const col = new St.BoxLayout({vertical: true, style: 'spacing: 4px;', x_align: Clutter.ActorAlign.CENTER});
            const btn = new St.Button({style_class: `sa-circle-btn sa-tier-${tier}`, can_focus: true, style: 'width: 56px; height: 56px; border-radius: 999px;'});
            btn.set_child(this.makeIcon(a.icon, 18));
            btn.connect('clicked', () => this.trigger(a));
            this.registerNav(btn);
            col.add_child(btn);
            col.add_child(new St.Label({text: a.label.toUpperCase(), style_class: 'sa-circle-label', x_align: Clutter.ActorAlign.CENTER, style: 'font-size: 0.6em;'}));
            // wrap col in actor for positioning
            const actor = new St.Widget({layout_manager: new Clutter.BinLayout()});
            actor.add_child(col);
            actor.set_position(Math.round(x), Math.round(y - 12));
            fixed.add_child(actor);
        }

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });

        // size wrapper to fixed size
        wrapper.set_size(size + 20, size + 20);
        return wrapper;
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._clockLabel.text = now.format('%H:%M') ?? '';
    }
}
