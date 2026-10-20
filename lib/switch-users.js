// SPDX-License-Identifier: GPL-2.0-or-later

const GRAPHICAL_SESSION_TYPES = new Set(['wayland', 'x11']);

/** Build switch actions only for other users' local graphical sessions. */
export function buildSwitchUserActions(sessions, currentUser, currentSessionId) {
    if (!Array.isArray(sessions))
        return [];
    return sessions
        .filter(session =>
            session &&
            typeof session.id === 'string' &&
            /^[A-Za-z0-9_-]+$/.test(session.id) &&
            session.id !== currentSessionId &&
            typeof session.user === 'string' &&
            session.user.length > 0 &&
            session.user !== currentUser &&
            typeof session.seat === 'string' &&
            session.seat.length > 0 &&
            session.class === 'user' &&
            GRAPHICAL_SESSION_TYPES.has(session.type) &&
            session.remote === false)
        .map(session => ({
            id: `switch-user-${session.id}`,
            label: `Switch to ${session.user}`,
            icon: 'system-users-symbolic',
            cmd: ['loginctl', 'activate', session.id],
            destructive: false,
        }));
}
