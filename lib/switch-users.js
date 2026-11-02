// SPDX-License-Identifier: GPL-2.0-or-later

const GRAPHICAL_SESSION_TYPES = new Set(['wayland', 'x11']);

/** Build switch actions only for other users' local graphical sessions. */
export function buildSwitchUserActions(sessions, currentUser, currentSessionId, confirmSwitchUser = true) {
    if (!Array.isArray(sessions))
        return [];

    const eligible = sessions.filter(session =>
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
        session.remote === false);

    const labels = eligible.map(session => `Switch to ${session.user}`);
    const byUser = new Map();
    eligible.forEach((session, index) => {
        if (!byUser.has(session.user))
            byUser.set(session.user, []);
        byUser.get(session.user).push({session, index});
    });

    for (const [user, group] of byUser) {
        if (group.length < 2)
            continue;

        const multipleSeats = new Set(group.map(({session}) => session.seat)).size > 1;
        const multipleTypes = new Set(group.map(({session}) => session.type)).size > 1;
        const qualified = group.map(({session}) => {
            const details = [];
            if (multipleTypes)
                details.push(session.type === 'wayland' ? 'Wayland' : 'X11');
            if (multipleSeats)
                details.push(`on ${session.seat}`);
            return details.length
                ? `Switch to ${user} (${details.join(', ')})`
                : `Switch to ${user}`;
        });
        const counts = new Map();
        for (const label of qualified)
            counts.set(label, (counts.get(label) ?? 0) + 1);

        group.forEach(({session, index}, groupIndex) => {
            const label = qualified[groupIndex];
            // Only expose a session ID if seat and session type still collide.
            labels[index] = counts.get(label) > 1
                ? `${label} (session ${session.id})`
                : label;
        });
    }

    return eligible.map((session, index) => ({
        id: `switch-user-${session.id}`,
        label: labels[index],
        icon: 'system-users-symbolic',
        cmd: ['loginctl', 'activate', session.id],
        destructive: confirmSwitchUser !== false,
    }));
}
