// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {backdropSettings} from '../lib/backdrop.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('strong dim darkens the backdrop only when dimming is enabled', () => {
    assert.deepEqual(backdropSettings(false, true), {brightness: 1, sharpness: 0, opacity: 0});
    const normal = backdropSettings(true, false);
    const strong = backdropSettings(true, true);
    assert.ok(strong.brightness < normal.brightness);
    assert.ok(strong.sharpness > normal.sharpness);
    assert.ok(strong.opacity < normal.opacity);
});

test('dialog uses the backdrop helper and reacts to both settings', () => {
    const dialog = read('../lib/dialog.js');
    assert.match(dialog, /backdropSettings\(enabled, strong\)/);
    assert.match(dialog, /changed::backdrop-strong-enabled/);
    assert.match(dialog, /this\._strongDimHandlerId/);
});

test('strong dim is configurable, resettable, and documented', () => {
    const schema = read('../schemas/org.gnome.shell.extensions.material-system-actions.gschema.xml');
    assert.match(schema, /<key name="backdrop-strong-enabled" type="b">\s*<default>false<\/default>/);
    const prefs = read('../prefs.js');
    assert.match(prefs, /title: 'Stronger backdrop dim'/);
    assert.match(prefs, /sensitive: dimRow\.active/);
    const reset = read('../lib/settings-reset.js');
    assert.match(reset, /'backdrop-strong-enabled'/);
    const readme = read('../README.md');
    assert.match(readme, /Stronger backdrop dim/);
});
