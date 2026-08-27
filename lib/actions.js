// SPDX-License-Identifier: GPL-2.0-or-later

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

function which(name) {
    return GLib.find_program_in_path(name) !== null;
}

export function getActions() {
    const session = [];
    const power = [];
    if (which('loginctl')) {
        session.push({id: 'lock', label: 'Lock', icon: 'system-lock-screen-symbolic', cmd: ['loginctl', 'lock-session'], destructive: false, key: 'l'});
    }
    if (which('gnome-session-quit')) {
        session.push({id: 'logout', label: 'Log out', icon: 'system-log-out-symbolic', cmd: ['gnome-session-quit', '--logout', '--no-prompt'], destructive: false, key: 'o'});
    }
    if (which('systemctl')) {
        power.push({id: 'suspend', label: 'Suspend', icon: 'weather-clear-night-symbolic', cmd: ['systemctl', 'suspend'], destructive: false, key: 's'});
        power.push({id: 'reboot', label: 'Reboot', icon: 'system-reboot-symbolic', cmd: ['systemctl', 'reboot'], destructive: true, key: 'r'});
        power.push({id: 'shutdown', label: 'Shutdown', icon: 'system-shutdown-symbolic', cmd: ['systemctl', 'poweroff'], destructive: true, key: 'p'});
    }
    return {session, power, all: [...session, ...power]};
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
