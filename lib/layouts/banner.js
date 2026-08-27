// SPDX-License-Identifier: GPL-2.0-or-later
// Port of BannerWindow:1477 — wallpaper banner + pill + icon row
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class BannerStyle extends BaseStyle {
    buildUI() {
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel-flat', style: 'min-width: 340px; border-radius: 16px; overflow: hidden;'});
        const bannerContent = new St.Widget({style: 'height: 120px; background-color: rgba(255,255,255,0.06);', x_expand: true, layout_manager: new Clutter.BinLayout()});
        const wallpaperPath = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'background.jpg']);
        const file = Gio.File.new_for_path(wallpaperPath);
        if (file.query_exists(null)) {
            try {
                const gicon = Gio.FileIcon.new(file);
                const img = new St.Icon({gicon, icon_size: 340, style: 'width: 340px; height: 120px;'});
                bannerContent.add_child(img);
            } catch (_e) { bannerContent.add_child(new St.Icon({icon_name: 'image-x-generic-symbolic', icon_size: 30, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER})); }
        } else {
            bannerContent.add_child(new St.Icon({icon_name: 'image-x-generic-symbolic', icon_size: 30, x_expand: true, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER}));
        }

        // badge overlay simulated as top-left box inside bannerContent via BinLayout add with position
        const badge = new St.BoxLayout({style_class: 'sa-banner-badge', style: 'spacing: 6px; padding: 4px 10px 4px 4px; border-radius: 999px; background-color: rgba(0,0,0,0.4);', x_align: Clutter.ActorAlign.START, y_align: Clutter.ActorAlign.START});
        badge.add_child(new St.Label({text: (GLib.get_user_name()||'U').slice(0,2).toUpperCase(), style_class: 'sa-avatar', style: 'width: 18px; height: 18px; font-size: 0.65em; text-align: center;'}));
        badge.add_child(new St.Label({text: GLib.get_user_name(), y_align: Clutter.ActorAlign.CENTER}));
        // place badge via adding to bannerContent with alignment
        bannerContent.add_child(badge);

        box.add_child(bannerContent);

        const footer = new St.BoxLayout({vertical: true, style: 'spacing: 8px; padding: 8px 14px 14px;'});
        this._uptimeLabel = new St.Label({style_class: 'sa-muted', x_align: Clutter.ActorAlign.START});
        footer.add_child(this._uptimeLabel);
        const row = new St.BoxLayout({style: 'spacing: 8px;'});
        for (const a of this.actions.all) {
            const tier = this.actionTier(a);
            const btn = new St.Button({style_class: `sa-circle-btn sa-tier-${tier}`, can_focus: true, style: 'width: 36px; height: 36px; border-radius: 999px;'});
            btn.set_child(this.makeIcon(a.icon, 15));
            btn.connect('clicked', () => this.trigger(a));
            row.add_child(btn);
        }
        footer.add_child(row);
        box.add_child(footer);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });
        return box;
    }

    _tick() { this._uptimeLabel.text = `uptime: ${getUptime()}`; }
}
