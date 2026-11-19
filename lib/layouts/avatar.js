// SPDX-License-Identifier: GPL-2.0-or-later
// Port of AvatarWindow:1417 — big avatar + text list menu
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import {BaseStyle} from './base.js';

export class AvatarStyle extends BaseStyle {
    buildUI() {
        const row = new St.BoxLayout({style_class: 'sa-panel sa-layout-avatar', style: 'spacing: 0; padding: 20px;', x_align: Clutter.ActorAlign.CENTER});
        const avatar = this._buildAvatar(96, 'border-radius: 999px; font-size: 1.9em; text-align: center;');
        avatar.y_align = Clutter.ActorAlign.CENTER;
        row.add_child(avatar);

        const menu = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style: 'spacing: 4px; margin-left: 16px; min-width: 200px;'});
        const userLabel = new St.Label({text: `${GLib.get_user_name()}@${GLib.get_host_name()}`, style_class: 'sa-muted', x_align: Clutter.ActorAlign.START});
        this.bindStatusWidget(userLabel);
        menu.add_child(userLabel);
        for (const a of this.actions.all) {
            const tier = this.actionTier(a);
            const btn = new St.Button({style_class: `sa-text-row sa-tier-${tier}`, can_focus: true, x_expand: true, style: 'padding: 8px 12px; min-height: 36px; border-left: 2px solid transparent; border-radius: 10px;'});
            const content = new St.BoxLayout({style: 'spacing: 10px;', x_align: Clutter.ActorAlign.CENTER});
            content.add_child(this.makeIcon(a.icon, 18));
            content.add_child(new St.Label({text: a.label, x_align: Clutter.ActorAlign.START}));
            const contentWrap = new St.Bin({x_expand: true});
            contentWrap.set_child(content);
            btn.set_child(contentWrap);
            btn.connect('clicked', () => this.trigger(a));
            this.registerNav(btn, a);
            menu.add_child(btn);
        }
        row.add_child(menu);
        return row;
    }
}
