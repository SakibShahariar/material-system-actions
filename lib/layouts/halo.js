// SPDX-License-Identifier: GPL-2.0-or-later
// Port of halo ring (was dots):1243 — swaylock dot-ring hold-to-confirm

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {BaseStyle} from './base.js';

export class HaloStyle extends BaseStyle {
    buildUI() {
        this.HOLD_MS = 1400;
        this.TICK_MS = 70;
        this.DOTS = 28;
        const destructive = this.actions.all.filter(a => a.destructive);
        this._destructive = destructive.length ? destructive : this.actions.power;
        this._targetIdx = 0;

        const outer = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'sa-panel sa-layout-halo', style: 'spacing: 16px; padding: 24px;', x_align: Clutter.ActorAlign.CENTER});

        // quick row non-destructive
        const quickRow = new St.BoxLayout({style: 'spacing: 10px;', x_align: Clutter.ActorAlign.CENTER});
        for (const a of this.actions.all.filter(a => !a.destructive)) {
            const btn = new St.Button({style_class: `sa-circle-btn sa-tier-${this.actionTier(a)}`, can_focus: true, style: 'width: 44px; height: 44px; border-radius: 999px;'});
            btn.set_child(this.makeIcon(a.icon, 16));
            btn.connect('clicked', () => this.trigger(a));
            this.registerNav(btn);
            quickRow.add_child(btn);
        }
        if (quickRow.get_n_children() > 0) outer.add_child(quickRow);

        if (!this._destructive.length) {
            outer.add_child(new St.Label({text: 'No power actions available (systemctl not found).', style_class: 'sa-muted', x_align: Clutter.ActorAlign.CENTER}));
            return outer;
        }

        // dot ring via Clutter fixed
        const size = 220;
        const fixed = new Clutter.Actor({width: size, height: size, layout_manager: new Clutter.FixedLayout()});
        this._dots = [];
        const cx = 110, cy = 110, r = 95;
        for (let i = 0; i < this.DOTS; i++) {
            const angle = (2*Math.PI*i/this.DOTS) - Math.PI/2;
            const x = cx + r*Math.cos(angle) - 4;
            const y = cy + r*Math.sin(angle) - 4;
            const dot = new St.Widget({style_class: 'sa-dot', style: 'width: 8px; height: 8px; border-radius: 999px; background-color: rgba(255,255,255,0.2);'});
            dot.set_position(Math.round(x), Math.round(y));
            fixed.add_child(dot);
            this._dots.push(dot);
        }

        const centerBtn = new St.Button({style_class: 'sa-circle-btn sa-tier-error', style: 'width: 80px; height: 80px; border-radius: 999px;', can_focus: true});
        centerBtn.set_child(this.makeIcon(this._destructive[0].icon, 26));
        centerBtn.set_position(70, 70);
        this._centerBtn = centerBtn;
        this.registerNav(centerBtn);
        fixed.add_child(centerBtn);
        outer.add_child(fixed);

        this._statusLabel = new St.Label({text: `hold to ${this._destructive[0].label.toLowerCase()}`, style_class: 'sa-danger-text', x_align: Clutter.ActorAlign.CENTER, style: 'color: #ffb4ab;'});
        this._hintLabel = new St.Label({text: 'release early to cancel   ·   tap icon to switch action', style_class: 'sa-muted', x_align: Clutter.ActorAlign.CENTER});
        outer.add_child(this._statusLabel);
        outer.add_child(this._hintLabel);

        this._progress = 0;
        this._holdId = 0;

        centerBtn.connect('button-press-event', () => this._onPress());
        centerBtn.connect('button-release-event', () => this._onRelease());
        // keyboard hold: Space/Enter triggers hold, release triggers action/cycle
        // short tap cycles, long hold (1.4s) triggers
        centerBtn.connect('clicked', () => {
            // clicked already handled via press/release; keep for accessibility
        });

        return outer;
    }

    onKeyPress(sym) {
        // Do not steal activation from the quick-action buttons.
        if (global.stage.get_key_focus() !== this._centerBtn)
            return false;
        if (sym === Clutter.KEY_space || sym === Clutter.KEY_Return || sym === Clutter.KEY_KP_Enter) {
            // Keyboard has no reliable hold/release semantics here; use the normal
            // confirmation screen instead of accidentally triggering a power action.
            this.trigger(this._destructive[this._targetIdx]);
            return true;
        }
        if (sym === Clutter.KEY_Right || sym === Clutter.KEY_Left) {
            // Left/right cycles the target while the center control is focused.
            this._targetIdx = (this._targetIdx + 1) % this._destructive.length;
            const action = this._destructive[this._targetIdx];
            this._centerBtn.set_child(this.makeIcon(action.icon, 26));
            this._statusLabel.text = `hold to ${action.label.toLowerCase()}`;
            return true;
        }
        return false;
    }

    _onPress() {
        this._progress = 0;
        this._resetDots();
        if (this._holdId) GLib.source_remove(this._holdId);
        this._holdId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.TICK_MS, () => this._onTickHold());
        return Clutter.EVENT_PROPAGATE;
    }

    _onRelease() {
        if (this._progress * (this.TICK_MS / this.HOLD_MS) < 0.35) {
            this._targetIdx = (this._targetIdx + 1) % this._destructive.length;
            const action = this._destructive[this._targetIdx];
            this._centerBtn.set_child(this.makeIcon(action.icon, 26));
            this._statusLabel.text = `hold to ${action.label.toLowerCase()}`;
        }
        if (this._holdId) { GLib.source_remove(this._holdId); this._holdId = 0; }
        this._progress = 0;
        this._resetDots();
        return Clutter.EVENT_PROPAGATE;
    }

    _onTickHold() {
        this._progress += 1;
        const filled = Math.min(this.DOTS, Math.floor(this.DOTS * (this._progress * this.TICK_MS) / this.HOLD_MS));
        for (let i = 0; i < this._dots.length; i++) {
            if (i < filled) this._dots[i].add_style_class_name('sa-dot-filled');
            else this._dots[i].remove_style_class_name('sa-dot-filled');
        }
        if (filled >= this.DOTS) {
            this._holdId = 0;
            this._run(this._destructive[this._targetIdx].cmd);
            return GLib.SOURCE_REMOVE;
        }
        return GLib.SOURCE_CONTINUE;
    }

    _resetDots() { for (const d of this._dots) d.remove_style_class_name('sa-dot-filled'); }
}
