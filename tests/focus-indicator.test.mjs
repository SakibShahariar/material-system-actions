// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base = readFileSync(new URL('../lib/layouts/base.js', import.meta.url), 'utf8');

test('keyboard focus paints an inline border that hover/theme CSS cannot clear', () => {
    assert.match(base, /const focusColor = this\.theme\?\.on_surface \|\| '#f5f5f5'/);
    assert.match(base, /widget\.connect\('key-focus-in'/);
    assert.match(base, /widget\.set_style\(`\$\{base\} border: 3px solid \$\{focusColor\};`/);
    assert.match(base, /widget\.connect\('key-focus-out'/);
    assert.match(base, /widget\._saBaseStyle/);
    assert.match(base, /widget\.remove_style_class_name\('sa-focus-ring'\)/);
});
