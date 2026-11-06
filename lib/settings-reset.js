// SPDX-License-Identifier: GPL-2.0-or-later

// Keep reset groups aligned with the extension's GSettings schema.
// settings.reset() delegates default values to the schema itself.
export const RESET_SETTING_GROUPS = Object.freeze({
    appearance: Object.freeze([
        'icon-scale',
        'panel-opacity',
        'show-status-header',
        'status-header-density',
        'backdrop-dim-enabled',
    ]),
    actions: Object.freeze([
        'style',
        'action-order',
        'hidden-actions',
        'default-focused-action',
        'confirm-switch-user',
        'power-countdown-enabled',
        'toggle-system-actions',
    ]),
    custom: Object.freeze([
        'custom-actions',
    ]),
});

export const RESET_ALL_SETTING_KEYS = Object.freeze([
    ...RESET_SETTING_GROUPS.appearance,
    ...RESET_SETTING_GROUPS.actions,
    ...RESET_SETTING_GROUPS.custom,
]);

export function resetSettings(settings, group = 'all') {
    const keys = group === 'all' ? RESET_ALL_SETTING_KEYS : RESET_SETTING_GROUPS[group];
    if (!keys)
        throw new RangeError(`Unknown settings reset group: ${group}`);
    if (!settings || typeof settings.reset !== 'function')
        throw new TypeError('A Gio.Settings-compatible object is required');

    for (const key of keys)
        settings.reset(key);

    return [...keys];
}
