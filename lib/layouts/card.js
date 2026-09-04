// SPDX-License-Identifier: GPL-2.0-or-later
// Card layout — compact Material 3 system-actions card.

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class CardStyle extends BaseStyle {
    buildUI() {
        // Keep the card itself compact and centered. The Bin is intentional:
        // ModalDialog/contentLayout can be allocated at the monitor width, but
        // the card must keep its own natural width instead of stretching.
        const frame = new St.Bin({
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            style: 'padding: 20px;',
        });

        const box = new St.BoxLayout({
            vertical: true,
            style_class: 'sa-panel sa-layout-card',
            x_align: Clutter.ActorAlign.CENTER,
        });
        frame.set_child(box);

        const header = new St.BoxLayout({
            style_class: 'sa-header-pill sa-card-header',
            style: 'spacing: 12px; padding: 10px 14px;',
            x_expand: true,
        });
        header.add_child(this._buildAvatar(44));

        const info = new St.BoxLayout({
            vertical: true,
            spacing: 1,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        info.add_child(new St.Label({
            text: GLib.get_user_name() || 'User',
            style_class: 'sa-card-user',
            x_align: Clutter.ActorAlign.START,
        }));
        this._metaLabel = new St.Label({
            style_class: 'sa-muted',
            x_align: Clutter.ActorAlign.START,
        });
        info.add_child(this._metaLabel);
        header.add_child(info);

        const clockBox = new St.BoxLayout({
            vertical: true,
            spacing: 0,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._clockLabel = new St.Label({
            style_class: 'sa-card-clock',
            x_align: Clutter.ActorAlign.END,
        });
        this._dateLabel = new St.Label({
            style_class: 'sa-muted',
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
        }));

        if (this.actions.session.length)
            box.add_child(this._section('SESSION', this.actions.session));
        if (this.actions.power.length)
            box.add_child(this._section('POWER', this.actions.power));

        const cancelRow = new St.BoxLayout({
            style: 'margin-top: 18px;',
            x_align: Clutter.ActorAlign.CENTER,
        });
        const cancel = new St.Button({
            label: 'Cancel',
            style_class: 'sa-pill-btn sa-card-cancel',
            can_focus: true,
            style: 'min-width: 104px; min-height: 40px; padding: 8px 18px;',
        });
        cancel.connect('clicked', () => this.dialog.close());
        this.registerNav(cancel);
        cancelRow.add_child(cancel);
        box.add_child(cancelRow);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, 1, () => {
                this._tick();
                return GLib.SOURCE_CONTINUE;
            });
        this.dialog.connect('closed', () => {
            if (this._tickId) {
                GLib.source_remove(this._tickId);
                this._tickId = 0;
            }
        });

        return frame;
    }

    _section(title, actions) {
        const sec = new St.BoxLayout({
            vertical: true,
            style: 'spacing: 8px; margin-top: 18px;',
            x_align: Clutter.ActorAlign.CENTER,
        });

        sec.add_child(new St.Label({
            text: title,
            style_class: 'sa-heading sa-card-section-heading',
            x_align: Clutter.ActorAlign.CENTER,
            style: 'min-width: 80px;',
        }));

        const row = new St.BoxLayout({
            style: 'spacing: 10px;',
            x_align: Clutter.ActorAlign.CENTER,
        });
        for (const action of actions)
            row.add_child(this._pill(action));
        sec.add_child(row);
        return sec;
    }

    _pill(action) {
        const tier = this.actionTier(action);
        const btn = new St.Button({
            style_class: `sa-pill-btn sa-card-action sa-tier-${tier}`,
            can_focus: true,
            style: 'width: 110px; min-width: 110px; height: 54px; min-height: 54px; padding: 6px 10px; border-radius: 16px;',
        });

        const content = new St.BoxLayout({
            vertical: true,
            spacing: 3,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        content.add_child(this.makeIcon(action.icon, 18));
        content.add_child(new St.Label({
            text: action.label,
            style_class: 'sa-pill-label',
            x_align: Clutter.ActorAlign.CENTER,
        }));

        btn.set_child(content);
        btn.connect('clicked', () => this.trigger(action));
        this.registerNav(btn);
        return btn;
    }

    _buildAvatar(size) {
        const user = GLib.get_user_name() || 'U';
        const paths = [
            GLib.build_filenamev(['/var', 'lib', 'AccountsService', 'icons', user]),
            GLib.build_filenamev([GLib.get_home_dir(), '.face']),
        ];

        for (const path of paths) {
            try {
                const file = Gio.File.new_for_path(path);
                if (!file.query_exists(null))
                    continue;
                const avatar = new St.Bin({
                    style_class: 'sa-avatar sa-avatar-image',
                    style: `width: ${size}px; height: ${size}px;`,
                    clip_to_allocation: true,
                });
                avatar.set_child(new St.Icon({
                    gicon: Gio.FileIcon.new(file),
                    icon_size: size,
                    style: `width: ${size}px; height: ${size}px;`,
                }));
                return avatar;
            } catch (_e) {
                // Try the next avatar source, then fall back to initials.
            }
        }

        return new St.Label({
            text: user.slice(0, 2).toUpperCase(),
            style_class: 'sa-avatar',
            style: `width: ${size}px; height: ${size}px; text-align: center;`,
        });
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._clockLabel.text = now.format('%H:%M') ?? '';
        this._dateLabel.text = now.format('%a %d %b') ?? '';
        const host = `${GLib.get_user_name()}@${GLib.get_host_name()}`;
        this._metaLabel.text = `${host} · up ${getUptime()}`;
    }
}
