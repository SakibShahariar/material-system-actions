// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
    RESET_SETTING_GROUPS,
    RESET_ALL_SETTING_KEYS,
    resetSettings,
} from '../lib/settings-reset.js';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('reset groups cover every GSettings key exactly once', () => {
    const schema = source('../schemas/org.gnome.shell.extensions.material-system-actions.gschema.xml');
    const schemaKeys = [...schema.matchAll(/<key name="([^"]+)"/g)].map(([, key]) => key);
    assert.deepEqual([...RESET_ALL_SETTING_KEYS].sort(), [...schemaKeys].sort());
    assert.equal(new Set(RESET_ALL_SETTING_KEYS).size, RESET_ALL_SETTING_KEYS.length);
});

test('appearance, action, and custom-action groups remain independently selectable', () => {
    assert.deepEqual(RESET_SETTING_GROUPS.appearance, [
        'icon-scale', 'panel-opacity', 'show-status-header',
        'status-header-density', 'backdrop-dim-enabled',
    ]);
    assert.deepEqual(RESET_SETTING_GROUPS.actions, [
        'style', 'action-order', 'hidden-actions', 'default-focused-action',
        'confirm-switch-user', 'power-countdown-enabled', 'toggle-system-actions',
    ]);
    assert.deepEqual(RESET_SETTING_GROUPS.custom, ['custom-actions']);
});

test('resetSettings delegates each selected key to the schema-backed reset method', () => {
    const reset = [];
    const settings = {reset: key => reset.push(key)};
    assert.deepEqual(resetSettings(settings, 'appearance'), [...RESET_SETTING_GROUPS.appearance]);
    assert.deepEqual(reset, [...RESET_SETTING_GROUPS.appearance]);

    reset.length = 0;
    assert.deepEqual(resetSettings(settings, 'custom'), ['custom-actions']);
    assert.deepEqual(reset, ['custom-actions']);

    reset.length = 0;
    assert.deepEqual(resetSettings(settings), [...RESET_ALL_SETTING_KEYS]);
    assert.deepEqual(reset, [...RESET_ALL_SETTING_KEYS]);
});

test('unknown groups and incompatible settings objects fail explicitly', () => {
    assert.throws(() => resetSettings({reset() {}}, 'missing'), /Unknown settings reset group/);
    assert.throws(() => resetSettings({}, 'appearance'), /Gio.Settings-compatible/);
});

test('Preferences requires confirmation before removing custom actions or resetting everything', () => {
    const prefs = source('../prefs.js');
    assert.match(prefs, /new Adw\.MessageDialog/);
    assert.match(prefs, /set_response_appearance\('reset', Adw\.ResponseAppearance\.DESTRUCTIVE\)/);
    assert.match(prefs, /confirmReset\(\s*'custom'/);
    assert.match(prefs, /confirmReset\(\s*'all'/);
    assert.match(prefs, /resetSettings\(settings, group\)/);
});
