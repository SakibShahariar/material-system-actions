// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPreferencesExport, parsePreferencesImport} from '../lib/preferences-io.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

const values = {
    style: 'card',
    'action-order': ['lock', 'suspend'],
    'hidden-actions': ['hibernate'],
    'custom-actions': '[{"id":"custom-x","label":"X","icon":"dialog-information-symbolic","cmd":["/bin/true"]}]',
    'panel-opacity': 0.5,
};

test('export contains only the dotfile-relevant keys', () => {
    const snapshot = JSON.parse(createPreferencesExport(values));
    assert.equal(snapshot.version, 1);
    assert.deepEqual(Object.keys(snapshot.settings).sort(), [
        'action-order', 'custom-actions', 'hidden-actions', 'style',
    ]);
    assert.equal(snapshot.settings.style, 'card');
});

test('valid imports are accepted and partially applied', () => {
    const snapshot = createPreferencesExport(values);
    assert.deepEqual(parsePreferencesImport(snapshot), {
        style: 'card',
        'action-order': ['lock', 'suspend'],
        'hidden-actions': ['hibernate'],
        'custom-actions': values['custom-actions'],
    });
    assert.deepEqual(parsePreferencesImport(JSON.stringify({version: 1, settings: {style: 'grid'}})),
        {style: 'grid'});
});

test('invalid imports are rejected safely', () => {
    assert.throws(() => parsePreferencesImport('not json'), /valid JSON/);
    assert.throws(() => parsePreferencesImport('[]'), /JSON object/);
    assert.throws(() => parsePreferencesImport('{"version":2,"settings":{}}'), /version/);
    assert.throws(() => parsePreferencesImport('{"version":1}'), /settings object/);
    assert.throws(() => parsePreferencesImport('{"version":1,"settings":{"panel-opacity":0.5}}'), /Unknown preference key/);
    assert.throws(() => parsePreferencesImport('{"version":1,"settings":{"style":7}}'), /must be a string/);
    assert.throws(() => parsePreferencesImport('{"version":1,"settings":{"action-order":[1]}}'), /array of strings/);
});

test('import validates commands without executing them', () => {
    const helper = read('../lib/preferences-io.js');
    assert.doesNotMatch(helper, /gi:\/\/Gio/);
    assert.doesNotMatch(helper, /spawn|exec|commandLine/);
    const prefs = read('../prefs.js');
    assert.match(prefs, /parseCustomActions\(values\['custom-actions'\] \?\? '\[\]'\)/);
    assert.match(prefs, /set_string\('custom-actions', values\['custom-actions'\]\)/);
    assert.match(prefs, /title: 'Preferences JSON'/);
    assert.match(prefs, /'Validate and import'/);
});
