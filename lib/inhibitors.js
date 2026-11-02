// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Keep only login1 inhibitors that can block or delay sleep.
 * D-Bus tuples follow ListInhibitors: what, who, why, mode, uid, pid.
 * Multiple inhibitors from one application are consolidated without losing
 * distinct reasons or the block/delay modes needed for the suspend warning.
 */
export function getSleepInhibitors(inhibitors) {
    if (!Array.isArray(inhibitors))
        return [];

    const grouped = new Map();
    for (const item of inhibitors) {
        if (!Array.isArray(item) ||
            typeof item[0] !== 'string' ||
            !item[0].split(':').includes('sleep') ||
            (item[3] !== 'block' && item[3] !== 'delay')) {
            continue;
        }

        const who = String(item[1] || 'Unknown application');
        let group = grouped.get(who);
        if (!group) {
            group = {what: [], reasons: [], modes: []};
            grouped.set(who, group);
        }

        const what = item[0];
        const why = String(item[2] || 'No reason provided');
        const mode = item[3];
        if (!group.what.includes(what))
            group.what.push(what);
        if (!group.reasons.includes(why))
            group.reasons.push(why);
        if (!group.modes.includes(mode))
            group.modes.push(mode);
    }

    return [...grouped.entries()].map(([who, group]) => ({
        what: group.what.join(', '),
        who,
        why: group.reasons.join('; '),
        mode: group.modes.join(', '),
    }));
}
