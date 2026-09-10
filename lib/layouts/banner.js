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
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel-flat sa-layout-banner', style: 'min-width: 360px; border-radius: 24px; overflow: hidden;'});
        const bannerContent = new St.Widget({style: 'height: 120px; background-color: rgba(255,255,255,0.06);', x_expand: true, layout_manager: new Clutter.FixedLayout()});
        const wallpaperPath = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'background.jpg']);
        const file = Gio.File.new_for_path(wallpaperPath);
        const placeholder = () => {
            const icon = new St.Icon({icon_name: 'image-x-generic-symbolic', icon_size: 30});
            icon.set_position(155, 45);
            bannerContent.add_child(icon);
        };
        if (file.query_exists(null)) {
            try {
                const paintScale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
                const img = St.TextureCache.get_default().load_file_async(file, 340, 120, paintScale, 1);
                img.set_position(0, 0);
                bannerContent.add_child(img);
            } catch (_e) {
                placeholder();
            }
        } else {
            placeholder();
        }

        // badge overlay pinned top-left over the banner
        const badge = new St.BoxLayout({style_class: 'sa-banner-badge', style: 'spacing: 6px; padding: 4px 10px 4px 4px; border-radius: 999px; background-color: rgba(0,0,0,0.4);'});
        badge.add_child(new St.Label({text: (GLib.get_user_name()||'U').slice(0,2).toUpperCase(), style_class: 'sa-avatar', style: 'width: 18px; height: 18px; font-size: 0.65em; text-align: center;'}));
        badge.add_child(new St.Label({text: GLib.get_user_name(), y_align: Clutter.ActorAlign.CENTER}));
        badge.set_position(10, 10);
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
            this.registerNav(btn);
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
