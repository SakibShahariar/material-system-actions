// SPDX-License-Identifier: GPL-2.0-or-later
// Port of CardWindow:700 — header card, SESSION/POWER pill buttons, clock

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class CardStyle extends BaseStyle {
    buildUI() {
        const scale = this.theme.scale ?? 1;
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel'});

        // Header pill — avatar + host + clock
        const header = new St.BoxLayout({style_class: 'sa-header-pill', x_expand: true});
        const avatar = new St.Label({text: (GLib.get_user_name() || 'U').slice(0,2).toUpperCase(), style_class: 'sa-avatar', style: `width: 44px; height: 44px; text-align: center;`});
        header.add_child(avatar);

        const info = new St.BoxLayout({vertical: true, x_expand: true, y_align: Clutter.ActorAlign.CENTER});
        info.add_child(new St.Label({text: GLib.get_user_name(), x_align: Clutter.ActorAlign.START}));
        this._metaLabel = new St.Label({style_class: 'sa-muted', x_align: Clutter.ActorAlign.START});
        info.add_child(this._metaLabel);
        header.add_child(info);

        const clockBox = new St.BoxLayout({vertical: true, y_align: Clutter.ActorAlign.CENTER});
        this._clockLabel = new St.Label({x_align: Clutter.ActorAlign.END});
        this._dateLabel = new St.Label({style_class: 'sa-muted', x_align: Clutter.ActorAlign.END});
        clockBox.add_child(this._clockLabel);
        clockBox.add_child(this._dateLabel);
        header.add_child(clockBox);
        box.add_child(header);

        box.add_child(new St.Label({text: 'System actions', style_class: 'sa-heading', x_align: Clutter.ActorAlign.CENTER, style: 'margin-top: 10px;'}));

        if (this.actions.session.length) box.add_child(this._section('SESSION', this.actions.session));
        if (this.actions.power.length) box.add_child(this._section('POWER', this.actions.power));

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) { GLib.source_remove(this._tickId); this._tickId = 0; }});

        return box;
    }

    _section(title, actions) {
        const sec = new St.BoxLayout({vertical: true, style: 'margin-top: 10px;'});
        sec.add_child(new St.Label({text: title, style_class: 'sa-heading', x_align: Clutter.ActorAlign.CENTER}));
        const row = new St.BoxLayout({x_align: Clutter.ActorAlign.CENTER, style: 'spacing: 10px;'});
        for (const a of actions) row.add_child(this._pill(a));
        sec.add_child(row);
        return sec;
    }

    _pill(action) {
        const tier = this.actionTier(action);
        const btn = new St.Button({style_class: `sa-pill-btn sa-tier-${tier}`, can_focus: true, x_expand: false});
        const content = new St.BoxLayout({vertical: true, style: 'spacing: 2px;', x_align: Clutter.ActorAlign.CENTER});
        content.add_child(this.makeIcon(action.icon, 18));
        content.add_child(new St.Label({text: action.label, style_class: 'sa-pill-label', x_align: Clutter.ActorAlign.CENTER}));
        btn.set_child(content);
        btn.connect('clicked', () => this.trigger(action));
        this.registerNav(btn);
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
