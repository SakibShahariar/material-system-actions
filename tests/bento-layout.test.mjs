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

test('bento has no decorative caption that can overflow the panel', () => {
    const source = read('../lib/layouts/bento.js');
    assert.doesNotMatch(source, /set_rotation_angle/);
    assert.doesNotMatch(source, /for \(const ch of 'SYSTEM'\)/);
    assert.doesNotMatch(source, /col0/);
});
