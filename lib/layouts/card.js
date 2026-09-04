// SPDX-License-Identifier: GPL-2.0-or-later
// Material Card layout — compact header, grouped actions, shared M3 interaction states.

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class CardStyle extends BaseStyle {
    buildUI() {
        const box = new St.BoxLayout({
            vertical: true,
            style_class: 'sa-panel sa-layout-card',
            style: 'width: 780px; padding: 30px 30px 28px; spacing: 0;',
        });

        // Header: use the user's GNOME face image when available, otherwise initials.
        const header = new St.BoxLayout({
            style_class: 'sa-card-header',
            x_expand: true,
            style: 'min-height: 92px;',
        });

        const avatar = this._avatar();
        header.add_child(avatar);

        const info = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 2px; margin-left: 18px;',
        });
        const user = new St.Label({
            text: GLib.get_user_name() || 'User',
            x_align: Clutter.ActorAlign.START,
            style_class: 'sa-card-user',
        });
        this._metaLabel = new St.Label({
            style_class: 'sa-muted sa-card-meta',
            x_align: Clutter.ActorAlign.START,
        });
        info.add_child(user);
        info.add_child(this._metaLabel);
        header.add_child(info);

        const clockBox = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.END,
            style: 'spacing: 0; min-width: 130px;',
        });
        this._clockLabel = new St.Label({
            x_align: Clutter.ActorAlign.END,
            style_class: 'sa-card-clock',
        });
        this._dateLabel = new St.Label({
            style_class: 'sa-muted sa-card-date',
            x_align: Clutter.ActorAlign.END,
        });
        clockBox.add_child(this._clockLabel);
        clockBox.add_child(this._dateLabel);
        header.add_child(clockBox);
        box.add_child(header);

        box.add_child(new St.Label({
            text: 'System Actions',
            style_class: 'sa-card-title',
            x_align: Clutter.ActorAlign.CENTER,
            style: 'margin-top: 48px; margin-bottom: 34px;',
        }));

        if (this.actions.session.length)
            box.add_child(this._section('SESSION', this.actions.session));

        if (this.actions.power.length)
            box.add_child(this._section('POWER', this.actions.power));

        const cancel = new St.Button({
            label: 'Cancel',
            style_class: 'sa-pill-btn sa-tier-primary sa-card-cancel',
            can_focus: true,
            style: 'min-width: 128px; min-height: 54px; margin-top: 14px; border-radius: 16px;',
            x_align: Clutter.ActorAlign.CENTER,
        });
        cancel.connect('clicked', () => this.dialog.close());
        this.styleActionButton(cancel);
        this.registerNav(cancel);
        box.add_child(cancel);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._tick();
            return GLib.SOURCE_CONTINUE;
        });
        this.dialog.connect('closed', () => {
            if (this._tickId) {
                GLib.source_remove(this._tickId);
                this._tickId = 0;
            }
        });

        return box;
    }

    _avatar() {
        const path = GLib.build_filenamev([GLib.get_home_dir(), '.face']);
        const file = Gio.File.new_for_path(path);

        if (file.query_exists(null)) {
            try {
                const avatar = new St.Icon({
                    gicon: Gio.FileIcon.new(file),
                    icon_size: 88,
                    style_class: 'sa-card-avatar-image',
                    style: 'width: 88px; height: 88px; border-radius: 14px;',
                });
                return avatar;
            } catch (_e) {}
        }

        return new St.Label({
            text: (GLib.get_user_name() || 'U').slice(0, 2).toUpperCase(),
            style_class: 'sa-avatar',
            style: 'width: 88px; height: 88px; border-radius: 14px; font-size: 1.8em; text-align: center;',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
    }

    _section(title, actions) {
        const sec = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style: 'spacing: 18px; margin-bottom: 28px;',
        });

        const heading = new St.Label({
            text: title,
            style_class: 'sa-heading sa-card-section',
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            style: 'min-width: 110px; min-height: 24px;',
        });
        sec.add_child(heading);

        const row = new St.BoxLayout({
            x_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 14px;',
        });

        for (const action of actions)
            row.add_child(this._pill(action));

        sec.add_child(row);
        return sec;
    }

    _pill(action) {
        const tier = this.actionTier(action);
        const btn = new St.Button({
            style_class: `sa-pill-btn sa-tier-${tier} sa-card-action`,
            can_focus: true,
            style: 'width: 148px; min-width: 148px; height: 58px; border-radius: 16px;',
        });

        const content = new St.BoxLayout({
            style: 'spacing: 12px;',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        content.add_child(this.makeIcon(action.icon, 24));
        content.add_child(new St.Label({
            text: action.label,
            style_class: 'sa-pill-label',
            x_align: Clutter.ActorAlign.CENTER,
        }));

        btn.set_child(content);
        btn.connect('clicked', () => this.trigger(action));
        this.styleActionButton(btn, action);
        this.registerNav(btn);
        return btn;
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._clockLabel.text = now.format('%H:%M') ?? '';
        this._dateLabel.text = now.format('%a %d %b') ?? '';
        const host = `${GLib.get_user_name()} · ${GLib.get_host_name()} · up ${getUptime()}`;
        this._metaLabel.text = host;
    }
}
