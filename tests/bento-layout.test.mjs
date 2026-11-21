// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('bento tiles keep long labels inside their width', () => {
    const source = read('../lib/layouts/bento.js');
    assert.match(source, /font-size: 0\.78em; text-align: center;/);
    assert.match(source, /sa-tile-label/);
});

test('bento hero uses a themed fill instead of solid black', () => {
    const source = read('../lib/layouts/bento.js');
    assert.match(source, /background-color: var\(--surface_container_high/);
    assert.match(source, /border: 1px solid var\(--outline_variant/);
    assert.match(source, /heroStyle/);
});

test('bento vertical caption stays inside a fixed-width column', () => {
    const source = read('../lib/layouts/bento.js');
    assert.match(source, /for \(const ch of 'SYSTEM'\)/);
    assert.match(source, /width: 28,/);
    assert.match(source, /sa-bento-caption-letter/);
    assert.doesNotMatch(source, /set_rotation_angle/);
    assert.match(read('../stylesheet.css'), /\.sa-bento-caption-letter \{ width: 28px;/);
});
