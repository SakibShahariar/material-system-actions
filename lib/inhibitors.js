// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Keep only login1 inhibitors that can block or delay sleep.
 * D-Bus tuples follow ListInhibitors: what, who, why, mode, uid, pid.
 */
export function getSleepInhibitors(inhibitors) {
    if (!Array.isArray(inhibitors))
        return [];
    return inhibitors
        .filter(item => Array.isArray(item) &&
            typeof item[0] === 'string' &&
            item[0].split(':').includes('sleep') &&
            (item[3] === 'block' || item[3] === 'delay'))
        .map(item => ({
            what: item[0],
            who: String(item[1] || 'Unknown application'),
            why: String(item[2] || 'No reason provided'),
            mode: item[3],
        }));
}
