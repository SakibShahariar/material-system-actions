// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {LAYOUT_METADATA} from '../lib/layouts/metadata.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('every layout has a gallery thumbnail', () => {
    for (const id of Object.keys(LAYOUT_METADATA)) {
        const path = new URL(`../screenshots/${id}.png`, import.meta.url);
        assert.ok(existsSync(path), `${id}.png is missing`);
    }
});

test('README embeds the gallery for every layout', () => {
    const readme = read('../README.md');
    assert.match(readme, /### Style gallery/);
    for (const id of Object.keys(LAYOUT_METADATA)) assert.ok(readme.includes(`screenshots/${id}.png`), `${id} thumbnail is not linked`);
});
