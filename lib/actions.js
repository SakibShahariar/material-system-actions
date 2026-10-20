// SPDX-License-Identifier: GPL-2.0-or-later

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {applyActionPreferences} from './action-preferences.js';
import {parseCustomActions} from './custom-actions.js';

function which(name) {
    return GLib.find_program_in_path(name) !== null;
}

export function getActions(settings = null) {
    const session = [];
    const power = [];
    if (which('loginctl')) {
        session.push({id: 'lock', label: 'Lock', icon: 'system-lock-screen-symbolic', cmd: ['loginctl', 'lock-session'], destructive: false, key: 'l'});
    }
    if (which('gnome-session-quit')) {
        session.push({id: 'logout', label: 'Log out', icon: 'system-log-out-symbolic', cmd: ['gnome-session-quit', '--logout', '--no-prompt'], destructive: true, key: 'o'});
    }
    if (which('systemctl')) {
        power.push({id: 'suspend', label: 'Suspend', icon: 'weather-clear-night-symbolic', cmd: ['systemctl', 'suspend'], destructive: false, key: 's'});
        power.push({id: 'reboot', label: 'Reboot', icon: 'system-reboot-symbolic', cmd: ['systemctl', 'reboot'], destructive: true, key: 'r'});
        power.push({id: 'shutdown', label: 'Shutdown', icon: 'system-shutdown-symbolic', cmd: ['systemctl', 'poweroff'], destructive: true, key: 'p'});
    }
    let custom = [];
    if (settings) {
        try { custom = parseCustomActions(settings.get_string('custom-actions')); }
        catch (e) { logError(e, 'material-system-actions: invalid custom-actions setting'); }
    }
    const discovered = [...session, ...power, ...custom];
    const ordered = applyActionPreferences(discovered, settings);
    const sessionIds = new Set(session.map(action => action.id));
    const powerIds = new Set(power.map(action => action.id));
    const customIds = new Set(custom.map(action => action.id));
    return {
        session: ordered.filter(action => sessionIds.has(action.id)),
        power: ordered.filter(action => powerIds.has(action.id) || customIds.has(action.id)),
        custom: ordered.filter(action => customIds.has(action.id)),
        all: ordered,
    };
}

export function getUptime() {
    try {
        const [ok, bytes] = GLib.file_get_contents('/proc/uptime');
        if (!ok) return '?';
        const text = new TextDecoder().decode(bytes);
        const secs = Math.floor(parseFloat(text.split(' ')[0]));
        const d = Math.floor(secs / 86400);
        const h = Math.floor((secs % 86400) / 3600);
        const m = Math.floor((secs % 3600) / 60);
        if (d) return `${d}d ${h}h`;
        if (h) return `${h}h ${m}m`;
        return `${m}m`;
    } catch (_e) { return '?'; }
}

export function spawnCommand(argv) {
    try {
        Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
        return true;
    } catch (e) {
        log(`material-system-actions: spawn failed ${argv.join(' ')}: ${e}`);
        return false;
    }
}
