// SPDX-License-Identifier: GPL-2.0-or-later
// Port of AvatarWindow:1417 — big avatar + text list menu
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import {BaseStyle} from './base.js';

export class AvatarStyle extends BaseStyle {
    buildUI() {
        const row = new St.BoxLayout({style_class: 'sa-panel', style: 'spacing: 0; padding: 16px;', x_align: Clutter.ActorAlign.CENTER});
        const avatar = new St.Label({text: (GLib.get_user_name()||'U').slice(0,2).toUpperCase(), style_class: 'sa-avatar', style: 'width: 120px; height: 120px; border-radius: 999px; font-size: 2.2em; text-align: center; background-color: rgba(255,255,255,0.12);'});
        row.add_child(avatar);

        const menu = new St.BoxLayout({vertical: true, style: 'spacing: 4px; margin-left: 16px; min-width: 200px;'});
        menu.add_child(new St.Label({text: `${GLib.get_user_name()}@${GLib.get_host_name()}`, style_class: 'sa-muted', x_align: Clutter.ActorAlign.START}));
        for (const a of this.actions.all) {
            const tier = this.actionTier(a);
            const btn = new St.Button({style_class: `sa-text-row sa-tier-${tier}`, can_focus: true, x_expand: true, style: 'padding: 6px 8px; border-left: 2px solid transparent; border-radius: 8px;'});
            const content = new St.BoxLayout({style: 'spacing: 8px;'});
            content.add_child(this.makeIcon(a.icon, 15));
            content.add_child(new St.Label({text: a.label, x_align: Clutter.ActorAlign.START}));
            btn.set_child(content);
            btn.connect('clicked', () => this.trigger(a));
            menu.add_child(btn);
        }
        row.add_child(menu);
        return row;
    }
}
