// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const base = read('../lib/layouts/base.js');

test('keyboard focus tints the button background and foreground', () => {
    assert.match(base, /import \{hexToRgba\} from '\.\.\/theme-colors\.js'/);
    assert.match(base, /const focusBg = hexToRgba\(this\.theme\?\.primary \|\| '#b0c6ff', 0\.6\)/);
    assert.match(base, /const focusFg = this\.theme\?\.primary_fixed \|\| '#ffffff'/);
    assert.match(base, /background-color: \$\{focusBg\}; color: \$\{focusFg\};/);
    assert.match(base, /widget\.connect\('key-focus-out'/);
    assert.match(base, /widget\.remove_style_class_name\('sa-focus-ring'\)/);
});

test('focus styling is shared with confirmation buttons', () => {
    assert.match(base, /bindFocusStyle\(widget\) \{/);
    // registerNav delegates to the shared helper.
    assert.match(base, /this\.bindFocusStyle\(widget\);/);
    // Confirmation buttons get the same helper, since they skip registerNav.
    assert.match(base, /this\.bindFocusStyle\(component\.cancelButton\)/);
    assert.match(base, /this\.bindFocusStyle\(component\.confirmButton\)/);
    assert.doesNotMatch(base, /border: 3px solid \$\{focusColor\}/);
});
