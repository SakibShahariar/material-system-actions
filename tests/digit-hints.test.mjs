// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('digit hints are configurable and default on', () => {
    const schema = read('../schemas/org.gnome.shell.extensions.material-system-actions.gschema.xml');
    assert.match(schema, /<key name="show-digit-hints" type="b">\s*<default>true<\/default>/);
    const reset = read('../lib/settings-reset.js');
    assert.match(reset, /'show-digit-hints'/);
    const prefs = read('../prefs.js');
    assert.match(prefs, /title: 'Show digit hints'/);
    assert.match(prefs, /settings\.set_boolean\('show-digit-hints', digitRow\.active\)/);
});

test('grid badges follow the visible action order and can be hidden', () => {
    const grid = read('../lib/layouts/grid.js');
    assert.match(grid, /this\._tile\(this\.actions\.all\[i\], i \+ 1\)/);
    assert.match(grid, /const perRow = 6;/);
    assert.match(grid, /get_boolean\('show-digit-hints'\) !== false/);
    const navigation = read('../lib/keyboard-navigation.js');
    assert.match(navigation, /index < actions\.all\.length/);
    assert.match(navigation, /style\.trigger\(actions\.all\[index\]\)/);
});

test('README explains digit shortcuts and the opt-out', () => {
    const readme = read('../README.md');
    assert.match(readme, /## Keyboard shortcuts/);
    assert.match(readme, /current visible order/);
    assert.match(readme, /Show digit hints/);
    assert.match(readme, /Hiding hints does not disable the shortcuts/);
});
