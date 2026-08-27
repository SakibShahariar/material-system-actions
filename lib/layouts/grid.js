// SPDX-License-Identifier: GPL-2.0-or-later
// Port of GridWindow:937 — rofi grid theme, numbered icon tiles

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';
import {getUptime} from '../actions.js';

export class GridStyle extends BaseStyle {
    buildUI() {
        const box = new St.BoxLayout({vertical: true, style_class: 'sa-panel-flat sa-mono', style: 'min-width: 480px;'});
        const header = new St.BoxLayout({style_class: 'sa-bar sa-bar-top', x_expand: true, style: 'padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.1); spacing: 6px;'});
        header.add_child(new St.Label({text: `power > ${GLib.get_user_name()}@${GLib.get_host_name()}`, x_expand: true, x_align: Clutter.ActorAlign.START}));
        header.add_child(new St.Label({text: `${this.actions.all.length} items`, style_class: 'sa-muted'}));
        box.add_child(header);

        const grid = new St.BoxLayout({x_expand: true, style: 'spacing: 1px; padding-top: 4px; background-color: rgba(255,255,255,0.08);'});
        for (let i = 0; i < this.actions.all.length; i++) {
            const a = this.actions.all[i];
            grid.add_child(this._tile(a, i + 1));
        }
        box.add_child(grid);

        const footer = new St.BoxLayout({style_class: 'sa-bar sa-bar-bottom', x_expand: true, style: 'padding: 6px 12px; border-top: 1px solid rgba(255,255,255,0.1); spacing: 6px;'});
        footer.add_child(new St.Label({text: '1-5 select   enter confirm   esc quit', x_expand: true, x_align: Clutter.ActorAlign.START}));
        this._uptimeLabel = new St.Label({x_align: Clutter.ActorAlign.END});
        footer.add_child(this._uptimeLabel);
        box.add_child(footer);

        this._tick();
        this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { this._tick(); return GLib.SOURCE_CONTINUE; });
        this.dialog.connect('closed', () => { if (this._tickId) GLib.source_remove(this._tickId); });

        // 1-9 quick select
        this.dialog.connect('key-press-event', (_a, evt) => {
            const sym = evt.get_key_symbol();
            if (sym >= Clutter.KEY_1 && sym <= Clutter.KEY_9) {
                const idx = sym - Clutter.KEY_1;
                if (idx < this.actions.all.length) { this.trigger(this.actions.all[idx]); return Clutter.EVENT_STOP; }
            }
            if (sym >= Clutter.KEY_KP_1 && sym <= Clutter.KEY_KP_9) {
                const idx = sym - Clutter.KEY_KP_1;
                if (idx < this.actions.all.length) { this.trigger(this.actions.all[idx]); return Clutter.EVENT_STOP; }
            }
            return Clutter.EVENT_PROPAGATE;
        });

        return box;
    }

    _tile(action, badgeNum) {
        const tier = this.actionTier(action);
        const btn = new St.Button({style_class: `sa-tile-btn sa-tier-${tier}`, can_focus: true, style: 'width: 88px; height: 96px; border-top: 3px solid transparent;'});
        const content = new St.BoxLayout({vertical: true, style: 'spacing: 8px;', x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER});
        content.add_child(this.makeIcon(action.icon, 22));
        content.add_child(new St.Label({text: action.label, style_class: 'sa-tile-label', x_align: Clutter.ActorAlign.CENTER}));
        // badge via overlay label
        const overlay = new St.BoxLayout({vertical: true});
        overlay.add_child(content);
        btn.set_child(overlay);
        // badge as small corner label via style
        btn.connect('clicked', () => this.trigger(action));
        return btn;
    }

    _tick() { this._uptimeLabel.text = `up ${getUptime()}`; }
}
