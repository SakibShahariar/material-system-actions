// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('radial layout has no rectangular panel behind the ring', () => {
    const source = read('../lib/layouts/radial.js');
    assert.match(source, /style_class: 'sa-layout-radial'/);
    assert.doesNotMatch(source, /sa-panel sa-layout-radial/);
    assert.match(source, /background-color: transparent; border: none; box-shadow: none; border-radius: 999px;/);
    assert.match(read('../stylesheet.css'), /\.sa-layout-radial \{ color:/);
});

test('radial hub is centered and themed, not solid black', () => {
    const source = read('../lib/layouts/radial.js');
    assert.match(source, /wrapper\.set_size\(size \+ 32, size \+ 32\)/);
    assert.match(source, /width: 110px; height: 110px; border-radius: 999px; background-color: var\(--surface_container_high/);
    assert.match(source, /box-shadow: 0 6px 18px/);
});
