// SPDX-License-Identifier: GPL-2.0-or-later

/** Build a user-facing failure notice without exposing command arguments. */
export function getActionFailureNotice(actionLabel) {
    const label = typeof actionLabel === 'string' && actionLabel.trim()
        ? actionLabel.trim()
        : 'Action';
    return {
        title: `${label} failed`,
        message: `Could not start or complete ${label}. Check the GNOME Shell log for details.`,
    };
}
