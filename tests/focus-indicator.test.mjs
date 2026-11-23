// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base = readFileSync(new URL('../lib/layouts/base.js', import.meta.url), 'utf8');

test('keyboard focus tints the button background instead of drawing a ring', () => {
    assert.match(base, /import \{hexToRgba\} from '\.\.\/theme-colors\.js'/);
    assert.match(base, /const focusBg = hexToRgba\(this\.theme\?\.primary \|\| '#b0c6ff', 0\.45\)/);
    assert.match(base, /const focusFg = this\.theme\?\.on_primary \|\| '#ffffff'/);
    assert.match(base, /widget\.connect\('key-focus-in'/);
    assert.match(base, /background-color: \$\{focusBg\}; color: \$\{focusFg\};/);
    assert.doesNotMatch(base, /border: 3px solid \$\{focusColor\}/);
    assert.match(base, /widget\.connect\('key-focus-out'/);
    assert.match(base, /widget\._saBaseStyle/);
    assert.match(base, /widget\.remove_style_class_name\('sa-focus-ring'\)/);
});
