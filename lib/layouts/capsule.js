// SPDX-License-Identifier: GPL-2.0-or-later
// Port of capsule pills (was end4):1355 — end-4/dots-hyprland rounded pill rows
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';

export class CapsuleStyle extends BaseStyle {
    buildUI() {
        const box = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'sa-panel sa-layout-capsule', style: 'spacing: 10px; min-width: 340px; padding: 20px;'});
        const header = new St.BoxLayout({style_class: 'sa-header-pill', style: 'spacing: 10px; padding: 8px 12px; border-radius: 16px;'});
        header.add_child(new St.Label({text: (GLib.get_user_name()||'U').slice(0,2).toUpperCase(), style_class: 'sa-avatar', style: 'width: 36px; height: 36px; text-align: center;'}));
        header.add_child(new St.Label({text: GLib.get_user_name(), x_expand: true, x_align: Clutter.ActorAlign.START, y_align: Clutter.ActorAlign.CENTER}));
        this._clockLabel = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        header.add_child(this._clockLabel);
        box.add_child(header);

        const nonDestructive = this.actions.all.filter(a => !a.destructive);
        const destructive = this.actions.all.filter(a => a.destructive);
        for (const a of nonDestructive) box.add_child(this._pillRow(a));
        if (destructive.length) {
            const row = new St.BoxLayout({style: 'spacing: 8px;'});
            for (const a of destructive) {
                const btn = this._tile(a, -1, 80, 20, true);
                btn.x_expand = true;
                row.add_child(btn);
            }
            box.add_child(row);
        }

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });
        return box;
    }

    _pillRow(action) {
        const tier = this.actionTier(action);
        const btn = new St.Button({style_class: `sa-pill-btn sa-tier-${tier}`, can_focus: true, x_expand: true, style: 'padding: 10px 16px; border-radius: 999px;'});
        const row = new St.BoxLayout({style: 'spacing: 12px;', x_expand: true});
        const badge = new St.Widget({style_class: `sa-row-icon-badge sa-tier-${tier}`, style: 'width: 32px; height: 32px; border-radius: 999px;'});
        badge.add_child(this.makeIcon(action.icon, 16));
        row.add_child(badge);
        row.add_child(new St.Label({text: action.label, style_class: 'sa-pill-label', x_expand: true, x_align: Clutter.ActorAlign.START, y_align: Clutter.ActorAlign.CENTER}));
        btn.set_child(row);
        btn.connect('clicked', () => this.trigger(action));
        this.registerNav(btn);
        return btn;
    }

    _tile(action, w, h, iconSize, round) {
        const tier = this.actionTier(action);
        const style = `${w>0?`width:${w}px;`:''} height:${h}px; ${round?'border-radius:24px;':''}`;
        const btn = new St.Button({style_class: `sa-tile-btn sa-tier-${tier} ${round?'sa-round':''}`, can_focus: true, style});
        const content = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 4px;'});
        content.add_child(this.makeIcon(action.icon, iconSize));
        content.add_child(new St.Label({text: action.label, x_align: Clutter.ActorAlign.CENTER}));
        btn.set_child(content);
        btn.connect('clicked', () => this.trigger(action));
        this.registerNav(btn);
        return btn;
    }

    _tick() { const now = GLib.DateTime.new_now_local(); this._clockLabel.text = now.format('%H:%M') ?? ''; }
}
