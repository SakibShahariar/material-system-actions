// SPDX-License-Identifier: GPL-2.0-or-later

// Dotfile-friendly snapshot of the settings that affect menu behavior and
// appearance. Deliberately excludes device/session-local keys such as the
// global shortcut.
export const PREFERENCES_EXPORT_KEYS = Object.freeze([
    'style',
    'action-order',
    'hidden-actions',
    'custom-actions',
]);

export function createPreferencesExport(values) {
    const settings = {};
    for (const key of PREFERENCES_EXPORT_KEYS)
        settings[key] = values[key];
    return JSON.stringify({version: 1, settings}, null, 2);
}

export function parsePreferencesImport(text) {
    let data;
    try { data = JSON.parse(text); }
    catch (_error) { throw new Error('Preferences import must be valid JSON.'); }

    if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new Error('Preferences import must be a JSON object.');
    if (data.version !== 1)
        throw new Error('Unsupported preferences import version.');
    const source = data.settings;
    if (!source || typeof source !== 'object' || Array.isArray(source))
        throw new Error('Preferences import must contain a settings object.');

    const values = {};
    for (const [key, value] of Object.entries(source)) {
        if (!PREFERENCES_EXPORT_KEYS.includes(key))
            throw new Error(`Unknown preference key: ${key}`);
        if (key === 'style' || key === 'custom-actions') {
            if (typeof value !== 'string')
                throw new Error(`${key} must be a string.`);
        } else if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
            throw new Error(`${key} must be an array of strings.`);
        }
        values[key] = value;
    }
    return values;
}
