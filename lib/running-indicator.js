// SPDX-License-Identifier: GPL-2.0-or-later

import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import {getRunningCustomActions, terminateCustomAction} from './process.js';

const GRACE_MS = 1500;
const RECHECK_MS = 2000;

class RunningIndicator {
    constructor() {
        this._source = null;
        this._notifications = new Map();
        this._timers = new Set();
    }

    _ensureSource() {
        if (this._source) return this._source;
        try {
            const source = new MessageTray.Source('Material System Actions', 'system-run-symbolic');
            Main.messageTray.add(source);
            this._source = source;
        } catch (_e) {
            this._source = null;
        }
        return this._source;
    }

    _isRunning(id) {
        return getRunningCustomActions().some(item => item.id === id);
    }

    _show(id, label) {
        if (this._notifications.has(id) || !this._isRunning(id)) return;
        const source = this._ensureSource();
        if (!source) return;
        try {
            const notification = new MessageTray.Notification({
                source,
                title: 'Custom action still running',
                body: label
            });
            notification.resident = true;
            notification.addAction('Cancel', () => {
                terminateCustomAction(id);
                this._dismiss(id);
            });
            source.addNotification(notification);
            source.showNotification(notification);
            this._notifications.set(id, notification);
        } catch (_e) {
            // A notification is optional; tracking still works via D-Bus.
        }
    }

    _dismiss(id) {
        const notification = this._notifications.get(id);
        if (notification) notification.destroy();
        this._notifications.delete(id);
    }

    watch(id, label) {
        const addTimer = (delay, callback) => {
            const timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT_IDLE, delay, () => {
                this._timers.delete(timerId);
                callback();
                return GLib.SOURCE_REMOVE;
            });
            this._timers.add(timerId);
        };
        addTimer(GRACE_MS, () => {
            this._show(id, label);
            if (this._notifications.has(id))
                addTimer(RECHECK_MS, () => {
                    if (!this._isRunning(id)) this._dismiss(id);
                });
        });
    }

    clear() {
        for (const timerId of this._timers) GLib.source_remove(timerId);
        this._timers.clear();
        for (const id of [...this._notifications.keys()]) this._dismiss(id);
        if (this._source) {
            this._source.destroy();
            this._source = null;
        }
    }
}

export const runningIndicator = new RunningIndicator();
