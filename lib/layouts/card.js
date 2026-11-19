// SPDX-License-Identifier: GPL-2.0-or-later
// Card layout — compact Material 3 system-actions card.

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class CardStyle extends BaseStyle {
    buildUI() {
        const frame = new St.Bin({
            style_class: 'sa-card-frame',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const box = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'sa-panel sa-layout-card',
            x_align: Clutter.ActorAlign.CENTER,
        });
        frame.set_child(box);
        // The panel background lives on the inner box, not the frame.
        this.bmsBlurTargets = [box];

        const header = new St.BoxLayout({
            style_class: 'sa-card-header',
            x_align: Clutter.ActorAlign.FILL,
        });
        header.add_child(this._buildAvatar(44));

        const info = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'sa-card-header-info',
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
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'sa-card-clock-box',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._clockLabel = new St.Label({
            style_class: 'sa-card-clock',
            x_align: Clutter.ActorAlign.END,
        });
        this._dateLabel = new St.Label({
            style_class: 'sa-muted sa-card-date',
            x_align: Clutter.ActorAlign.END,
        });
        clockBox.add_child(this._clockLabel);
        clockBox.add_child(this._dateLabel);
        header.add_child(clockBox);
        this.bindStatusWidget(header);
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
            style_class: 'sa-card-cancel-row',
            x_align: Clutter.ActorAlign.CENTER,
        });
        const cancel = new St.Button({
            label: 'Cancel',
            style_class: 'sa-pill-btn sa-card-cancel',
            can_focus: true,
        });
        cancel.connect('clicked', () => this.dialog.close());
        this.registerNav(cancel, {label: 'Cancel'});
        cancelRow.add_child(cancel);
        box.add_child(cancelRow);

        this._tick();
        this.startTicker(() => this._tick());

        return frame;
    }

    _section(title, actions) {
        const sec = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'sa-card-section',
            x_align: Clutter.ActorAlign.CENTER,
        });

        sec.add_child(new St.Label({
            text: title,
            style_class: 'sa-heading sa-card-section-heading',
            x_align: Clutter.ActorAlign.CENTER,
        }));

        const row = new St.BoxLayout({
            style_class: 'sa-card-action-row',
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
        });

        const content = new St.BoxLayout({
            style_class: 'sa-card-action-content',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        content.add_child(this.makeIcon(action.icon, 18));
        content.add_child(new St.Label({
            text: action.label,
            style_class: 'sa-pill-label sa-card-action-label',
            x_align: Clutter.ActorAlign.CENTER,
        }));

        btn.set_child(content);
        btn.connect('clicked', () => this.trigger(action));
        this.registerNav(btn, action);
        return btn;
    }

    _tick() {
        const now = GLib.DateTime.new_now_local();
        this._clockLabel.text = now.format('%H:%M') ?? '';
        this._dateLabel.text = now.format('%a %d %b') ?? '';
        const host = `${GLib.get_user_name()}@${GLib.get_host_name()}`;
        this._metaLabel.text = `${host} · up ${getUptime()}`;
    }
}
