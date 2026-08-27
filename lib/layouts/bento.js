// SPDX-License-Identifier: GPL-2.0-or-later
// Port of BentoWindow:1047 — asymmetric bento dashboard

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';

export class BentoStyle extends BaseStyle {
    buildUI() {
        const outer = new St.BoxLayout({style_class: 'sa-panel-flat sa-grid-seam', style: 'spacing: 1px; padding: 6px;'});
        // Use vertical box to emulate grid: 2 rows
        const col0 = new St.BoxLayout({vertical: true, style: 'spacing: 1px; width: 36px;'});
        // vertical SYSTEM label emulated via BoxLayout letters
        for (const ch of 'SYSTEM') {
            col0.add_child(new St.Label({text: ch, style_class: 'sa-heading-lg', x_align: Clutter.ActorAlign.CENTER, style: 'font-size: 0.7em; letter-spacing: 0.08em;'}));
        }
        outer.add_child(col0);

        const map = Object.fromEntries(this.actions.all.map(a => [a.id, a]));
        const hero = map['lock'];
        const rest = this.actions.all.filter(a => a.id !== 'lock');

        const main = new St.BoxLayout({vertical: true, style: 'spacing: 1px;'});
        const topRow = new St.BoxLayout({style: 'spacing: 1px;'});
        if (hero) {
            const heroBtn = this._tile(hero, 180, 76, 30, true);
            topRow.add_child(heroBtn);
        }
        const clockBox = new St.BoxLayout({vertical: true, style: 'padding: 12px; min-width: 110px;', y_align: Clutter.ActorAlign.CENTER});
        this._clockLabel = new St.Label({style: 'font-size: 1.4em; font-weight: 700;', x_align: Clutter.ActorAlign.CENTER});
        this._dateLabel = new St.Label({style_class: 'sa-muted', x_align: Clutter.ActorAlign.CENTER});
        clockBox.add_child(this._clockLabel);
        clockBox.add_child(this._dateLabel);
        topRow.add_child(clockBox);
        if (rest[0]) topRow.add_child(this._tile(rest[0], 96, 76, 22, false));
        main.add_child(topRow);

        const bottomRow = new St.BoxLayout({style: 'spacing: 1px;'});
        for (const a of rest.slice(1)) bottomRow.add_child(this._tile(a, 96, 76, 22, false));
        main.add_child(bottomRow);
        outer.add_child(main);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });
        return outer;
    }

    _tile(action, w, h, iconSize, hero) {
        const tier = this.actionTier(action);
        const btn = new St.Button({style_class: `sa-tile-btn sa-tier-${tier} ${hero ? 'sa-hero' : ''}`, can_focus: true, style: `width: ${w}px; height: ${h}px;`});
        const content = new St.BoxLayout({vertical: true, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 8px;'});
        content.add_child(this.makeIcon(action.icon, iconSize));
        content.add_child(new St.Label({text: action.label, style_class: 'sa-tile-label', x_align: Clutter.ActorAlign.CENTER}));
        btn.set_child(content);
        btn.connect('clicked', () => this.trigger(action));
        return btn;
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._clockLabel.text = now.format('%H:%M') ?? '';
        this._dateLabel.text = now.format('%a %d') ?? '';
    }
}
