// SPDX-License-Identifier: GPL-2.0-or-later

// Pure helpers for the status clock's 24/12-hour preference. A single source
// of truth for the GLib.DateTime pattern keeps every layout consistent and
// makes the behavior easy to test without importing GNOME modules.

export const CLOCK_FORMATS = Object.freeze(['24h', '12h']);
export const DEFAULT_CLOCK_FORMAT = '24h';

export function normalizeClockFormat(value) {
    return CLOCK_FORMATS.includes(value) ? value : DEFAULT_CLOCK_FORMAT;
}

// Return the GLib.DateTime.format() pattern for a clock-format setting value.
export function getClockFormat(setting, {withSeconds = false} = {}) {
    const format = normalizeClockFormat(setting);
    if (format === '12h') return withSeconds ? '%I:%M:%S %p' : '%I:%M %p';
    return withSeconds ? '%H:%M:%S' : '%H:%M';
}

// Format any DateTime-like object (anything exposing .format()).
export function formatClock(dateTime, setting, options = {}) {
    return dateTime.format(getClockFormat(setting, options)) ?? '';
}
